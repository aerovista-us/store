# Deployment Guide (Canonical Root Storefront)

> Canonical storefront: `index.html` at repo root (Square JSON-fed catalog).
> Previous Firebase/public variants are archived and should not be deployed from this repo.

## GitHub Pages (recommended)

GitHub Pages should serve from the repository root.

Required files at repo root:
- `index.html`
- `favicon.svg`
- `img/`
- `square_products_merged.json` (recommended; one product per card, variants merged)
- `square_products_latest.json` or dated JSON (fallback)

Catalog:
- Prefer `square_products_merged.json` (from merge script/report). Loader also tries `square_products_latest.json`, then `square_products_2026-02-11.json`, then `square_products_2026-02-10.json`.

## Backend (separate deploy)

The backend is under `backend/` and is intended to be deployed separately (Docker/Compose or bare metal).
See `backend/README.md`.

