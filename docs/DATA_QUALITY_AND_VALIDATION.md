# Data Quality and Validation Workflow (Square-First)

Square is your catalog and pricing source of truth. Catalog Console v1.1
and the storefront overlay build on top of that; they do not replace it.

This document ties together three validation layers:

- **Data quality checks on Square exports** (this repo)
- **Catalog Console v1.1 Validate tab** (in-browser)
- **Profit floor validator** (overlay + cost/fees/ship buffer)

The goal is to catch surprises *before* they reach customers:
missing copy, missing images, missing prices, or losing SKUs.

---

## 1. Data quality report (Square CSV / JSON)

Script: `backend/scripts/generate_data_quality_report.py`

This script is the Square-focused counterpart to the
`generate_data_quality_report.py` from the dropship.store treasure trove.
It does **not** talk to Printful; it only inspects your Square-shaped
catalog for missing fields.

Checks:

- missing descriptions
- missing images
- missing prices

Supported inputs:

- Square export **CSV** (Items export)
- Square-shaped **JSON** catalogs:
  - `square_products_latest.json`
  - any review/export catalog JSON you plan to validate before making it active
  - any other `{ "products": [ ... ] }` shape

### 1.1 Usage – JSON catalogs

From the repo root:

```bash
python backend/scripts/generate_data_quality_report.py \
  --input square_products_latest.json
```

or for a review/export catalog:

```bash
python backend/scripts/generate_data_quality_report.py \
  --input square_products_edited.json
```

The script:

- Prints a summary to stdout.
- Writes `data_quality_reports/data_quality_issues.csv` at the repo root:
  - Columns: `product_id`, `name`,
    `missing_description`, `missing_image`, `missing_price`.

### 1.2 Usage – Square Items CSV export

If you export items from Square into a CSV, you can point the script at
that file and tell it which columns hold names, descriptions, images,
and prices.

Example (common Square headers, case-insensitive):

```bash
python backend/scripts/generate_data_quality_report.py \
  --input square_items_export.csv \
  --kind csv \
  --name-field "Item Name" \
  --description-field "Description" \
  --image-field "Image URL" \
  --price-field "Price"
```

You can also provide `--id-field` if you have a stable product id column.

The output CSV is the same as for JSON inputs and lives under
`data_quality_reports/`.

---

## 2. Catalog Console v1.1 Validate tab

Tool: `AeroVista_Catalog_Console/v1.1/index.html`

Once your Square data is in Catalog Console v1.1 (via Import JSON or
Import CSV), run the **Validate** tab for in-memory catalog checks:

- missing description
- missing/invalid prices
- duplicate SKUs
- invalid sizes (XS–5XL)
- products with no variants

You can:

- Click an issue to jump directly to the product.
- Export an **Issues CSV** for tracking or bulk fixes.

This validation layer works on the in-memory catalog inside Console,
after you have applied bulk rules and merges.

Typical Console workflow:

1. Import Square export (CSV or JSON) into v1.1.
2. Use **Bulk** tab to normalize sizes/colors, apply pricing rules,
   and merge duplicates.
3. Run **Validate**:
   - Fix flagged issues in-place.
   - Optionally export Issues CSV for later.
4. Export JSON for review, then replace `square_products_latest.json` or use `STORE_CATALOG_PATH`.

---

## 3. Profit floor validator (overlay + costs/fees/ship buffer)

Script: `backend/scripts/validate_profit_floor.py`

This script treats Square retail as truth, but uses your overlay rules
to make sure you never dip below:

> cost + shipping buffer + processor fees

Inputs:

- `storefront_overlay.json`:
  - `rules.priceLadders`
  - `rules.costByLadder`
  - `rules.fees`:
    - `processorPct`
    - `processorFixedCents`
  - `rules.shipBufferCents`
- A catalog JSON:
  - typically `square_products_latest.json` or the review/export file you will promote to active

Usage (from repo root, defaults shown):

```bash
python backend/scripts/validate_profit_floor.py \
  storefront_overlay.json \
  square_products_latest.json
```

Behavior:

- Walks every product and variant that has a ladder.
- Computes:
  - `retail_cents` from ladder (`base`, `2XL`, `3XL`, etc.).
  - `cost_cents` from `rules.costByLadder`.
  - `fee_cents` from `rules.fees`.
  - `shipBufferCents` from overlay.
- Flags any variant where:

  \[
  \text{retail} - \text{cost} - \text{shipBuffer} - \text{fees} < 0
  \]

- Prints violations to stderr and exits **1** if any are found.
- Prints an OK summary and exits **0** when everything passes.

This validator lines up with the “Printful as cost reference only”
stance: costs can come from Printful exports or manual entries, but
retail remains Square’s price.

---

## 4. Recommended validation order

When you refresh catalog/pricing, run these checks in this order:

1. **Square export → Data quality script**
   - Run `generate_data_quality_report.py` on your Square CSV or
     JSON catalog.
   - Fix obvious holes (no descriptions, no images, no prices).

2. **Catalog Console v1.1 Validate**
   - Import into Console.
   - Apply Bulk rules and merges.
   - Run Validate and fix issues (missing description/price, bad sizes,
     duplicate SKUs).

3. **Profit floor (overlay + costs/fees/ship buffer)**
   - Ensure `storefront_overlay.json` has current ladders, costs,
     fees, and ship buffer.
   - Run `validate_profit_floor.py` against the catalog you are about
     to publish.
   - Do not deploy if there are any negative-profit variants.

4. **Only then**:
   - Export a review catalog JSON, then make it active only after checks pass.
   - (Optional) Generate a “Square Update CSV” or run an API script to
     push updated prices back into Square.

Each layer is fast to run and keeps the “Square-first, Printful as
fulfillment + cost reference only” contract intact.

