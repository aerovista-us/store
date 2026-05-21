/**
 * Copy catalog console v2 assets → ./public/console for Vite (dev + production).
 * Does not copy Docker files or SOT markdown. Does not touch images.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const overlaySrcPath = path.join(root, 'store', 'storefront_overlay.json');
const overlayBaselinePath = path.join(root, 'console', 'overlay_baseline.js');
const src = path.join(root, 'console');
const dest = path.join(root, 'public', 'console');

/** Keep console offline overlay in sync with the shop — avoids bogus "Unmatched" rows vs catalog baseline. */
function writeOverlayBaselineFromStore() {
  if (!fs.existsSync(overlaySrcPath)) {
    console.warn('[sync:console] store/storefront_overlay.json missing — skip overlay baseline regen.');
    return;
  }
  const data = JSON.parse(fs.readFileSync(overlaySrcPath, 'utf8'));
  const banner = `/**
 * Offline overlay default for Catalog Console v2 (\`loadOverlayBaseline\`).
 * Generated from ../../store/storefront_overlay.json — run npm run sync:console after editing the store overlay.
 * Drift produces "Unmatched" rows when IDs do not appear in your loaded Square export.
 */\n`;
  fs.writeFileSync(overlayBaselinePath, `${banner}window.AV_STOREFRONT_OVERLAY = ${JSON.stringify(data, null, 2)};\n`, 'utf8');
  console.log('[sync:console] wrote console/overlay_baseline.js from store/storefront_overlay.json');
}

writeOverlayBaselineFromStore();

const INCLUDE = new Set([
  'aerovista_catalog_console_v2.html',
  'catalog_baseline.js',
  'overlay_baseline.js',
  'SOT.json',
]);

if (!fs.existsSync(path.join(src, 'aerovista_catalog_console_v2.html'))) {
  console.warn('[sync:console] Missing console/aerovista_catalog_console_v2.html — skipping.');
  process.exit(0);
}

fs.mkdirSync(dest, { recursive: true });
for (const name of INCLUDE) {
  const from = path.join(src, name);
  if (!fs.existsSync(from)) continue;
  fs.copyFileSync(from, path.join(dest, name));
}

console.log('[sync:console]', src, '->', dest, `(${INCLUDE.size} files)`);
