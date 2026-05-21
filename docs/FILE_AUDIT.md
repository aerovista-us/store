# File audit — orphans, duplicates, and what is in use

**Last updated:** 2026-05-18 (collection SVG + multi-page shop UX). Re-run: `npm run audit:repo`.

## Active workflow (use these)

| Path | Role |
|------|------|
| `store/` | Edit shop + catalog JSON + `store/js/collection-lane-svg.js` |
| `store/index.html` | Storefront (home / collection / catalog views) |
| `console/` | Edit via v2 HTML / `npm run console:server` |
| `public/shop/` | Generated — `npm run sync:store` |
| `public/console/` | Generated — `npm run sync:console` |
| `public/store/` | Generated JSON bridge only (no images) |
| Root Vite files | `index.html`, `vite.config.ts`, `tsconfig.json`, `src/`, `nginx/` |

## Intentionally not changed

- **`store/img/`**, **`store/bg_remove_in/`**, **`store/bg_remove_out/`** — image sets until canonical set is chosen
- **`store/img/collection-cards/`** — optional PNG refs for lane art (live doors use SVG)
- **`archive/`** — reference only; not in sync pipeline

## Duplicates (safe to ignore or regenerate)

| Copy | Canonical |
|------|-----------|
| `public/shop/**` | `store/**` |
| `public/console/*` | `console/*` |
| `public/store/*.json` | `store/*.json` |
| SOT files under `public/shop/` | `store/` or `console/` |

## Stale / optional cleanup later

- `store/av_gear_shop_*.html` — alternate HTML, not linked from `index.html`
- `archive/**` nested v1.1 copies
- `store/` vs `store/scripts/` duplicate `.py` / `.sh` (diff before deleting)

## Removed from default pipeline

- `sync:legacy` / `public/v1.1/` / React `/legacy/v1.1/`
- `scripts/sync-legacy-v1.mjs` (deleted)

## Related docs

- **`docs/STOREFRONT.md`** — what is customer-facing and how it behaves
- **`docs/WORKFLOWS.md`** — commands
