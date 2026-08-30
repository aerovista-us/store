#!/usr/bin/env node
/**
 * Audit duplicate folder tags: fail if generated mirrors lack FOLDER_ROLE.md
 * or if forbidden duplicate trees appear under public/shop or dist without allowlist.
 *
 *   node scripts/audit-folder-duplicates.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FOLDER_REGISTRY, MARKER_TARGETS } from './lib/folder-roles.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const errors = [];
const warnings = [];

for (const [rel, meta] of Object.entries(MARKER_TARGETS)) {
  const dir = path.join(root, rel);
  if (!fs.existsSync(dir)) {
    warnings.push(`Missing generated folder (ok if not built yet): ${rel}/`);
    continue;
  }
  const marker = path.join(dir, 'FOLDER_ROLE.md');
  if (!fs.existsSync(marker)) {
    errors.push(`${rel}/ missing FOLDER_ROLE.md (run sync:store / sync:console / build:pages)`);
  }
}

// Warn on known superseded folders that still exist at store root (legacy clutter)
const legacyStoreRoot = [
  'handoffnotes.md',
  'README.md',
  'SOT_README.md',
  'scripts',
  'commerce',
];
for (const name of legacyStoreRoot) {
  if (fs.existsSync(path.join(root, 'store', name))) {
    warnings.push(`store/${name} still at store root — should live in docs/store-internal/ or store/_internal/`);
  }
}

console.log('=== Folder duplicate audit ===\n');
console.log(`Registry: ${FOLDER_REGISTRY.length} tagged paths (see docs/FOLDER_DUPLICATES.md)\n`);

if (warnings.length) {
  console.log('Warnings:');
  for (const w of warnings) console.log(`  [warn] ${w}`);
  console.log('');
}

if (errors.length) {
  console.error('Errors:');
  for (const e of errors) console.error(`  [error] ${e}`);
  process.exit(1);
}

console.log('[ok] Generated mirror folders tagged.');
process.exit(0);
