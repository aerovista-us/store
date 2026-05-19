# AeroVista Store — working workflows

This doc describes **current** operator and deploy flows after splitting **`store/`** (shop) and **`console/`** (catalog v2). Product **images** under `store/img/` are intentionally not reorganized here — curate that set separately.

## Repo map

| Path | Role |
|------|------|
| `store/` | Canonical static shop + `square_products_latest.json` + `storefront_overlay.json` |
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

## Catalog → shop pipeline

1. **Square export** — save `.xlsx` to `\\100.115.9.61\Collab\av-data\` (see `docs/CATALOG_PIPELINE.md`).
2. **Edit** — open console v2 (`npm run dev` → `/console/`, or `npm run console:server`, or open `console/aerovista_catalog_console_v2.html` with a local server).
3. **Load** xlsx in console → clean → validate → adjust overlay.
4. **Deploy**
   - **Recommended:** `npm run deploy:server` (keep running) → console **Exports** → **Deploy to store**
   - **CLI:** `npm run deploy:catalog -- path/to/export.json` [`--overlay path/to/overlay.json`]
5. Writes **`store/square_products_latest.json`** (+ optional overlay), runs sync → **`public/shop`**, **`public/console`**, **`public/store`** JSON bridge.
6. **Images** — ensure filenames in JSON exist under `store/img/` (not bulk-moved in this cleanup).
7. **Production** — `npm run build`, deploy `dist/` (nginx SPA + static `/shop/`, `/console/`).

## URLs (after `npm run dev`)

| URL | What |
|-----|------|
| `/` | React home / workflow links |
| `/shop/index.html` | Customer storefront |
| `/console/aerovista_catalog_console_v2.html` | Operator catalog console |
| `/console/` | Same console in iframe |

Console loads catalog from `../store/*.json` (dev: Vite serves `/store/` from `store/`; prod: `public/store/` + `/shop/img/` for previews).

## Public vs private hosting

| Role | URL | Deploy |
|------|-----|--------|
| **Shop** | https://gear.aerovista.us/ | GitHub Pages — `npm run build:pages` in CI |
| **Console** | https://store-console.aerocoreos.com/ | NXCore — **`docs/NXCORE_CONSOLE.md`** |

GitHub Pages is **public**. The console must never appear in the Pages artifact (`audit-public-pages-build.mjs` enforces this).

## Docker

**Store (Vite build + nginx):** root `Dockerfile` — `docker build -t av-store .`

**Console only:** `docker compose -f console/docker-compose.yml up -d --build` → http://localhost:3014 (mounts `../store` read-only).

## What we removed

- **`console/v1.1/`** — retired; v2 replaces it.
- **`npm run sync:legacy`** — removed; no `public/v1.1` in the default pipeline.
- React route **`/legacy/v1.1/`** — replaced by **`/console/`**.

Legacy files remain under **`archive/`** for reference only.
