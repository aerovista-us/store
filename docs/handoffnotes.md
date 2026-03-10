# AeroVista Storefront — Handoff Notes for Developers

Quick reference so new devs can find code, understand data flow, and fix common issues without digging through the whole repo.

---

## 1. What this repo is

- **Source of truth:** **Square** is the source of truth for catalog, pricing, and checkout. **Printful** is for fulfillment only (and optionally cost data for profit checks).
- **Storefront:** Single-page store (`index.html` at repo root). No build step; catalog is loaded from JSON (Square export shape). Can be served from GitHub Pages, Firebase, or any static host.
- **Two catalog sources:** The storefront can show either the **live** catalog (e.g. `square_products_latest.json`) or an **edited** catalog (file or localStorage) — switch via the **Catalog** dropdown in the header.
- **Catalog Console:** Standalone tool (`AeroVista_Catalog_Console/v1.1/`) to import Square CSV/JSON, clean/merge, and export JSON for the storefront (edited source).
- **Backend:** Optional Python API (`backend/`) for Square bootstrap and checkout; storefront calls it when `STORE_API_BASE` is set.

---

## 2. Where things live

| What | Where |
|------|--------|
| **Storefront (canonical)** | `index.html` (root) |
| **Live catalog (default)** | `square_products_latest.json` (+ dated fallbacks in code) |
| **Edited catalog (file)** | `square_products_edited.json` (or path set by `window.STORE_EDITED_CATALOG_PATH`) |
| **Catalog source toggle** | Header: **Catalog** dropdown → `#catalogSource` in `index.html` |
| **Catalog loading logic** | `index.html`: `loadProducts()` (search for `getCatalogSource`, `LS_CATALOG_SOURCE`, `LS_EDITED_CATALOG`) |
| **Catalog Console** | `AeroVista_Catalog_Console/v1.1/index.html` (open in browser; no server required) |
| **Overlay (order/hide/ads + consistency)** | `storefront_overlay.json`; loaded by `loadOverlay()`, applied in `applyOverlayToProducts()` |
| **Backend API** | `backend/app.py` |
| **Backend env** | `backend/.env` (see `backend/README.md`) |
| **SKU/variation map** | Backend: `SQUARE_SKU_MAP_JSON` or `SQUARE_SKU_MAP_FILE`; storefront sends cart keys that must exist in this map |
| **Hosting / DNS / routing** | `docs/HOSTING_AND_DNS.md`, `docs/NXCORE_STORE_API_ROUTING_STATUS.md` |

---

## 3. Two catalog sources (live vs edited)

- **Live:** Used when **Catalog** = “Live”. Tries `window.STORE_CATALOG_PATH` then `./square_products_latest.json`, then dated fallbacks. Same as “production” feed.
- **Edited:** Used when **Catalog** = “Edited”. Tries:
  1. `window.STORE_EDITED_CATALOG_PATH` or `./square_products_edited.json`
  2. `localStorage` key `av_storefront_edited_catalog` (JSON string with `{ "products": [ ... ] }`)
- **Persistence:** Current choice is in `localStorage` under `av_storefront_catalog_source` (`"live"` or `"edited"`).
- **Code:** In `index.html`, search for `getCatalogSource`, `setCatalogSource`, `loadProducts`. When “Edited” has no data, the storefront falls back to live paths and logs a console warning.

**Quick test:** Set Catalog to Edited, create `square_products_edited.json` with a small `products` array next to `index.html`, reload — grid should show that catalog.

---

## 4. Catalog Console (edit → storefront)

- **Purpose:** Turn Square exports (CSV/JSON) into one cleaned JSON with a `products` array for the storefront.
- **Entrypoint:** Open `AeroVista_Catalog_Console/v1.1/index.html` in a browser (local or static host).
- **Flow:** Import → edit/merge → Export JSON. Then either:
  - Save export as `square_products_edited.json` next to root `index.html`, or
  - Paste the exported JSON into `localStorage` as `av_storefront_edited_catalog` (same origin as storefront).
- **Storefront:** Set **Catalog** to “Edited” to preview; “Live” stays on `square_products_latest.json`.

---

## 5. Catalog consistency overlay (titles, prices, descriptions)

One layer normalizes **how** products are shown, for **both** Live and Edited catalog. No rebuild — edit `storefront_overlay.json` only.

- **File:** `storefront_overlay.json` — add or edit `rules` and `overrides`.
- **Rules** (apply to whole catalog):
  - **titleFormat:** Template for product name, e.g. `"{brand} • {collection} • {productType} • {color}"`. Placeholders: `{brand}`, `{collection}`, `{productType}`, `{color}`.
  - **defaultBrand:** Used when no override sets it (e.g. `"AeroVista"`).
  - **priceLadders:** Per-type base + size bumps. Keys: `tee`, `hoodie_pullover`, `hoodie_zip`, `trucker_hat`, `crewneck`, etc. Each ladder: `{ "base": 34.99, "2XL": 37.99, "3XL": 39.99 }`. Product type is inferred from category (or set in override) and mapped to a ladder key in `index.html` (`categoryToLadderKey`).
- **Overrides** (per product): Key = **productKey** (stable id). Product gets a `productKey` when the catalog is loaded: **`sq_` + Square item id** (raw, no slug) when present, else `slug(product name)`. Also set **`squareItemIdRaw`** on the product when Square id exists so override keys like `sq_ABC123` are bulletproof. In `overrides` you can set: `collection`, `productType`, `color`, `descriptionShort` (card), `description` (modal), and optionally `ladderKey` to force a price ladder. A **copy lock** convention is supported: if `copyLock: true` is set on an override (or if that override supplies `description`/`descriptionShort`), the storefront overlay will not auto-rewrite that product’s name/description fields from rules; they are treated as curated.
- **Pricing:** Base price comes from the ladder; at add-to-cart, **variant-aware** price is used: 2XL/3XL get ladder `"2XL"` / `"3XL"` when present, else `base`. See `getPriceForProduct(p, size)` in `index.html`.
- **Descriptions:** Card uses `descriptionShort` (from overlay override) or `blurb`. Modal uses `description` (from overlay) or `blurb`.
- **Policy:** Square/Printful = operational (inventory, fulfillment). Overlay = presentation (names, copy, prices you show). You can push cleaned copy back to Square later if you want; it’s optional.

**Code:** `index.html`: `normalizeOverlay()`, `applyOverlayToProducts()`, `formatTitle()`, `categoryToLadderKey()`, `getPriceForProduct()`.

---

## 6. Backend (checkout, bootstrap, CORS)

- **Entrypoint:** `backend/app.py`. See `backend/README.md` for Docker vs bare metal, env vars, CORS.
- **Endpoints used by storefront:** Square bootstrap (e.g. `/api/square/bootstrap`), checkout (e.g. `POST /api/square/checkout`). Base URL is `window.STORE_API_BASE` in `index.html` (e.g. `https://api.aerovista.us`).
- **Checkout 400:** Often “unknown SKU”. Cart sends keys like `Color__Size`; backend resolves them via `SQUARE_SKU_MAP_JSON` (or file). Each entry needs `name`, `cents`; add `variationId` for Square catalog. See `backend/README.md` “Checkout returns 400”.
- **CORS:** `ALLOWED_ORIGINS` in backend must include the storefront origin (e.g. `https://aerovista.us`, `https://aerovista-us.github.io`).

---

## 7. Common tasks — where to look

| Task | Where / how |
|------|----------------|
| Change default catalog file | `index.html`: `loadProducts()` path list, or set `window.STORE_CATALOG_PATH` before load |
| Add another “edited” path | `index.html`: in `loadProducts()`, edited branch — add path to `editedPaths` or set `window.STORE_EDITED_CATALOG_PATH` |
| Preview edited catalog without a file | Set **Catalog** to Edited; put JSON in `localStorage.av_storefront_edited_catalog` (object with `products` array) |
| Point storefront at different API | Set `window.STORE_API_BASE` (e.g. in a script before main bundle or in inline config in `index.html`) |
| Fix “Unable to load product catalog” | Check network tab for 404/errors on catalog URL; ensure JSON has `products` array; if Edited, ensure file or localStorage has valid JSON |
| Fix checkout 400 (unknown SKU) | Backend: add missing cart keys to `SQUARE_SKU_MAP_JSON` / map file; keys must match what frontend sends (e.g. `Black__M`) |
| Change overlay (order, hide, collections, ads) | Edit `storefront_overlay.json`; structure in `index.html`: `normalizeOverlay`, `loadOverlay`, `applyOverlayToProducts` |
| Change titles/prices/descriptions (consistency) | Edit `storefront_overlay.json`: `rules.titleFormat`, `rules.defaultBrand`, `rules.priceLadders`, and `overrides[productKey]`. productKey = `sq_` + Square item id (when present) or slug(product name). See §5. |
| Validate profit floor (no losing SKUs) | Run `backend/scripts/validate_profit_floor.py [overlay.json] [catalog.json]`. Uses `rules.fees`, `rules.shipBufferCents`, `rules.costByLadder` in overlay. Exits 1 if any variant profit < 0. |
| Holographic card styling | `index.html`: `productHasHolo(p)` and `.holo-overlay`; extend by name/tags if needed |

---

## 8. Key globals and localStorage (storefront)

- `PRODUCTS` — in-memory product list after `loadProducts()` and overlay applied.
- `window.STORE_CATALOG_PATH` — override for live catalog URL/path.
- `window.STORE_EDITED_CATALOG_PATH` — override for edited catalog URL/path.
- `window.STORE_API_BASE` — backend base URL for checkout/bootstrap.
- `localStorage.av_storefront_catalog_source` — `"live"` or `"edited"`.
- `localStorage.av_storefront_edited_catalog` — optional; full catalog JSON string for edited source.
- Cart: `localStorage.av_store_cart_v3`; promo: `av_store_promo_v3`.

---

## 9. Docs index

- **Root:** `README.md` — layout, catalog sources, Catalog Console, API config, backend pointer.
- **This file:** `handoffnotes.md` — dev quick-reference (you are here).
- **How to update products:** `docs/HOW_TO_UPDATE_PRODUCTS.md` — step-by-step guide for live catalog, edited catalog, overlay, and validation.
- **Backend:** `backend/README.md` — setup, env, CORS, SKU map, checkout 400.
- **Data quality + validation:** `docs/DATA_QUALITY_AND_VALIDATION.md` — Square export data quality script, Catalog Console v1.1 Validate tab, profit floor validator; recommended order.
- **Printful mapping:** `docs/PRINTFUL_FULFILLMENT_AND_MAPPING.md` — how to run Printful exports and build a Square → Printful variant map (fulfillment/cost only).
- **Hosting/DNS:** `docs/HOSTING_AND_DNS.md` — Firebase, Cloudflare, tunnel, CORS.
- **API routing (NXCore):** `docs/NXCORE_STORE_API_ROUTING_STATUS.md` — Traefik, health checks, 530 triage.
- **Checkout readiness:** `docs/STOREFRONT_REVIEW_CHECKOUT_READINESS.md`.
- **Variant/pricing:** `docs/VARIANT_PRICING_SCHEMA_AND_WORKSHEET.md`, `docs/variant_pricing_dashboard.html`.
- **Dropship.store “treasure trove”:** `docs/DROPSHIP_STORE_TREASURE_TROVE.md` — inventory of dropship.store and what to reuse (Square = source of truth).
- **Catalog Console comparison & roadmap:** `docs/CATALOG_CONSOLE_COMPARISON_AND_ROADMAP.md` — root vs v1.1, treasure trove cross-reference, best features for catalog management.

---

## 10. Phase 2 guardrails (pricing, profit, fulfillment)

- **Checkout price = Square only.** Frontend price (ladder) is display only. Backend **always** builds line-item price from **sku_map** (or Square lookup by variationId). Client-sent price/cents are ignored; backend logs a warning if present. See `backend/app.py` `build_line_items_from_cart()`.
- **Cart must include:** `sku` (cartKey: `Color__Size`), `variationId` (Square variation id), `qty`, and optionally `size`, `color`. Backend looks up price by `sku` or `variationId` in sku_map.
- **Profit floor:** Overlay `rules` can include `fees` (processorPct, processorFixedCents), `shipBufferCents`, and `costByLadder` (cents per ladder key/size). Run `backend/scripts/validate_profit_floor.py` to fail any variant where retail − cost − shipBuffer − fees < 0. Prevents publishing losing SKUs.
- **Printful fulfillment:** Cart line must map to a stable variant id (Square variationId + sku_map). Backend should resolve to **Printful variant id** when submitting orders; store that mapping in sku_map (e.g. `printfulVariantId`) or a separate map so fulfillment uses the exact variant ordered.
- **Shipping strategy (recommended):** Flat shipping per order (e.g. Square: $7.99). Keep a $3–5 buffer in ladders; use profit validator so you don’t lose money. Document in backend env: `SQUARE_FLAT_SHIPPING_CENTS`.

---

## 11. Troubleshooting one-liners

- **Catalog shows nothing or wrong set:** Check **Catalog** dropdown (Live vs Edited). If Edited, ensure `square_products_edited.json` exists or `av_storefront_edited_catalog` is set; check console for “Edited catalog: no file or localStorage” and 404s.
- **Checkout fails (CORS):** Backend `ALLOWED_ORIGINS` must include the exact origin (scheme + host, no trailing slash).
- **Checkout 400 “unknown SKU”:** Backend SKU map missing that cart key; add it with `name` and `cents` (and optionally `variationId`).
- **API health 200 locally but 530 externally:** Usually tunnel/origin config; see `docs/NXCORE_STORE_API_ROUTING_STATUS.md` and `docs/CLOUDFLARE_530_CHECKLIST.md`.

---

*Last updated: Phase 2 guardrails (Square-authoritative price, profit floor validator, cart sku/variationId, productKey = sq_ + rawId).*
