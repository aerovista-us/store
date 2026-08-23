#!/usr/bin/env node
/**
 * Merge Square Catalog API inventory (SOT) into storefront JSON for Catalog Console.
 *
 * - Variation IDs, SKUs, names, and prices come from Square.
 * - collection / visibility / image / tags / descriptions prefer the prior curated
 *   store/square_products_latest.json when a product matches (by variation_id, then name).
 * - DockLife / Osprey auto-tagged to collection DockLife + category hats.
 * - Horizon art (Canvas / Art / Metal) and services stay hidden for Gear.
 *
 * Usage:
 *   node scripts/merge-square-catalog-to-storefront.mjs
 *   node scripts/merge-square-catalog-to-storefront.mjs --square store/commerce/square-catalog-inventory-2026-08-23.json
 *
 * Afterward: npm run curate:catalog && npm run sync:all
 * Admins adjust lanes/images in console/, then Deploy to store.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function argValue(flag, fallback = '') {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function slug(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'product';
}

function moneyFromCents(amount) {
  if (amount == null || Number.isNaN(Number(amount))) return 0;
  return Math.round(Number(amount)) / 100;
}

function categoryFromSquare(categories, name) {
  const blob = `${(categories || []).join(' ')} ${name || ''}`.toLowerCase();
  if (blob.includes('hoodie')) return 'hoodies';
  if (blob.includes('sweatshirt') || blob.includes('crewneck')) return 'crewnecks';
  if (blob.includes('tee') || blob.includes('t-shirt')) return 'tees';
  if (blob.includes('hat') || blob.includes('cap')) return 'hats';
  if (blob.includes('sticker')) return 'stickers';
  if (blob.includes('neck gaiter') || blob.includes('desk mat') || blob.includes('case') || blob.includes('cooler')) {
    return 'accessories';
  }
  if (blob.includes('bomber') || blob.includes('jacket')) return 'apparel';
  if (blob.includes('canvas') || blob.includes('art') || blob.includes('metal')) return 'art';
  if (blob.includes('utility') || blob.includes('consultation') || blob.includes('rental')) return 'services';
  if (blob.includes('apparel')) return 'apparel';
  return 'apparel';
}

function detectCollection(name, categories) {
  const hay = `${name || ''} ${(categories || []).join(' ')}`.toLowerCase();
  if (hay.includes('docklife') || hay.includes('dock life') || hay.includes('osprey rope')) return 'DockLife';
  if (hay.includes('glitch')) return 'Glitch Line';
  if (hay.includes('draft')) return 'Draft Series';
  if (hay.includes('apex pattern')) return 'Apex Pattern';
  if (hay.includes('shadow')) return 'Shadow Wear';
  if (hay.includes('architect')) return 'Draft Series';
  if (/\bapex\b/.test(hay)) return 'apex';
  if (hay.includes('core') || hay.includes('division')) return 'core';
  if (hay.includes('wave mark')) return 'Wave Mark';
  if (hay.includes('orbit')) return 'Orbit Mark';
  if (hay.includes('powder peaks')) return 'Powder Peaks';
  if (hay.includes('bonsaid')) return 'BONSAID';
  if (hay.includes('vespra') || hay.includes('vespera')) return 'Vespera';
  if (hay.includes('echoverse')) return 'echoverse';
  if (hay.includes('lumina')) return 'Lumina';
  if (hay.includes('canvas') || hay.includes('coeur') || hay.includes('harbor') || hay.includes('fairways') || hay.includes('floating green') || hay.includes('last light') || hay.includes('mahogany') || hay.includes('autumn over') || hay.includes('clock at resort') || hay.includes('road to the lake') || hay.includes('lake cove') || hay.includes('cornerbar') || hay.includes('center clock')) {
    return 'horizon';
  }
  return '';
}

function defaultVisibility(collection, category, name) {
  const hay = `${name || ''} ${collection || ''} ${category || ''}`.toLowerCase();
  if (category === 'art' || collection === 'horizon') return 'hidden';
  if (category === 'services') return 'hidden';
  if (['echoverse', 'Powder Peaks', 'Lumina', 'BONSAID', 'Wave Mark', 'Orbit Mark', 'Vespera', 'goat'].includes(collection)) {
    return 'hidden';
  }
  if (hay.includes('rental') || hay.includes('consultation') || hay.includes('museface') || hay.includes('temp')) {
    return 'hidden';
  }
  return 'visible';
}

function normalizeSize(name) {
  const s = String(name || '').trim();
  return s || 'One Size';
}

const squarePath =
  argValue('--square') ||
  path.join(root, 'store', 'commerce', 'square-catalog-inventory-2026-08-23.json');
const storePath = path.join(root, 'store', 'square_products_latest.json');
const outPath = argValue('--out', storePath);

if (!fs.existsSync(squarePath)) {
  console.error(`[merge-square] missing Square inventory: ${squarePath}`);
  console.error('Run: python scripts/pull-square-catalog.py');
  process.exit(1);
}

const square = JSON.parse(fs.readFileSync(squarePath, 'utf8'));
const prior = fs.existsSync(storePath)
  ? JSON.parse(fs.readFileSync(storePath, 'utf8'))
  : { products: [] };

const priorByVid = new Map();
const priorByName = new Map();
for (const p of prior.products || []) {
  priorByName.set(String(p.name || '').trim().toLowerCase(), p);
  for (const v of p.variants || []) {
    const vid = String(v.variation_id || '').trim();
    if (vid) priorByVid.set(vid, p);
  }
}

let matched = 0;
let added = 0;
const products = [];

for (const item of square.products || []) {
  if (item.isArchived) continue;
  const name = String(item.name || '').trim();
  if (!name) continue;

  const squareVids = (item.variations || [])
    .map((v) => String(v.id || '').trim())
    .filter(Boolean);
  let curated = null;
  for (const vid of squareVids) {
    if (priorByVid.has(vid)) {
      curated = priorByVid.get(vid);
      break;
    }
  }
  if (!curated) curated = priorByName.get(name.toLowerCase()) || null;
  if (curated) matched += 1;
  else added += 1;

  const categories = item.categories || [];
  const category = curated?.category || categoryFromSquare(categories, name);
  let collection =
    curated?.collection ||
    detectCollection(name, categories) ||
    '';
  if (/docklife|osprey rope/i.test(name)) collection = 'DockLife';

  const visibility =
    curated?.visibility ||
    defaultVisibility(collection, category, name);

  const variants = (item.variations || []).map((v) => {
    const price = moneyFromCents(v.price?.amount);
    return {
      size: normalizeSize(v.name),
      color: '',
      sku: v.sku || '',
      price,
      variation_id: v.id || '',
    };
  });
  const price =
    variants.find((v) => v.price > 0)?.price ||
    curated?.price ||
    0;

  const description =
    curated?.description_text ||
    String(item.description || '').trim() ||
    '';

  products.push({
    id: curated?.id || slug(name),
    name,
    color: curated?.color || '',
    category: /docklife|osprey rope/i.test(name) ? 'hats' : category,
    collection,
    visibility,
    price,
    image: curated?.image || '',
    description_text: description,
    description_html:
      curated?.description_html ||
      (description ? `<p>${description.replace(/</g, '&lt;')}</p>` : ''),
    seo_title: curated?.seo_title || name,
    seo_description: curated?.seo_description || description.slice(0, 160),
    tags: Array.isArray(curated?.tags) ? curated.tags : [],
    variants,
    square_item_id: item.id || '',
  });
}

products.sort((a, b) => a.name.localeCompare(b.name));

const out = {
  meta: {
    tool: 'AeroVista Catalog Console v2',
    source: path.basename(squarePath),
    exportedAt: new Date().toISOString(),
    count: products.length,
    squarePulledAt: square.pulledAt || null,
    squareEnv: square.squareEnv || null,
    curationNote:
      'Merged from Square Catalog API (SOT variation IDs/prices). Curated collection/visibility/image retained when matched. DockLife tagged for Osprey Rope Cap. Horizon art + future worlds default hidden. Adjust in Catalog Console, then Deploy to store.',
    priorMatched: matched,
    newlyAdded: added,
  },
  products,
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`, 'utf8');

const dock = products.filter((p) => /docklife|osprey/i.test(p.name) || p.collection === 'DockLife');
const visible = products.filter((p) => p.visibility === 'visible');
console.log(`[merge-square] wrote ${outPath}`);
console.log(`[merge-square] products=${products.length} matched=${matched} added=${added} visible=${visible.length}`);
console.log(`[merge-square] DockLife rows=${dock.length}`);
for (const p of dock) {
  console.log(`  - ${p.id} | ${p.name} | coll=${p.collection} | vis=${p.visibility} | vars=${p.variants.length}`);
}
