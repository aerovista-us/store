/**
 * Remove operator/private paths from dist/ before GitHub Pages publish.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');

const removeTargets = [
  'console',
  'AeroVista_Catalog_Console',
  'backend',
  'tools',
  'archive',
  'docs',
  'store',
  'assets',
  'docs/operator',
  'data_quality_reports',
  'bg_remove_in',
  'bg_remove_out',
  'output',
];

for (const target of removeTargets) {
  const full = path.join(dist, target);
  if (fs.existsSync(full)) {
    fs.rmSync(full, { recursive: true, force: true });
    console.log(`[strip-pages] Removed: ${target}/`);
  }
}

const forbiddenFiles = [
  '.env',
  'square_private_config.json',
  'margin_reference.json',
  'operator_margin_ladders.json',
  'aerovista_catalog_console_v2.html',
];

function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walkFiles(full, out);
    else out.push(full);
  }
  return out;
}

for (const file of walkFiles(dist)) {
  const base = path.basename(file);
  if (forbiddenFiles.includes(base)) {
    fs.rmSync(file, { force: true });
    console.log(`[strip-pages] Removed file: ${path.relative(dist, file)}`);
  }
}

// Root-level operator exports (dated catalog xlsx/csv) must not ship on Pages
for (const name of fs.readdirSync(dist)) {
  const full = path.join(dist, name);
  if (fs.statSync(full).isFile() && /\.(xlsx|csv|xlsm)$/i.test(name)) {
    fs.rmSync(full, { force: true });
    console.log(`[strip-pages] Removed export: ${name}`);
  }
}

console.log('[strip-pages] Done.');
