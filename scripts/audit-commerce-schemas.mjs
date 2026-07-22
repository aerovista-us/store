import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { normalizeGearCatalog } from "./lib/normalize-gear-catalog.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const schemaPaths = {
  store: "schemas/store-config.schema.json",
  catalog: "schemas/catalog.schema.json",
  providerMappings: "schemas/provider-mappings.schema.json",
  merchandising: "schemas/merchandising.schema.json",
  media: "schemas/media-manifest.schema.json"
};

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validators = Object.fromEntries(
  Object.entries(schemaPaths).map(([name, schemaPath]) => [name, ajv.compile(readJson(schemaPath))])
);

let failures = 0;
function check(label, condition, detail = "") {
  if (condition) {
    console.log(`[ok] ${label}`);
    return;
  }
  failures += 1;
  console.error(`[error] ${label}${detail ? `: ${detail}` : ""}`);
}

function validate(label, validator, value) {
  const valid = validator(value);
  const detail = valid ? "" : ajv.errorsText(validator.errors, { separator: "; " });
  check(label, valid, detail);
  return valid;
}

function optionIntegrity(catalog) {
  return catalog.products.every((product) => {
    const groups = new Map(product.optionGroups.map((group) => [group.id, new Set(group.values.map((value) => value.id))]));
    if (groups.size !== product.optionGroups.length) return false;
    if (product.optionGroups.some((group) => new Set(group.values.map((value) => value.id)).size !== group.values.length)) return false;
    return product.variants.every((variant) =>
      Object.entries(variant.options).every(([groupId, valueId]) => groups.get(groupId)?.has(valueId))
    );
  });
}

console.log("=== Store-aware schema and compatibility audit ===\n");

const gearStore = readJson("stores/aerovista-apparel/store.json");
const horizonStore = readJson("stores/horizon/store.fixture.json");
const horizonCatalog = readJson("tests/fixtures/commerce/normalized-horizon-catalog.json");
const horizonMerchandising = readJson("tests/fixtures/commerce/merchandising-horizon.json");
const horizonMedia = readJson("tests/fixtures/commerce/media-manifest-horizon.json");

validate("Gear store configuration validates", validators.store, gearStore);
validate("Horizon store fixture validates", validators.store, horizonStore);
validate("Horizon generic catalog fixture validates", validators.catalog, horizonCatalog);
validate("Horizon merchandising fixture validates", validators.merchandising, horizonMerchandising);
validate("Horizon media fixture validates", validators.media, horizonMedia);
check("Gear and Horizon have distinct store IDs", gearStore.store.id !== horizonStore.store.id);
check("Gear and Horizon have distinct cart namespaces", gearStore.store.cartNamespace !== horizonStore.store.cartNamespace);
check("Gear and Horizon have distinct catalog channels", gearStore.catalog.channel !== horizonStore.catalog.channel);
check("Horizon proves non-apparel options", horizonCatalog.products[0].optionGroups.some((group) => group.id === "dimensions") && !horizonCatalog.products[0].optionGroups.some((group) => group.id === "size"));
check("Horizon variant selections reference declared generic options", optionIntegrity(horizonCatalog));

const legacyGear = readJson("store/square_products_latest.json");
const normalizedOnce = normalizeGearCatalog(legacyGear);
const normalizedTwice = normalizeGearCatalog(legacyGear);
validate("normalized current Gear catalog validates", validators.catalog, normalizedOnce.catalog);
validate("private Square mapping sidecar validates", validators.providerMappings, normalizedOnce.providerMappings);

const sourceProducts = legacyGear.products;
const sourceVariantCount = sourceProducts.reduce((total, product) => total + (product.variants || []).length, 0);
const sourceMappedCount = sourceProducts.reduce(
  (total, product) => total + (product.variants || []).filter((variant) => String(variant.variation_id || "").trim()).length,
  0
);
const normalizedVariantCount = normalizedOnce.catalog.products.reduce((total, product) => total + product.variants.length, 0);
const normalizedVariantIds = normalizedOnce.catalog.products.flatMap((product) => product.variants.map((variant) => variant.id));
const providerVariationIds = normalizedOnce.providerMappings.items.map((item) => item.providerVariationId);
const publicCatalogText = JSON.stringify(normalizedOnce.catalog);
const publicProductIds = new Set(normalizedOnce.catalog.products.map((product) => product.id));
const publicVariantIdSet = new Set(normalizedVariantIds);
const mappingByVariantId = new Map(normalizedOnce.providerMappings.items.map((item) => [item.variantId, item]));
const availableGearVariants = normalizedOnce.catalog.products.flatMap((product) =>
  product.variants.filter((variant) => variant.availability === "available")
);
const collisionGroups = new Map();
for (const item of normalizedOnce.providerMappings.items) {
  const entries = collisionGroups.get(item.compatibilityCartKey) || [];
  entries.push(item);
  collisionGroups.set(item.compatibilityCartKey, entries);
}
const hasProtectedCollision = [...collisionGroups.values()].some((items) =>
  items.length > 1 && new Set(items.map((item) => item.providerVariationId)).size === items.length
);

check("Gear product count is preserved", normalizedOnce.catalog.products.length === sourceProducts.length);
check("Gear variant count is preserved", normalizedVariantCount === sourceVariantCount);
check("all mapped source variations are preserved in private sidecar", normalizedOnce.providerMappings.items.length === sourceMappedCount);
check("normalized public variant IDs are unique", new Set(normalizedVariantIds).size === normalizedVariantIds.length);
check("private provider variation IDs remain unique", new Set(providerVariationIds).size === providerVariationIds.length);
check("Gear variant selections reference declared generic options", optionIntegrity(normalizedOnce.catalog));
check("provider mappings reference public products and variants", normalizedOnce.providerMappings.items.every((item) => publicProductIds.has(item.productId) && publicVariantIdSet.has(item.variantId)));
check("every available Gear variant has a provider mapping", availableGearVariants.every((variant) => mappingByVariantId.has(variant.id)));
check("legacy cart-key collisions remain explicit in the private mapping", hasProtectedCollision);
check("public normalized catalog contains no provider mapping field", !publicCatalogText.includes("providerVariationId") && !publicCatalogText.includes("variation_id"));
check("public normalized catalog contains no Square variation ID values", providerVariationIds.every((id) => !publicCatalogText.includes(id)));
check("all normalized prices use integer minor units", normalizedOnce.catalog.products.every((product) => product.variants.every((variant) => Number.isInteger(variant.price.amount))));
check("hidden Gear products remain unavailable", normalizedOnce.catalog.products.filter((product) => product.visibility === "hidden").every((product) => product.availability === "unavailable"));
check("normalization is deterministic", (() => {
  try {
    assert.deepEqual(normalizedOnce, normalizedTwice);
    return true;
  } catch {
    return false;
  }
})());

console.log(`\n=== Done (${failures} error(s)) ===`);
process.exitCode = failures ? 1 : 0;
