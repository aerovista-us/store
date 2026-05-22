/**
 * Production-clean storefront_overlay.json:
 * - Remove placeholder descriptions (use Square catalog text)
 * - Prune stale variation IDs
 * - Fix override keys to sq_<catalogId>
 * - Move margin ladders to operator (presentation-only)
 * - Set rules.applyPriceLadders = false
 *
 * Run: node scripts/clean-storefront-overlay.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const catalogPath = path.join(root, "store/square_products_latest.json");
const overlayPath = path.join(root, "store/storefront_overlay.json");

const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
let overlay = JSON.parse(fs.readFileSync(overlayPath, "utf8"));

const byVar = new Map();
const byId = new Map();
for (const p of catalog.products || []) {
  byId.set(p.id, p);
  for (const v of p.variants || []) {
    if (v.variation_id) byVar.set(String(v.variation_id).trim(), p);
  }
}

const PLACEHOLDER_RE = /FULL CUSTOMER-FACING|PLACEHOLDER|TBD/i;

// --- Prune stale variation entries ---
const itemsByVariationId = { ...(overlay.itemsByVariationId || {}) };
let pruned = 0;
for (const vid of Object.keys(itemsByVariationId)) {
  if (!byVar.has(vid)) {
    delete itemsByVariationId[vid];
    pruned++;
  }
}

// --- Fix glitch_drone overlay titles (hoodie in catalog) ---
for (const [vid, entry] of Object.entries(itemsByVariationId)) {
  const p = byVar.get(vid);
  if (!p || !/glitch.*drone|drone.*glitch/i.test(p.name || p.id)) continue;
  if (/tee/i.test(entry.title || "") && /hoodie/i.test(p.name || p.id || p.category)) {
    entry.title = "AeroVista • Drone Glitch • Pullover Hoodie";
  }
}

// --- Overrides: fix keys + descriptions from catalog ---
const overrides = {};
const legacyOverrides = overlay.overrides || {};
const legacyMap = {
  aerovista_apex_draft_pullover_hoodie: "aerovista-apex-draft-pullover-hoodie",
  aerovista_apex_draft_pullover_hoodie_alt: "aerovista-apex-draft-pullover-hoodie",
  "aerovista_apex-draft_pullover_hoodie": "aerovista-apex-draft-pullover-hoodie",
  aerovista_orbit_trucker_hat: "aerovista-retro-trucker-hat-orbit-a",
};

for (const [key, ov] of Object.entries(legacyOverrides)) {
  const catalogId = legacyMap[key] || key.replace(/^sq_/, "");
  const p = byId.get(catalogId) || byId.get(key.replace(/^sq_/, ""));
  const sqKey = p ? `sq_${p.id}` : key.startsWith("sq_") ? key : `sq_${catalogId}`;

  const next = { ...ov };
  delete next.description;
  if (PLACEHOLDER_RE.test(next.descriptionShort || "")) delete next.descriptionShort;

  if (p) {
    if (!next.collection && p.collection) next.collection = p.collection;
    if (!next.descriptionShort && p.description_text) {
      next.descriptionShort = String(p.description_text).slice(0, 160).trim();
    }
  }
  overrides[sqKey] = next;
}

// --- Operator margins (not used for checkout or display when applyPriceLadders is false) ---
const rules = { ...(overlay.rules || {}) };
const operator = {
  ...(overlay.operator || {}),
  priceLadders: rules.priceLadders || overlay.operator?.priceLadders,
  costByLadder: rules.costByLadder || overlay.operator?.costByLadder,
  fees: rules.fees || overlay.operator?.fees,
  shipBufferCents: rules.shipBufferCents ?? overlay.operator?.shipBufferCents,
  notes:
    "Console/operator reference only. Storefront display and Square checkout use catalog prices unless rules.applyPriceLadders is true.",
};

delete rules.priceLadders;
delete rules.costByLadder;
delete rules.fees;
delete rules.shipBufferCents;

rules.applyPriceLadders = false;
rules.presentationOnly = true;
rules.titleFormat = rules.titleFormat || "";

overlay = {
  ...overlay,
  meta: {
    ...(overlay.meta || {}),
    updatedAt: new Date().toISOString(),
    schemaVersion: 2,
    notes:
      "Presentation layer only. Square catalog is checkout truth. Variation-level visible:false hides storefront cards (intentional curation). Featured order 3–11. applyPriceLadders must stay false unless Square prices are synced to ladders.",
    visibilityPolicy:
      "itemsByVariationId.visible:false hides the whole product card when no variant on that product has visible:true. Prune stale IDs after each catalog export.",
    featuredOrder: "Lower order = higher in featured sort. Slots 3–11 are launch featured; tag:featured also applies.",
    checkoutTruth: "Checkout uses variationId from square_products_latest.json — not overlay prices.",
  },
  rules,
  operator,
  overrides,
  itemsByVariationId,
  itemsByCartKey: overlay.itemsByCartKey || {},
  collections: overlay.collections || [],
  ads: overlay.ads || [],
};

fs.writeFileSync(overlayPath, JSON.stringify(overlay, null, 2) + "\n", "utf8");
console.log("[clean-storefront-overlay] pruned stale IDs:", pruned);
console.log("[clean-storefront-overlay] wrote", overlayPath);
