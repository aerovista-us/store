/**
 * Remove operator/private paths from dist/ before GitHub Pages publish.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isForbiddenPublicArtifact } from './lib/public-shop-manifest.mjs';

const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');

const removeTargets = [
  'console',
  'AeroVista_Catalog_Console',
  'backend',
  'tools',
  'archive',
  'docs',
  'assets',
  'docs/operator',
  'data_quality_reports',
  'bg_remove_in',
  'bg_remove_out',
  'output',
  '_internal',
  'scripts',
  'commerce',
];

for (const target of removeTargets) {
  const full = path.join(dist, target);
  if (fs.existsSync(full)) {
    fs.rmSync(full, { recursive: true, force: true });
    console.log(`[strip-pages] Removed: ${target}/`);
  }
}

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
  const rel = path.relative(dist, file).replace(/\\/g, '/');
  if (rel === 'FOLDER_ROLE.md') continue;
  if (isForbiddenPublicArtifact(rel)) {
    fs.rmSync(file, { force: true });
    console.log(`[strip-pages] Removed file: ${rel}`);
  }
}

console.log('[strip-pages] Done.');
