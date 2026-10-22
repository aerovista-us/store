const { createCatalogConsoleBrowserAuth, ConsoleAuthError } = require("./catalog-console-browser-auth");

const { releaseHandler } = require("./flagship-release-http");
const { projectionHandler } = require("./flagship-projection-http");
const AUTH_BODY_LIMIT = 64 * 1024;
const AVCC_ORIGIN = "https://avcc.aerocoreos.com";

function authHeaders(extra = {}) {
  return {
    "cache-control": "no-store",
    "content-security-policy": `default-src 'none'; frame-ancestors ${AVCC_ORIGIN}; base-uri 'none'`,
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    ...extra,
  };
}

function sendJson(res, status, data, headers = {}) {
  const body = JSON.stringify(data, null, 2);
  res.writeHead(status, authHeaders({ "content-type": "application/json; charset=utf-8", ...headers }));
  res.end(body);
}

function sendRedirect(res, result) {
  const headers = authHeaders({ location: result.location });
  if (result.cookies?.length) headers["set-cookie"] = result.cookies;
  res.writeHead(result.status || 302, headers);
  res.end();
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let rejected = false;
    req.on("data", (chunk) => {
      if (rejected) return;
      size += chunk.length;
      if (size > AUTH_BODY_LIMIT) {
        rejected = true;
        reject(new ConsoleAuthError(413, "request_too_large", "Authentication request body is too large."));
        req.resume();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (rejected) return;
      if (!chunks.length) return resolve({});
      try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("object required");
        resolve(parsed);
      } catch {
        reject(new ConsoleAuthError(400, "invalid_json", "Authentication request body must be a JSON object."));
      }
    });
    req.on("error", reject);
  });
}

function authError(res, error) {
  if (error instanceof ConsoleAuthError) {
    return sendJson(res, error.status, { ok: false, error: error.message, code: error.code });
  }
  console.error("Catalog Console AeroCore auth error", error);
  return sendJson(res, 500, { ok: false, error: "Authentication request failed.", code: "auth_internal_error" });
}

function isAuthPath(pathname) {
  return pathname === "/auth/avcc/start"
    || pathname === "/auth/login"
    || pathname === "/auth/callback"
    || pathname === "/auth/logout"
    || pathname === "/api/auth/status"
    || pathname === "/api/auth/session"
    || pathname === "/api/auth/me"
    || pathname === "/api/auth/capability-check";
}

function isBasicAttempt(req, url) {
  return String(req.headers.authorization || "").startsWith("Basic ")
    || url.searchParams.get("breakglass") === "1";
}

function isNavigationRequest(req, pathname) {
  if (req.method !== "GET" && req.method !== "HEAD") return false;
  if (pathname.startsWith("/api/") || pathname.startsWith("/img/") || pathname.startsWith("/store/")) return false;
  return true;
}

function isStaticAsset(pathname) {
  if (pathname === "/") return false;
  if (pathname.startsWith("/api/") || pathname.startsWith("/img/") || pathname.startsWith("/store/") || pathname.startsWith("/auth/")) return false;
  return /\.(?:js|css|json|png|jpe?g|webp|gif|svg)$/i.test(pathname);
}

function nextFromUrl(url) {
  const copy = new URL(url.toString());
  copy.searchParams.delete("signed_in");
  copy.searchParams.delete("breakglass");
  return `${copy.pathname}${copy.search}` || "/";
}

function redirectToAvccSso(res, url) {
  const location = new URL("/auth/avcc/start", "https://store-console.aerocoreos.com");
  location.searchParams.set("next", nextFromUrl(url));
  return sendRedirect(res, { status: 302, location: `${location.pathname}${location.search}` });
}

function delegate(server, downstream, req, res) {
  for (const listener of downstream) listener.call(server, req, res);
}

/**
 * Transitional compatibility seam: the mature server's audited authorization
 * boundary is still Basic-auth shaped. Once AeroCore SSO has been resolved and
 * authorized by this wrapper, inject the already-configured Basic credential
 * only into the in-process request object before delegating. The credential is
 * never sent to the browser or over the network. This lets AVCC SSO become the
 * normal operator path without rewriting the mature server router in the same
 * production cutover. Remove this shim when server.js is natively AeroCore-aware.
 */
function delegateAeroCore(server, downstream, req, res) {
  const user = String(process.env.CONSOLE_AUTH_USER || "operator").trim();
  const password = String(process.env.CONSOLE_AUTH_PASSWORD || "").trim();
  if (!user || !password) {
    return sendJson(res, 503, {
      ok: false,
      error: "Catalog Console compatibility auth credential is not configured.",
      code: "console_auth_not_ready",
    });
  }
  req.headers.authorization = `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
  return delegate(server, downstream, req, res);
}

function attachAeroCoreAuth(server, { auth = createCatalogConsoleBrowserAuth() } = {}) {
  const downstream = server.listeners("request");
  if (!downstream.length) throw new Error("Catalog Console server has no request listener to wrap");
  server.removeAllListeners("request");

  server.on("request", async (req, res) => {
    const requestUrl = new URL(req.url || "/", auth.config.auth.appOrigin || "https://store-console.aerocoreos.com");
    const pathname = requestUrl.pathname;

    if (pathname === "/v1/storefront/flagship/catalog") {
      projectionHandler(req,res);
      return;
    }

    if (req.method === "GET" && pathname === "/healthz") {
      return delegate(server, downstream, req, res);
    }

    if (pathname.startsWith("/api/flagship/release/")) {
      try { await releaseHandler(req, res, auth); }
      catch (error) { return authError(res,error); }
      return;
    }

    if (isAuthPath(pathname)) {
      try {
        if (req.method === "GET" && pathname === "/api/auth/status") {
          return sendJson(res, 200, { ok: true, auth: auth.publicStatus() });
        }

        if (!auth.publicStatus().enabled) {
          return sendJson(res, 404, { ok: false, error: "AeroCore browser authentication is disabled.", code: "aerocore_auth_disabled" });
        }

        if (req.method === "GET" && pathname === "/auth/avcc/start") {
          return sendRedirect(res, auth.beginAvccLogin(requestUrl));
        }

        if (req.method === "GET" && pathname === "/auth/login") {
          return sendRedirect(res, auth.beginAccountLogin(requestUrl));
        }

        if (req.method === "GET" && pathname === "/auth/callback") {
          return sendRedirect(res, await auth.completeLogin(req, requestUrl));
        }

        if ((req.method === "GET" || req.method === "POST") && pathname === "/auth/logout") {
          return sendRedirect(res, await auth.logout(req));
        }

        if (req.method === "GET" && (pathname === "/api/auth/session" || pathname === "/api/auth/me")) {
          const session = await auth.resolveSession(req);
          return sendJson(res, 200, { ok: true, ...session });
        }

        if (req.method === "POST" && pathname === "/api/auth/capability-check") {
          const body = await readJson(req);
          const decision = await auth.checkCapability(req, {
            capability: body.capability,
            resourceType: body.resourceType ?? null,
            resourceId: body.resourceId ?? null,
          });
          return sendJson(res, decision.allowed ? 200 : 403, { ok: decision.allowed, ...decision });
        }

        return sendJson(res, 405, { ok: false, error: "Method not allowed.", code: "method_not_allowed" });
      } catch (error) {
        return authError(res, error);
      }
    }

    // Explicit break-glass access remains available, but the normal AVCC
    // path never emits a Basic challenge. Operators must deliberately use
    // ?breakglass=1 (or provide an Authorization header) to enter it.
    if (isBasicAttempt(req, requestUrl)) {
      return delegate(server, downstream, req, res);
    }

    const status = auth.publicStatus();
    if (!status.enabled) {
      return delegate(server, downstream, req, res);
    }
    if (!status.ready) {
      return sendJson(res, 503, {
        ok: false,
        error: "AeroCore authentication is enabled but not ready. Break-glass Basic access remains available explicitly.",
        code: "aerocore_auth_not_ready",
      });
    }

    try {
      const local = auth.localSession(req);
      if (!local) {
        if (isNavigationRequest(req, pathname)) return redirectToAvccSso(res, requestUrl);
        return sendJson(res, 401, { ok: false, error: "AeroVista Identity sign-in is required.", code: "auth_required" });
      }

      // Static modules only need the short-lived sealed local session. Root
      // navigation and every API/data request resolve the upstream session
      // live before the mature server receives the request.
      if (isStaticAsset(pathname)) {
        return delegateAeroCore(server, downstream, req, res);
      }

      await auth.requireUse(req);
      return delegateAeroCore(server, downstream, req, res);
    } catch (error) {
      if (error instanceof ConsoleAuthError && error.status === 401 && isNavigationRequest(req, pathname)) {
        return redirectToAvccSso(res, requestUrl);
      }
      return authError(res, error);
    }
  });

  return server;
}

if (require.main === module) {
  const { server } = require("./server");
  const port = Number(process.env.PORT || 80);
  const host = process.env.HOST || "0.0.0.0";
  const auth = createCatalogConsoleBrowserAuth();
  attachAeroCoreAuth(server, { auth });
  server.listen(port, host, () => {
    const status = auth.publicStatus();
    console.log(`AeroVista Catalog Console listening on ${host}:${port}`);
    console.log(`AeroCore auth enabled=${status.enabled} ready=${status.ready}; Basic is break-glass only when AeroCore is enabled`);
  });
}

module.exports = {
  attachAeroCoreAuth,
  delegateAeroCore,
  isAuthPath,
  isBasicAttempt,
  isNavigationRequest,
  isStaticAsset,
  readJson,
};
