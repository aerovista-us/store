/**
 * Public GitHub Pages build: storefront only (no console, no Vite React shell).
 * Custom domain: gear.aerovista.us (BASE_PATH=/).
 *
 *   npm run build:pages
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const shopPublic = path.join(root, 'public', 'shop');
const productSource = path.join(root, 'store', 'products');

const env = {
  ...process.env,
  BASE_PATH: '/',
  PUBLIC_SITE_MODE: 'shop',
  VITE_OPERATOR_MODE: 'false',
};

console.log('[build:pages] PUBLIC_SITE_MODE=shop BASE_PATH=/ (gear.aerovista.us)');

execSync('node scripts/sync-store.mjs', { cwd: root, stdio: 'inherit', env });
execSync('node scripts/write-build-source-manifest.mjs', { cwd: root, stdio: 'inherit', env });

if (!fs.existsSync(path.join(shopPublic, 'index.html'))) {
  console.error('[build:pages] Missing public/shop/index.html after sync:store');
  process.exit(1);
}

if (fs.existsSync(dist)) {
  fs.rmSync(dist, { recursive: true, force: true });
}
fs.mkdirSync(dist, { recursive: true });
fs.cpSync(shopPublic, dist, { recursive: true });

// Catalog gallery URLs use the stable absolute path /store/products/*.
// Publish only tracked product images and manifests; provider ZIP staging and
// completed archives live under public/store/products and are never copied.
if (fs.existsSync(productSource)) {
  const productDist = path.join(dist, 'store', 'products');
  for (const entry of fs.readdirSync(productSource, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('_')) continue;
    const from = path.join(productSource, entry.name);
    const to = path.join(productDist, entry.name);
    fs.mkdirSync(to, { recursive: true });
    for (const file of fs.readdirSync(from, { withFileTypes: true })) {
      if (!file.isFile()) continue;
      if (file.name !== 'manifest.json' && path.extname(file.name).toLowerCase() !== '.webp') continue;
      fs.copyFileSync(path.join(from, file.name), path.join(to, file.name));
    }
  }
}

console.log('[build:pages] Copied public/shop + canonical product galleries → dist/');
