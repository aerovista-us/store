/**
 * Build SQUARE_SKU_MAP_JSON entries (cartKey Color__Size) from square_products_latest.json.
 * Run: node scripts/build-cart-sku-map.mjs
 * Output: store/cart_sku_map.generated.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const catalogPath = path.join(root, "..", "store", "square_products_latest.json");
const outPath = path.join(root, "..", "store", "cart_sku_map.generated.json");

const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const products = catalog.products || [];
const map = {};

for (const p of products) {
  if ((p.visibility || "visible") === "hidden") continue;
  const name = String(p.name || p.id || "Item").trim();
  const productColor = String(p.color || "").trim() || "Default";
  for (const v of p.variants || []) {
    const size = String(v.size || "").trim() || "One Size";
    const vColor = String(v.color || "").trim() || productColor;
    const cartKey = `${vColor}__${size}`;
    const variationId = String(v.variation_id || "").trim();
    const price = v.price;
    if (!variationId || typeof price !== "number") continue;
    map[cartKey] = {
      name: `${name} (${size})`,
      cents: Math.round(price * 100),
      variationId,
    };
    map[variationId] = map[cartKey];
  }
}

fs.writeFileSync(
  outPath,
  JSON.stringify({ meta: { generatedAt: new Date().toISOString(), keys: Object.keys(map).length }, map }, null, 2) + "\n"
);
console.log(`Wrote ${Object.keys(map).length} entries to ${outPath}`);
