/**
 * Write catalog (and optional overlay) into store/, then run static bridge sync.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const defaultRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

function normalizeJson(data) {
  const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  return text.endsWith('\n') ? text : `${text}\n`;
}

function productCount(catalog) {
  const obj = typeof catalog === 'string' ? JSON.parse(catalog) : catalog;
  const list = Array.isArray(obj) ? obj : obj?.products || obj?.items || [];
  return list.length;
}

/**
 * @param {{ root?: string, catalog: object|string, overlay?: object|string|null, runSync?: boolean }} opts
 */
export function deployStoreCatalog(opts) {
  const root = path.resolve(opts.root || defaultRoot);
  const catalogPath = path.join(root, 'store', 'square_products_latest.json');
  const overlayPath = path.join(root, 'store', 'storefront_overlay.json');

  fs.mkdirSync(path.dirname(catalogPath), { recursive: true });
  fs.writeFileSync(catalogPath, normalizeJson(opts.catalog), 'utf8');

  let overlayWritten = false;
  if (opts.overlay != null) {
    fs.writeFileSync(overlayPath, normalizeJson(opts.overlay), 'utf8');
    overlayWritten = true;
  }

  if (opts.runSync !== false) {
    execSync(
      'node scripts/sync-store.mjs && node scripts/sync-console.mjs && node scripts/write-build-source-manifest.mjs',
      { cwd: root, stdio: 'inherit' },
    );
  }

  return {
    ok: true,
    root,
    catalogPath,
    overlayPath: overlayWritten ? overlayPath : null,
    productCount: productCount(opts.catalog),
  };
}
