#!/usr/bin/env node
/**
 * CLI: copy exported catalog JSON into store/ and run sync → public/shop/
 *
 *   npm run deploy:catalog -- ./Downloads/square_products_cleaned_v2.json
 *   npm run deploy:catalog -- --overlay ./storefront_overlay_edited.json ./catalog.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { deployStoreCatalog } from './lib/deploy-store.mjs';

const args = process.argv.slice(2);
let overlayPath = null;
const positional = [];

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--overlay' && args[i + 1]) {
    overlayPath = args[++i];
  } else {
    positional.push(args[i]);
  }
}

const runSync = !positional.includes('--no-sync');
const catalogArg = positional.find((a) => a !== '--no-sync');

if (!catalogArg) {
  console.error('Usage: npm run deploy:catalog -- <catalog.json> [--overlay overlay.json] [--no-sync]');
  process.exit(1);
}

const catalogPath = path.resolve(catalogArg);
if (!fs.existsSync(catalogPath)) {
  console.error('[deploy:catalog] File not found:', catalogPath);
  process.exit(1);
}

const ext = path.extname(catalogPath).toLowerCase();
if (ext === '.xlsx' || ext === '.xls' || ext === '.xlsm') {
  console.error('[deploy:catalog] Wrong file type:', catalogPath);
  console.error('  This path is an Excel workbook, not storefront JSON.');
  console.error('  In Catalog Console v2 → Exports → click "Export storefront JSON" (not "Export clean review CSV").');
  console.error('  Then: npm run deploy:catalog -- "C:\\path\\to\\square_products_cleaned_v2.json"');
  process.exit(1);
}

const raw = fs.readFileSync(catalogPath);
if (raw.length >= 2 && raw[0] === 0x50 && raw[1] === 0x4b) {
  console.error('[deploy:catalog] File looks like a ZIP/Excel document, not JSON:', catalogPath);
  console.error('  Use "Export storefront JSON" from the console, not the review CSV/XLSX.');
  process.exit(1);
}

const catalog = raw.toString('utf8').replace(/^\uFEFF/, '');
if (!catalog.trim().startsWith('{') && !catalog.trim().startsWith('[')) {
  console.error('[deploy:catalog] File does not look like JSON:', catalogPath);
  console.error('  Expected square_products_cleaned_v2.json from Exports → Export storefront JSON.');
  process.exit(1);
}

try {
  JSON.parse(catalog);
} catch (err) {
  console.error('[deploy:catalog] Invalid JSON:', catalogPath);
  console.error(' ', err.message);
  console.error('  If you exported "clean review CSV", open it in Excel only for QA — deploy needs storefront JSON.');
  process.exit(1);
}
let overlay = null;
if (overlayPath) {
  const op = path.resolve(overlayPath);
  if (!fs.existsSync(op)) {
    console.error('[deploy:catalog] Overlay not found:', op);
    process.exit(1);
  }
  overlay = fs.readFileSync(op, 'utf8');
}

const result = deployStoreCatalog({ catalog, overlay, runSync });
console.log('[deploy:catalog] Wrote', result.catalogPath, `(${result.productCount} products)`);
if (result.overlayPath) console.log('[deploy:catalog] Wrote', result.overlayPath);
if (runSync) console.log('[deploy:catalog] Synced store → public/shop');
