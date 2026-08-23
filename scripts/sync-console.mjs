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
const catalogSrcPath = path.join(root, 'store', 'square_products_latest.json');
const catalogBaselinePath = path.join(root, 'console', 'catalog_baseline.js');
const src = path.join(root, 'console');
const dest = path.join(root, 'public', 'console');

/** Keep offline catalog baseline aligned with published storefront JSON (Square projection). */
function writeCatalogBaselineFromStore() {
  if (!fs.existsSync(catalogSrcPath)) {
    console.warn('[sync:console] store/square_products_latest.json missing — skip catalog baseline regen.');
    return;
  }
  const data = JSON.parse(fs.readFileSync(catalogSrcPath, 'utf8'));
  const baseline = {
    generated_from: data?.meta?.source || 'store/square_products_latest.json',
    generated_at: new Date().toISOString(),
    tool: 'npm run sync:console',
    note: 'Regenerated from store/square_products_latest.json so Catalog Console boots with the same Square-projected catalog admins deploy.',
    meta: data.meta || {},
    products: data.products || [],
  };
  const banner = `/**
 * Offline catalog default for Catalog Console v2 (\`loadCatalogBaseline\`).
 * Generated from ../../store/square_products_latest.json — run npm run sync:console after Square merge / console deploy.
 */\n`;
  fs.writeFileSync(
    catalogBaselinePath,
    `${banner}window.AV_CATALOG_BASELINE = ${JSON.stringify(baseline, null, 2)};\n`,
    'utf8'
  );
  console.log(
    `[sync:console] wrote console/catalog_baseline.js (${baseline.products.length} products) from store/square_products_latest.json`
  );
}

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

writeCatalogBaselineFromStore();
writeOverlayBaselineFromStore();

const INCLUDE = new Set([
  'aerovista_catalog_console_v2.html',
  'catalog-console-config.js',
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

// So /console/ resolves (Vite otherwise serves repo-root index.html → shop redirect).
const consoleHtml = path.join(src, 'aerovista_catalog_console_v2.html');
const consoleIndex = path.join(dest, 'index.html');
if (fs.existsSync(consoleHtml)) {
  fs.copyFileSync(consoleHtml, consoleIndex);
}

console.log('[sync:console]', src, '->', dest, `(${INCLUDE.size} files + index.html)`);
