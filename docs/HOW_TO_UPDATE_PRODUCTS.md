# How to Update Products

Step-by-step guide for updating the AeroVista Storefront product catalog and presentation.

**Mental model:** Square = retail truth → Catalog Console edits & validates → Overlay enforces presentation → Printful fulfills. See [HOWTO_OPERATOR_PORTAL.html](../HOWTO_OPERATOR_PORTAL.html) for the daily operator loop.

---

## Contents

- [Option A: Update Live Catalog (Production Feed)](#option-a-update-live-catalog-production-feed)
- [Option B: Edit via Catalog Console (Edited Source)](#option-b-edit-via-catalog-console-edited-source)
- [Option C: Change Presentation Only (Overlay)](#option-c-change-presentation-only-overlay)
- [Option D: Validate Before Publishing](#option-d-validate-before-publishing)
- [Tagging Products for Visitor Filtering](#tagging-products-for-visitor-filtering)
- [URL & Config Overrides](#url--config-overrides)
- [SKU Map & Checkout](#sku-map--checkout)
- [Quick Preview Without Deploy](#quick-preview-without-deploy)
- [Quick Reference](#quick-reference)
- [Troubleshooting](#troubleshooting)

---

## Option A: Update Live Catalog (Production Feed)

Use this when you want the storefront to show **fresh data directly from Square** (no Console edits).

### Steps

1. **Export from Square**
   - Square Dashboard → Items → Export Items (CSV) or use Square API to fetch catalog
   - Save as JSON if using API; save CSV if exporting manually

2. **Convert if needed**
   - **CSV → JSON:** Use `AeroVista_Catalog_Console/v1.1/csv_to_json_converter.html` (standalone) or Import CSV inside the Console
   - **Python:** `scripts/convert_catalog.py` (if configured for your Square export format)

3. **Replace the live catalog file**
   - Save as `square_products_latest.json` at repo root, **or**
   - Set `window.STORE_CATALOG_PATH` in `index.html` (before load) to your custom path/URL

4. **Regenerate SKU map** (required for checkout)
   ```bash
   python tools/generate_sku_map.py --input square_products_latest.json --output backend/sku_map.generated.json
   ```

5. **Update backend env**
   - Point `SQUARE_SKU_MAP_FILE` at the generated file, or paste JSON into `SQUARE_SKU_MAP_JSON`

### Fallback paths

The storefront tries, in order: `STORE_CATALOG_PATH` → `square_products_latest.json` → dated fallbacks (`square_products_2026-02-11.json`, etc.).

---

## Option B: Edit via Catalog Console (Edited Source)

Use this when you want to **clean, curate, and enhance** the catalog before showing it on the storefront.

### Prerequisites

- Open `AeroVista_Catalog_Console/v1.1/index.html` in a browser
- **Chrome or Edge** recommended for **Save to Project** (File System Access API); other browsers fall back to download

### Workflow

1. **Import**
   - **Import JSON** — Drag-drop or select `square_products_latest.json` (or any `{ products: [...] }` shape)
   - **Import CSV** — Square Items export or merged CSV; Console converts to JSON internally
   - **Load Sample** — Populate with sample data for testing

2. **Edit tab**
   - **Sidebar filters:** Group, Type, Tag dropdown, Search — narrow the product list
   - **Product list:** Click a product to edit in the detail panel
   - **Detail panel:**
     - Title, description, group, type, status
     - **Tags:** Preset chips (hoodies, hats, featured, echoverse, etc.) — click to toggle; custom tags in the text field
     - Variants: SKU, color, size, price, inventory; auto-split by "Color, Size" when needed
   - **Raw JSON:** Copy / Apply / Rebuild for advanced edits
   - Duplicate or Delete product as needed

3. **Bulk tab**
   - **Scope:** Filtered / Selected / All products
   - **Tags:** Add or remove tags in bulk
   - **Group / Type:** Set across scope
   - **Pricing:** Value, delta (+/-), type-based JSON, round to .99
   - **Normalize:** Sizes/colors + sort variants
   - **Merge duplicates:** Preview and safe merge

4. **Validate tab**
   - Missing description, missing/invalid price, duplicate SKUs, invalid sizes (XS…5XL), no variants
   - Click an issue → jump to the product
   - **Export Issues CSV** for batch fixes or reporting

5. **Export**
   | Export | Output | Use for |
   |--------|--------|---------|
   | **Export JSON** | `{ meta, products }` | Store catalog (`square_products_edited.json`) |
   | **Export Overlay JSON** | `storefront_overlay.json` shape | Overlay (Load overlay first to merge with existing) |
   | **Export table** | Square-style CSV | Re-import to Square or archive |
   | **Export Edits CSV** | Overlay-style CSV | Reapply edits, diff |
   | **Save to Project** | Writes catalog + overlay to project folder | Direct save with autobackup (Chrome/Edge) |

6. **Deploy edited catalog**
   - Save Export JSON as `square_products_edited.json` next to `index.html`, **or**
   - Use **Save to Project** → writes to repo with backups in `backups/`, **or**
   - Paste JSON into `localStorage.av_storefront_edited_catalog` (same origin) for quick preview

7. **In storefront**
   - Set **Catalog** dropdown (header) to **Edited**
   - Visitors can filter by tags (hoodies, hats, featured, echoverse, etc.) via tag chips below category chips

### Related docs

- [CATALOG_CONSOLE_COMPARISON_AND_ROADMAP.md](CATALOG_CONSOLE_COMPARISON_AND_ROADMAP.md) — v1.1 vs root, feature matrix
- [DATA_QUALITY_AND_VALIDATION.md](DATA_QUALITY_AND_VALIDATION.md) — Data quality + Validate tab + profit floor

---

## Option C: Change Presentation Only (Overlay)

Edit `storefront_overlay.json` to change **how** products are shown — no catalog change. Applies to **both** Live and Edited catalog.

### File structure

```json
{
  "rules": { ... },
  "overrides": { ... },
  "itemsByVariationId": { ... },
  "itemsByCartKey": { ... },
  "collections": [ ... ],
  "ads": [ ... ]
}
```

### Rules (global)

| Key | Purpose |
|-----|---------|
| `titleFormat` | Template: `"{brand} • {collection} • {productType} • {color}"`. Placeholders: `{brand}`, `{collection}`, `{productType}`, `{color}` |
| `defaultBrand` | Fallback when no override sets it (e.g. `"AeroVista"`) |
| `priceLadders` | Per-type base + size bumps. Keys: `tee`, `hoodie_pullover`, `hoodie_zip`, `trucker_hat`, `crewneck`, etc. Each ladder: `{ "base": 34.99, "2XL": 37.99, "3XL": 39.99 }` |
| `fees`, `shipBufferCents`, `costByLadder` | Used by profit floor validator |

### Overrides (per product)

- **Key** = `productKey`: `sq_` + Square item id (when present) or `slug(product name)`
- **Fields:** `collection`, `productType`, `color`, `descriptionShort` (card), `description` (modal), `ladderKey` (force price ladder)
- **copyLock: true** — Treats copy as curated; overlay won’t auto-rewrite from rules

### Visibility & order

- **itemsByVariationId** — Key = Square variation id; values: `cartKey`, `title`, `tags`, `order`, `visible`
- **itemsByCartKey** — Key = `Color__Size`; same fields. Used when variation id is unavailable.
- **collections** — `{ id, title, rule, order }`. Rule examples: `tag:featured`, `tag:division:nexus`
- **ads** — Hero/promotional cards; `cta.href` can use `#collection=featured` for in-page navigation

See `handoffnotes.md` §5 for full schema. Product key = `sq_` + Square item id or slug(name).

---

## Option D: Validate Before Publishing

Run these **before** pushing changes to production.

### Data quality (missing desc/img/price)

```bash
# JSON catalog
python backend/scripts/generate_data_quality_report.py --input square_products_edited.json

# Square Items CSV
python backend/scripts/generate_data_quality_report.py \
  --input square_items_export.csv --kind csv \
  --name-field "Item Name" --description-field "Description" \
  --image-field "Image URL" --price-field "Price"
```

Output: `data_quality_reports/data_quality_issues.csv`

### Profit floor (no losing SKUs)

```bash
python backend/scripts/validate_profit_floor.py storefront_overlay.json square_products_edited.json
```

Uses `rules.fees`, `rules.shipBufferCents`, `rules.costByLadder` in overlay. Exits 1 if any variant profit < 0.

### Pre-publish gate (all-in-one)

```bash
python backend/scripts/pre_publish_gate.py \
  --catalog square_products_edited.json \
  --overlay storefront_overlay.json
```

Runs data quality → profit floor → optional Printful map coverage. Exit 0 = green.

See [DATA_QUALITY_AND_VALIDATION.md](DATA_QUALITY_AND_VALIDATION.md) and [HOWTO_OPERATOR_PORTAL.html](../HOWTO_OPERATOR_PORTAL.html).

---

## Tagging Products for Visitor Filtering

Products can have tags so **visitors** can filter on the storefront (e.g. hoodies, featured, echoverse).

### Preset tags (Catalog Console)

- **featured**, **hoodies**, **crewnecks**, **tees**, **hats**, **stickers**
- **echoverse**, **nxcore**, **aerovista**, **limited**

### Workflow

1. **In Catalog Console**
   - Open a product → Tags section
   - Click preset chips to toggle on/off
   - Add custom tags in the custom tags field (comma-separated)
   - Use the **Tag** dropdown in the sidebar to filter the product list

2. **On storefront**
   - Tag chips appear below category chips
   - Visitors click a tag to filter products
   - Tags and categories are **mutually exclusive** (clicking one clears the other)

3. **Data flow**
   - Tags are stored in `product.tags` (array of strings)
   - Exported in catalog JSON and overlay JSON
   - Overlay `itemsByVariationId` / `itemsByCartKey` can add/override tags per variant

---

## URL & Config Overrides

### Catalog paths (before load)

Set in `index.html` or a script that runs before `loadProducts()`:

| Variable | Purpose |
|----------|---------|
| `window.STORE_CATALOG_PATH` | Live catalog URL/path |
| `window.STORE_EDITED_CATALOG_PATH` | Edited catalog URL/path |
| `window.STORE_API_BASE` | Backend base URL for checkout/bootstrap |

### URL parameters

| Param | Purpose |
|-------|---------|
| `?api=local8088` | Use `http://localhost:8088` for API |

### Hash navigation

| Hash | Purpose |
|------|---------|
| `#collection=featured` | Jump to collection (clears category/tag filters) |

---

## SKU Map & Checkout

Checkout requires a **SKU map** so the backend can build line items. Cart keys (e.g. `Black__M`) must exist in the map.

### Regenerate from catalog

```bash
python tools/generate_sku_map.py --input square_products_edited.json --output backend/sku_map.generated.json
```

### Backend config

- `SQUARE_SKU_MAP_JSON` — inline JSON object (env var)
- `SQUARE_SKU_MAP_FILE` — path to JSON file

Each entry: `{ "name": "Display name", "cents": 5500 }`. Optional: `variationId` for Square catalog lookup.

**Checkout 400 "unknown SKU"** → Add the missing cart key to the SKU map and redeploy backend.

---

## Quick Preview Without Deploy

1. **Edited catalog in browser**
   - Set Catalog to **Edited**
   - Paste full catalog JSON into `localStorage.av_storefront_edited_catalog` (DevTools → Application → Local Storage)
   - Reload storefront

2. **Catalog Console Save to Project**
   - Chrome/Edge: Save to Project writes directly to repo folder
   - Creates `backups/` with timestamped copies before overwrite

3. **Local server**
   - Serve `index.html` from repo root (e.g. `npx serve .` or VS Code Live Server)
   - Catalog files load relative to the page

---

## Quick Reference

| Need to… | Where / How |
|----------|-------------|
| Change live catalog path | `window.STORE_CATALOG_PATH` or `loadProducts()` path list in `index.html` |
| Change edited catalog path | `window.STORE_EDITED_CATALOG_PATH` or edited branch in `loadProducts()` |
| Edit catalog before publishing | Catalog Console v1.1 → Export JSON or Save to Project → `square_products_edited.json` |
| Export store overlay from Console | Catalog Console → Export Overlay JSON (optionally Load overlay to merge) |
| Change titles/prices/descriptions | `storefront_overlay.json` (`rules` + `overrides`) |
| Add or edit tags | Catalog Console → product Tags section; preset chips + custom |
| Filter products by tag (visitors) | Tag chips on storefront; set in Console per product |
| Fix checkout 400 (unknown SKU) | Add cart keys to backend SKU map; regenerate with `tools/generate_sku_map.py` |
| Point at different API | `window.STORE_API_BASE` or URL `?api=local8088` |
| Run pre-publish gate | `python backend/scripts/pre_publish_gate.py --catalog square_products_edited.json --overlay storefront_overlay.json` |
| Deploy storefront | Static host: `index.html`, catalog JSON, `storefront_overlay.json`, `favicon.svg`, `img/` |
| Deploy backend | Docker Compose; see `backend/README.md` |
| Daily operator loop | [HOWTO_OPERATOR_PORTAL.html](../HOWTO_OPERATOR_PORTAL.html) |
| Dev quick-reference | [handoffnotes.md](../handoffnotes.md) |
| Deployment files | [DEPLOYMENT_WHICH_FILES.md](DEPLOYMENT_WHICH_FILES.md) |

---

## Troubleshooting

| Issue | Likely cause | Fix |
|-------|--------------|-----|
| Storefront shows wrong products | Catalog dropdown (Live vs Edited) | Set to Edited if using edited catalog; ensure `square_products_edited.json` exists or `av_storefront_edited_catalog` in localStorage |
| "Unable to load product catalog" | 404 or invalid JSON | Check Network tab; ensure JSON has `products` array; if Edited, verify file path or localStorage |
| Tag chips not showing | Catalog not loaded or no tags | Ensure products have `tags` array; `buildTagChips()` runs on load and catalog switch |
| Checkout 400 "unknown SKU" | Cart key missing in backend map | Add to `SQUARE_SKU_MAP_JSON` / map file; regenerate with `tools/generate_sku_map.py` |
| Gate fails data quality | Missing desc/img/price | Open `data_quality_reports/data_quality_issues.csv`; fix in Console or Square; re-export |
| Gate fails profit floor | Variant below cost + buffer | Adjust `rules.priceLadders`, `rules.costByLadder`, or `rules.shipBufferCents` in overlay |
| Save to Project not available | Wrong browser | Use Chrome or Edge; File System Access API required |
| Overlay changes not visible | Override key mismatch | `productKey` = `sq_` + Square item id or slug(name); check `applyOverlayToProducts` in console |

---

*Ties together [handoffnotes.md](../handoffnotes.md), [HOWTO_OPERATOR_PORTAL.html](../HOWTO_OPERATOR_PORTAL.html), and [DATA_QUALITY_AND_VALIDATION.md](DATA_QUALITY_AND_VALIDATION.md) for product update workflows.*
