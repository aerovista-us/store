const crypto = require("crypto");

class AeroCoreAdapterError extends Error {
  constructor(message, { status = 500, code = null, correlationId = null, body = null } = {}) {
    super(message);
    this.name = "AeroCoreAdapterError";
    this.status = status;
    this.code = code;
    this.correlationId = correlationId;
    this.body = body;
  }
}

function normalizeOrigin(value) {
  return String(value || "").replace(/\/+$/, "");
}

function normalizePath(value) {
  const pathname = new URL(String(value || "/"), "https://adapter.invalid").pathname;
  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

function serializeBody(body) {
  if (body === undefined || body === null) return "";
  if (typeof body === "string") return body;
  return JSON.stringify(body);
}

function serviceHmac({ secret, method, path, timestamp, rawBody = "" }) {
  const canonical = `${String(method).toUpperCase()}\n${normalizePath(path)}\n${timestamp}\n${rawBody}`;
  return crypto.createHmac("sha256", secret).update(canonical, "utf8").digest("hex");
}

function buildAccountLoginUrl({ appId, loginUrl, returnTo, state }) {
  if (!appId || !loginUrl || !returnTo || !state) throw new Error("Account login URL requires appId, loginUrl, returnTo, and state");
  const login = new URL(loginUrl);
  login.searchParams.set("client_id", appId);
  login.searchParams.set("return_to", returnTo);
  login.searchParams.set("state", state);
  return login.toString();
}

async function readJsonResponse(response) {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new AeroCoreAdapterError(body?.error || `AeroCore request failed (${response.status})`, {
      status: response.status,
      code: body?.code ?? null,
      correlationId: body?.correlationId ?? response.headers.get("x-correlation-id"),
      body,
    });
  }
  return body;
}

function withTimeout(fetchImpl, timeoutMs) {
  return async (url, init = {}) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetchImpl(url, { ...init, signal: controller.signal });
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new AeroCoreAdapterError("AeroCore request timed out", { status: 504, code: "aerocore_timeout" });
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  };
}

function createServerAppAdapter({ appId, identityGatewayOrigin = "https://identity-api.aerovista.us", identityGatewaySecret, services = [], credentials = {}, timeoutMs = 2500, fetchImpl = fetch, now = () => new Date() }) {
  if (!appId) throw new Error("AeroCore adapter requires appId");
  if (!identityGatewaySecret) throw new Error("AeroCore adapter requires identityGatewaySecret");

  const serviceMap = new Map();
  serviceMap.set("identity-gateway", {
    id: "identity-gateway",
    baseUrl: normalizeOrigin(identityGatewayOrigin),
    auth: "service-hmac",
    healthPath: "/health",
  });
  for (const service of services) {
    if (!service?.id || !service?.baseUrl) throw new Error("AeroCore service definitions require id and baseUrl");
    serviceMap.set(service.id, { ...service, baseUrl: normalizeOrigin(service.baseUrl) });
  }

  const boundedFetch = withTimeout(fetchImpl, timeoutMs);

  function credentialFor(serviceId) {
    if (serviceId === "identity-gateway") return { secret: identityGatewaySecret, callerId: appId };
    const configured = credentials[serviceId];
    if (!configured) return null;
    return { secret: configured.secret, callerId: configured.callerId || appId };
  }

  async function call(serviceId, requestPath, options = {}) {
    const service = serviceMap.get(serviceId);
    if (!service) throw new Error(`Unknown AeroVista service: ${serviceId}`);
    if (service.auth === "browser-session") throw new Error(`Service '${serviceId}' requires browser-session auth and cannot be called by the server adapter.`);

    const method = String(options.method || (options.body === undefined ? "GET" : "POST")).toUpperCase();
    const normalizedPath = normalizePath(requestPath);
    const url = new URL(normalizedPath, `${normalizeOrigin(service.baseUrl)}/`);
    const rawBody = serializeBody(options.body);
    const headers = new Headers(options.headers || {});
    if (!headers.has("accept")) headers.set("accept", "application/json");
    if (rawBody && !headers.has("content-type")) headers.set("content-type", "application/json");

    if (service.auth === "service-hmac") {
      const credential = credentialFor(serviceId);
      if (!credential?.secret) throw new Error(`No service credential configured for '${serviceId}'.`);
      const timestamp = now().toISOString();
      headers.set("x-av-service", String(credential.callerId).toUpperCase());
      headers.set("x-av-timestamp", timestamp);
      headers.set("x-av-signature", serviceHmac({ secret: credential.secret, method, path: url.toString(), timestamp, rawBody }));
    }

    const { body: _ignoredBody, ...requestOptions } = options;
    const response = await boundedFetch(url, {
      ...requestOptions,
      method,
      headers,
      ...(rawBody ? { body: rawBody } : {}),
    });
    return readJsonResponse(response);
  }

  return Object.freeze({
    appId,
    auth: Object.freeze({
      exchangeHandoff(code) {
        return call("identity-gateway", "/v1/handoff/exchange", { method: "POST", body: { code } });
      },
      resolveSession(sessionToken) {
        return call("identity-gateway", "/v1/session/resolve", { method: "POST", body: { sessionToken } });
      },
      revokeSession(sessionToken) {
        return call("identity-gateway", "/v1/session/revoke", { method: "POST", body: { sessionToken } });
      },
    }),
    identity: Object.freeze({
      can({ identityId, capability, resourceType = null, resourceId = null }) {
        return call("identity-gateway", "/v1/authorization/check", {
          method: "POST",
          body: { identityId, capability, resourceType, resourceId },
        });
      },
    }),
    services: Object.freeze({
      call,
      health(serviceId = "identity-gateway") {
        const service = serviceMap.get(serviceId);
        if (!service) throw new Error(`Unknown AeroVista service: ${serviceId}`);
        return call(serviceId, service.healthPath || "/health", { method: "GET" });
      },
    }),
  });
}

module.exports = {
  AeroCoreAdapterError,
  buildAccountLoginUrl,
  createServerAppAdapter,
  normalizeOrigin,
  normalizePath,
  serviceHmac,
};
