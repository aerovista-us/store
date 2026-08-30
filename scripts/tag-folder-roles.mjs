#!/usr/bin/env node
/** Write static FOLDER_ROLE.md markers on non-generated duplicate trees. */
import { writeFolderRoleMarker, FOLDER_REGISTRY } from './lib/folder-roles.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const STATIC_MARKERS = FOLDER_REGISTRY.filter(
  (e) => !['public/shop/', 'public/console/', 'public/store/', 'dist/'].includes(e.path),
);

for (const entry of STATIC_MARKERS) {
  const rel = entry.path.replace(/\/$/, '');
  writeFolderRoleMarker(root, rel, {
    role: entry.role,
    winner: entry.winner,
    sync: entry.sync,
    note: entry.note,
  });
  console.log('[tag]', entry.role, rel);
}
