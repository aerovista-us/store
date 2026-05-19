/**
 * Audit storefront_overlay.json vs square_products_latest.json.
 * Run: node scripts/audit-storefront-overlay.cjs
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const catalogPath = path.join(root, "store/square_products_latest.json");
const overlayPath = path.join(root, "store/storefront_overlay.json");

const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const overlay = JSON.parse(fs.readFileSync(overlayPath, "utf8"));
const products = catalog.products || [];

const byVar = new Map();
const byId = new Map();
for (const p of products) {
  byId.set(p.id, p);
  for (const v of p.variants || []) {
    if (v.variation_id) {
      byVar.set(String(v.variation_id).trim(), {
        productId: p.id,
        name: p.name,
        visibility: p.visibility,
        price: v.price,
        size: v.size,
        color: v.color,
      });
    }
  }
}

const ladders = overlay.rules?.priceLadders || overlay.operator?.priceLadders || {};
const applyLadders = overlay.rules?.applyPriceLadders === true;

function ladderKeyForCategory(cat) {
  const c = String(cat || "").toLowerCase();
  if (c.includes("hoodie") && c.includes("zip")) return "hoodie_zip";
  if (c.includes("hoodie")) return "hoodie_pullover";
  if (c.includes("tee")) return "tee";
  if (c.includes("hat") || c.includes("cap")) return "trucker_hat";
  if (c.includes("crew")) return "crewneck";
  return "";
}

const issues = {
  placeholderCopy: [],
  staleVariationIds: [],
  hiddenButSquareVisible: [],
  priceLadderDrift: [],
  featuredSlots: [],
};

const PLACEHOLDER_RE = /FULL CUSTOMER-FACING|PLACEHOLDER|TBD/i;

for (const [key, ov] of Object.entries(overlay.overrides || {})) {
  const desc = `${ov.description || ""} ${ov.descriptionShort || ""}`;
  if (PLACEHOLDER_RE.test(desc)) {
    issues.placeholderCopy.push({ key, snippet: desc.slice(0, 80) });
  }
}

for (const [vid, entry] of Object.entries(overlay.itemsByVariationId || {})) {
  const cat = byVar.get(vid);
  if (!cat) {
    if (entry.visible === false) issues.staleVariationIds.push(vid);
    continue;
  }
  if (entry.visible === false && cat.visibility === "visible") {
    issues.hiddenButSquareVisible.push({ vid, name: cat.name });
  }
  if (entry.order != null && entry.visible !== false) {
    issues.featuredSlots.push({
      order: entry.order,
      title: entry.title || cat.name,
      productId: cat.productId,
    });
  }
}

if (applyLadders) {
  for (const p of products.filter((x) => String(x.visibility).toLowerCase() === "visible")) {
    const lk = ladderKeyForCategory(p.category);
    const ladder = lk ? ladders[lk] : null;
    if (!ladder || typeof ladder.base !== "number") continue;
    for (const v of p.variants || []) {
      const sq = typeof v.price === "number" ? v.price : p.price;
      const ladderPrice =
        v.size === "2XL" && typeof ladder["2XL"] === "number"
          ? ladder["2XL"]
          : v.size === "3XL" && typeof ladder["3XL"] === "number"
            ? ladder["3XL"]
            : ladder.base;
      const diff = Math.abs(sq - ladderPrice);
      if (diff > 0.5) {
        issues.priceLadderDrift.push({
          id: p.id,
          name: p.name,
          size: v.size,
          square: sq,
          ladder: ladderPrice,
          diff: +diff.toFixed(2),
        });
      }
    }
  }
}

issues.featuredSlots.sort((a, b) => a.order - b.order);

console.log("=== Storefront overlay audit ===\n");
console.log("applyPriceLadders:", applyLadders, "(false = display uses Square catalog prices)");
console.log("placeholder overrides:", issues.placeholderCopy.length);
console.log("stale hidden variation IDs:", issues.staleVariationIds.length);
console.log("overlay-hidden but Square-visible:", issues.hiddenButSquareVisible.length);
console.log("price ladder drift entries:", issues.priceLadderDrift.length);

if (issues.placeholderCopy.length) {
  console.log("\n--- Placeholder copy ---");
  console.log(JSON.stringify(issues.placeholderCopy, null, 2));
}
if (issues.staleVariationIds.length) {
  console.log("\n--- Stale variation IDs (prune) ---");
  console.log(JSON.stringify(issues.staleVariationIds.slice(0, 15), null, 2));
}
if (issues.featuredSlots.length) {
  console.log("\n--- Featured slots (order) ---");
  console.log(JSON.stringify(issues.featuredSlots, null, 2));
}
if (issues.priceLadderDrift.length) {
  console.log("\n--- Price ladder vs Square (top 10) ---");
  console.log(
    JSON.stringify(
      issues.priceLadderDrift.sort((a, b) => b.diff - a.diff).slice(0, 10),
      null,
      2
    )
  );
}

const exitCode =
  issues.placeholderCopy.length || issues.staleVariationIds.length ? 1 : 0;
process.exit(exitCode);
