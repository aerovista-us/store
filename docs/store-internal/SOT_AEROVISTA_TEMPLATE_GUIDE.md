# AeroVista SOT Template Guide

This guide explains the AeroVista-flavored root `SOT.json` template.

## What this is
`SOT.json` is the Source of Truth manifest for an AeroVista project.

It defines:
- what the project is
- where canonical files are allowed to live
- what files are the true masters
- what systems it connects to
- what deployment/runtime details matter
- what the scanner should validate

Drop one copy of `SOT.json` at the root of each AeroVista project you want to track.

---

## Recommended AeroVista project layout
```text
project-root/
├─ SOT.json
├─ README.md
├─ docs/
│  ├─ docs_index.md
│  ├─ runbook.md
│  └─ architecture.md
├─ config/
├─ data/
├─ schemas/
├─ prompts/
├─ archive/
├─ intake/
├─ build/
├─ src/
└─ tools/
```

### Suggested meaning
- `docs/` = canonical docs and runbooks
- `config/` = approved config masters
- `data/` = canonical structured truth files
- `schemas/` = contract/schema truth
- `prompts/` = canonical AI prompt assets
- `archive/` = old or non-canonical items
- `intake/` = raw imported material
- `build/` / `dist/` = generated outputs only

---

## Key AeroVista sections

### `project`
Identity and business context.
Use this to track:
- division
- lifecycle
- category
- language
- owner
- status

### `technical_profile`
Technical truth for the project.
Use this to document:
- frontend/backend stack
- runtime ports
- deployment path on NXCore
- public/internal URLs
- compose file
- reverse proxy
- data model and shared storage

### `canon`
Rules for where master files may live.
This is how you stop drift from archive/build/intake copies.

### `canon_files`
The most important list in the manifest.
These are the actual master files for the project.

Typical AeroVista entries:
- `README.md`
- `docs/docs_index.md`
- `docs/runbook.md`
- `docs/architecture.md`
- config files
- canonical schemas
- master prompts

### `systems`
Cross-project relationship map.
Useful for:
- linked apps
- feeds and dependencies
- shared storage
- Tailscale hosts
- Cloudflare tunnels

### `ops`
Operational details.
Use this to track:
- service name
- health paths
- backup targets
- log paths
- secret locations
- monitoring status

### `checks`
Scanner rules.
This is where you define:
- must-exist paths
- marker scanning behavior
- warnings for masters outside approved locations

---

## Example SOT markers

### Markdown
```md
<!-- SOT: true | sot_id: docs_index | canon_path: docs/docs_index.md | updated: 2026-03-18 -->
```

### HTML
```html
<!-- SOT: true | sot_id: landing | canon_path: index.html | updated: 2026-03-18 -->
```

### TS/JS comments
```ts
// SOT: true | sot_id: app_entry | canon_path: src/app/page.tsx | updated: 2026-03-18
```

---

## Minimal setup workflow
1. Copy `SOT.json` into the project root.
2. Update `project` metadata.
3. Set the real `deploy_path`, URLs, stack, and ports.
4. Set `canon_root`.
5. Add true master docs/configs/schemas to `canon_files`.
6. Add must-have paths to `checks.required_paths_exist`.
7. Run your SOT scan.
8. Update the manifest whenever canon or deployment truth changes.

---

## Good rule of thumb
If a file would cause confusion when two versions exist, it should probably be listed in `canon_files`.
