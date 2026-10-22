const { createServerAppAdapter } = require("./aerocore-app-adapter");

const DEFAULT_APP_ID = "catalog-console";
const DEFAULT_IDENTITY_GATEWAY = "https://identity-api.aerovista.us";
const DEFAULT_ACCOUNT_LOGIN = "https://account.aerocoreos.com/login";
const DEFAULT_APP_ORIGIN = "https://store-console.aerocoreos.com";
const DEFAULT_AVCC_HANDOFF_START = "https://avcc.aerocoreos.com/api/auth/handoff/start";

function boolEnv(value, fallback = false) {
  if (value == null || String(value).trim() === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

function intEnv(value, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (value == null || String(value).trim() === "") return fallback;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) return fallback;
  return parsed;
}

function buildAeroCoreConfig(env = process.env) {
  return {
    appId: String(env.AEROCORE_APP_ID || DEFAULT_APP_ID).trim(),
    identityGatewayOrigin: String(env.AEROCORE_IDENTITY_GATEWAY_ORIGIN || DEFAULT_IDENTITY_GATEWAY).trim().replace(/\/+$/, ""),
    identityGatewaySecret: String(env.AEROCORE_IDENTITY_GATEWAY_SECRET || "").trim(),
    timeoutMs: intEnv(env.AEROCORE_ADAPTER_TIMEOUT_MS, 2500, { min: 250, max: 15_000 }),
    auth: Object.freeze({
      enabled: boolEnv(env.AEROCORE_AUTH_ENABLED, false),
      enforceUseCapability: boolEnv(env.AEROCORE_ENFORCE_USE_CAPABILITY, false),
      enforcePublishCapability: boolEnv(env.AEROCORE_ENFORCE_PUBLISH_CAPABILITY, false),
      accountLoginUrl: String(env.AEROCORE_ACCOUNT_LOGIN_URL || DEFAULT_ACCOUNT_LOGIN).trim(),
      avccHandoffStartUrl: String(env.AEROCORE_AVCC_HANDOFF_START_URL || DEFAULT_AVCC_HANDOFF_START).trim(),
      appOrigin: String(env.AEROCORE_APP_ORIGIN || DEFAULT_APP_ORIGIN).trim().replace(/\/+$/, ""),
      browserSessionSecret: String(env.AEROCORE_BROWSER_SESSION_SECRET || "").trim(),
      browserSessionTtlSeconds: intEnv(env.AEROCORE_BROWSER_SESSION_TTL_SECONDS, 900, { min: 60, max: 86_400 }),
      authStateTtlSeconds: intEnv(env.AEROCORE_AUTH_STATE_TTL_SECONDS, 300, { min: 60, max: 900 }),
      useCapability: String(env.AEROCORE_USE_CAPABILITY || "catalog-console.use").trim(),
      publishCapability: String(env.AEROCORE_PUBLISH_CAPABILITY || "catalog-console.publish").trim(),
    }),
  };
}

function createCatalogConsoleAdapter({ env = process.env, fetchImpl, now } = {}) {
  const config = buildAeroCoreConfig(env);
  if (!config.identityGatewaySecret) return null;
  return createServerAppAdapter({
    ...config,
    ...(fetchImpl ? { fetchImpl } : {}),
    ...(now ? { now } : {}),
  });
}

function authReadiness(config = buildAeroCoreConfig()) {
  const missing = [];
  if (!config.identityGatewaySecret) missing.push("identity_gateway_secret");
  if (!config.auth.browserSessionSecret || config.auth.browserSessionSecret.length < 32) missing.push("browser_session_secret");
  if (!config.appId) missing.push("app_id");
  if (!config.auth.appOrigin) missing.push("app_origin");
  if (!config.auth.avccHandoffStartUrl) missing.push("avcc_handoff_start_url");
  return {
    enabled: config.auth.enabled,
    ready: config.auth.enabled && missing.length === 0,
    missing,
  };
}

function publicAeroCoreStatus(env = process.env) {
  const config = buildAeroCoreConfig(env);
  const readiness = authReadiness(config);
  return {
    appId: config.appId,
    configured: Boolean(config.identityGatewaySecret),
    identityGatewayOrigin: config.identityGatewayOrigin,
    timeoutMs: config.timeoutMs,
    auth: {
      enabled: readiness.enabled,
      ready: readiness.ready,
      enforceUseCapability: config.auth.enforceUseCapability,
      enforcePublishCapability: config.auth.enforcePublishCapability,
      appOrigin: config.auth.appOrigin,
      capabilities: { use: config.auth.useCapability, publish: config.auth.publishCapability },
    },
    contract: "aerocore-app-adapter-v0.1",
    runtime: "commonjs-compatibility-bridge",
  };
}

module.exports = {
  DEFAULT_APP_ID,
  authReadiness,
  buildAeroCoreConfig,
  createCatalogConsoleAdapter,
  publicAeroCoreStatus,
};
