import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const catalog = JSON.parse(
  fs.readFileSync(path.join(root, "store/square_products_latest.json"), "utf8")
);
const sellable = JSON.parse(
  fs.readFileSync(path.join(root, "store/checkout_ready_keys.json"), "utf8")
);
const SQUARE_SELLABLE_KEYS = new Set(sellable.keys || sellable);

const items = catalog.products || catalog.items || [];

function productBaseKey(p) {
  const id = (p.id || "").trim();
  if (!id) {
    const name = (p.name || "").trim().toLowerCase().replace(/\s+/g, " ").trim();
    return name || "unknown";
  }
  const color = (p.color || "").trim();
  if (!color) return id;
  const lowered = id.toLowerCase();
  const colorSuffix = "-" + color.toLowerCase().replace(/\s+/g, "-");
  if (lowered.endsWith(colorSuffix)) return id.slice(0, -colorSuffix.length);
  if (/-[a-z0-9]+$/i.test(id)) return id.replace(/-[^-]+$/, "");
  return id;
}

const rows = [];
for (const p of items) {
  const variants = Array.isArray(p.variants) ? p.variants : [];
  const productColor = (p.color || "").trim() || "Default";
  const squareVariationMap = {};
  for (const v of variants) {
    const vColor = (v.color || "").trim() || productColor;
    const sz = (v.size || "").trim() || "One Size";
    const variationId = (v.variation_id || "").trim();
    if (!variationId) continue;
    const cartKey = `${vColor}__${sz}`;
    if (SQUARE_SELLABLE_KEYS.size && !SQUARE_SELLABLE_KEYS.has(cartKey)) continue;
    squareVariationMap[cartKey] = variationId;
  }
  if (!Object.keys(squareVariationMap).length) continue;
  rows.push({ _baseKey: productBaseKey(p), id: p.id, name: p.name, image: p.image });
}

const byKey = {};
for (const r of rows) {
  if (!byKey[r._baseKey]) byKey[r._baseKey] = [];
  byKey[r._baseKey].push(r);
}

const merged = Object.entries(byKey).map(([baseKey, group]) => ({
  baseKey,
  id: group[0].id,
  name: group[0].name,
  image: group[0].image,
  mergedIds: group.map((g) => g.id),
  count: group.length,
}));

console.log("Rows with sellable variants:", rows.length);
console.log("Merged product cards:", merged.length);
console.log("\nGroups with >1 catalog item:");
for (const m of merged.filter((x) => x.count > 1)) {
  console.log(`  name: ${m.name}`);
  console.log(`  baseKey: ${m.baseKey.slice(0, 80)}`);
  console.log(`  ids (${m.count}):`, m.mergedIds.join(", "));
  console.log(`  image: ${m.image}`);
  console.log("");
}

// Simulate resolveProduct for featured drop ids
const featuredIds = [
  "shadow-wear-ghost-ridge",
  "shadow-pants",
  "men-s-ghost-shorts",
  "aerovista-apex-pattern-print-swimsuit-one-piece",
];
const PRODUCTS = merged.map((m) => ({ id: m.id, name: m.name, image: m.image }));

function resolveProduct(id) {
  if (!id) return null;
  const key = String(id).trim();
  let p = PRODUCTS.find((x) => x.id === key);
  if (p) return p;
  const norm = key.toLowerCase().replace(/-/g, " ").replace(/\s+/g, " ").trim();
  return (
    PRODUCTS.find(
      (x) =>
        x.id === norm ||
        x.name.toLowerCase().replace(/\s+/g, " ").trim() === norm
    ) || null
  );
}

console.log("\nFeatured drop resolveProduct:");
for (const id of featuredIds) {
  const p = resolveProduct(id);
  console.log(`  ${id} -> ${p ? p.id + " / " + p.name : "NULL"}`);
}
