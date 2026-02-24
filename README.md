# AeroVista Storefront

Canonical static storefront for AeroVista Apparel, backed by a Square JSON catalog and an optional Python backend API.

**Developers:** See **[handoffnotes.md](handoffnotes.md)** for a quick map of where things live, how the two catalog sources work, and how to fix common issues.

## Top-level layout

- `index.html` – primary storefront (GitHub Pages–friendly, no build step).
- `square_products_latest.json` – **live** Square export the storefront reads by default (with dated fallbacks like `square_products_2026-02-11.json`).
- `AeroVista_Catalog_Console/` – Catalog Console for cleaning/merging Square exports and producing an edited JSON catalog.
- `backend/` – optional FastAPI/Starlette-style backend used for checkout, ops dashboards, etc.
- `public/` – legacy/archived frontend; not served in production.

Archived Firebase/public variants are not used or served; `index.html` at the repo root is authoritative.

## Catalog data sources (live vs. edited)

The storefront can read its product catalog from **two different sources**:

1. **Live catalog (default)**  
   - Reads from `square_products_latest.json` in the repo root.  
   - If that file is missing, it falls back to dated snapshots (e.g. `square_products_2026-02-11.json`, `square_products_2026-02-10.json`).  
   - You can override the path via `window.STORE_CATALOG_PATH`:

   ```html
   <script>
     // Example: point to a merged or filtered catalog JSON
     window.STORE_CATALOG_PATH = "./square_products_merged.json";
   </script>
   ```

2. **Edited catalog**  
   The UI in the header includes a **Catalog** dropdown (`Live` / `Edited`). When you switch to **Edited**, the storefront tries:

   1. **Edited catalog file (recommended)**  
      - Optional override: `window.STORE_EDITED_CATALOG_PATH`.  
      - Otherwise it looks for:
        - `./square_products_edited.json`
        - `square_products_edited.json`
      - Expected shape:
        ```json
        {
          "products": [
            {
              "id": "...",
              "name": "...",
              "variants": [ ... ]
            }
          ]
        }
        ```

   2. **LocalStorage fallback (advanced / dev)**  
      - Key: `av_storefront_edited_catalog`  
      - Value: JSON-serialized object with a `products` array (same shape as above).  
      - This is mainly useful for pasting a Catalog Console export directly into the browser without writing a file.

   If no edited catalog is found, the storefront logs a warning and silently falls back to the **live** catalog paths.

The current catalog source (`live` or `edited`) is persisted in `localStorage` under `av_storefront_catalog_source` and restored on reload.

## Catalog Console (AeroVista Catalog Console)

Directory: `AeroVista_Catalog_Console/v1.1/`

Purpose:
- Import raw Square CSV/JSON,
- Clean/normalize product + variant data,
- Merge/flatten into a single JSON file with a `products` array,
- Export that JSON to be consumed by the storefront.

Typical workflow:

1. Export catalog from Square.
2. Open `AeroVista_Catalog_Console/v1.1/index.html` locally (or via static hosting).
3. Import the Square export, clean/merge as needed.
4. Export the resulting JSON and either:
   - Save it as `square_products_edited.json` next to `index.html`, or
   - Paste it into `localStorage` as `av_storefront_edited_catalog`.
5. In the storefront, switch the **Catalog** dropdown to **Edited** to preview the edited version.

## Frontend API configuration (checkout)

In `index.html`, checkout uses:

- `window.STORE_API_BASE` (recommended), or
- `CHECKOUT_API_BASE` directly (computed from `STORE_API_BASE` + sensible defaults).

Example configuration for production:

```html
<script>
  // Root for checkout API (FastAPI backend)
  window.STORE_API_BASE = "https://api.aerovista.us";
</script>
```

When `STORE_API_BASE` is not set, the frontend falls back to relative paths (e.g. for local dev against `backend/app.py`).

## Backend

- Entrypoint: `backend/app.py`
- Additional scripts: `backend/scripts/update_sku_map_from_catalog.py`
- Templates / dashboards: `backend/templates/…`

See `backend/README.md` for:

- Environment variables,
- CORS configuration,
- Local dev vs. production deployment.

For a GitHub Pages frontend origin, `ALLOWED_ORIGINS` on the backend should include:

- `https://aerovista-us.github.io`

## Overlay: ordering, visibility, and consistency

**File:** `storefront_overlay.json` (optional). Loaded after the catalog; applied to **both** Live and Edited sources.

- **Ordering / hiding / ads:** Existing behavior: `itemsByVariationId`, `itemsByCartKey`, `collections`, `ads` — control sort order, visibility, and collection rules.
- **Consistency layer (titles, prices, descriptions):**
  - **rules** — `titleFormat` (e.g. `"{brand} • {collection} • {productType} • {color}"`), `defaultBrand`, and `priceLadders` (per product type: base + 2XL/3XL). Applied to every product so naming and pricing stay consistent.
  - **overrides** — Per-product overrides keyed by **productKey** (stable id: `slug(Square id)` or `slug(product name)`). Set `collection`, `productType`, `color`, `descriptionShort` (card), `description` (modal), and optionally `ladderKey` for pricing. A **copy lock** convention is supported: if `copyLock: true` is set on an override (or if that override supplies `description`/`descriptionShort`), the overlay will not auto-rewrite that product’s name/description fields from global rules.
  - Prices are **variant-aware**: at add-to-cart, 2XL/3XL use the ladder’s size price when defined.
  - **Policy:** Square/Printful remain the source of truth for inventory and fulfillment; the overlay is the **presentation layer** for what customers see (names, copy, prices).
  - **Profit floor:** Optional `rules.fees`, `rules.shipBufferCents`, and `rules.costByLadder` (cost in cents per ladder/size) let you run `backend/scripts/validate_profit_floor.py` to ensure no retail price dips below cost + fees + shipping buffer. See [handoffnotes.md](handoffnotes.md) §5 and §10.

## Holographic overlay & product tagging

The storefront has a “holographic” visual treatment used for certain products:

- Products whose name or tags include `"Holographic"` (e.g. **Holographic Goat Sticker**) automatically get a holo overlay on their card image.
- The `.holo-overlay` component is reusable; you can apply it to other cards or feature areas as design evolves.

Future enhancements / extension points:

- Extend `productHasHolo(p)` in `index.html` to use richer tags (e.g. `"audio"`, `"enhanced"`).
- Add `data-holo="1"` or `data-tags="..."` hooks to drive additional styling or behaviors.

## Docs

- **Handoff for devs:** [handoffnotes.md](handoffnotes.md) — where to look, catalog sources, Catalog Console, backend, troubleshooting.
- Hosting & DNS: [docs/HOSTING_AND_DNS.md](docs/HOSTING_AND_DNS.md)
- API/Routing status & verification: [docs/NXCORE_STORE_API_ROUTING_STATUS.md](docs/NXCORE_STORE_API_ROUTING_STATUS.md)

These cover DNS, Cloudflare, NXCore routing, and how the frontend and backend are wired in production.
