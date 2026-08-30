# Catalog cleanup and polish

**See also:** [Store Workflow: What to Edit, Where](STORE_WORKFLOW.md) — three layers (catalog, refined catalog, presentation) and when to use each.

## Process (documented pipeline)

Recommended order when you get a fresh export or want to polish the catalog:

1. **Merge** – One product per design, all variants combined  
   `python scripts/merge_catalog_by_design.py`  
   → Writes `square_products_latest.json`. Backup: `square_products_latest_pre_merge.json`. Log: `data_quality_reports/catalog_merge_log.txt`.

2. **Polish** – Normalize categories, dedupe variants, sort, normalize visibility/shipping  
   `python scripts/polish_catalog.py`  
   → Updates same file. Backup: `square_products_latest_pre_polish.json`. Log: `data_quality_reports/catalog_polish_log.txt`. Appends run to `meta.polish_history` in the JSON.

3. **Optional: description normalization** – Only if you have many duplicate-name rows before merge and want to copy best description into empty siblings  
   `python scripts/analyze_catalog.py`  
   → Log: `data_quality_reports/description_normalization_log.txt`. Run before merge if needed.

4. **Regenerate design markdown** – One `.md` per design with description, variants table, image link  
   `python scripts/generate_product_md.py`  
   → Writes `docs/catalog/<slug>.md`.

5. **Assign catalog images** – Connect products to existing files in `img/`  
   `python scripts/assign_catalog_images.py`  
   → Sets `product.image` in `square_products_latest.json` for each product that matches a rule and has that file in `img/`. Log: `data_quality_reports/catalog_image_assignments.txt`. The storefront uses catalog `image` when present, else `findProductImage()`.

6. **Audit live store** – Screenshots and report  
   `node scripts/playwright-audit.js`  
   → `output/playwright/store-audit.png`, `store-audit-full.png`, `audit-report.txt` (product cards on page, console, broken images).

---

## What each step does

### 1. Playwright audit
- **Script:** `scripts/playwright-audit.js`
- **Run:** `node scripts/playwright-audit.js`
- **Output:**
  - `output/playwright/store-audit.png` – viewport screenshot
  - `output/playwright/store-audit-full.png` – full-page screenshot
  - `output/playwright/audit-report.txt` – product card titles, console errors, broken images, gift-card image status

### 2. Merge: one post per design
- **Script:** `scripts/merge_catalog_by_design.py`
- **Run:** `python scripts/merge_catalog_by_design.py`
- **Effect:** `square_products_latest.json` is rewritten so there is **one product per design** (same normalized name), with all variants (colors/sizes) combined. Matches the storefront’s grouping.
- **Backup:** `square_products_latest_pre_merge.json`
- **Log:** `data_quality_reports/catalog_merge_log.txt` – lists each design and which original product IDs were merged

### 3. Polish: normalize and clean
- **Script:** `scripts/polish_catalog.py`
- **Run:** `python scripts/polish_catalog.py`
- **Effect:**
  - **Categories** – Normalized to storefront canon: `hoodies`, `crewnecks`, `hats`, `tees`, `stickers`, `apparel` (e.g. `hat` → `hats`, `utility` + sticker → `stickers`, `longsleevetee` → `tees`).
  - **Variants** – Duplicate color+size rows removed; variants sorted by color then size.
  - **Products** – Sorted by `sort_order` then name.
  - **Visibility / shipping_enabled** – Normalized to `visible`/`hidden` and `Y`/`""`.
  - **Descriptions** – Whitespace trimmed (no truncation).
- **Backup:** `square_products_latest_pre_polish.json`
- **Log:** `data_quality_reports/catalog_polish_log.txt` – per-product category changes, variant dedupes, visibility/shipping changes
- **Meta:** Each run is appended to `meta.polish_history` in the JSON (timestamp and counts) so the process is documented inside the catalog.

### 4. Description normalization (optional, pre-merge)
- **Script:** `scripts/analyze_catalog.py`
- **Log:** `data_quality_reports/description_normalization_log.txt` – which duplicate groups got description copy propagated

### 5. Missing images (one-time code change)
- In `index.html`, `findProductImage()` was updated so designs that pointed at missing assets return `null` and use the SVG/gradient fallback.

---

## Current state

- **Catalog:** 62 design-level products in `square_products_latest.json` (merged from 201 rows). Categories polished to `hoodies` | `crewnecks` | `hats` | `tees` | `stickers` | `apparel`. Each run of polish is recorded in `meta.polish_history`.

---

## Keeping templates without showing them on the public page

You can keep placeholder or future items in the catalog and overlay **without** them appearing on the live store.

### Catalog (`square_products_latest.json`)

- **Shown on site:** Products with `"visibility": "visible"` (or omitted; default is visible).
- **Hidden from site:** Products with `"visibility": "hidden"` or `"visibility": "draft"` or `"visibility": false`.
- **Workflow:** Add new or template products with `"visibility": "hidden"`. When copy and details are ready, set `"visibility": "visible"` (or remove the field) so they appear. The storefront filters these out before building the grid, so unfinished cells never show.

### Overlay (`storefront_overlay.json`)

- **Ads:** Only entries with `"visible": true` are shown; set `"visible": false` for upcoming or template ads.
- **itemsByVariationId / itemsByCartKey:** Per-entry `"visible": false` hides that override from the grid (the product can still exist from the catalog, but the overlay title/description won’t apply if hidden). Use `"visible": false` for stub or template overrides you’re not ready to show.

Result: you can keep templates and future items in both files and only flip them to visible when they’re ready; the public page never shows unfinished cells.

---

## Making adjustments each time

- **New Square export:** Replace or merge into the catalog, then run **merge** → **polish**. Check `catalog_merge_log.txt` and `catalog_polish_log.txt`.
- **Per-design copy and images:** Edit `docs/catalog/*.md`. Regenerate with `python scripts/generate_product_md.py` after catalog changes.
- **Audit live site:** Run `node scripts/playwright-audit.js` and check `output/playwright/audit-report.txt` and the screenshots.
