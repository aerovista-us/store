# AeroVista storefront (`store/`)

Canonical **static customer shop** for AeroVista Apparel. This folder is synced to **`public/shop/`** by the root monorepo (`npm run sync:store`).

> **Monorepo home:** See **[../README.md](../README.md)** and **[../docs/WORKFLOWS.md](../docs/WORKFLOWS.md)** for Vite dev, console v2, and deploy.  
> **Operator manual:** **[../docs/USER_MANUAL/README.md](../docs/USER_MANUAL/README.md)** — deploy, orders, fulfillment.  
> **Storefront behavior:** **[../docs/STOREFRONT.md](../docs/STOREFRONT.md)** — routing, collection lanes, SVG art, checkout.  
> **Developer handoff:** **[handoffnotes.md](handoffnotes.md)**.

## Production

| Surface | URL |
|---------|-----|
| **Shop** | https://gear.aerovista.us/ (GitHub Pages from root repo) |
| **Checkout API** | https://api.aerovista.us |

## Key files

| File | Role |
|------|------|
| `index.html` | Full storefront (catalog, cart, checkout, collection UX) |
| `js/collection-lane-svg.js` | Per-lane `/\` SVG + holographic backgrounds (hover-activated shine/parallax) |
| `square_products_latest.json` | Square export the shop loads |
| `storefront_overlay.json` | Optional presentation layer |
| `policy-content.js` | Policy text for modals |
| `collection.html` / `catalog.html` | Short redirects to query routes |
| `img/` | Product and reference art |

## Local preview

From **repository root** (not this folder alone):

```bash
npm install
npm run dev:shop
# → http://localhost:5174/shop/index.html  (collection SVG + holo live here)

# Or manually:
npm run sync:store
npm run dev
# Open http://localhost:5174/shop/index.html  — NOT http://localhost:5174/ (React shell only)

# Production-like preview after build:
npm run preview:pages
# → http://localhost:4173/  (shop copied to dist root)
```

## Catalog

Single JSON loader — see **handoffnotes.md** §3. Deploy catalog via root **`npm run deploy:catalog`** or console **Deploy to store**.

## Checkout

Requires **`api.aerovista.us`** (or local API on **8088** / **18088**). Configure **`window.STORE_API_BASE`** or use URL `?api=` flags — **STOREFRONT.md** § Checkout.

## Overlay

**[../docs/STOREFRONT_OVERLAY.md](../docs/STOREFRONT_OVERLAY.md)** — visibility, featured order, ads. In **catalog-export-only** mode, lane filters use export **`collection`**, not overlay overrides.

## Backend / console (outside daily `store/` edits)

- **Catalog console v2:** `../console/` at repo root  
- **Flask API / SKU map:** `backend/` (often local/NXCore only; may be gitignored)

Legacy paths (`AeroVista_Catalog_Console/` under `store/`, Firebase hosting notes) are historical; use root **`docs/`** for current process.
