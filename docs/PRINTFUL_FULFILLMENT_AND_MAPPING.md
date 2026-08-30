# Printful Fulfillment and Variant Mapping (Square-First)

Square is the source of truth for catalog and retail pricing.
Printful is used for:

- on-demand production and fulfillment, and
- cost / variant reference for profit checks.

This document explains how to use the Printful scripts copied from
the dropship.store treasure trove in a way that **does not** turn
Printful into a catalog or price authority.

---

## 1. What the Printful exporter does

Script: `backend/scripts/printful_my_products_export.py`

This script talks to the Printful API and exports two CSVs:

- `printful_my_products.csv`
- `printful_my_variants.csv`

Contents (conceptual):

- **Products CSV**:
  - store id / name
  - product title and description
  - thumbnail / image URLs
  - status and timestamps
- **Variants CSV**:
  - store id / name
  - sync product id / sync variant id
  - `external_id` (store-specific identifier – you control this)
  - Printful catalog `variant_id`
  - retail prices (and optional subscription prices)
  - catalog costs (and optional subscription costs)
  - technique key (dtg/embroidery/etc.)
  - SKU, print files, mockups, enablement flag

These files are **not** used by the storefront directly. They are
offline artifacts to help you:

- verify costs,
- build a Square → Printful variant map,
- power ops dashboards.

---

## 2. Environment variables

**Fulfillment worker** (submits orders to Printful API):

- **Required for live submission**
  - `PRINTFUL_API_TOKEN` or `PRINTFUL_TOKEN` – Printful API token (e.g. Private token with “View and manage orders”). The worker checks both names.

**Export script** `printful_my_products_export.py` expects:

- **Required**
  - `PRINTFUL_TOKEN` – Printful API token
  - `PRINTFUL_STORE_ID` – single store id, or
  - `PRINTFUL_STORE_IDS` – comma-separated list of store ids
- **Optional**
  - `PRINTFUL_SELLING_REGION` – default `usa`
  - `PRINTFUL_CURRENCY` – default `USD`
  - `PRINTFUL_SUBSCRIPTION_DISCOUNT_PCT` – e.g. `20` for 20% off

For security:

- Keep these values in backend env (e.g. `backend/.env`, Docker env,
  or your deployment secret store).
- Do **not** expose them to the frontend.

---

## 3. Running the exporter

From the repo root, after setting the env vars (Shell syntax shown):

```bash
export PRINTFUL_TOKEN="..."           # or set in .env / Docker
export PRINTFUL_STORE_ID="123456"    # or PRINTFUL_STORE_IDS="123,456"

python backend/scripts/printful_my_products_export.py
```

This will produce two files in the **current working directory**:

- `printful_my_products.csv`
- `printful_my_variants.csv`

You can move or archive these into a dedicated directory if desired,
but by default they sit next to your command.

---

## 4. Building a Square → Printful variant map

Script: `backend/scripts/build_printful_variant_map.py`

Once you have a fresh `printful_my_variants.csv`, you can build a
simple JSON map from your **external id** (usually a Square variation
id) to Printful `variant_id`.

Recommended convention when linking Printful to Square:

- Set `external_id` on each Printful sync variant to your
  **Square variation id** (e.g. `"SQV123..."`).

With that convention, the map becomes:

```json
{
  "SQV123...": "PrintfulVariantID",
  "SQV456...": "PrintfulVariantID2"
}
```

### 4.1 Usage

From the repo root:

```bash
python backend/scripts/build_printful_variant_map.py \
  --variants printful_my_variants.csv
```

This writes:

- `backend/data/printful_variant_map.json`

Structure:

- Keys: `external_id` from `printful_my_variants.csv`
- Values: Printful `variant_id`

You can override paths if needed:

```bash
python backend/scripts/build_printful_variant_map.py \
  --variants path/to/printful_my_variants.csv \
  --output backend/data/custom_printful_map.json
```

The fulfillment worker **does** consume the map: it reads `product_variant_map` (loaded via `import_printful_variant_map.py`) to resolve Square variation ids to Printful sync variant ids and submits orders to the Printful API. See [END_TO_END_AUDIT_2026-03.md](END_TO_END_AUDIT_2026-03.md) for the full flow and verification checklist.

---

## 5. How this fits the Square-first model

- Square remains the **only** catalog + retail pricing source of truth.
- Catalog Console v1.1 edits and validates Square-shaped data.
- The storefront overlay applies presentation rules and profit checks.
- Printful exports and the variant map are used only for:
  - variant identity at fulfillment time, and
  - better cost modeling in your overlay / validators.

You should **not**:

- drive customer-facing catalog from Printful CSVs,
- treat Printful costs as retail prices,
- bypass Square for checkout.

Instead:

- Continue to charge customers via Square (backend already enforces this).
- Use Printful CSVs and the map purely as backend / ops helpers.

