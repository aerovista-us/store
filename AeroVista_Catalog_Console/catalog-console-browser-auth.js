const crypto = require("crypto");
const { AeroCoreAdapterError, buildAccountLoginUrl } = require("./aerocore-app-adapter");
const { authReadiness, buildAeroCoreConfig, createCatalogConsoleAdapter } = require("./catalog-console-aerocore");
const {
  authStateCookie,
  authStateFromRequest,
  browserSessionCookie,
  browserSessionFromRequest,
  clearAuthStateCookie,
  clearBrowserSessionCookie,
  issueBrowserSession,
} = require("./catalog-console-browser-session");

class ConsoleAuthError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = "ConsoleAuthError";
    this.status = status;
    this.code = code;
  }
}

function safeNext(value, config) {
  if (!value || typeof value !== "string") return "/";
  try {
    const base = new URL(config.auth.appOrigin);
    const target = new URL(value, base);
    if (target.origin !== base.origin) return "/";
    return `${target.pathname}${target.search}` || "/";
  } catch {
    return "/";
  }
}

function callbackUrl(config, next = "/") {
  const callback = new URL("/auth/callback", config.auth.appOrigin);
  const normalized = safeNext(next, config);
  if (normalized !== "/") callback.searchParams.set("next", normalized);
  return callback.toString();
}

function ensureReady(config) {
  const readiness = authReadiness(config);
  if (!config.auth.enabled) throw new ConsoleAuthError(404, "aerocore_auth_disabled", "AeroCore browser authentication is disabled.");
  if (!readiness.ready) throw new ConsoleAuthError(503, "aerocore_auth_not_ready", "AeroCore browser authentication is not fully configured.");
}

function mapAdapterFailure(error, operation = "identity") {
  if (error instanceof AeroCoreAdapterError) {
    if ([400, 401, 403, 409, 410].includes(error.status)) {
      return new ConsoleAuthError(401, `${operation}_rejected`, "AeroVista rejected or expired this authentication session.");
    }
    return new ConsoleAuthError(503, `${operation}_unavailable`, "AeroVista Identity is temporarily unavailable.");
  }
  if (error?.name === "AbortError") return new ConsoleAuthError(503, `${operation}_unavailable`, "AeroVista Identity timed out.");
  return error instanceof ConsoleAuthError ? error : new ConsoleAuthError(503, `${operation}_unavailable`, "AeroVista Identity is temporarily unavailable.");
}

function timingSafeState(actual, expected) {
  if (!actual || !expected) return false;
  const a = Buffer.from(String(actual));
  const b = Buffer.from(String(expected));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function createCatalogConsoleBrowserAuth({ env = process.env, fetchImpl, now, randomBytes } = {}) {
  const config = buildAeroCoreConfig(env);
  const adapter = createCatalogConsoleAdapter({ env, fetchImpl, now });
  const bytes = randomBytes || crypto.randomBytes;

  function publicStatus() {
    const readiness = authReadiness(config);
    return {
      enabled: config.auth.enabled,
      ready: readiness.ready,
      appId: config.appId,
      avccLoginPath: readiness.ready ? "/auth/avcc/start" : null,
      accountLoginPath: readiness.ready ? "/auth/login" : null,
      callbackPath: readiness.ready ? "/auth/callback" : null,
      logoutPath: readiness.ready ? "/auth/logout" : null,
      enforceUseCapability: config.auth.enforceUseCapability,
      enforcePublishCapability: config.auth.enforcePublishCapability,
    };
  }

  function issueLoginState(next) {
    ensureReady(config);
    const state = bytes(24).toString("base64url");
    return { state, next: safeNext(next || "/", config), cookie: authStateCookie(state, config) };
  }

  function beginAvccLogin(url) {
    const login = issueLoginState(url?.searchParams?.get("next") || "/");
    const location = new URL(config.auth.avccHandoffStartUrl);
    location.searchParams.set("client_id", config.appId);
    location.searchParams.set("return_to", callbackUrl(config, login.next));
    location.searchParams.set("state", login.state);
    return { status: 302, location: location.toString(), cookies: [login.cookie] };
  }

  function beginAccountLogin(url) {
    const login = issueLoginState(url?.searchParams?.get("next") || "/");
    return {
      status: 302,
      location: buildAccountLoginUrl({ appId: config.appId, loginUrl: config.auth.accountLoginUrl, returnTo: callbackUrl(config, login.next), state: login.state }),
      cookies: [login.cookie],
    };
  }

  async function completeLogin(req, url) {
    ensureReady(config);
    const state = url.searchParams.get("state");
    const expected = authStateFromRequest(req);
    if (!timingSafeState(state, expected)) throw new ConsoleAuthError(400, "invalid_auth_state", "AeroVista sign-in state did not match this browser session.");
    const code = url.searchParams.get("code");
    if (!code) throw new ConsoleAuthError(400, "missing_handoff_code", "AeroVista sign-in did not return a handoff code.");

    let exchanged;
    let resolved;
    try {
      exchanged = await adapter.auth.exchangeHandoff(code);
      if (typeof exchanged?.sessionToken !== "string" || exchanged.sessionToken.length < 12) {
        throw new ConsoleAuthError(503, "handoff_invalid_response", "AeroVista returned an invalid handoff response.");
      }
      resolved = await adapter.auth.resolveSession(exchanged.sessionToken);
    } catch (error) {
      throw mapAdapterFailure(error, "handoff");
    }

    if (!resolved?.authenticated || typeof resolved.identityId !== "string" || resolved.identityId.length < 4) {
      throw new ConsoleAuthError(401, "handoff_rejected", "AeroVista did not resolve an authenticated identity for this handoff.");
    }

    const local = issueBrowserSession({ identityId: resolved.identityId, upstreamToken: exchanged.sessionToken }, config);
    const destination = new URL(safeNext(url.searchParams.get("next") || "/", config), config.auth.appOrigin);
    destination.searchParams.set("signed_in", "1");
    return {
      status: 302,
      location: `${destination.pathname}${destination.search}`,
      cookies: [browserSessionCookie(local, config), clearAuthStateCookie(config)],
    };
  }

  function localSession(req) {
    if (!config.auth.enabled || !config.auth.browserSessionSecret || config.auth.browserSessionSecret.length < 32) return null;
    return browserSessionFromRequest(req, config);
  }

  async function resolveSession(req) {
    ensureReady(config);
    const local = localSession(req);
    if (!local) return { authenticated: false, identityId: null, expiresAt: null };
    try {
      const resolved = await adapter.auth.resolveSession(local.upstreamToken);
      if (!resolved?.authenticated || typeof resolved.identityId !== "string" || resolved.identityId !== local.identityId) {
        throw new ConsoleAuthError(401, "identity_rejected", "AeroVista Identity session is no longer authenticated.");
      }
      return { authenticated: true, identityId: resolved.identityId, expiresAt: resolved.expiresAt || null };
    } catch (error) {
      throw mapAdapterFailure(error, "identity");
    }
  }

  async function checkCapability(req, { capability, resourceType = null, resourceId = null }) {
    if (!capability || typeof capability !== "string") throw new ConsoleAuthError(400, "invalid_capability", "A capability is required.");
    const session = await resolveSession(req);
    if (!session.authenticated) throw new ConsoleAuthError(401, "auth_required", "Sign in with AeroVista Identity to use this capability.");
    try {
      const decision = await adapter.identity.can({ identityId: session.identityId, capability, resourceType, resourceId });
      return { allowed: decision?.allowed === true, identityId: session.identityId, capability, resourceType, resourceId };
    } catch (error) {
      throw mapAdapterFailure(error, "authorization");
    }
  }

  async function requireUse(req) {
    const session = await resolveSession(req);
    if (!session.authenticated) throw new ConsoleAuthError(401, "auth_required", "AeroVista Identity sign-in is required.");
    if (!config.auth.enforceUseCapability) return { enforced: false, allowed: true, identityId: session.identityId };
    const decision = await checkCapability(req, { capability: config.auth.useCapability });
    if (!decision.allowed) throw new ConsoleAuthError(403, "capability_required", `Missing required capability: ${config.auth.useCapability}`);
    return { enforced: true, allowed: true, identityId: decision.identityId };
  }

  async function logout(req) {
    const local = localSession(req);
    if (local?.upstreamToken && adapter) {
      try { await adapter.auth.revokeSession(local.upstreamToken); } catch {}
    }
    return { status: 302, location: "/", cookies: [clearBrowserSessionCookie(config), clearAuthStateCookie(config)] };
  }

  async function requirePublish(req, storeId) {
    if (!config.auth.enforcePublishCapability) return { enforced: false, allowed: true };
    const decision = await checkCapability(req, {
      capability: config.auth.publishCapability,
      resourceType: "storefront",
      resourceId: storeId,
    });
    if (!decision.allowed) throw new ConsoleAuthError(403, "capability_required", `Missing required capability: ${config.auth.publishCapability}`);
    return { enforced: true, allowed: true, identityId: decision.identityId };
  }

  return Object.freeze({
    config,
    publicStatus,
    beginAvccLogin,
    beginAccountLogin,
    completeLogin,
    localSession,
    resolveSession,
    checkCapability,
    requireUse,
    logout,
    requirePublish,
  });
}

module.exports = { ConsoleAuthError, callbackUrl, createCatalogConsoleBrowserAuth, safeNext };
