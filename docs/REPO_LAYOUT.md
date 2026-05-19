# AeroVista Store — repo layout

## Top-level folders

- **`store/`** — Canonical static storefront + `square_products_latest.json` + `storefront_overlay.json` + `img/`. Synced to **`public/shop`** (except `store/docs/`). JSON also copied to **`public/store/`** for console fetch paths.
- **`console/`** — Catalog console **v2** only. Synced to **`public/console/`**. No `console/v1.1/`.
- **`archive/`** — Superseded trees; not used in `npm run sync:all`.
- **`scripts/`** — `sync-store.mjs`, `sync-console.mjs`, deploy + overlay tools.
- **`src/`** — React bridge (Vite).

## Build pipeline

1. **`npm run sync:all`** — `store` → `public/shop`, `console` → `public/console`, manifest.
2. **`vite build`** → **`dist/`** includes shop, console, and React SPA.

See **`docs/WORKFLOWS.md`** for operator flows. **`docs/FILE_AUDIT.md`** for orphan/duplicate notes (images excluded from cleanup).
