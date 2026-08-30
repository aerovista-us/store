/**
 * Canonical vs duplicate folder roles for the av-store monorepo.
 * Used by sync/build scripts to write FOLDER_ROLE.md markers and by audit-folder-duplicates.mjs.
 */
import fs from 'node:fs';
import path from 'node:path';

export const FOLDER_REGISTRY = [
  {
    path: 'store/',
    role: 'CANON',
    winner: null,
    deploy: 'gear.aerovista.us (via build:pages)',
    note: 'Canonical Gear storefront source. Edit here only.',
  },
  {
    path: 'public/shop/',
    role: 'GENERATED_MIRROR',
    winner: 'store/',
    sync: 'npm run sync:store',
    note: 'Allowlisted copy for Vite dev and Pages build input. Never edit.',
  },
  {
    path: 'dist/',
    role: 'GENERATED_MIRROR',
    winner: 'public/shop/',
    sync: 'npm run build:pages',
    note: 'GitHub Pages artifact root. Regenerated every CI deploy.',
  },
  {
    path: 'console/',
    role: 'CANON',
    winner: null,
    deploy: 'store-console.aerocoreos.com',
    note: 'Catalog Console v2 source (gitignored in this working copy).',
  },
  {
    path: 'public/console/',
    role: 'GENERATED_MIRROR',
    winner: 'console/',
    sync: 'npm run sync:console',
    note: 'Vite-served console copy; excludes Docker/server-only files.',
  },
  {
    path: 'public/store/',
    role: 'JSON_BRIDGE',
    winner: 'store/',
    sync: 'npm run sync:store',
    note: 'JSON-only bridge (square_products_latest.json, storefront_overlay.json) for /store/ fetch paths.',
  },
  {
    path: 'horizon/',
    role: 'CANON',
    winner: null,
    deploy: 'horizon.aerovista.us',
    note: 'Canonical Horizon storefront. Sanitized artifact via horizon/scripts/.',
  },
  {
    path: 'planning/canvas/',
    role: 'SUPERSEDED',
    winner: 'horizon/',
    note: 'Design provenance + intake evidence. Next/React demo not promoted.',
  },
  {
    path: 'planning/horizon gallary/',
    role: 'SUPERSEDED',
    winner: 'horizon/',
    note: 'Earlier static gallery demo; superseded by horizon/.',
  },
  {
    path: 'planning/horizon-drone-tour/',
    role: 'PROVENANCE',
    winner: 'horizon/',
    note: 'Concept tour demo; not a runtime storefront.',
  },
  {
    path: 'docs/',
    role: 'CANON',
    winner: null,
    note: 'Monorepo operator documentation (USER_MANUAL, deploy, storefront).',
  },
  {
    path: 'docs/store-internal/',
    role: 'OPERATOR_ONLY',
    winner: 'docs/',
    note: 'Store-adjacent operator notes moved out of store/ (not synced to Pages).',
  },
  {
    path: 'store/docs/',
    role: 'LEGACY_DOCS',
    winner: 'docs/',
    note: 'Pre-monorepo NXCore/Firebase-era docs. Stale URLs; do not extend.',
  },
  {
    path: 'store/_internal/',
    role: 'OPERATOR_ONLY',
    winner: 'store/',
    note: 'Commerce snapshots, catalog backups, legacy scripts. Never synced to public/shop.',
  },
  {
    path: 'store/_internal/scripts/',
    role: 'LEGACY_DOCS',
    winner: 'scripts/',
    note: 'Legacy catalog Python/JS pipeline relocated from store/scripts/. Prefer root scripts/.',
  },
  {
    path: 'store/backend/',
    role: 'CANON',
    winner: null,
    deploy: 'api.aerovista.us',
    note: 'Payment API (gitignored). Not a duplicate of store/ — server-side only.',
  },
  {
    path: 'scripts/',
    role: 'CANON',
    winner: null,
    note: 'Root build/sync/audit/deploy tooling.',
  },
  {
    path: 'src/',
    role: 'CANON',
    winner: null,
    note: 'React/Vite dev bridge only; not deployed to gear.aerovista.us Pages.',
  },
  {
    path: 'archive/',
    role: 'SUPERSEDED',
    winner: 'docs/archive/',
    note: 'Retired trees; reference only. Prefer docs/archive/ for audit history.',
  },
  {
    path: 'store/_archive/',
    role: 'SUPERSEDED',
    winner: 'store/',
    note: 'Retired store snapshots under store/.',
  },
  {
    path: 'store/image/',
    role: 'SUPERSEDED',
    winner: 'store/img/',
    note: 'Legacy image folder name; canonical product art is store/img/.',
  },
  {
    path: '_legacy_export/',
    role: 'LEGACY_EXPORT',
    winner: 'docs/ + horizon/ + store/',
    note: 'Staged for Move-Item out of aerovista-store parent. See _legacy_export/README.md.',
  },
  {
    path: 'horizon/evidence/',
    role: 'CANON',
    winner: null,
    note: 'Promoted Horizon rights + catalog reconciliation from planning/canvas/.',
  },
];

/** Paths that receive an auto-written FOLDER_ROLE.md on sync/build (local + Pages-safe marker) */
export const MARKER_TARGETS = {
  'public/shop': { role: 'GENERATED_MIRROR', winner: 'store/' },
  'public/console': { role: 'GENERATED_MIRROR', winner: 'console/' },
  'public/store': { role: 'JSON_BRIDGE', winner: 'store/' },
};

export function folderRoleMarkdown({ role, winner, sync, note }) {
  const lines = [
    '# Folder role (auto-tagged)',
    '',
    `| Field | Value |`,
    `|-------|-------|`,
    `| **Role** | \`${role}\` |`,
  ];
  if (winner) lines.push(`| **Canonical source** | \`${winner}\` |`);
  if (sync) lines.push(`| **Regenerate** | \`${sync}\` |`);
  lines.push(`| **Note** | ${note || 'See docs/FOLDER_DUPLICATES.md'} |`);
  lines.push('', '**Do not edit files in this folder.** Change the canonical source and re-run sync/build.', '');
  return lines.join('\n');
}

export function writeFolderRoleMarker(root, relDir, meta) {
  const dir = path.join(root, relDir);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'FOLDER_ROLE.md'), folderRoleMarkdown(meta), 'utf8');
}
