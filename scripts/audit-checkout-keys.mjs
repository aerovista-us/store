/**
 * Probe live checkout API for each visible catalog variant cart key.
 * Writes store/checkout_ready_keys.json for storefront size filtering.
 *
 * Run: node scripts/audit-checkout-keys.mjs
 * Optional: CHECKOUT_API_BASE=https://api.aerovista.us
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const storeDir = path.join(root, "..", "store");
const apiBase = (process.env.CHECKOUT_API_BASE || "https://api.aerovista.us").replace(/\/$/, "");

const catalog = JSON.parse(
  fs.readFileSync(path.join(storeDir, "square_products_latest.json"), "utf8")
);
const visible = (catalog.products || []).filter(
  (p) => (p.visibility || "visible") !== "hidden"
);

function cartSkuForVariant(p, v) {
  const productColor = (p.color || "").trim() || "Default";
  const vColor = (v.color || "").trim() || productColor;
  const sz = (v.size || "").trim() || "One Size";
  return `${vColor}__${sz}`;
}

const ready = [];
const failures = [];

for (const p of visible) {
  for (const v of p.variants || []) {
    const sku = cartSkuForVariant(p, v);
    const body = JSON.stringify({
      cart: [{ sku, variationId: v.variation_id || "", qty: 1 }],
      currency: "USD",
    });
    const res = await fetch(`${apiBase}/api/square/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    const out = await res.json().catch(() => ({}));
    if (res.ok && out.ok) {
      ready.push(sku);
    } else {
      failures.push({
        id: p.id,
        name: p.name,
        sku,
        variationId: v.variation_id || "",
        error: out.error || `${res.status} ${res.statusText}`,
      });
    }
  }
}

const outPath = path.join(storeDir, "checkout_ready_keys.json");
const payload = {
  meta: {
    updatedAt: new Date().toISOString(),
    apiBase,
    readyCount: ready.length,
    failureCount: failures.length,
  },
  keys: [...new Set(ready)].sort(),
};
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + "\n");

console.log(`=== Checkout key audit (${apiBase}) ===\n`);
console.log(`Ready: ${payload.keys.length}`);
console.log(`Failed: ${failures.length}`);
if (failures.length) {
  const byId = new Map();
  for (const f of failures) {
    if (!byId.has(f.id)) byId.set(f.id, []);
    byId.get(f.id).push(f.sku);
  }
  for (const [id, skus] of byId) {
    console.log(`  ${id}: ${skus.join(", ")}`);
  }
}
console.log(`\nWrote ${outPath}`);
process.exit(failures.length ? 1 : 0);
