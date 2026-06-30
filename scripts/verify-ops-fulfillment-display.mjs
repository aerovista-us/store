/**
 * Verify /api/ops/db exposes fulfillment_status=fulfilled for ops dashboard / order view.
 *
 * Usage:
 *   OPS_TOKEN=... node scripts/verify-ops-fulfillment-display.mjs
 *   node scripts/verify-ops-fulfillment-display.mjs --expect-fixture
 */
const base = (process.argv.find((a) => a.startsWith("http")) || "https://api.aerovista.us").replace(
  /\/$/,
  ""
);
const expectFixture = process.argv.includes("--expect-fixture");
const token = (process.env.OPS_TOKEN || "").trim();
const FIXTURE_SOURCE_ID = "TEST-FULFILLED-OPS-DISPLAY";

if (!token) {
  console.error("Set OPS_TOKEN to call /api/ops/db");
  process.exit(1);
}

const res = await fetch(`${base}/api/ops/db?limit=100`, {
  headers: { "X-Ops-Token": token },
});
if (!res.ok) {
  console.error(`[FAIL] /api/ops/db HTTP ${res.status}`);
  process.exit(1);
}

const data = await res.json();
const orders = Array.isArray(data.orders) ? data.orders : [];
const fulfilled = orders.filter((o) => o.fulfillment_status === "fulfilled");
const fixture = orders.find((o) => o.source_order_id === FIXTURE_SOURCE_ID);

console.log("=== Ops fulfillment display check ===");
console.log(`orders in snapshot: ${orders.length}`);
console.log(`fulfilled count: ${fulfilled.length}`);

if (fulfilled.length < 1) {
  console.error("[FAIL] no order with fulfillment_status=fulfilled in /api/ops/db");
  process.exit(1);
}

const sample = fulfilled[0];
console.log(
  `[ok] fulfilled order visible: id=${sample.id} source=${sample.source_order_id} status=${sample.fulfillment_status}`
);

if (expectFixture) {
  if (!fixture || fixture.fulfillment_status !== "fulfilled") {
    console.error(`[FAIL] fixture order ${FIXTURE_SOURCE_ID} missing or not fulfilled`);
    process.exit(1);
  }
  console.log(`[ok] fixture order ${FIXTURE_SOURCE_ID} displays fulfilled`);
}

console.log("\nAll checks passed");
