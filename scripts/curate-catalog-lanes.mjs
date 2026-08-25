/**
 * Normalize catalog `collection` labels for the live lanes and hide
 * off-story / Signal-Lab-future SKUs from the shop grid.
 *
 * Run: node scripts/curate-catalog-lanes.mjs
 * Then: npm run sync:store
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const catalogPath = path.join(root, '..', 'store', 'square_products_latest.json');

/** SKUs to hide until their collection world is live or creative is finalized. */
const HIDE_IDS = new Set([
  'echoverse-frost-circuit-pullover-hoodie',
  'echoverse-frost-circuit-tee',
  'echoverse-signal-dial-chest-emblem-hoodie',
  'powder-peaks-8-ball-hoodie-black-white-ink',
  'powder-peaks-8-ball-sticker-black-white-ink',
  'powder-peaks-8-ball-tee-black-white-ink',
  'powder-peaks-v2-premium-pullover-hoodie-black',
  'lumina-premium-mid-weight-hoodie',
  'holographic-stickers',
  'aerovista-skyline-drone-crest-sticker',
  'founders-mark-full-zip-hoodie',
  'neon-billygoat-pullover-hoodie',
  'night-ranger-bear-pullover-hoodie',
  'observer-eye-sigel-pullover-hoodie-black-w-blue-print',
  'aerovista-wave-mark-full-zip-hoodie-white',
  'aerovista-wave-mark-zip-hoodie-white',
  'aerovista-retro-trucker-hat-orbit-a-gray',
  'aerovista-apex-mark-draft-series-s01-sticker',
  'aerovista-apex-pattern-hoodie',
]);

/** Correct catalog image filenames (Square export sometimes shares wrong assets). */
const IMAGE_BY_ID = {
  'architect-built-different-hoodie-black': 'Architect Built Different Hoodie.png',
};

/** Per-product collection overrides (canonical lane labels). */
const COLLECTION_BY_ID = {
  'aerovista-shadow-pattern-hoodie': 'Shadow Wear',
  'aerovista-shadow-pattern-long-sleeve-tee': 'Shadow Wear',
  'aerovista-apex-pattern-bomber-jacket': 'Apex Pattern',
  'aerovista-apex-pattern-hoodie': 'Apex Pattern',
  'aerovista-apex-pattern-print-swimsuit-one-piece': 'Apex Pattern',
  'aerovista-apex-pattern-skater-dress': 'Apex Pattern',
  'men-s-ghost-shorts': 'Shadow Wear',
  'shadow-pants': 'Shadow Wear',
  'shadow-wear-ghost-ridge': 'Shadow Wear',
  'aerovista-apex-camo-flexfit-hat': 'apex',
  'aerovista-premium-embroidered-hat-black-cap-with-signature-apex-mark': 'apex',
  'aerovista-apex-signal-sweatshirt': 'apex',
  'neck-gaiter-crypt-tech-gray': 'apex',
  'neck-gaiter-crypt-tech-orange': 'apex',
  'neck-gaiter-crypt-tech-red': 'apex',
  'architect-field-issue-tee-ash': 'Draft Series',
  'architect-field-issue-tee-black': 'Draft Series',
  'architect-built-different-hoodie-black': 'Draft Series',
  'aerovista-apex-mesh-trucker-cap': 'Draft Series',
  'docklife-drip-osprey-rope-cap': 'DockLife',
  'osprey-rope-cap': 'DockLife',
};

/** Default mapping from messy export labels → lane label. */
const COLLECTION_ALIASES = {
  apex: 'apex',
  'apex pattern': 'Apex Pattern',
  'shadow wear': 'Shadow Wear',
  shadowwear: 'Shadow Wear',
  'glitch line': 'Glitch Line',
  glitch: 'Glitch Line',
  'draft series': 'Draft Series',
  drafted: 'Draft Series',
  core: 'core',
  division: 'division',
  docklife: 'DockLife',
  'dock life': 'DockLife',
  'dock-life': 'DockLife',
  accessories: 'Accessories',
  accessory: 'Accessories',
  gear: 'Accessories',
  utility: 'Accessories',
  extras: 'Accessories',
  other: 'Accessories',
};

function normalizeCollection(product) {
  const id = (product.id || '').trim();
  if (COLLECTION_BY_ID[id]) return COLLECTION_BY_ID[id];
  const raw = (product.collection || '').trim().toLowerCase();
  if (!raw) return product.collection || '';
  return COLLECTION_ALIASES[raw] || product.collection.trim();
}

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
let hidden = 0;
let relabeled = 0;

for (const p of catalog.products) {
  const id = (p.id || '').trim();
  if (IMAGE_BY_ID[id]) {
    p.image = IMAGE_BY_ID[id];
  }

  if (HIDE_IDS.has(id)) {
    if (p.visibility !== 'hidden') {
      p.visibility = 'hidden';
      hidden++;
    }
    continue;
  }
  const next = normalizeCollection(p);
  const prev = (p.collection || '').trim();
  if (next && next !== prev) {
    p.collection = next;
    relabeled++;
  }

  // Visible shop products must have a lane/collection — leave untagged drops hidden until Console tags them.
  if ((p.visibility || 'visible') !== 'hidden' && !(p.collection || '').trim()) {
    p.visibility = 'hidden';
    hidden++;
  }
}

catalog.meta = catalog.meta || {};
catalog.meta.curationNote =
  'Lanes normalized (Core/Shadow/Apex/Glitch/Architect/DockLife). Untagged visible SKUs hidden until Catalog Console assigns a collection. Future worlds (EchoVerse, Powder Peaks, etc.) stay hidden.';

fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');

const visible = catalog.products.filter((p) => (p.visibility || 'visible') !== 'hidden');
console.log(`[curate] hidden ${hidden} newly, relabeled ${relabeled} collections`);
console.log(`[curate] visible products: ${visible.length} / ${catalog.products.length}`);
