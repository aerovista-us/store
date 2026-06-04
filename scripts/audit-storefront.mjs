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

let issues = 0;
const log = (level, msg) => {
  if (level === "error") issues++;
  console.log(`[${level}] ${msg}`);
};

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
  "shadow-pants",
  "men-s-ghost-shorts",
  "aerovista-apex-pattern-print-swimsuit-one-piece",
];

console.log("=== Storefront audit ===\n");
console.log(`Catalog: ${products.length} total, ${visible.length} visible\n`);

const missingVariationId = [];
for (const p of visible) {
  for (const v of p.variants || []) {
    if (!(v.variation_id || "").trim()) {
      missingVariationId.push(`${p.id} (${v.size || "?"}/${v.color || "Default"})`);
    }
  }
}
if (missingVariationId.length) {
  log("error", `${missingVariationId.length} visible variant(s) missing Square variation_id (not sellable):`);
  missingVariationId.slice(0, 15).forEach((line) => log("error", `  - ${line}`));
} else {
  log("ok", "All visible variants have Square variation_id");
}

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

const readyKeysPath = path.join(storeDir, "checkout_ready_keys.json");
if (fs.existsSync(readyKeysPath)) {
  const ready = new Set(JSON.parse(fs.readFileSync(readyKeysPath, "utf8")).keys || []);
  const pants = products.find((x) => x.id === "shadow-pants");
  if (pants) {
    const productColor = (pants.color || "").trim() || "Default";
    const missing = (pants.variants || [])
      .map((v) => {
        const vColor = (v.color || "").trim() || productColor;
        const sz = (v.size || "").trim();
        return `${vColor}__${sz}`;
      })
      .filter((sku) => !ready.has(sku));
    if (missing.length) {
      log("warn", `shadow-pants sizes not checkout-ready (hidden in shop): ${missing.join(", ")}`);
    }
    if (ready.has("Default__M")) {
      log("ok", "shadow-pants Default__M is checkout-ready");
    } else {
      log("error", "shadow-pants Default__M missing from checkout_ready_keys.json");
    }
  }
} else {
  log("warn", "checkout_ready_keys.json missing — run npm run audit:checkout-keys");
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
  ["featured drop tiles", /dropPiece__thumb/],
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
