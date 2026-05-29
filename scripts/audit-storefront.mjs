/**
 * Storefront polish audit — catalog lanes, images, featured drop IDs.
 * Run: node scripts/audit-storefront.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const storeDir = path.join(root, "..", "store");
const imgDir = path.join(storeDir, "img");

const catalog = JSON.parse(
  fs.readFileSync(path.join(storeDir, "square_products_latest.json"), "utf8")
);
const products = catalog.products || [];
const visible = products.filter((p) => (p.visibility || "visible") !== "hidden");

const COLLECTION_ALIASES = {
  apex: "apex",
  "apex pattern": "apex pattern",
  "shadow wear": "shadow wear",
  shadowwear: "shadow wear",
  "glitch line": "glitch line",
  glitch: "glitch line",
  "draft series": "draft series",
  drafted: "draft series",
  core: "core",
  division: "division",
};
const LANES = {
  core: [/^core$/, /^division$/],
  shadow: [/^shadow wear$/, /^apex pattern$/],
  apex: [/^apex$/],
  glitch: [/^glitch line$/],
  architect: [/^draft series$/, /^architect$/],
};

function normCollection(c) {
  const raw = String(c || "").trim().toLowerCase();
  return COLLECTION_ALIASES[raw] || raw;
}

function laneFor(p) {
  const c = normCollection(p.collection);
  for (const [id, patterns] of Object.entries(LANES)) {
    if (c && patterns.some((re) => re.test(c))) return id;
  }
  return null;
}

const featuredIds = [
  "shadow-wear-ghost-ridge",
  "men-s-ghost-shorts",
  "shadow-pants",
  "aerovista-apex-pattern-print-swimsuit-one-piece",
];

let issues = 0;
const log = (level, msg) => {
  if (level === "error") issues++;
  console.log(`[${level}] ${msg}`);
};

console.log("=== Storefront audit ===\n");
console.log(`Catalog: ${products.length} total, ${visible.length} visible\n`);

// Lane coverage
for (const [id, patterns] of Object.entries(LANES)) {
  const n = visible.filter((p) => {
    const c = normCollection(p.collection);
    return c && patterns.some((re) => re.test(c));
  }).length;
  console.log(`  lane ${id}: ${n} products`);
}
const uncategorized = visible.filter((p) => !laneFor(p));
if (uncategorized.length) {
  log("warn", `${uncategorized.length} visible products outside lanes:`);
  uncategorized.forEach((p) => log("warn", `  - ${p.id} (${p.collection || "(empty)"})`));
} else {
  log("ok", "All visible products map to a collection lane");
}

// Images
const missingImg = [];
const emptyImg = [];
for (const p of visible) {
  const img = String(p.image || "").trim();
  if (!img) {
    emptyImg.push(p.id);
    continue;
  }
  const filePath = path.join(imgDir, img.replace(/^\.\/img\//, "").replace(/^img\//, ""));
  if (!fs.existsSync(filePath)) missingImg.push({ id: p.id, image: img });
}
if (emptyImg.length) {
  log("warn", `${emptyImg.length} visible products with no image field: ${emptyImg.join(", ")}`);
}
if (missingImg.length) {
  log("error", `${missingImg.length} visible products reference missing files:`);
  missingImg.forEach(({ id, image }) => log("error", `  - ${id} → ${image}`));
} else if (!emptyImg.length) {
  log("ok", "All visible catalog images exist under store/img/");
}

// Featured drop IDs (must exist in catalog with visibility)
console.log("");
for (const id of featuredIds) {
  const p = products.find((x) => x.id === id);
  if (!p) log("error", `Featured drop: missing catalog id ${id}`);
  else if ((p.visibility || "visible") === "hidden")
    log("error", `Featured drop: ${id} is hidden`);
  else log("ok", `Featured drop: ${id}`);
}

// Hidden apex pattern hoodie should stay hidden
const apexHoodie = products.find((x) => x.id === "aerovista-apex-pattern-hoodie");
if (apexHoodie && (apexHoodie.visibility || "visible") !== "hidden") {
  log("warn", "aerovista-apex-pattern-hoodie should be hidden but is visible");
} else {
  log("ok", "Apex Pattern Hoodie remains hidden");
}

// Phase A UX markers in storefront HTML
console.log("");
const indexHtml = fs.readFileSync(path.join(storeDir, "index.html"), "utf8");
const uxChecks = [
  ["headerShopBtn", /id="headerShopBtn"/],
  ["size pills", /id="mSizePills"/],
  ["featured drop prices", /dropPiece__price/],
  ["Shop card CTA", /<button class="btn primary" data-quick="[^"]+"[^>]*>Shop<\/button>/],
  ["Add to bag", /id="addToCartBtn">Add to bag/],
];
for (const [label, re] of uxChecks) {
  if (!re.test(indexHtml)) log("error", `UX: missing ${label} in store/index.html`);
  else log("ok", `UX: ${label}`);
}
if (/providerBtn|Quick View/.test(indexHtml)) {
  log("warn", "UX: stale providerBtn or Quick View label still in index.html");
} else {
  log("ok", "UX: no providerBtn / Quick View leftovers");
}

console.log(`\n=== Done (${issues} error(s)) ===`);
process.exit(issues > 0 ? 1 : 0);
