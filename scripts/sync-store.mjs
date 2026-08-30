/**
 * Copy ./store (canonical static apparel storefront) → ./public/shop
 * so Vite serves it at /shop/index.html alongside the React shell.
 *
 * Uses an allowlist — only customer-facing HTML/CSS/JS, catalog JSON, and img/js/audio.
 * Operator docs, scripts, commerce snapshots, and backups stay in store/ (or store/_internal/).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isPublicShopPath } from './lib/public-shop-manifest.mjs';
import { writeFolderRoleMarker } from './lib/folder-roles.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'store');
const dest = path.join(root, 'public', 'shop');

if (!fs.existsSync(path.join(src, 'index.html'))) {
  console.warn('[sync:store] Missing store/index.html — skipping.');
  process.exit(0);
}

function shouldCopy(srcPath) {
  const rel = path.relative(src, srcPath);
  if (!rel || rel === '.') return true;
  return isPublicShopPath(rel);
}

fs.mkdirSync(path.dirname(dest), { recursive: true });
if (fs.existsSync(dest)) {
  fs.rmSync(dest, { recursive: true, force: true });
}
fs.cpSync(src, dest, {
  recursive: true,
  filter: (from) => shouldCopy(from),
});

// JSON-only bridge for console v2 fetch paths (/store/*.json in prod; dev uses Vite middleware too).
const bridgeDir = path.join(root, 'public', 'store');
fs.mkdirSync(bridgeDir, { recursive: true });
for (const name of ['square_products_latest.json', 'storefront_overlay.json']) {
  const from = path.join(src, name);
  if (fs.existsSync(from)) {
    fs.copyFileSync(from, path.join(bridgeDir, name));
  }
}

// Product galleries are tracked under store/products and served from the
// stable /store/products/* bridge. Preserve operator-only _incoming and
// _completed folders; neither exists in the tracked canonical product source.
const productSrc = path.join(src, 'products');
const productBridge = path.join(bridgeDir, 'products');
if (fs.existsSync(productSrc)) {
  fs.mkdirSync(productBridge, { recursive: true });
  for (const entry of fs.readdirSync(productSrc, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const from = path.join(productSrc, entry.name);
    const to = path.join(productBridge, entry.name);
    if (fs.existsSync(to)) fs.rmSync(to, { recursive: true, force: true });
    fs.cpSync(from, to, { recursive: true });
  }
}

// Cache-bust storefront scripts so hard refresh picks up SVG/CSS/JS edits after sync.
const indexPath = path.join(dest, 'index.html');
if (fs.existsSync(indexPath)) {
  const v = Date.now().toString(36);
  let html = fs.readFileSync(indexPath, 'utf8');
  html = html.replace(
    /collection-lane-svg\.js(\?[^"']*)?/g,
    `collection-lane-svg.js?v=${v}`,
  );
  html = html.replace(
    /collection-header-svg\.js(\?[^"']*)?/g,
    `collection-header-svg.js?v=${v}`,
  );
  fs.writeFileSync(indexPath, html);
}

writeFolderRoleMarker(root, 'public/shop', {
  role: 'GENERATED_MIRROR',
  winner: 'store/',
  sync: 'npm run sync:store',
  note: 'Allowlisted customer shop copy. Canonical edits in store/.',
});
writeFolderRoleMarker(root, 'public/store', {
  role: 'RUNTIME_BRIDGE',
  winner: 'store/',
  sync: 'npm run sync:store',
  note: 'Catalog JSON and canonical product-image runtime bridge.',
});

console.log('[sync:store]', src, '->', dest, '(allowlist) + public/store runtime bridge');
