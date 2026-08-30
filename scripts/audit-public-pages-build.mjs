/**
 * Fail the build if dist/ contains operator/private artifacts (GitHub Pages is public).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FORBIDDEN_PUBLIC_PATTERNS,
  isForbiddenPublicArtifact,
  isPublicShopPath,
} from './lib/public-shop-manifest.mjs';

const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');

const forbiddenDirNames = new Set([
  'console',
  'backend',
  'tools',
  'archive',
  'data_quality_reports',
  'bg_remove_in',
  'bg_remove_out',
  'aerovistacatalog_console',
  '_internal',
  'scripts',
  'commerce',
]);

const forbiddenPathPatterns = [
  ...FORBIDDEN_PUBLIC_PATTERNS,
  /(?:^|\/)console(?:\/|$)/i,
  /(?:^|\/)backend(?:\/|$)/i,
  /(?:^|\/)tools(?:\/|$)/i,
  /(?:^|\/)archive(?:\/|$)/i,
  /aerovista_catalog_console/i,
];

function walk(dir, base = dist) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel = path.relative(base, full).replace(/\\/g, '/');
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results.push(rel);
      results.push(...walk(full, base));
    } else {
      results.push(rel);
    }
  }
  return results;
}

if (!fs.existsSync(dist)) {
  console.error('[audit-pages] dist/ does not exist');
  process.exit(1);
}

const hits = [];
for (const rel of walk(dist)) {
  const norm = rel.replace(/\\/g, '/');
  if (!norm) continue;
  if (norm === 'FOLDER_ROLE.md') continue;

  const segments = norm.split('/');
  if (segments.some((s) => forbiddenDirNames.has(s.toLowerCase()))) {
    hits.push(rel);
    continue;
  }
  if (forbiddenPathPatterns.some((re) => re.test(norm))) {
    hits.push(rel);
    continue;
  }
  const isProductGalleryPath = /^store\/products\/[^/]+\/(?:[^/]+\.webp|manifest\.json)$/i.test(norm);
  const isProductGalleryDirectory = /^store(?:\/products(?:\/[^/]+)?)?$/i.test(norm);
  if (!isProductGalleryPath && !isProductGalleryDirectory && !isPublicShopPath(norm)) {
    hits.push(`${rel} (not on public shop allowlist)`);
  }
}

const catalogPath = path.join(dist, 'square_products_latest.json');
if (fs.existsSync(catalogPath)) {
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  for (const product of catalog.products || []) {
    for (const url of [product.image, ...(product.images || [])]) {
      if (typeof url !== 'string' || !url.startsWith('/store/products/')) continue;
      const target = path.join(dist, ...url.split('/').filter(Boolean));
      if (!fs.existsSync(target)) hits.push(`${url} (catalog gallery image missing from Pages artifact)`);
    }
    if (typeof product.image_manifest === 'string' && product.image_manifest.startsWith('/store/products/')) {
      const target = path.join(dist, ...product.image_manifest.split('/').filter(Boolean));
      if (!fs.existsSync(target)) hits.push(`${product.image_manifest} (manifest missing from Pages artifact)`);
    }
  }
}

// Vite/React operator shell must not ship on public Pages
const assetsDir = path.join(dist, 'assets');
if (fs.existsSync(assetsDir)) {
  for (const name of fs.readdirSync(assetsDir)) {
    if (/^index-[a-z0-9]+\.js$/i.test(name)) {
      hits.push(`assets/${name} (React bundle — public build must be shop-only)`);
    }
  }
}

if (hits.length) {
  console.error('[audit-pages] Public Pages build contains forbidden paths:');
  for (const hit of [...new Set(hits)].sort()) console.error(`  - ${hit}`);
  process.exit(1);
}

console.log('[audit-pages] Public Pages audit passed.');
