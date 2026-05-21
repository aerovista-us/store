/**
 * Copy ./store (canonical static apparel storefront) → ./public/shop
 * so Vite serves it at /shop/index.html alongside the React shell.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'store');
const dest = path.join(root, 'public', 'shop');

if (!fs.existsSync(path.join(src, 'index.html'))) {
  console.warn('[sync:store] Missing store/index.html — skipping.');
  process.exit(0);
}

/** Skip heavy / irrelevant paths under store/ */
function shouldCopy(srcPath) {
  const rel = path.relative(src, srcPath);
  if (!rel || rel === '.') return true;
  const segments = rel.split(path.sep);
  if (segments.includes('node_modules')) return false;
  if (segments.includes('.git')) return false;
  if (segments[0] === 'docs' && segments.length > 1) return false;

  // Never copy operator / server paths into public/shop (Pages, Vite dev, or dist).
  if (segments[0] === 'backend') return false;
  if (segments[0] === 'tools') return false;
  if (segments[0] === 'data_quality_reports') return false;
  if (segments[0] === 'output') return false;
  if (segments[0] === 'bg_remove_in' || segments[0] === 'bg_remove_out') return false;

  // Extra exclusions for public Pages artifact builds
  if (process.env.PUBLIC_SITE_MODE === 'shop') {
    const base = segments[segments.length - 1] || '';
    if (segments.length === 1 && /\.(xlsx|csv|xlsm)$/i.test(base)) return false;
    if (/^HOWTO_|store_health_dashboard|av_gear_shop_pages/i.test(base)) return false;
  }

  return true;
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

console.log('[sync:store]', src, '->', dest, '+ public/store/*.json bridge');
