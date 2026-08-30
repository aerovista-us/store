# Developer handoff — AeroVista storefront (`store/`)

Quick map for the **canonical shop** in this monorepo.

**Operator manual (start here):** **[../USER_MANUAL/README.md](../USER_MANUAL/README.md)**  
Full UX and SVG: **[../STOREFRONT.md](../STOREFRONT.md)** · Commands: **[../WORKFLOWS.md](../WORKFLOWS.md)**

Operator-only markdown lives in **`docs/store-internal/`** (not synced to Pages). Commerce snapshots / scripts: **`store/_internal/`**.

---

## 1) Where things live

| Area | Path |
|------|------|
| Customer storefront | **`store/index.html`** (synced to `public/shop/`) |
| Collection lane SVG + hover holo | **`store/js/collection-lane-svg.js`** |
| Default catalog JSON | **`store/square_products_latest.json`** |
| Presentation overlay | **`store/storefront_overlay.json`** |
| Collection route helpers | **`store/collection.html`**, **`store/catalog.html`** |
| Catalog console (v2) | **`console/`** at repo root — not in `store/` |
| Checkout / Square API | **`store/backend/`** (NXCore; often gitignored here) |
| Local dev entry | Repo root: **`npm run dev`** → `/shop/index.html` |

---

## 2) Public URLs

| Surface | URL |
|---------|-----|
| **Shop (Pages)** | https://gear.aerovista.us/ |
| **Console** | https://store-console.aerocoreos.com/ |
| **Checkout API** | https://api.aerovista.us |

Legacy references to `aerovista.us` Firebase or `aerovista-us.github.io/store/` may appear in old docs; customer gear shop on Pages uses **gear.aerovista.us**.

---

## 3) Catalog loading

`index.html` loads **one** Square-shaped JSON:

1. Optional **`window.STORE_CATALOG_PATH`**
2. Else **`square_products_latest.json`** (+ dated fallbacks)

**Collection landing lanes** filter by export field **`collection`** (see **`COLLECTION_LANES`** in `index.html`). Overlay is presentation-only when using catalog-export-only mode.

---

## 4) Shop navigation

| Route | Result |
|-------|--------|
| `index.html` | Home (collection doors, no product grid) |
| `?collection=core` | Collection view for Core |
| `?collection=docklife` | DockLife page (hero ad + growing product grid) |
| `?view=catalog` | Browse all apparel |

---

## 5) API base URL (checkout)

- **`window.STORE_API_BASE`** if set
- Else hostname: production → `https://api.aerovista.us`; localhost → `127.0.0.1:8088` / `18088`
- Flags: `?api=local8088`, `?api=local18088`, `?api=prod`

Local checkout **requires** the payment API running unless CORS allows `?api=prod`.

---

## 6) Overlay

See **[../STOREFRONT_OVERLAY.md](../STOREFRONT_OVERLAY.md)**. Square remains checkout truth; overlay controls visibility, order, ads, and optional copy.

---

## 7) SKU map and checkout keys

Cart sends **`Color__Size`** (e.g. `Black__M`). Backend **`SQUARE_SKU_MAP`** must match the deployed catalog.

---

## 8) Collection SVG (editing)

- **File:** `store/js/collection-lane-svg.js`
- **Exports:** `collectionLaneSvg`, `mountCollectionDoorSvgs`, `initCollectionDoorHolo`, `mountCollectionPageArt`
- **After edits:** `npm run sync:store` from repo root
- **Behavior:** Holographic foil/shine and parallax only when card has **`is-door-active`** (hover/touch), same idea as hero

---

## 9) Troubleshooting

| Symptom | Check |
|---------|--------|
| No products on home grid | Expected — grid is on collection/catalog views only |
| Collection door empty | Export `collection` values vs `COLLECTION_LANES` regex |
| Checkout “payment service” on localhost | Start API on 8088/18088 or set `STORE_API_BASE` |
| Checkout CORS | `ALLOWED_ORIGINS` includes shop origin |
| Stale assets | `npm run sync:store`; bump `STORE_BUILD_ID` in `index.html` if needed |
| Order paid but not fulfilled | See **[../USER_MANUAL/09-troubleshooting.md](../USER_MANUAL/09-troubleshooting.md)** |

---

## 10) NXCore nicknames (memorable)

| Nickname | Remember as… |
|----------|----------------|
| **nxcore** | `ssh glyph@100.115.9.61` |
| **av-backend** | Payment API folder on nxcore (`.../av_storefront/backend/`) |
| **av-api** | https://api.aerovista.us |
| **av-gear** | https://gear.aerovista.us |

**Memorable secrets (production nxcore):**

| What | Value |
|------|--------|
| Postgres user / pass / db | `av_store` / **`store_commands_password`** / `av_storefront` |
| Ops token (`X-Ops-Token`) | **`AeroVista-Gear-Ops-2026`** |
| Webhook URL | `https://api.aerovista.us/api/webhooks/square` |

Commands: `npm run deploy:nxcore -- -BackendOnly` · `npm run nxcore:sku-map`  
Full card: **[../NXCORE_QUICKREF.md](../NXCORE_QUICKREF.md)**

---

## 11) Docs index

| Doc | Topic |
|-----|--------|
| [../USER_MANUAL/README.md](../USER_MANUAL/README.md) | **Operator manual** — deploy, orders, fulfillment |
| [../STOREFRONT.md](../STOREFRONT.md) | Shop UX, lanes, SVG, checkout |
| [../WORKFLOWS.md](../WORKFLOWS.md) | Sync, console, deploy |
| [../NXCORE_QUICKREF.md](../NXCORE_QUICKREF.md) | Memorable nxcore names, token, routes |
| [../STATUS.md](../STATUS.md) | **Current production status** (shop + backend) |
| [../BACKEND_DEPLOY.md](../BACKEND_DEPLOY.md) | NXCore payment API |
| [../CATALOG_PIPELINE.md](../CATALOG_PIPELINE.md) | Square export |
| [../HOW_TO_UPDATE_PRODUCTS.md](../HOW_TO_UPDATE_PRODUCTS.md) | Product update playbook |
| [../DEPLOY_GITHUB_PAGES.md](../DEPLOY_GITHUB_PAGES.md) | Pages + CORS |
| [../../README.md](../../README.md) | Monorepo quick start |
