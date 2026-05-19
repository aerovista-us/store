# AeroVista Storefront

Canonical static storefront for AeroVista Apparel, backed by a Square JSON catalog and an optional Python backend API.

**Developers:** See **[handoffnotes.md](handoffnotes.md)** for where things live, how the catalog loads, overlay rules, SKU maps, and common fixes. For current product-add intent, start with **[docs/PRODUCT_CATALOG_INTENT_AND_GOALS.md](docs/PRODUCT_CATALOG_INTENT_AND_GOALS.md)**.

**Source of Truth:** **[SOT.json](SOT.json)** lists canonical files and systems for this repo; subtree manifests live in **`AeroVista_Catalog_Console/SOT.json`** and **`backend/SOT.json`**. See **[SOT_README.md](SOT_README.md)**. Runtime stack detail for the API: **[backend/SOT.json](backend/SOT.json)**.

## Canonical production URLs

| Surface | URL |
|---------|-----|
| **Storefront** | `https://aerovista.us` / `https://www.aerovista.us` (Firebase Hosting; see [docs/HOSTING_AND_DNS.md](docs/HOSTING_AND_DNS.md)) |
| **Checkout API** | `https://api.aerovista.us` |

If you change where the site is hosted, update Open Graph / Twitter / JSON-LD URLs in `index.html` so they match the public URL customers use.

## Top-level layout

- `index.html` – primary storefront (static hosting–friendly, no build step).
- `square_products_latest.json` – Square export the storefront loads by default (with dated fallbacks like `square_products_2026-02-11.json`).
- `AeroVista_Catalog_Console/` – Catalog Console surfaces for cleaning/merging Square exports and exporting refined JSON.
- `backend/` – optional **Flask** API used for checkout, webhooks, ops dashboards, etc.
- `public/` – legacy/archived frontend; not served in production.

Archived Firebase/public variants are not used or served; `index.html` at the repo root is authoritative.

## Catalog data (single loader)

`index.html` loads **one** catalog JSON (Square-shaped: top-level `{ "products": [ ... ] }`):

1. **`window.STORE_CATALOG_PATH`** — if set (before load), this path/URL is tried first.
2. Otherwise **`square_products_latest.json`** in the repo root (with a small list of dated fallbacks if the primary file is missing).

```html
<script>
  // Example: point to a merged catalog or a staging file
  window.STORE_CATALOG_PATH = "./square_products_merged.json";
</script>
```

**Rule of thumb:** the storefront loads a **single JSON source**. Edited catalogs must **replace** `square_products_latest.json` or be explicitly supplied via `STORE_CATALOG_PATH`.

**Current product intake rule:** a fresh Square export is source reference data, not an automatic deploy artifact. Run `scripts/audit_square_export.py` first, classify new/changed rows, fix blockers, then promote a passing candidate catalog.

**Refined / Console exports:** there is no separate “edited” mode or header toggle in the current UI. Export from Catalog Console, then **replace or merge into** `square_products_latest.json` (or set `STORE_CATALOG_PATH` to your exported file) before deploy. See [docs/STORE_WORKFLOW.md](docs/STORE_WORKFLOW.md).

## Catalog Console (AeroVista Catalog Console)

Current surfaces:

- `AeroVista_Catalog_Console/aerovista_catalog_console_v2.html` — newer local-first cleanup, validation, intake, and export console.
- `AeroVista_Catalog_Console/v1.1/` — established v1.1 console workflow.

Purpose:

- Import raw Square CSV/JSON,
- Clean/normalize product + variant data,
- Merge/flatten into a single JSON file with a `products` array,
- Export JSON and optional overlay snippets.

Typical workflow:

1. Export catalog from Square.
2. Run `python scripts/audit_square_export.py "path/to/export.xlsx"` to create a preview and report.
3. Open Catalog Console v2 or v1.1 locally.
4. Import the audit preview or Square export, clean/merge as needed, and keep internal/service rows hidden or out of the public catalog.
5. Export JSON and merge or save as `square_products_latest.json` (or the file referenced by `STORE_CATALOG_PATH`) only after validation.
6. Regenerate the backend SKU map ([handoffnotes.md](handoffnotes.md) §6), run the pre-publish gate, and deploy.

## Frontend API configuration (checkout)

In `index.html`, checkout uses:

- `window.STORE_API_BASE` (recommended), or
- `CHECKOUT_API_BASE` directly (computed from `STORE_API_BASE` + sensible defaults).

Example configuration for production:

```html
<script>
  // Root for checkout API (Flask backend)
  window.STORE_API_BASE = "https://api.aerovista.us";
</script>
```

When `STORE_API_BASE` is not set, the frontend falls back to relative paths (e.g. for local dev against `backend/app.py`).

## Backend

- Entrypoint: `backend/app.py`
- SKU map helpers: `tools/generate_sku_map.py` (canonical source of truth); `backend/scripts/update_sku_map_from_catalog.py` (thin wrapper that writes `backend/.env` using the same key logic)
- Templates / dashboards: `backend/templates/…`

See `backend/README.md` for:

- Environment variables,
- CORS configuration,
- Local dev vs. production deployment.

For a GitHub Pages frontend origin, `ALLOWED_ORIGINS` on the backend should include:

- `https://aerovista-us.github.io`

For the production custom domain, also include `https://aerovista.us` and `https://www.aerovista.us` (see [docs/HOSTING_AND_DNS.md](docs/HOSTING_AND_DNS.md)).

## Overlay: ordering, visibility, and consistency

**File:** `storefront_overlay.json` (optional). Loaded after the catalog.

- **Ordering / hiding / ads:** `itemsByVariationId`, `itemsByCartKey`, `collections`, `ads` — sort order, visibility, collection rules.
- **Consistency layer (titles, prices, descriptions):**
  - **rules** — `titleFormat` (e.g. `"{brand} • {collection} • {productType} • {color}"`), `defaultBrand`, and `priceLadders` (per product type: base + 2XL/3XL). Applied to products unless overridden.
  - **overrides** — Per-product overrides keyed by **productKey** (stable id: `slug(Square id)` or `slug(product name)`). Set `collection`, `productType`, `color`, `descriptionShort` (card), `description` (modal), and optionally `ladderKey` for pricing. **copy lock:** if `copyLock: true` or curated descriptions are set, the overlay will not auto-rewrite that product’s name/description from global rules.
  - Prices are **variant-aware**: at add-to-cart, 2XL/3XL use the ladder’s size price when defined.
  - **Policy:** Square/Printful remain the source of truth for inventory and fulfillment; the overlay is the **presentation layer** for what customers see (names, copy, prices).
  - **Profit floor:** Optional `rules.fees`, `rules.shipBufferCents`, and `rules.costByLadder` (cost in cents per ladder/size) let you run `backend/scripts/validate_profit_floor.py` to ensure no retail price dips below cost + fees + shipping buffer. See [handoffnotes.md](handoffnotes.md) §5.

**Current curated top-six grid order**

The storefront’s first two rows are intentionally pinned in the overlay, not taken from raw Square export order:

1. `AeroVista eGift Card`
2. `Synthetic Souls Drop`
3. `glitch logo • AeroVista • Tee - black`
4. `AeroVista “Apex Mesh” Trucker Cap`
5. `AeroVista Apex Draft Pullover Hoodie (Black, M)`
6. `Drafted A • Premium Sweatshirt`

That sequence is controlled in `storefront_overlay.json` by `ads[].order` and `itemsByVariationId.*.order`. If the top grid changes, update the overlay and then redeploy the storefront assets.

## Holographic overlay & product tagging

The storefront has a “holographic” visual treatment used for certain products:

- Products whose name or tags include `"Holographic"` (e.g. **Holographic Goat Sticker**) automatically get a holo overlay on their card image.
- The `.holo-overlay` component is reusable; you can apply it to other cards or feature areas as design evolves.

Future enhancements / extension points:

- Extend `productHasHolo(p)` in `index.html` to use richer tags (e.g. `"audio"`, `"enhanced"`).
- Add `data-holo="1"` or `data-tags="..."` hooks to drive additional styling or behaviors.

## Docs

- **Handoff for devs:** [handoffnotes.md](handoffnotes.md) — map of the repo, catalog load, overlay, backend, troubleshooting.
- **Doc index:** [docs/docs_index.md](docs/docs_index.md)
- **Product catalog intent:** [docs/PRODUCT_CATALOG_INTENT_AND_GOALS.md](docs/PRODUCT_CATALOG_INTENT_AND_GOALS.md) — current goals, May 5 export baseline, readiness bar.
- **How to update products:** [docs/HOW_TO_UPDATE_PRODUCTS.md](docs/HOW_TO_UPDATE_PRODUCTS.md) — catalog updates, overlay, validation.
- **Store workflow:** [docs/STORE_WORKFLOW.md](docs/STORE_WORKFLOW.md) — base vs refined catalog vs presentation layer.
- Hosting & DNS: [docs/HOSTING_AND_DNS.md](docs/HOSTING_AND_DNS.md)
- API/Routing status & verification: [docs/NXCORE_STORE_API_ROUTING_STATUS.md](docs/NXCORE_STORE_API_ROUTING_STATUS.md)

These cover DNS, Cloudflare, NXCore routing, and how the frontend and backend are wired in production.
