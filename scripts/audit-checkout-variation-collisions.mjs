/**
 * Full checkout collision audit: cart keys shared by many products + API resolution simulation.
 * Run: node scripts/audit-checkout-variation-collisions.mjs
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

function cartKeyForVariant(p, v) {
  const productColor = (p.color || "").trim() || "Default";
  const vColor = (v.color || "").trim() || productColor;
  const sz = (v.size || "").trim() || "One Size";
  return `${vColor}__${sz}`;
}

// Build catalog meta like backend load_catalog_checkout_meta
const byVariation = {};
const byCartKey = {};
const visibleProducts = (catalog.products || []).filter(
  (p) => (p.visibility || "visible") !== "hidden"
);

for (const p of visibleProducts) {
  const name = String(p.name || p.id || "Item").trim();
  const productColor = String(p.color || "").trim() || "Default";
  for (const v of p.variants || []) {
    const size = String(v.size || "").trim() || "One Size";
    const vColor = String(v.color || "").trim() || productColor;
    const cartKey = `${vColor}__${size}`;
    const variationId = String(v.variation_id || "").trim();
    const price = v.price;
    if (!variationId || typeof price !== "number") continue;
    const meta = {
      name: `${name} (${size})`,
      cents: Math.round(price * 100),
      variationId,
      productId: p.id,
    };
    byVariation[variationId] = meta;
    byCartKey[cartKey] = meta; // last writer wins — mirrors backend bug
  }
}

// Cart key collisions
const keyToProducts = new Map();
for (const p of visibleProducts) {
  for (const v of p.variants || []) {
    const vid = String(v.variation_id || "").trim();
    if (!vid) continue;
    const key = cartKeyForVariant(p, v);
    if (!keyToProducts.has(key)) keyToProducts.set(key, []);
    keyToProducts.get(key).push({ id: p.id, name: p.name, variationId: vid });
  }
}

const collisions = [...keyToProducts.entries()]
  .filter(([, items]) => items.length > 1)
  .sort((a, b) => b[1].length - a[1].length);

console.log("=== Checkout variation collision audit ===\n");
console.log(`Visible products: ${visibleProducts.length}`);
console.log(`Cart keys with collisions: ${collisions.length}`);
console.log(`Worst key: ${collisions[0]?.[0]} (${collisions[0]?.[1].length} products)\n`);

// Simulate OLD backend resolve order (sku before catalog variation)
function resolveOld(skuMap, sku, variationId) {
  const variationIndex = {};
  for (const meta of Object.values(skuMap)) {
    const vid = String(meta?.variationId || "").trim();
    if (vid) variationIndex[vid] = meta;
  }
  let meta = variationIndex[variationId] || skuMap[variationId] || null;
  if (!meta) meta = skuMap[sku] || null;
  if (!meta && variationId) meta = byVariation[variationId] || null;
  if (!meta) meta = byCartKey[sku] || null;
  return meta;
}

// Simulate FIXED resolve order
function resolveFixed(sku, variationId) {
  if (variationId) {
    return byVariation[variationId] || null;
  }
  return byCartKey[sku] || null;
}

// Load bootstrap sellable keys from API
let sellableKeys = [];
try {
  const res = await fetch(`${apiBase}/api/square/bootstrap`, { cache: "no-store" });
  const data = await res.json();
  sellableKeys = data.sellableCartKeys || [];
  console.log(`API bootstrap: ${sellableKeys.length} sellableCartKeys\n`);
} catch (e) {
  console.warn("Could not fetch bootstrap:", e.message, "\n");
}

// Probe API checkout for diverse products sharing Default__M
const probeProducts = visibleProducts
  .flatMap((p) =>
    (p.variants || [])
      .filter((v) => String(v.size || "").trim() === "M")
      .map((v) => ({
        id: p.id,
        name: p.name,
        sku: cartKeyForVariant(p, v),
        variationId: String(v.variation_id || "").trim(),
      }))
  )
  .filter((x) => x.variationId && x.sku === "Default__M")
  .slice(0, 5);

console.log("--- Live API checkout probe (Default__M, distinct variationIds) ---");
const probeResults = [];
for (const item of probeProducts) {
  const body = JSON.stringify({
    cart: [{ sku: item.sku, variationId: item.variationId, qty: 1 }],
    currency: "USD",
  });
  try {
    const res = await fetch(`${apiBase}/api/square/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    const out = await res.json().catch(() => ({}));
    probeResults.push({
      product: item.id,
      variationId: item.variationId,
      ok: res.ok && out.ok,
      error: out.error,
    });
  } catch (e) {
    probeResults.push({ product: item.id, variationId: item.variationId, ok: false, error: e.message });
  }
}

for (const r of probeResults) {
  console.log(
    r.ok ? "[ok]" : "[FAIL]",
    r.product,
    r.variationId.slice(0, 12) + "...",
    r.error || ""
  );
}

// Multi-item probe
if (probeProducts.length >= 2) {
  const a = probeProducts[0];
  const b = probeProducts.find((x) => x.variationId !== a.variationId) || probeProducts[1];
  const multiBody = JSON.stringify({
    cart: [
      { sku: a.sku, variationId: a.variationId, qty: 1 },
      { sku: b.sku, variationId: b.variationId, qty: 1 },
    ],
    currency: "USD",
  });
  const res = await fetch(`${apiBase}/api/square/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: multiBody,
  });
  const out = await res.json().catch(() => ({}));
  console.log(
    "\nMulti-item Default__M probe:",
    res.ok && out.ok ? "[ok]" : "[FAIL]",
    a.id,
    "+",
    b.id,
    out.error || out.checkoutUrl?.slice(0, 40) + "..."
  );
}

console.log("\n--- by_cart_key winner for Default__M (catalog load order) ---");
const winner = byCartKey["Default__M"];
if (winner) {
  console.log("Last catalog row wins:", winner.productId, "→", winner.name);
  console.log("variationId:", winner.variationId);
}

console.log("\n--- Resolution simulation (if sku_map has Default__M → glitch hoodie) ---");
const fakeSkuMap = {
  Default__M: {
    name: "AeroVista Apex Glitch Premium Pullover Hoodie | Black (M)",
    cents: 5500,
    variationId: byVariation[probeProducts[0]?.variationId]?.variationId || "T2MH2Z6XNCZC4LPVSXZ7WX4B",
  },
};

if (probeProducts.length >= 2) {
  const shadow = probeProducts.find((p) => p.id.includes("shadow")) || probeProducts[2];
  const old = resolveOld(fakeSkuMap, "Default__M", shadow.variationId);
  const fixed = resolveFixed("Default__M", shadow.variationId);
  console.log(`Product: ${shadow.id}`);
  console.log(`Sent variationId: ${shadow.variationId}`);
  console.log(
    "OLD resolve →",
    old?.productId || old?.name,
    "vid:",
    old?.variationId
  );
  console.log(
    "FIXED resolve →",
    fixed?.productId || fixed?.name,
    "vid:",
    fixed?.variationId
  );
  if (old?.variationId !== shadow.variationId) {
    console.log("\n*** ROOT CAUSE: sku_map[Default__M] wins over client variationId in current resolve order ***");
  }
}

console.log("\n=== Done ===");

function buildIndex(skuMap) {
  const idx = {};
  for (const meta of Object.values(skuMap)) {
    if (!meta || typeof meta !== "object") continue;
    const vid = String(meta.variationId || "").trim();
    if (vid) idx[vid] = meta;
    const nested = meta.variationsById;
    if (nested && typeof nested === "object") {
      for (const [nv, nm] of Object.entries(nested)) {
        if (nm && typeof nm === "object") idx[String(nv).trim()] = nm;
      }
    }
  }
  return idx;
}

function resolveBroken(skuMap, sku, variationId) {
  const idx = buildIndex(skuMap);
  let meta = idx[variationId] || skuMap[variationId] || null;
  if (!meta) meta = skuMap[sku] || null;
  if (!meta && variationId) meta = byVariation[variationId] || null;
  return meta;
}

// Misresolution count vs production env map (if downloaded to tmp-server-env-sku-map.json)
try {
  const envPath = path.join(storeDir, "..", "tmp-server-env-sku-map.json");
  if (fs.existsSync(envPath)) {
    const envRaw = fs.readFileSync(envPath, "utf8").replace(/^\uFEFF/, "");
    const envMap = JSON.parse(envRaw.trim());
    let broken = 0;
    let fixed = 0;
    for (const p of visibleProducts) {
      for (const v of p.variants || []) {
        const vid = String(v.variation_id || "").trim();
        if (!vid) continue;
        const sku = cartKeyForVariant(p, v);
        const b = resolveBroken(envMap, sku, vid);
        const f = resolveFixed(sku, vid);
        const bVid = String(b?.variationId || b?.got || "").trim() || (b === byVariation[vid] ? vid : b?.variationId);
        const brokenVid = String((b && b.variationId) || (b === envMap[sku] ? envMap[sku]?.variationId : "") || "").trim();
        const gotBroken = brokenVid && brokenVid !== vid ? brokenVid : (resolveBroken(envMap, sku, vid)?.variationId !== vid ? resolveBroken(envMap, sku, vid)?.variationId : null);
        if (gotBroken && gotBroken !== vid) broken++;
        else if (f && f.variationId === vid) fixed++;
      }
    }
    console.log("\n--- Production env map simulation (tmp-server-env-sku-map.json) ---");
    console.log("Broken resolve (old order): see simulate-resolve-checkout.mjs for full list");
  }
} catch (e) {
  console.warn("Env map simulation skipped:", e.message);
}
