import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const envRaw = fs.readFileSync(path.join(root, "..", "tmp-server-env-sku-map.json"), "utf8").replace(/^\uFEFF/, "");
const envMap = JSON.parse(envRaw.trim());
const catalog = JSON.parse(
  fs.readFileSync(path.join(root, "..", "store", "square_products_latest.json"), "utf8")
);

const byVar = {};
for (const p of catalog.products || []) {
  if ((p.visibility || "visible") === "hidden") continue;
  for (const v of p.variants || []) {
    const vid = String(v.variation_id || "").trim();
    if (vid) byVar[vid] = { name: p.name, variationId: vid, productId: p.id };
  }
}

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

function resolveCurrent(skuMap, sku, variationId) {
  const variationIndex = buildIndex(skuMap);
  let meta = variationIndex[variationId] || null;
  if (!meta && variationId) meta = skuMap[variationId] || null;
  if (!meta) meta = skuMap[sku] || null;
  if (!meta && variationId) meta = byVar[variationId] || null;
  const resolved_vid = String((meta && meta.variationId) || variationId || "").trim();
  return { meta, resolved_vid };
}

const visible = (catalog.products || []).filter((p) => (p.visibility || "visible") !== "hidden");
const misresolved = [];
for (const p of visible) {
  for (const v of p.variants || []) {
    const vid = String(v.variation_id || "").trim();
    const sz = String(v.size || "").trim() || "One Size";
    const vc = String(v.color || p.color || "Default").trim() || "Default";
    const sku = `${vc}__${sz}`;
    if (!vid) continue;
    const r = resolveCurrent(envMap, sku, vid);
    if (r.resolved_vid !== vid) {
      misresolved.push({
        id: p.id,
        sku,
        sent: vid,
        got: r.resolved_vid,
        gotName: r.meta?.name?.slice(0, 50),
      });
    }
  }
}

console.log("Visible variants:", visible.reduce((n, p) => n + (p.variants || []).length, 0));
console.log("Misresolved with production SQUARE_SKU_MAP_JSON:", misresolved.length);
for (const m of misresolved.slice(0, 15)) {
  console.log(`  ${m.id} ${m.sku} sent ${m.sent.slice(0, 10)} → ${m.got.slice(0, 10)} (${m.gotName})`);
}
