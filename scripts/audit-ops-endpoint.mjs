/**
 * Verify /api/ops/db auth on the payment API (fail closed before live ops).
 *
 * Usage:
 *   node scripts/audit-ops-endpoint.mjs
 *   OPS_TOKEN=... node scripts/audit-ops-endpoint.mjs
 *   node scripts/audit-ops-endpoint.mjs https://api.aerovista.us
 */
const base = (process.argv[2] || "https://api.aerovista.us").replace(/\/$/, "");
const url = `${base}/api/ops/db`;
const token = (process.env.OPS_TOKEN || "").trim();

const results = [];

async function probe(label, headers = {}) {
  const res = await fetch(url, { headers, redirect: "follow" });
  let body = "";
  try {
    body = await res.text();
  } catch {
    body = "";
  }
  let json = null;
  try {
    json = body ? JSON.parse(body) : null;
  } catch {
    json = null;
  }
  return { label, status: res.status, body, json };
}

function pass(label, detail) {
  results.push({ ok: true, label, detail });
  console.log(`[ok] ${label}: ${detail}`);
}

function fail(label, detail) {
  results.push({ ok: false, label, detail });
  console.error(`[FAIL] ${label}: ${detail}`);
}

console.log("=== Ops endpoint auth audit ===");
console.log("URL:", url);

const noToken = await probe("no token");
if (noToken.status === 401 || noToken.status === 404) {
  pass("unauthenticated blocked", `HTTP ${noToken.status}`);
} else {
  fail("unauthenticated blocked", `expected 401 or 404, got ${noToken.status}`);
}

const wrongToken = await probe("wrong token", { "X-Ops-Token": "audit-wrong-token" });
if (noToken.status === 404) {
  if (wrongToken.status === 404) {
    pass("wrong token rejected", "endpoint hidden (404, OPS_SECRET unset)");
  } else {
    fail("wrong token rejected", `expected 404 when secret unset, got ${wrongToken.status}`);
  }
} else if (wrongToken.status === 401) {
  pass("wrong token rejected", "HTTP 401");
} else {
  fail("wrong token rejected", `expected 401, got ${wrongToken.status}`);
}

if (token) {
  const authed = await probe("valid token", { "X-Ops-Token": token });
  if (authed.status === 200 && authed.json && Array.isArray(authed.json.orders)) {
    const n = authed.json.orders.length;
    pass("operator access", `HTTP 200, orders=${n}, keys=${Object.keys(authed.json).join(",")}`);
  } else {
    fail("operator access", `expected 200 + orders[], got ${authed.status}`);
  }
} else {
  console.log("[skip] valid token test — set OPS_TOKEN to verify operator access");
}

const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `\n${failed} check(s) failed` : "\nAll checks passed");
process.exit(failed ? 1 : 0);
