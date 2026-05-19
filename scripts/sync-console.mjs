/**
 * Copy catalog console v2 assets → ./public/console for Vite (dev + production).
 * Does not copy Docker files or SOT markdown. Does not touch images.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'console');
const dest = path.join(root, 'public', 'console');

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
