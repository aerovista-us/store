/**
 * One-off repo audit: duplicate trees, build inputs, likely orphans.
 * Run: node scripts/audit-orphans.mjs
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['node_modules', '.git', '.vite', '__pycache__', 'dist', '.cursor']);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function rel(p) {
  return path.relative(root, p).split(path.sep).join('/');
}

function hashFile(p) {
  const h = crypto.createHash('sha256');
  h.update(fs.readFileSync(p));
  return h.digest('hex').slice(0, 16);
}

function dirStats(dir) {
  const files = walk(path.join(root, dir));
  const rels = files.map((f) => rel(f)).filter((r) => r.startsWith(dir + '/'));
  let bytes = 0;
  for (const f of files) bytes += fs.statSync(f).size;
  return { count: rels.length, bytes, rels };
}

function compareTrees(a, b, sample = 40) {
  const aFiles = new Set(dirStats(a).rels.map((r) => r.slice(a.length + 1)));
  const bFiles = new Set(dirStats(b).rels.map((r) => r.slice(b.length + 1)));
  const onlyA = [...aFiles].filter((x) => !bFiles.has(x));
  const onlyB = [...bFiles].filter((x) => !aFiles.has(x));
  const shared = [...aFiles].filter((x) => bFiles.has(x));
  let same = 0;
  let diff = 0;
  const diffSamples = [];
  for (const sub of shared) {
    const ha = hashFile(path.join(root, a, sub));
    const hb = hashFile(path.join(root, b, sub));
    if (ha === hb) same++;
    else {
      diff++;
      if (diffSamples.length < sample) diffSamples.push(sub);
    }
  }
  return { onlyA: onlyA.length, onlyB: onlyB.length, shared: shared.length, same, diff, diffSamples };
}

const BUILD_INPUTS = [
  'package.json',
  'scripts/sync-store.mjs',
  'scripts/sync-console.mjs',
  'scripts/write-build-source-manifest.mjs',
  'store/index.html',
  'src/App.tsx',
  'src/routes/CatalogHome.tsx',
  'src/routes/ConsoleFrame.tsx',
  'src/main.tsx',
  'index.html',
  'vite.config.ts',
  'tsconfig.json',
];

console.log('# AeroVista Store — orphan / duplicate audit\n');

console.log('## Build-critical files at repo root\n');
for (const f of BUILD_INPUTS) {
  const ok = fs.existsSync(path.join(root, f));
  console.log(`- ${ok ? 'OK' : 'MISSING'} \`${f}\``);
}

console.log('\n## Console v2\n');
console.log(`- \`console/aerovista_catalog_console_v2.html\`: ${fs.existsSync(path.join(root, 'console/aerovista_catalog_console_v2.html'))}`);
console.log(`- \`public/console/\` (after sync:console): ${fs.existsSync(path.join(root, 'public/console/aerovista_catalog_console_v2.html'))}`);

console.log('\n## Top-level tree sizes\n');
for (const d of ['store', 'public/shop', 'public/console', 'public/store', 'console', 'archive', 'src', 'scripts']) {
  const s = dirStats(d);
  console.log(`- \`${d}/\`: ${s.count} files, ${(s.bytes / 1024 / 1024).toFixed(2)} MB`);
}

console.log('\n## Canonical vs generated copies\n');
const storeVsShop = compareTrees('store', 'public/shop');
console.log('`store/` vs `public/shop/` (sync output):');
console.log(
  `  shared paths: ${storeVsShop.shared}, identical: ${storeVsShop.same}, differ: ${storeVsShop.diff}, only in store: ${storeVsShop.onlyA}, only in public/shop: ${storeVsShop.onlyB}`,
);
if (storeVsShop.diffSamples.length) {
  console.log('  sample differing paths:');
  for (const s of storeVsShop.diffSamples.slice(0, 15)) console.log(`    - ${s}`);
}

const consoleVsArchive = compareTrees('console', 'archive', 20);
console.log('\n`console/` vs `archive/` (root-level console bundle):');
const consoleFiles = walk(path.join(root, 'console')).map(rel);
const archiveRootNames = [
  'aerovista_catalog_console_v2.html',
  'catalog_baseline.js',
  'overlay_baseline.js',
  'server.js',
  'SOT.json',
  'Dockerfile',
  'docker-compose.yml',
];
let consoleInArchive = 0;
for (const name of archiveRootNames) {
  if (fs.existsSync(path.join(root, 'console', name)) && fs.existsSync(path.join(root, 'archive', name))) {
    const same = hashFile(path.join(root, 'console', name)) === hashFile(path.join(root, 'archive', name));
    console.log(`  ${name}: ${same ? 'identical to archive/' : 'DIFFERS from archive/'}`);
    if (same) consoleInArchive++;
  }
}
console.log(`  (${consoleInArchive}/${archiveRootNames.length} named console files match archive/ copies)`);

console.log('\n## Likely safe to treat as non-build (reference / hold)\n');
console.log('- `archive/` — reference only; not in npm run sync:all');
console.log('- `public/shop/`, `public/console/`, `public/store/` — regenerate with `npm run sync:all`');
console.log('- `store/img/` — not reorganized by cleanup; curate separately');

console.log('\n## src/ completeness\n');
const srcFiles = walk(path.join(root, 'src')).map(rel);
console.log('Files under `src/`:', srcFiles.join(', ') || '(none)');
const archiveSrc = walk(path.join(root, 'archive/src')).map(rel);
const missingFromRoot = archiveSrc
  .map((r) => r.replace(/^archive\//, ''))
  .filter((r) => r.startsWith('src/') && !fs.existsSync(path.join(root, r)));
if (missingFromRoot.length) {
  console.log('Present in `archive/src` but missing at repo root:');
  for (const m of missingFromRoot) console.log(`  - ${m}`);
}

console.log('\n## store/ duplicate script paths (same basename in root and scripts/)\n');
const storeRoot = fs.readdirSync(path.join(root, 'store')).filter((n) => {
  const p = path.join(root, 'store', n);
  return fs.statSync(p).isFile();
});
const dupScripts = storeRoot.filter((n) => fs.existsSync(path.join(root, 'store/scripts', n)));
for (const n of dupScripts) {
  const a = path.join(root, 'store', n);
  const b = path.join(root, 'store/scripts', n);
  const same = hashFile(a) === hashFile(b);
  console.log(`- ${n}: ${same ? 'identical' : 'DIFFERENT'} (store/ vs store/scripts/)`);
}

console.log('\n## public/shop-only paths (stale sync artifacts?)\n');
const shopOnly = dirStats('public/shop').rels
  .map((r) => r.slice('public/shop/'.length))
  .filter((sub) => !fs.existsSync(path.join(root, 'store', sub)));
for (const s of shopOnly) console.log(`- ${s}`);

console.log('\n## store HTML pages\n');
const storeHtml = dirStats('store').rels.filter((r) => r.endsWith('.html'));
for (const h of storeHtml) console.log(`- \`${h}\``);

console.log('\n## store/img not referenced in catalog JSON (basename search)\n');
let catalogBlob = '';
for (const j of ['store/square_products_latest.json', 'store/storefront_overlay.json']) {
  const p = path.join(root, j);
  if (fs.existsSync(p)) catalogBlob += fs.readFileSync(p, 'utf8');
}
const imgFiles = walk(path.join(root, 'store/img')).filter((f) => /\.(png|jpe?g|webp|svg|gif)$/i.test(f));
const unrefImg = imgFiles.filter((f) => !catalogBlob.includes(path.basename(f)));
console.log(`- ${imgFiles.length} images under store/img/, ${unrefImg.length} basenames absent from square_products + overlay JSON`);
for (const f of unrefImg.slice(0, 20).map(rel)) console.log(`  - ${f}`);

console.log('\n## Root Dockerfile deps\n');
for (const f of ['nginx/default.conf', 'index.html', 'vite.config.ts']) {
  console.log(`- ${fs.existsSync(path.join(root, f)) ? 'OK' : 'MISSING'} \`${f}\` (archive has: ${fs.existsSync(path.join(root, 'archive', f)) || fs.existsSync(path.join(root, 'archive/nginx', path.basename(f)))})`);
}

console.log('\n## npm scripts → script files\n');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const scriptRefs = Object.values(pkg.scripts || {})
  .flatMap((s) => [...String(s).matchAll(/scripts\/[\w.-]+/g)] ?? [])
  .map((m) => m[0]);
const scriptFiles = walk(path.join(root, 'scripts')).map(rel);
const unusedScripts = scriptFiles.filter((f) => f.startsWith('scripts/') && f.endsWith('.mjs') || f.endsWith('.cjs')).filter((f) => {
  const base = path.basename(f);
  return !scriptRefs.some((r) => r.includes(base));
});
console.log('Referenced by package.json:', [...new Set(scriptRefs)].join(', '));
console.log('Script files not referenced in package.json scripts:');
for (const u of unusedScripts) console.log(`  - ${u}`);

console.log('\nDone.\n');
