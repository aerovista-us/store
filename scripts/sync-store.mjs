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

  // Public GitHub Pages / gear.aerovista.us — storefront files only
  if (process.env.PUBLIC_SITE_MODE === 'shop') {
    if (segments[0] === 'backend') return false;
    if (segments[0] === 'tools') return false;
    if (segments[0] === 'data_quality_reports') return false;
    if (segments[0] === 'output') return false;
    if (segments[0] === 'bg_remove_in' || segments[0] === 'bg_remove_out') return false;
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

console.log('[sync:store]', src, '->', dest, '+ public/store/*.json bridge');
