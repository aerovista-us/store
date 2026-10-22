const crypto = require("crypto");

const VERSION = 1;
const SESSION_COOKIE = "__av_catalog_console_session";
const STATE_COOKIE = "av_catalog_console_auth_state";
const AUDIENCE = "catalog-console-browser";

function parseCookies(header = "") {
  const out = new Map();
  for (const part of String(header).split(";")) {
    const index = part.indexOf("=");
    if (index <= 0) continue;
    out.set(part.slice(0, index).trim(), part.slice(index + 1).trim());
  }
  return out;
}

function secure(config) {
  try {
    return new URL(config.auth.appOrigin).protocol === "https:";
  } catch {
    return true;
  }
}

function encryptionKey(config) {
  const secret = String(config.auth.browserSessionSecret || "");
  if (secret.length < 32) throw new Error("AEROCORE_BROWSER_SESSION_SECRET must be at least 32 characters");
  return crypto.createHmac("sha256", secret).update("catalog-console/browser-session/v1").digest();
}

function seal(payload, config) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(config), iv);
  const plaintext = Buffer.from(JSON.stringify(payload));
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), ciphertext.toString("base64url"), tag.toString("base64url")].join(".");
}

function open(token, config) {
  const [version, iv64, body64, tag64, extra] = String(token || "").split(".");
  if (version !== String(VERSION) || !iv64 || !body64 || !tag64 || extra) return null;
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(config), Buffer.from(iv64, "base64url"));
    decipher.setAuthTag(Buffer.from(tag64, "base64url"));
    const plain = Buffer.concat([decipher.update(Buffer.from(body64, "base64url")), decipher.final()]);
    return JSON.parse(plain.toString("utf8"));
  } catch {
    return null;
  }
}

function issueBrowserSession({ identityId, upstreamToken }, config, now = Date.now()) {
  if (typeof identityId !== "string" || identityId.length < 4) throw new Error("Browser session requires identityId");
  if (typeof upstreamToken !== "string" || upstreamToken.length < 12) throw new Error("Browser session requires upstreamToken");
  const ttlSeconds = config.auth.browserSessionTtlSeconds;
  const issued = Math.floor(now / 1000);
  const payload = {
    v: VERSION,
    aud: AUDIENCE,
    iat: issued,
    exp: issued + ttlSeconds,
    identityId,
    upstreamToken,
  };
  return {
    token: seal(payload, config),
    ttlSeconds,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
  };
}

function browserSessionFromRequest(req, config, now = Date.now()) {
  const token = parseCookies(req.headers?.cookie).get(SESSION_COOKIE);
  if (!token) return null;
  const payload = open(token, config);
  if (!payload || payload.aud !== AUDIENCE || payload.exp * 1000 <= now) return null;
  if (typeof payload.identityId !== "string" || typeof payload.upstreamToken !== "string") return null;
  return payload;
}

function browserSessionCookie(session, config) {
  const attrs = [
    `${SESSION_COOKIE}=${session.token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${session.ttlSeconds}`,
  ];
  if (secure(config)) attrs.push("Secure");
  return attrs.join("; ");
}

function clearBrowserSessionCookie(config) {
  const attrs = [`${SESSION_COOKIE}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (secure(config)) attrs.push("Secure");
  return attrs.join("; ");
}

function authStateCookie(state, config) {
  const attrs = [
    `${STATE_COOKIE}=${encodeURIComponent(state)}`,
    "Path=/auth/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${config.auth.authStateTtlSeconds}`,
  ];
  if (secure(config)) attrs.push("Secure");
  return attrs.join("; ");
}

function authStateFromRequest(req) {
  const value = parseCookies(req.headers?.cookie).get(STATE_COOKIE);
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function clearAuthStateCookie(config) {
  const attrs = [`${STATE_COOKIE}=`, "Path=/auth/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (secure(config)) attrs.push("Secure");
  return attrs.join("; ");
}

module.exports = {
  AUDIENCE,
  SESSION_COOKIE,
  STATE_COOKIE,
  authStateCookie,
  authStateFromRequest,
  browserSessionCookie,
  browserSessionFromRequest,
  clearAuthStateCookie,
  clearBrowserSessionCookie,
  issueBrowserSession,
  parseCookies,
};
