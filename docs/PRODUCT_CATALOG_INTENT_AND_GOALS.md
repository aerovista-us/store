# Product Catalog Intent and Goals

Last updated: 2026-05-05

## Intent

Build a repeatable product-add workflow that starts from Square, protects the working storefront, and makes every publish decision explicit.

Square is the current product source reference, but a fresh Square export is not automatically storefront-ready. It can contain internal/service/admin rows, missing images, incomplete descriptions, zero-price rows, or product names that need customer-facing cleanup. The store should only publish products that pass the storefront readiness bar.

## Current Reality

- Live storefront file: `index.html`.
- Live catalog file: `square_products_latest.json`.
- Presentation file: `storefront_overlay.json`.
- Latest Square reference export: `AeroVista_Catalog_Console/v1.1/1149XBNG8C8ZE_catalog-2026-05-05-0546.xlsx`.
- Audit tool for new exports: `scripts/audit_square_export.py`.
- Current Catalog Console surfaces:
  - `AeroVista_Catalog_Console/aerovista_catalog_console_v2.html` is the newer local-first cleanup console.
  - `AeroVista_Catalog_Console/v1.1/index.html` is still documented and useful, but docs should not imply it is the only workflow.

## May 5 Export Baseline

The May 5 Square export was audited non-destructively. It was not promoted to the live storefront.

Generated audit files:

- `output/1149XBNG8C8ZE_catalog-2026-05-05-0546.audit.md`
- `output/1149XBNG8C8ZE_catalog-2026-05-05-0546.audit.json`
- `output/1149XBNG8C8ZE_catalog-2026-05-05-0546.pipeline_preview.json`

Audit summary:

- Raw Square rows converted to 322 product records.
- Pipeline preview after merge/polish produced 57 products and 322 variants.
- Current live catalog has 40 products and 176 variants.
- 19 products appear added by name.
- 16 preview products are missing image assignments/files.
- Pre-publish gate fails on the preview because of missing images, missing descriptions for `MuseFace` and `Rental`, and zero price for `MuseFace`.
- SKU-map dry run reports many cart-key collisions because `Color__Size` is not unique enough for the current catalog.

## Goals

1. Preserve the current working store while new products are evaluated.
2. Use Square exports as intake, not as an automatic deploy artifact.
3. Keep product facts in the catalog: title, description, category, image, variant, price, SKU, Square variation ID.
4. Keep merchandising in the overlay: featured order, ads, collections, visibility, storefront-only tags.
5. Make internal/service rows impossible to publish accidentally.
6. Fix or work around checkout identity collisions before scaling product additions.
7. Produce a short audit report for every new Square export so the next update begins from facts, not memory.

## Non-Goals For This Pass

- Do not blindly replace `square_products_latest.json` with the May 5 export.
- Do not use overlay overrides to hide poor catalog hygiene unless the product is intentionally being merchandised differently.
- Do not promote rows such as `Temp`, `Rental`, `MuseFace`, or service/deposit products without an explicit decision.
- Do not treat missing images as acceptable for promoted products.

## Product Readiness Bar

A product can be published when:

- It is a real customer-facing product, not an internal/service/test row.
- It has a customer-facing name and description.
- It has an assigned image file that exists under `img/`.
- It has one or more variants with valid price, SKU, and Square variation ID.
- Its category is one of the storefront categories or intentionally added to the storefront.
- Its checkout path resolves by Square variation ID or a unique SKU-map entry.
- It passes `backend/scripts/pre_publish_gate.py`.
- At least one add-to-cart/checkout payload test has been run for the product family.

## Working Product-Add Flow

1. Export the current catalog from Square.
2. Run:

```bash
python scripts/audit_square_export.py "path/to/latest_square_export.xlsx"
```

3. Read the generated Markdown audit in `output/`.
4. Classify added/changed products:
   - `publish`
   - `needs image`
   - `needs copy`
   - `hide/internal`
   - `hold`
5. Use Catalog Console v2 or the Python pipeline to clean the selected publish candidates.
6. Keep hidden/internal products out of the public catalog or explicitly hidden.
7. Regenerate the SKU map using explicit output paths during review:

```bash
python tools/generate_sku_map.py --input output/preview.json --output output/sku_map.audit.json --env-output output/sku_map.audit.env
```

8. Run the pre-publish gate against the candidate catalog and current overlay.
9. Preview locally before replacing `square_products_latest.json`.
10. Promote only after image, copy, price, checkout, and merchandising checks are clean.

## Open Decisions

- Decide whether checkout should use Square `variationId` as the primary identity and keep `Color__Size` as display/fallback metadata.
- Decide which May 5 added products are real store products versus internal/service rows.
- Assign or create images for the May 5 candidates that should be published.
- Decide whether v2 console becomes the primary documented console, with v1.1 retained as legacy/reference.

