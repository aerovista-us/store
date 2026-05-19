/**
 * Fail the build if dist/ contains operator/private artifacts (GitHub Pages is public).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');

const forbiddenDirNames = new Set([
  'console',
  'backend',
  'tools',
  'archive',
  'data_quality_reports',
  'bg_remove_in',
  'bg_remove_out',
  'aerovistacatalog_console',
]);

const forbiddenPathPatterns = [
  /(?:^|\/)console(?:\/|$)/i,
  /(?:^|\/)backend(?:\/|$)/i,
  /(?:^|\/)tools(?:\/|$)/i,
  /(?:^|\/)archive(?:\/|$)/i,
  /aerovista_catalog_console/i,
  /margin_reference/i,
  /operator_margin/i,
  /square_private_config/i,
  /\.env$/i,
  /^1149xbng8c8ze_catalog-.*\.(xlsx|csv|xlsm)$/i,
];

function walk(dir, base = dist) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel = path.relative(base, full).replace(/\\/g, '/');
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results.push(rel);
      results.push(...walk(full, base));
    } else {
      results.push(rel);
    }
  }
  return results;
}

if (!fs.existsSync(dist)) {
  console.error('[audit-pages] dist/ does not exist');
  process.exit(1);
}

const hits = [];
for (const rel of walk(dist)) {
  const norm = rel.replace(/\\/g, '/');
  const segments = norm.split('/');
  if (segments.some((s) => forbiddenDirNames.has(s.toLowerCase()))) {
    hits.push(rel);
    continue;
  }
  if (forbiddenPathPatterns.some((re) => re.test(norm))) {
    hits.push(rel);
  }
}

// Vite/React operator shell must not ship on public Pages
const assetsDir = path.join(dist, 'assets');
if (fs.existsSync(assetsDir)) {
  for (const name of fs.readdirSync(assetsDir)) {
    if (/^index-[a-z0-9]+\.js$/i.test(name)) {
      hits.push(`assets/${name} (React bundle — public build must be shop-only)`);
    }
  }
}

if (hits.length) {
  console.error('[audit-pages] Public Pages build contains forbidden paths:');
  for (const hit of [...new Set(hits)].sort()) console.error(`  - ${hit}`);
  process.exit(1);
}

console.log('[audit-pages] Public Pages audit passed.');
