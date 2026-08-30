# How to Update Products

Step-by-step guide for updating the AeroVista Storefront product catalog and presentation.

**Mental model:** Square export = intake/reference → audit and classify → Catalog Console or pipeline cleans selected products → overlay merchandises → Printful fulfills. See [PRODUCT_CATALOG_INTENT_AND_GOALS.md](PRODUCT_CATALOG_INTENT_AND_GOALS.md) for current intent.

**Storefront runtime rule:** the storefront loads **one** catalog JSON at a time. Edited catalogs must **replace** `square_products_latest.json` or be supplied explicitly via `window.STORE_CATALOG_PATH`.

**Current rule:** do not blindly replace `square_products_latest.json` with a fresh Square export. Audit it first, because Square may include internal/service/test rows and incomplete listings.

---

## Contents

- [Option 0: Audit a Fresh Square Export](#option-0-audit-a-fresh-square-export)
- [Option A: Update Live Catalog After Audit](#option-a-update-live-catalog-after-audit)
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

## Option 0: Audit a Fresh Square Export

Use this first whenever a new Square `.xlsx` export arrives.

### Steps

1. Save the export in the repo or point to the downloaded file.

2. Run the non-destructive audit:

   ```bash
   python scripts/audit_square_export.py "AeroVista_Catalog_Console/v1.1/1149XBNG8C8ZE_catalog-2026-05-05-0546.xlsx"
   ```

3. Review the generated files under `output/`:
   - `*.audit.md` — human-readable product delta and blocker report
   - `*.audit.json` — machine-readable summary
   - `*.pipeline_preview.json` — candidate catalog after convert/merge/polish/image assignment

4. Classify added/changed rows:
   - `publish`
   - `needs image`
   - `needs copy`
   - `hide/internal`
   - `hold`

5. Only after classification should you move into Catalog Console cleanup or live catalog replacement.

### May 5 reference baseline

The current fresh Square export is:

```text
AeroVista_Catalog_Console/v1.1/1149XBNG8C8ZE_catalog-2026-05-05-0546.xlsx
```

Its audit showed:

- 57 storefront-preview products after merge/polish, compared with 40 live products.
- 19 added-by-name candidates.
- 16 missing image assignments/files.
- preview pre-publish gate fails data quality.
- many SKU-map collision warnings caused by ambiguous `Color__Size` keys.

That export is current reference data, not yet a publish-ready live catalog.

---

## Option A: Update Live Catalog After Audit

Use this when audited and curated product data is ready to become the live storefront catalog.

### Steps

1. **Export from Square**
   - Square Dashboard → Items → Export Items (CSV) or use Square API to fetch catalog
   - Save as JSON if using API; save CSV if exporting manually

2. **Audit first**
   - Run `scripts/audit_square_export.py` for `.xlsx` exports.
   - Do not continue if the audit shows public products with missing images, missing descriptions, bad prices, or internal rows that need hiding.

3. **Convert if needed**
   - **CSV → JSON:** Use `AeroVista_Catalog_Console/v1.1/csv_to_json_converter.html` (standalone) or Import CSV inside the Console
   - **Python:** `scripts/convert_catalog.py` (if configured for your Square export format)

4. **Replace the live catalog file**
   - Save as `square_products_latest.json` at repo root, **or**
   - Set `window.STORE_CATALOG_PATH` in `index.html` (before load) to your custom path/URL

5. **Regenerate SKU map** (required for checkout)
   ```bash
   python tools/generate_sku_map.py --input square_products_latest.json --output backend/sku_map.generated.json
   ```

6. **Update backend env**
   - Point `SQUARE_SKU_MAP_FILE` at the generated file, or paste JSON into `SQUARE_SKU_MAP_JSON`

### Fallback paths

The storefront tries, in order: `STORE_CATALOG_PATH` → `square_products_latest.json` → dated fallbacks (`square_products_2026-02-11.json`, etc.).

---

## Option B: Edit via Catalog Console, then deploy as the live catalog

Use this when you want to **clean, curate, and enhance** the catalog before it goes live. The storefront does **not** load a separate “edited” file from the header; it always uses whatever JSON you deploy as the active catalog (`square_products_latest.json` by default, or `window.STORE_CATALOG_PATH`).

### Prerequisites

- Preferred newer console: open `AeroVista_Catalog_Console/aerovista_catalog_console_v2.html` in a browser.
- Existing v1.1 console: open `AeroVista_Catalog_Console/v1.1/index.html` in a browser.
- **Chrome or Edge** recommended for **Save to Project** (File System Access API); other browsers fall back to download

Use v2 when you want the local-first cleanup cockpit, new-product intake, issue export, and product brief exports. Use v1.1 when you need the older established flow.

### Workflow

1. **Import**
   - **Import JSON** — Drag-drop or select `square_products_latest.json`, an audit `*.pipeline_preview.json`, or any `{ products: [...] }` shape
   - **Import CSV/XLSX** — Square Items export; Console converts internally
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
   - Missing image assignments
   - Internal/test rows that should stay hidden
   - Click an issue → jump to the product
   - **Export Issues CSV** for batch fixes or reporting

5. **Export**
   | Export | Output | Use for |
   |--------|--------|---------|
   | **Export JSON** | `{ meta, products }` | Save as `square_products_latest.json` (or merge into it), or point `STORE_CATALOG_PATH` at the export |
   | **Export Overlay JSON** | `storefront_overlay.json` shape | Overlay (Load overlay first to merge with existing) |
   | **Export table** | Square-style CSV | Re-import to Square or archive |
   | **Export Edits CSV** | Overlay-style CSV | Reapply edits, diff |
   | **Save to Project** | Writes catalog + overlay to project folder | Direct save with autobackup (Chrome/Edge) |

6. **Deploy the catalog the storefront actually loads**
   - Replace **`square_products_latest.json`** with your export (after backup), **or**
   - Use **Save to Project** (Chrome/Edge) → writes into the repo with backups under `backups/`, **or**
   - Set `window.STORE_CATALOG_PATH` in `index.html` (or an inline script before load) to your JSON path/URL

7. **Run gates**
   ```bash
   python backend/scripts/pre_publish_gate.py \
     --catalog square_products_latest.json \
     --overlay storefront_overlay.json
   ```

8. **Verify on the storefront**
   - Reload the site; confirm Network tab loads your catalog file
   - Visitors can filter by tags (hoodies, hats, featured, echoverse, etc.) via tag chips when those tags exist on products

### Related docs

- [CATALOG_CONSOLE_COMPARISON_AND_ROADMAP.md](CATALOG_CONSOLE_COMPARISON_AND_ROADMAP.md) — v1.1 vs root, feature matrix
- [DATA_QUALITY_AND_VALIDATION.md](DATA_QUALITY_AND_VALIDATION.md) — Data quality + Validate tab + profit floor

---

## Option C: Change Presentation Only (Overlay)

Edit `storefront_overlay.json` to change **how** products are shown — no catalog change. Applies on top of whichever catalog JSON is currently loaded.

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

### Current storefront pinned order

The first six storefront tiles are currently curated in `storefront_overlay.json` with explicit `order` values:

1. `AeroVista eGift Card`
2. `Synthetic Souls Drop`
3. `glitch logo • AeroVista • Tee - black`
4. `AeroVista “Apex Mesh” Trucker Cap`
5. `AeroVista Apex Draft Pullover Hoodie (Black, M)`
6. `Drafted A • Premium Sweatshirt`

Use this as the pattern when curating the top grid:
- promo cards belong in `ads[]`
- product cards belong in `itemsByVariationId`
- lower `order` value renders earlier
- if Square names change but storefront presentation should stay fixed, keep the curated title in the overlay entry

See [handoffnotes.md](store-internal/handoffnotes.md) §5 for full schema. Product key = `sq_` + Square item id or slug(name).

---

## Option D: Validate Before Publishing

Run these **before** pushing changes to production.

### Data quality (missing desc/img/price)

```bash
# JSON catalog (use the same file you deploy, often square_products_latest.json)
python backend/scripts/generate_data_quality_report.py --input square_products_latest.json

# Square Items CSV
python backend/scripts/generate_data_quality_report.py \
  --input square_items_export.csv --kind csv \
  --name-field "Item Name" --description-field "Description" \
  --image-field "Image URL" --price-field "Price"
```

Output: `data_quality_reports/data_quality_issues.csv`

### Profit floor (no losing SKUs)

```bash
python backend/scripts/validate_profit_floor.py storefront_overlay.json square_products_latest.json
```

Uses `rules.fees`, `rules.shipBufferCents`, `rules.costByLadder` in overlay. Exits 1 if any variant profit < 0.

### Pre-publish gate (all-in-one)

```bash
python backend/scripts/pre_publish_gate.py \
  --catalog square_products_latest.json \
  --overlay storefront_overlay.json
```

Runs data quality → profit floor → optional Printful map coverage. Exit 0 = green.

For a candidate preview, point the gate at the preview file instead of the live catalog:

```bash
python backend/scripts/pre_publish_gate.py \
  --catalog output/1149XBNG8C8ZE_catalog-2026-05-05-0546.pipeline_preview.json \
  --overlay storefront_overlay.json
```

See [DATA_QUALITY_AND_VALIDATION.md](DATA_QUALITY_AND_VALIDATION.md) and [operator-tools/HOWTO_OPERATOR_PORTAL.html](operator-tools/HOWTO_OPERATOR_PORTAL.html).

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
| `window.STORE_CATALOG_PATH` | Override catalog URL/path (otherwise `square_products_latest.json` + fallbacks) |
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

Checkout requires a **SKU map** so the backend can build line items. The current cart line `sku` values are **`Color__Size`** (e.g. `Black__M`) — the same keys **`tools/generate_sku_map.py`** emits.

Reality check: this key shape is fragile when products or variants have blank colors. Many rows collapse to `Default__M`, `Default__L`, etc. The frontend also sends Square `variationId`, and the backend can resolve by `variationId`; preserving `variationId` is the safer path.

### Regenerate from catalog (canonical)

```bash
python tools/generate_sku_map.py --input square_products_latest.json --output backend/sku_map.generated.json
```

For dry-run audits, always override both outputs:

```bash
python tools/generate_sku_map.py \
  --input output/preview.json \
  --output output/sku_map.audit.json \
  --env-output output/sku_map.audit.env
```

If you omit `--env-output`, the tool writes `backend/sku_map.generated.env` even when `--output` points to `output/`.

Optional: update `backend/.env` in place from the repo catalog (same key logic as the tool):

```bash
python backend/scripts/update_sku_map_from_catalog.py
# Or: python backend/scripts/update_sku_map_from_catalog.py /path/to/catalog.json
```

### Backend config

- `SQUARE_SKU_MAP_JSON` — inline JSON object (env var)
- `SQUARE_SKU_MAP_FILE` — path to JSON file

Each entry: `{ "name": "Display name", "cents": 5500 }`. Optional: `variationId` for Square catalog lookup.

**Checkout 400 "unknown SKU"** → Add the missing `Color__Size` key to the SKU map and redeploy backend.

If the product has a Square variation ID, prefer fixing the catalog/frontend/backend path so that `variationId` is present and resolvable instead of adding ambiguous `Default__Size` entries.

---

## Quick Preview Without Deploy

1. **Point the storefront at a local JSON file**
   - Temporarily set `window.STORE_CATALOG_PATH` to a file you are iterating on (served from the same origin), or swap `square_products_latest.json` locally and reload.

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
| Audit fresh Square export | `python scripts/audit_square_export.py "path/to/export.xlsx"` |
| Change catalog file/path | `window.STORE_CATALOG_PATH` or replace `square_products_latest.json` |
| Edit catalog before publishing | Catalog Console v2 or v1.1 → Export JSON or Save to Project → merge into `square_products_latest.json` |
| Export store overlay from Console | Catalog Console → Export Overlay JSON (optionally Load overlay to merge) |
| Change titles/prices/descriptions | `storefront_overlay.json` (`rules` + `overrides`) |
| Add or edit tags | Catalog Console → product Tags section; preset chips + custom |
| Filter products by tag (visitors) | Tag chips on storefront; set in Console per product |
| Fix checkout 400 (unknown SKU) | Add cart keys to backend SKU map; regenerate with `tools/generate_sku_map.py` |
| Point at different API | `window.STORE_API_BASE` or URL `?api=local8088` |
| Run pre-publish gate | `python backend/scripts/pre_publish_gate.py --catalog square_products_latest.json --overlay storefront_overlay.json` |
| Deploy storefront | Static host: `index.html`, catalog JSON, `storefront_overlay.json`, `favicon.svg`, `img/` |
| Deploy backend | Docker Compose; see `backend/README.md` |
| Daily operator loop | [operator-tools/HOWTO_OPERATOR_PORTAL.html](operator-tools/HOWTO_OPERATOR_PORTAL.html) |
| Dev quick-reference | [store-internal/handoffnotes.md](store-internal/handoffnotes.md) |
| Deployment files | [FILES_REQUIRED_FOR_SITE.md](FILES_REQUIRED_FOR_SITE.md) |

---

## Troubleshooting

| Issue | Likely cause | Fix |
|-------|--------------|-----|
| Storefront shows wrong products | Wrong file deployed or cached | Confirm Network tab loads the intended JSON; bump `STORE_BUILD_ID` in `index.html` if needed |
| "Unable to load product catalog" | 404 or invalid JSON | Check Network tab; ensure JSON has `products` array; verify `STORE_CATALOG_PATH` if set |
| Tag chips not showing | Catalog not loaded or no tags | Ensure products have `tags` array; `buildTagChips()` runs on load and catalog switch |
| Checkout 400 "unknown SKU" | Cart key missing in backend map | Add to `SQUARE_SKU_MAP_JSON` / map file; regenerate with `tools/generate_sku_map.py` |
| Gate fails data quality | Missing desc/img/price | Open `data_quality_reports/data_quality_issues.csv`; fix in Console or Square; re-export |
| Gate fails profit floor | Variant below cost + buffer | Adjust `rules.priceLadders`, `rules.costByLadder`, or `rules.shipBufferCents` in overlay |
| Save to Project not available | Wrong browser | Use Chrome or Edge; File System Access API required |
| Overlay changes not visible | Override key mismatch | `productKey` = `sq_` + Square item id or slug(name); check `applyOverlayToProducts` in console |
| Audit preview has service/test rows | Square export includes non-storefront items | Classify as hidden/internal or remove from public catalog before publish |
| SKU map has many collisions | Blank product/variant colors produce `Default__Size` keys | Preserve real colors and Square `variationId`; do not publish until checkout identity is clear |

---

*Ties together [store-internal/handoffnotes.md](store-internal/handoffnotes.md), [operator-tools/HOWTO_OPERATOR_PORTAL.html](operator-tools/HOWTO_OPERATOR_PORTAL.html), and [DATA_QUALITY_AND_VALIDATION.md](DATA_QUALITY_AND_VALIDATION.md) for product update workflows.*
