# Store Workflow: What to Edit, Where to Edit It, and Why

**Current operating intent:** see [PRODUCT_CATALOG_INTENT_AND_GOALS.md](PRODUCT_CATALOG_INTENT_AND_GOALS.md). As of 2026-05-05, fresh Square exports are treated as intake/reference data first, not as automatic deploy artifacts.

**Goal:** Understand the three editing paths for the store, when to use each one, and how to avoid drift, confusion, or cleanup work later.

---

## The Big Idea

The store has **three layers** of work:

| Layer | Role |
|-------|------|
| **Base catalog** | Product truth (what exists, prices, variants, raw data) |
| **Refined catalog** | Storefront-ready product truth (clean titles, descriptions, grouping, tags) |
| **Presentation layer** | How things are shown (collections, ads, order, visibility, merchandising) |

**Core rule:** Use the right layer for the right kind of change.

- **Catalog** = product truth  
- **Refined catalog** = refined product truth  
- **Overlay** = presentation truth  

Do not blur those lines unless there is a real reason.

---

## How This Repo Maps to the Layers

| Layer | In this repo |
|-------|------------------|
| **Base catalog** | `square_products_latest.json` (export from Square or merge/polish output). The storefront loads this as the single catalog source unless `window.STORE_CATALOG_PATH` overrides it. |
| **Refined catalog** | `square_products_latest_edited.json` or `square_products_latest_edited_brand_refined.json`. Used when you polish in Catalog Console and export; that file can **replace** `square_products_latest.json` before deploy so the store shows refined data. |
| **Presentation layer** | `storefront_overlay.json` — ads, collections, `itemsByVariationId` / `itemsByCartKey` overrides, rules (e.g. price ladders). Optional overrides only; catalog drives names/descriptions when overlay doesn’t override. |

**Runtime formula:**  
**Catalog + Presentation layer = final store.**

The storefront uses **one** catalog file (`square_products_latest.json`). If you have a refined export (e.g. brand-refined), copy or merge it into `square_products_latest.json` and deploy so the store runs on that truth.

## Current Reality: Audit Before Replace

The latest Square export can contain a wider universe than the public storefront: real merch, draft products, services, deposits, tests, internal rows, and incomplete listings. For example, the May 5 export preview included rows such as `Temp`, `Rental`, `MuseFace`, and service/deposit-style items alongside real apparel.

Therefore the default workflow is now:

1. Treat the Square export as the current source reference.
2. Run a non-destructive audit.
3. Classify new/changed rows.
4. Clean and validate only the products intended for public storefront use.
5. Replace `square_products_latest.json` only after the candidate catalog passes gates.

Use:

```bash
python scripts/audit_square_export.py "path/to/latest_square_export.xlsx"
```

The audit writes a preview catalog and Markdown report under `output/` without touching the live catalog.

---

## The 3 Workflows

### Workflow A — Square Intake / Audit First

**Use when:** Square is the current source reference and products, prices, or variants changed at the source.

1. Export the latest catalog from Square.
2. Run `scripts/audit_square_export.py` against the export.
3. Review added, removed, changed, image, price, and SKU-map findings in the generated report.
4. Classify rows as publish, needs image, needs copy, hide/internal, or hold.
5. Clean the publish candidates using Catalog Console v2, Catalog Console v1.1, or the Python pipeline.
6. Run the pre-publish gate against the candidate catalog.
7. Use the passing candidate as `square_products_latest.json`.
8. Update the presentation layer (`storefront_overlay.json`) only for ads, collections, featured order, visibility, or storefront-only tags.
9. Deploy storefront assets (catalog + overlay).

**Best when:** Actual product data changed at the source, but the export still needs curation before publishing.

---

### Workflow B — Catalog Console Refinement

**Use when:** The catalog already loads and is mostly correct, but you want storefront polish (cleaner names, better descriptions, grouping, tags).

1. Import the **current** catalog (`square_products_latest.json`) or an audit preview into Catalog Console.
2. Edit titles, descriptions, categories, tags, and grouping.
3. Export the refined catalog (e.g. `square_products_latest_edited.json` or a brand-refined version).
4. Replace or merge that export into `square_products_latest.json` so the storefront uses it.
5. Adjust the presentation layer if needed (collections, ads, visibility).
6. Deploy and verify the store reads the updated catalog.

**Best when:** Base data mostly works; the storefront needs curated product copy and structure.

Current console surfaces:

- `AeroVista_Catalog_Console/aerovista_catalog_console_v2.html` — newer local-first console for cleanup, validation, product intake, and exports.
- `AeroVista_Catalog_Console/v1.1/index.html` — existing documented console. Still useful, especially for current v1.1 workflows.

---

### Workflow C — Presentation-only pass

**Use when:** Product data is correct; only store experience needs work (order, collections, ads, visibility).

1. **Do not** change the catalog JSON.
2. Edit only **`storefront_overlay.json`**: tags, collections, ads, visibility, order, any display overrides.
3. Reload and verify: cleaner grouping, right products featured, ads in the right places.

**Best when:** Nothing is wrong with product facts; the store needs better presentation and merchandising.

Current example:
- The top six storefront tiles are pinned by overlay order, not by Square export order.
- Current sequence:
  1. `AeroVista eGift Card`
  2. `Synthetic Souls Drop`
  3. `glitch logo • AeroVista • Tee - black`
  4. `AeroVista “Apex Mesh” Trucker Cap`
  5. `AeroVista Apex Draft Pullover Hoodie (Black, M)`
  6. `Drafted A • Premium Sweatshirt`

---

## How to Decide Which Workflow to Use

**First question:** Did the actual **product facts** change?

- **Yes** → Use Square-first or Catalog Console refinement; update the catalog.
- **No** → Do not touch the catalog; use the presentation layer only.

**Operational rule:**  
Do not put presentation logic into the product layer, and do not use the overlay to “fix” real product facts. That creates drift.

---

## What Belongs Where

| Edit in **catalog** (or refined catalog) | Edit in **presentation layer** |
|------------------------------------------|---------------------------------|
| Product names, descriptions | Featured order, collections |
| Prices, variants | Ads, promotional tiles |
| Categories, product grouping | Visibility, display order |
| Real product facts | Merchandising, filters, tags for display |

## Publish Readiness Bar

A public product should not be promoted until it has:

- customer-facing name and description,
- image field pointing at an existing file under `img/`,
- valid category,
- valid variant price, SKU, and Square variation ID,
- no pre-publish gate failures,
- checkout identity that resolves without relying on ambiguous cart keys,
- intentional overlay visibility/order if it is featured.

Rows such as `Temp`, `Rental`, `MuseFace`, services, deposits, tests, or internal items must stay hidden or out of the public catalog unless explicitly approved for storefront display.

---

## Common Mistakes to Avoid

1. **Editing the live catalog by hand as if it’s permanent**  
   That file can be regenerated from Square or from a refined export. Prefer: fix at source or in the refined-catalog workflow, then replace/merge into `square_products_latest.json`.

2. **Using the presentation layer to fix product facts**  
   Correcting wrong titles or missing info only in the overlay makes product truth and storefront truth diverge. Fix in Square or in the refined catalog.

3. **Forgetting which catalog file is deployed**  
   The storefront reads **`square_products_latest.json`** by default (or whatever path you set in `STORE_CATALOG_PATH`). If you only change a side file (e.g. a Console export) and don’t merge or replace the deployed catalog file, the store won’t reflect the change.

4. **Mixing cleanup and merchandising in the same place**  
   Keep product-data cleanup in the catalog/refined catalog and display/merchandising in the overlay.

5. **Blindly replacing the live catalog with a Square export**
   A fresh Square export is current, but not necessarily public-store-ready. Audit it first.

6. **Ignoring cart-key collisions**
   The current SKU-map generator emits `Color__Size` keys. Many current products have blank colors, so keys like `Default__M` collide across many variants. Square `variationId` needs to be preserved and treated as the safer checkout identity.

---

## Fast Reference

- **New Square export arrived?** → Run `scripts/audit_square_export.py` first.
- **Product facts changed?** → Edit Square or the refined catalog; then update `square_products_latest.json` only after validation.
- **Storefront appearance / order / ads changed?** → Edit `storefront_overlay.json`.
- **Final output wrong?** → First check: is the store loading the file you actually updated? Confirm `square_products_latest.json` is the one deployed.

**Habit:** Before any change, ask: *Is this a truth change or a display change?*  
Truth → catalog workflow. Display → presentation workflow.

---

## Refined catalog and brand alignment

When you have a **brand-refined** export (e.g. `square_products_latest_edited_brand_refined.json`) with:

- Improved grouping and `group_key`
- Brand, collection, `product_type`, tags, `sort_order`
- Normalized categories
- AeroVista-aligned titles and descriptions
- Cleaner, consistent copy across variants

use it as the **refined product truth**:

1. Replace `square_products_latest.json` with that file (after backing up the current one), or  
2. Merge the refined data into `square_products_latest.json` (e.g. via Catalog Console or a script).

Then run **merge** and **polish** if your pipeline expects one product per design and canonical categories. After that, deploy so the store runs on the refined catalog plus the same presentation layer.

This keeps **product truth** (including brand voice) in the catalog and **presentation** in the overlay.
