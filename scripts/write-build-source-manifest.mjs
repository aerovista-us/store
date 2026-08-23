/**
 * Write `public/build-source-manifest.json` after sync so AeroVista Command Center (AVCC)
 * can show gear-store deploy surfaces and deep links.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function exists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

function rel(rootPath, absPath) {
  return path.relative(rootPath, absPath).replace(/\\/g, '/');
}

const publicDir = path.join(root, 'public');
const manifestPath = path.join(publicDir, 'build-source-manifest.json');

const storeSourceAbs = path.join(root, 'store');
const storeSource = exists(path.join(storeSourceAbs, 'index.html')) ? 'store' : null;
const storeDest = path.join(root, 'public', 'shop');
const storeDestIndex = path.join(storeDest, 'index.html');

const consoleSourceAbs = path.join(root, 'console');
const consoleSource = exists(path.join(consoleSourceAbs, 'aerovista_catalog_console_v2.html'))
  ? 'console'
  : null;
const consoleDest = path.join(root, 'public', 'console');
const consoleDestHtml = path.join(consoleDest, 'aerovista_catalog_console_v2.html');

const shopOnly = process.env.PUBLIC_SITE_MODE === 'shop';

const manifest = {
  name: 'AV Store Static Bridge',
  version: 2,
  mode: shopOnly ? 'public-shop-pages' : 'full',
  commandCenter: {
    name: 'AeroVista Command Center',
    abbrev: 'AVCC',
    url: 'https://avcc.aerocoreos.com',
    repo: 'aerovista-command-center',
  },
  services: {
    shop: {
      url: 'https://gear.aerovista.us',
      repo: 'aerovista-store',
      path: 'store/',
      deploy: 'GitHub Pages',
    },
    catalogConsole: {
      url: 'https://store-console.aerocoreos.com',
      repo: 'aerovista-store',
      path: 'console/',
      deploy: 'NXCore Docker',
      note: 'Not AVCC — specialized catalog tool; AVCC links here',
    },
    paymentApi: {
      url: 'https://api.aerovista.us',
      repo: 'aerovista-store',
      path: 'store/backend/',
      deploy: 'NXCore SSH (not in git)',
    },
  },
  store: {
    enabled: exists(storeDestIndex),
    source: storeSource,
    output: 'public/shop',
    catalogBridge: shopOnly ? null : 'public/store',
    pagesDomain: shopOnly ? process.env.PAGES_CNAME || 'gear.aerovista.us' : null,
  },
  console: shopOnly
    ? { enabled: false, note: 'Private only — store-console.aerocoreos.com (not GitHub Pages)' }
    : {
        enabled: exists(consoleDestHtml),
        source: consoleSource,
        output: 'public/console',
      },
  generatedAt: new Date().toISOString(),
};

fs.mkdirSync(publicDir, { recursive: true });
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

console.log('[build-manifest] wrote', rel(root, manifestPath));
