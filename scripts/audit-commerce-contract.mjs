/**
 * Regression guard for the protected Gear legacy commerce contract.
 *
 * Offline fixture/source checks are the default and have no external side
 * effects. Pass --live to add read-only Health and Bootstrap checks. This
 * script intentionally never calls Checkout, Webhooks, or protected Ops.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const live = process.argv.includes("--live");
const baseArg = process.argv.find((arg) => arg.startsWith("--base="));
const liveBase = (baseArg?.slice("--base=".length) || "https://gear.aerovista.us").replace(/\/$/, "");
const liveOrigin = new URL(liveBase).origin;

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

let failures = 0;
function check(label, condition) {
  if (condition) {
    console.log(`[ok] ${label}`);
    return;
  }
  failures += 1;
  console.error(`[error] ${label}`);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasRequiredKeys(value, required) {
  return isPlainObject(value) && required.every((key) => Object.hasOwn(value, key));
}

function validateBootstrap(value, label, required) {
  check(`${label}: required response fields`, hasRequiredKeys(value, required));
  check(`${label}: environment is explicit`, ["sandbox", "production"].includes(value.env));
  check(`${label}: appId is present`, typeof value.appId === "string" && value.appId.length > 0);
  check(`${label}: locationId is present`, typeof value.locationId === "string" && value.locationId.length > 0);
  check(`${label}: currency is a three-letter code`, /^[A-Z]{3}$/.test(value.currency || ""));
  check(`${label}: flat shipping uses integer minor units`, Number.isInteger(value.flatShippingCents));
  check(`${label}: promoCodes is an object`, isPlainObject(value.promoCodes));
  check(`${label}: sellableCartKeys is a string array`, Array.isArray(value.sellableCartKeys) && value.sellableCartKeys.every((key) => typeof key === "string"));
}

function validateHealth(value, label, required) {
  check(`${label}: required response fields`, hasRequiredKeys(value, required));
  check(`${label}: ok is boolean`, typeof value.ok === "boolean");
  check(`${label}: Square environment is explicit`, ["sandbox", "production"].includes(value.square_env));
  check(`${label}: credential presence flags are an object`, isPlainObject(value.have));
  check(`${label}: allowed origins is an array`, Array.isArray(value.allowed_origins));
}

console.log("=== Current Gear commerce contract audit ===\n");

const contract = readJson("contracts/current-commerce-api.v0.json");
const routeById = new Map(contract.routes.map((route) => [route.id, route]));
const expectedRoutes = {
  health: ["GET", "/api/health"],
  bootstrap: ["GET", "/api/square/bootstrap"],
  checkout: ["POST", "/api/square/checkout"],
  "square-webhook": ["POST", "/api/webhooks/square"],
  "operations-database": ["GET", "/api/ops/db"],
  "catalog-live": ["GET", "/api/catalog/live"],
  "catalog-meta": ["GET", "/api/catalog/meta"],
  "catalog-publish": ["POST", "/api/catalog/publish"],
  "catalog-sync-from-disk": ["POST", "/api/catalog/sync-from-disk"]
};

check("contract version is pinned", contract.contractVersion === "legacy-gear-v0");
check("contract is scoped to Gear", contract.storeId === "aerovista-apparel");
for (const [id, [method, routePath]] of Object.entries(expectedRoutes)) {
  const route = routeById.get(id);
  check(`${id}: route and method are pinned`, route?.method === method && route?.path === routePath);
}
check("checkout is marked mutating", routeById.get("checkout")?.mutates === true);
check("checkout is excluded from routine live audit", routeById.get("checkout")?.routineLiveAudit === false);
check("webhook is excluded from routine live audit", routeById.get("square-webhook")?.routineLiveAudit === false);
check("ops endpoint is excluded from routine live audit", routeById.get("operations-database")?.routineLiveAudit === false);
check("catalog live initialization is treated as mutating", routeById.get("catalog-live")?.mutates === true);
check("catalog publish requires operations authentication", routeById.get("catalog-publish")?.authentication === "X-Ops-Token");
check("catalog sync requires operations authentication", routeById.get("catalog-sync-from-disk")?.authentication === "X-Ops-Token");
check("catalog mutation routes are excluded from routine live audit", ["catalog-live", "catalog-publish", "catalog-sync-from-disk"].every((id) => routeById.get(id)?.routineLiveAudit === false));

const bootstrapFixture = readJson("tests/fixtures/commerce/legacy-bootstrap-success.json");
const healthFixture = readJson("tests/fixtures/commerce/legacy-health-success.json");
validateBootstrap(bootstrapFixture, "bootstrap fixture", routeById.get("bootstrap").responseRequired);
validateHealth(healthFixture, "health fixture", routeById.get("health").responseRequired);

const catalogFixture = readJson("tests/fixtures/commerce/gear-catalog-edge-cases.json");
const products = catalogFixture.products;
const eligible = products.filter((product) =>
  product.visibility !== "hidden" &&
  typeof product.image === "string" && product.image.length > 0 &&
  product.variants?.some((variant) =>
    typeof variant.variation_id === "string" && variant.variation_id.length > 0 &&
    typeof variant.price === "number" && variant.price >= 0
  )
);
const hidden = products.find((product) => product.id === "fixture-hidden-product");
const missingImage = products.find((product) => product.id === "fixture-missing-image");
const invalidVariant = products.find((product) => product.id === "fixture-invalid-variant");
const eligibleM = eligible.map((product) => {
  const variant = product.variants.find((item) => item.size === "M");
  return {
    productId: product.id,
    cartKey: `${variant.color || product.color || "Default"}__${variant.size || "One Size"}`,
    variationId: variant.variation_id
  };
});

check("catalog fixture contains exactly two eligible edge-case products", eligible.length === 2);
check("hidden product is excluded", !eligible.includes(hidden));
check("product without an image is excluded", !eligible.includes(missingImage));
check("product without a variation ID is excluded", !eligible.includes(invalidVariant));
check("eligible collision fixtures share the compatibility cart key", new Set(eligibleM.map((item) => item.cartKey)).size === 1);
check("eligible collision fixtures retain distinct Square variation IDs", new Set(eligibleM.map((item) => item.variationId)).size === eligibleM.length);

const checkoutCases = readJson("tests/fixtures/commerce/legacy-checkout-cases.json").cases;
const collisionCase = checkoutCases.find((item) => item.id === "two-products-with-colliding-cart-keys");
const collisionCart = collisionCase?.request?.cart || [];
check("checkout fixture covers a two-product collision", collisionCart.length === 2 && new Set(collisionCart.map((item) => item.sku)).size === 1);
check("checkout fixture sends distinct selected variation IDs", new Set(collisionCart.map((item) => item.variationId)).size === collisionCart.length);
check("checkout fixture records server-authoritative prices", collisionCase?.expect?.serverIgnoresClientPrice === true);
check("checkout fixture covers missing and empty carts", ["empty-cart", "missing-cart"].every((id) => checkoutCases.some((item) => item.id === id && item.expect.status === 400)));
check("checkout fixture covers invalid quantity", checkoutCases.some((item) => item.id === "invalid-quantity" && item.expect.status === 400));

const storefront = fs.readFileSync(path.join(root, "store/index.html"), "utf8");
const worker = fs.readFileSync(path.join(root, "cloudflare/gear-api-proxy/src/index.js"), "utf8");
const storedFirstMatches = storefront.match(/storedVid\s*\|\|\s*mappedVid/g) || [];
check("storefront still calls legacy Bootstrap", storefront.includes("/api/square/bootstrap"));
check("storefront still calls legacy Checkout", storefront.includes("/api/square/checkout"));
check("storefront prefers selected variation ID in cart and checkout", storedFirstMatches.length >= 2);
check("mapped cart-key identity cannot override selected variation ID", !/mappedVid\s*\|\|\s*storedVid/.test(storefront));
check("Cloudflare worker scopes proxying to /api", worker.includes('url.pathname.startsWith("/api/")'));
check("Cloudflare worker preserves the upstream API origin", worker.includes('const API_ORIGIN = "https://api.aerovista.us"'));

if (live) {
  console.log(`\n=== Read-only live checks: ${liveBase} ===\n`);
  const requestOptions = {
    cache: "no-store",
    headers: { Origin: liveOrigin }
  };

  try {
    const bootstrapResponse = await fetch(`${liveBase}${routeById.get("bootstrap").path}`, requestOptions);
    check("live Bootstrap returns 200", bootstrapResponse.status === 200);
    check("live Bootstrap permits the storefront origin", bootstrapResponse.headers.get("access-control-allow-origin") === liveOrigin);
    const bootstrap = await bootstrapResponse.json();
    validateBootstrap(bootstrap, "live Bootstrap", routeById.get("bootstrap").responseRequired);
    check("live Bootstrap exposes at least one sellable cart key", bootstrap.sellableCartKeys.length > 0);
  } catch (error) {
    check(`live Bootstrap request completed (${error instanceof Error ? error.message : "unknown error"})`, false);
  }

  try {
    const healthResponse = await fetch(`${liveBase}${routeById.get("health").path}`, requestOptions);
    check("live Health returns 200", healthResponse.status === 200);
    const health = await healthResponse.json();
    validateHealth(health, "live Health", routeById.get("health").responseRequired);
    check("live Health reports ready", health.ok === true);
  } catch (error) {
    check(`live Health request completed (${error instanceof Error ? error.message : "unknown error"})`, false);
  }

  console.log("\n[info] Live audit remained read-only; Checkout, Webhooks, and Ops were not called.");
}

console.log(`\n=== Done (${failures} error(s)) ===`);
process.exitCode = failures ? 1 : 0;
