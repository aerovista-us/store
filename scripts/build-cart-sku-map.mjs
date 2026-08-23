/**
 * Build SQUARE_SKU_MAP from square_products_latest.json (visible products only).
 * - Top-level key per Square variationId (always unique)
 * - Colliding cart keys (Default__M) get variationsById nested map
 *
 * Outputs:
 *   store/cart_sku_map.generated.json  { meta, map }
 *   store/backend/sku_map.generated.json flat map for SQUARE_SKU_MAP_FILE
 *
 * Run: node scripts/build-cart-sku-map.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const catalogPath = path.join(root, "..", "store", "square_products_latest.json");
const horizonMapPath = path.join(root, "..", "horizon", "commerce", "square-sku-map.horizon.json");
const horizonCatalogPath = path.join(root, "..", "horizon", "catalog.json");
const outStore = path.join(root, "..", "store", "cart_sku_map.generated.json");
const outBackend = path.join(root, "..", "store", "backend", "sku_map.generated.json");

const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const products = (catalog.products || []).filter(
  (p) => (p.visibility || "visible") !== "hidden"
);

/** @type {Record<string, {name:string,cents:number,variationId:string}>} */
const byVariation = {};
/** @type {Map<string, Array<{name:string,cents:number,variationId:string,productId:string}>>} */
const byCartKey = new Map();

for (const p of products) {
  const name = String(p.name || p.id || "Item").trim();
  const productColor = String(p.color || "").trim() || "Default";
  const productId = String(p.id || "").trim();
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
      productId,
    };
    byVariation[variationId] = meta;
    if (!byCartKey.has(cartKey)) byCartKey.set(cartKey, []);
    byCartKey.get(cartKey).push(meta);
  }
}

/** Flat map for API: variationId keys + cart keys with optional variationsById */
const map = {};

// Every variation id is a first-class key (checkout + fulfillment lookup index)
for (const [vid, meta] of Object.entries(byVariation)) {
  map[vid] = {
    name: meta.name,
    cents: meta.cents,
    variationId: vid,
  };
}

// Cart keys: single product → simple entry; collisions → primary + variationsById
for (const [cartKey, items] of byCartKey.entries()) {
  const variationsById = {};
  for (const item of items) {
    variationsById[item.variationId] = {
      name: item.name,
      cents: item.cents,
      variationId: item.variationId,
    };
  }
  const primary = items[items.length - 1]; // stable: last in catalog order
  const entry = {
    name: primary.name,
    cents: primary.cents,
    variationId: primary.variationId,
  };
  if (items.length > 1) {
    entry.variationsById = variationsById;
  }
  map[cartKey] = entry;
}

// Horizon uses product-specific cart keys so its fine-art variants cannot
// collide with Gear's shared Color__Size keys. Prices and Square variation IDs
// still have to agree with the current Square export before the map is emitted.
let horizonCartKeys = 0;
if (fs.existsSync(horizonMapPath)) {
  const horizonMap = JSON.parse(fs.readFileSync(horizonMapPath, "utf8"));
  const horizonCatalog = JSON.parse(fs.readFileSync(horizonCatalogPath, "utf8"));
  const horizonVariants = new Map(
    (horizonCatalog.products || []).flatMap((product) =>
      (product.variants || [])
        .filter((variant) => variant.squareMapped)
        .map((variant) => [variant.cartKey, variant])
    )
  );
  for (const [cartKey, entry] of Object.entries(horizonMap)) {
    const variationId = String(entry?.variationId || "").trim();
    const cents = Number(entry?.cents);
    const name = String(entry?.name || "").trim();
    if (!cartKey.startsWith("Horizon__") || !variationId || !Number.isInteger(cents) || cents <= 0 || !name) {
      throw new Error(`Invalid Horizon Square map entry: ${cartKey}`);
    }

    const catalogVariant = horizonVariants.get(cartKey);
    if (!catalogVariant || catalogVariant.squareVariationId !== variationId) {
      throw new Error(`Horizon cart key disagrees with horizon/catalog.json: ${cartKey}`);
    }
    if (catalogVariant.priceCents !== cents) {
      throw new Error(
        `Horizon price mismatch for ${cartKey}: map ${cents}, catalog ${catalogVariant.priceCents}`
      );
    }

    map[cartKey] = { name, cents, variationId };
    const existingVariation = map[variationId];
    if (existingVariation && existingVariation.cents !== cents) {
      throw new Error(
        `Square variation price collision for ${variationId}: Gear ${existingVariation.cents}, Horizon ${cents}`
      );
    }
    map[variationId] = existingVariation || { name, cents, variationId };
    horizonCartKeys += 1;
  }
}

const payload = {
  meta: {
    generatedAt: new Date().toISOString(),
    visibleProducts: products.length,
    variationKeys: Object.keys(byVariation).length,
    cartKeys: byCartKey.size,
    topLevelKeys: Object.keys(map).length,
    collidingCartKeys: [...byCartKey.entries()].filter(([, v]) => v.length > 1).length,
    horizonCartKeys,
  },
  map,
};

fs.writeFileSync(outStore, JSON.stringify(payload, null, 2) + "\n");
fs.writeFileSync(outBackend, JSON.stringify(map, null, 2) + "\n");

console.log("Wrote", outBackend);
console.log("  variations:", payload.meta.variationKeys);
console.log("  cart keys:", payload.meta.cartKeys);
console.log("  colliding cart keys:", payload.meta.collidingCartKeys);
console.log("  Horizon cart keys:", payload.meta.horizonCartKeys);
console.log("  top-level map keys:", payload.meta.topLevelKeys);
