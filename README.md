# AeroVista Store (`av-store`)

**Stack:** [Vite](https://vitejs.dev/) 6 + [React](https://react.dev/) 19 +
TypeScript for the Gear bridge and catalog console, plus the dependency-free
static Horizon storefront.

**Remote:** [github.com/aerovista-us/av-store](https://github.com/aerovista-us/av-store)

## Layout

| Path | Role |
|------|------|
| **`store/`** | Canonical static shop + catalog JSON + `js/collection-lane-svg.js`. Synced to **`public/shop`**. |
| **`store/products/`** | Canonical WebP product galleries, one folder and manifest per catalog product. Published at **`/store/products/{product-id}/`**. |
| **`horizon/`** | **Horizon** customer storefront (second store) — four proportional consumer-wall works, one Harbor business-placement feature, no public placeholders, recoverable archive, hidden bundle, and safely gated Square/Printful commerce handoff; see `horizon/README.md`. |
| **`console/`** | Catalog console **v2** (`aerovista_catalog_console_v2.html`). Synced to **`public/console`**. |
| **`public/`** | Generated static assets for Vite/`dist` (run sync before dev/build). |
| **`src/`** | React bridge: home, `/console/` iframe, link to `/shop/`. |
| **`archive/`** | Old copies — not part of daily workflow. |

Full workflows: **`docs/WORKFLOWS.md`**.

## Quick start

```bash
npm install
npm run sync:all
npm run dev          # http://localhost:5174
npm run build
npm run preview
```

| Script | Purpose |
|--------|---------|
| `sync:store` | `store/` → `public/shop` + `public/store/*.json` |
| `sync:console` | Console v2 assets → `public/console` |
| `sync:all` | Both + `public/build-source-manifest.json` |
| `deploy:server` | Local API for console **Deploy to store** |
| `deploy:catalog` | CLI: write JSON to `store/` and sync |
| `console:server` | `node console/server.js` (static + bg-removal API) |
| `scripts/import-incoming-product-images.ps1` | Match reviewed provider exports to catalog product folders |
| `scripts/archive-completed-product-zips.ps1` | Move manifest-referenced ZIPs from staging to completed storage |

## Deploy catalog

1. `npm run deploy:server`
2. Open console → **Exports** → **Deploy to store**

Or: `npm run deploy:catalog -- ./export.json`

## Public shop (GitHub Pages)

| | |
|--|--|
| **URL** | https://gear.aerovista.us/ |
| **Contains** | Storefront only (no console) |
| **Build** | `npm run build:pages` → audited `dist/` |
| **Docs** | **`docs/DEPLOY_GITHUB_PAGES.md`** |

## Private console (NXCore)

| | |
|--|--|
| **URL** | https://store-console.aerocoreos.com/ |
| **Contains** | Catalog console v2, operator tools |
| **Docs** | **`docs/NXCORE_CONSOLE.md`** |

Local dev: `VITE_OPERATOR_MODE=true` in `.env.development` — see **`docs/WORKFLOWS.md`**.

## Docker

```bash
# Store (React + shop + console in dist)
docker build -t av-store .

# Console only
docker compose -f console/docker-compose.yml up -d --build
# http://localhost:3014
```

## Docs

- **`docs/USER_MANUAL/README.md`** — **operator manual** (start here): deploy, orders, fulfillment, runbooks
- **`docs/README.md`** — documentation index
- **`docs/STOREFRONT.md`** — shop UX, collection lanes, SVG art, checkout, routing  
- **`docs/WORKFLOWS.md`** — operator + deploy flows  
- **`docs/BACKEND_DEPLOY.md`** — payment API on NXCore (manual SSH)
- **`docs/CATALOG_PIPELINE.md`** — Square xlsx intake  
- **`docs/STOREFRONT_OVERLAY.md`** — overlay rules  
- **`docs/DEPLOY_GITHUB_PAGES.md`** — public shop (gear.aerovista.us)  
- **`docs/REPO_LAYOUT.md`** — folder reference  
- **`docs/AVCC_INTEGRATION.md`** — AVCC Command Center ↔ commerce storefronts
- **`docs/store-internal/handoffnotes.md`** — quick storefront dev map  
- **`planning/`** — commerce plans (Plan 1 / 1A / 2), readiness report, Horizon demo sources
- **`horizon/README.md`** — Horizon storefront shell status
- **`horizon/DEPLOYMENT_SOP.md`** — Horizon preview, launch, verification, and rollback procedure
- **`horizon/COMPLETION_PLAN.md`** — gated next steps through production completion
