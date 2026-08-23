# AeroVista Store — working workflows

**Last updated:** 2026-07-26

Operator and deploy flows for the **`av-store`** monorepo: **`store/`** (public shop), **`console/`** (catalog v2), root Vite/React bridge. Product **images** under `store/img/` are curated separately.

**Start here:** **`docs/USER_MANUAL/README.md`** (full manual).
**Customer shop detail:** **`docs/STOREFRONT.md`**.

## Repo map

| Path | Role |
|------|------|
| `store/` | Canonical static shop + `square_products_latest.json` + `storefront_overlay.json` + `js/collection-lane-svg.js` |
| `horizon/` | Canonical Horizon static storefront, catalog, evidence, deployment SOP, and completion plan; do not publish the directory wholesale |
| `console/` | Catalog console v2 (`aerovista_catalog_console_v2.html`, `server.js`) |
| `public/shop/` | Synced copy of `store/` for Vite / `dist` (minus `store/docs/`) |
| `public/console/` | Synced console HTML + baselines for Vite / `dist` |
| `public/store/` | JSON-only bridge (`square_products_latest.json`, overlay) for console fetch paths |
| `src/` | React bridge UI (home, links, console iframe) |
| `archive/` | Old trees — not used in daily workflow |

## Daily commands

```bash
npm install
npm run sync:all      # store → public/shop, console → public/console, manifest
npm run dev           # http://localhost:5174 — shop at /shop/, console at /console/
npm run build         # sync:all + tsc + vite → dist/
```

| Task | Command |
|------|---------|
| Refresh shop static only | `npm run sync:store` |
| Refresh console assets only | `npm run sync:console` |
| Serve console + bg-removal API | `npm run console:server` (port 80 default; set `PORT=3014`) |
| Deploy API for console UI | `npm run deploy:server` → POST `http://127.0.0.1:5199/deploy` |
| CLI deploy export JSON | `npm run deploy:catalog -- ./export.json` |
| Overlay hygiene | `npm run audit:overlay`, `npm run clean:overlay` |
| Repo hygiene report | `npm run audit:repo` |
| Horizon public build | `npm run build:horizon-pages` |
| Horizon artifact audit | `npm run audit:horizon-pages` |
| Horizon GitHub publish | `pwsh -File horizon/scripts/publish-github-pages.ps1` |

## Catalog → shop pipeline

1. **Square export** — save `.xlsx` to `\\100.115.9.61\Collab\av-data\` (see `docs/CATALOG_PIPELINE.md`).
2. **Edit** — console v2 (`npm run dev` → `/console/`, or `npm run console:server`).
3. **Load** xlsx → clean → validate → set export **`collection`** for lane grouping.
4. **Deploy**
   - **Recommended:** `npm run deploy:server` → console **Exports** → **Deploy to store**
   - **CLI:** `npm run deploy:catalog -- path/to/export.json` [`--overlay path/to/overlay.json`]
5. Writes **`store/square_products_latest.json`** (+ optional overlay), runs sync → **`public/shop`**, **`public/console`**, **`public/store`**.
6. **Images** — filenames in JSON must exist under `store/img/`.
7. **Production shop** — `npm run build:pages` → GitHub Pages (**gear.aerovista.us**). Full stack — `npm run build` → `dist/` (includes console for private hosts).

## Storefront URLs (after `npm run dev`)

| URL | What |
|-----|------|
| `/` | React home / workflow links |
| `/shop/index.html` | **Home** — hero + collection doors (no product grid) |
| `/shop/index.html?collection=core` | **Collection page** — lane hero, filters, grid |
| `/shop/collection.html?collection=shadow` | Redirect → `index.html?collection=shadow` |
| `/shop/index.html?view=catalog` | **Browse all** — flat catalog, no collection dropdown |
| `/shop/catalog.html` | Redirect → `?view=catalog` |
| `/console/aerovista_catalog_console_v2.html` | Operator catalog console |
| `/console/` | Same console in iframe |

Console loads catalog from `../store/*.json` (dev: Vite `/store/`; prod: `public/store/` + `/shop/img/` previews).

## Collection entry art (SVG)

Implemented in **`store/js/collection-lane-svg.js`**, mounted into home **collection doors** and the **collection page hero** (`#cvArtSvg`).

| Lane | Background | `/\` mark |
|------|------------|-----------|
| **core** | Blueprint + cyan base glow | Layered metal, electric underglow |
| **shadow** | Topo + HUD nodes | Slate tactical metal, cyan edge |
| **apex** | Prism diagonal bands + radar | Split bevel, inner chevron, prismatic rim |
| **glitch** | CRT scan/static | Orbit swoosh + chromatic slices |
| **architect** | Draft grid + torn corners | Split silver/charcoal lighting |

**Interaction (matches hero card):**

- Idle: scenery visible; holo foil/shine off; no parallax
- Hover/touch: **`is-door-active`** → tilt, holo sweep, foil layers, mark glow
- **`initCollectionDoorHolo()`** binds `.collectionDoor.hasArt` and `#collectionViewHero`

Reference PNGs in **`store/img/collection-cards/`** are optional; live UI is SVG.

After editing: **`npm run sync:store`**. Details: **`docs/STOREFRONT.md`**.

## Checkout (local vs production)

| Context | API default |
|---------|-------------|
| **gear.aerovista.us** | `https://api.aerovista.us` |
| **localhost:5174** | `127.0.0.1:8088`, then `18088` |

Local checkout needs the payment API running or `?api=prod` (if CORS allows). See **`docs/STOREFRONT.md`** § Checkout and **`docs/DEPLOY_GITHUB_PAGES.md`** § CORS.

## Payment API deploy (NXCore)

The Flask checkout service in **`store/backend/`** is gitignored and **not** deployed by GitHub Pages or `npm run deploy:server`.

| Task | Command / doc |
|------|-----------------|
| Production deploy (console + backend) | `npm run deploy:nxcore` — **`scripts/deploy-nxcore.ps1`** |
| Production deploy (API only) | SSH → **`docs/BACKEND_DEPLOY.md`** or `npm run deploy:nxcore -- -BackendOnly` |
| Local API | `cd store/backend && docker compose up -d --build` |
| Env reference | `store/backend/.env.example` |
| Fulfillment audits | NXCore: `docker compose exec api python scripts/audit-product-variant-map.py` — see **`docs/USER_MANUAL/08-audits-and-runbooks.md`** |

## Public vs private hosting

| Role | URL | Deploy |
|------|-----|--------|
| **Shop** | https://gear.aerovista.us/ | GitHub Pages — `npm run build:pages` in CI |
| **Horizon** | https://horizon.aerovista.us/ | Dedicated GitHub Pages repository behind Cloudflare Worker Custom Domain; `horizon/DEPLOYMENT_SOP.md` |
| **Console** | https://store-console.aerocoreos.com/ | NXCore — **`docs/NXCORE_CONSOLE.md`** |

GitHub Pages is **public**. The console must never appear in the Pages artifact (`audit-public-pages-build.mjs` enforces this).

Horizon also contains private/operator evidence and full-resolution files. Its
public build is allowlisted and sanitized. Follow
`horizon/DEPLOYMENT_SOP.md` and `horizon/COMPLETION_PLAN.md`.

## Docker

**Store (Vite build + nginx):** root `Dockerfile` — `docker build -t av-store .`

**Console only:** `docker compose -f console/docker-compose.yml up -d --build` → http://localhost:3014 (mounts `../store` read-only).

## What we removed

- **`console/v1.1/`** — retired; v2 replaces it.
- **`npm run sync:legacy`** — removed.
- React route **`/legacy/v1.1/`** — replaced by **`/console/`**.

Legacy files remain under **`archive/`** for reference only.
