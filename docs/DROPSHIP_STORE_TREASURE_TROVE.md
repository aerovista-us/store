# Dropship.Store “Treasure Trove” — Inventory & Reuse Guide

**Source repo:** `D:\mini.shops\dropship.store`  
**Target project:** `D:\mini.shops\av_storefront`  
**Caveat:** Some rules or processes in dropship.store may be outdated or incorrect; validate before porting.

**Source of truth:** In av_storefront, **Square is the source of truth** for catalog, pricing, and checkout. **Printful is for fulfillment only** — we use it to fulfill orders (and optionally for cost data / profit checks), not as the authority for what we sell or what we charge.

This doc summarizes what’s in dropship.store and what we can reuse to build out av_storefront (Square-first; Printful as fulfillment/cost reference).

---

## 1. What’s in dropship.store (high level)

- **No folder literally named “past attempts”** — the “treasure trove” is the whole repo: multiple storefront bundles, Printful export tooling, and an ops dashboard.
- **Flask app** on port 8088: export UI, ops dashboard, job APIs, file downloads.
- **Printful-focused:** catalog export (v2 API), “my products” export (multi-store, including Square-linked stores), technique-aware pricing, data quality reports.
- **Several “past” storefront bundles:** `aerovista_storefront/`, `aerovista_storefront_bundle/`, `aerovista_storefront_bundle_filemode_fix/` (catalog-driven HTML + JSON).
- **Static SEO pack:** `AeroVista_Storefront_SEO_SKU_Pages_Pack/` (index + per-SKU HTML pages).

---

## 2. Directory map (relevant parts)

```
dropship.store/
├── app.py                              # Flask: export UI, dashboard, /api/run, status, downloads, /api/stores
├── printful_catalog_export.py          # Full Printful v2 catalog → category CSVs (products + variants, technique-aware)
├── printful_my_products_export.py      # Printful “my products” (multi-store, Native + Square) → products/variants CSVs
├── pull-catalog.py                     # Standalone small catalog export (hoodies, hats, shirts)
├── generate_data_quality_report.py     # Scans export CSVs → missing descriptions/images/prices report
├── requirements.txt                    # flask, requests
├── index.html, storefront.html, filled.html   # AeroVista store landing / storefront variants
├── workorder.html                      # Lumina work order / print-ready PNG export
├── echostory_coherence_player.html     # EchoStory album booklet (unrelated to store)
├── exports/                            # Generated Printful CSVs; subfolders: my_products/, to use/
├── templates/
│   ├── printful.export.html            # Export UI: token, region, currency, store, mode, live log, downloads
│   └── printful_ops_dashboard.html     # Ops dashboard: load CSVs, KPIs, product JSON, profit, SEO, exports
├── docs/                               # SETUP, PROJECT_OVERVIEW, EXPORT_TOOL, DASHBOARD, API, AUDIT_REPORT, DATA_QUALITY
├── aerovista_storefront/               # Early catalog-driven bundle
│   ├── storefront_dynamic.html
│   ├── catalog.printful.usd_usa.json
│   └── STORE_BUNDLE_README.md
├── aerovista_storefront_bundle/        # Same idea, later bundle
├── aerovista_storefront_bundle_filemode_fix/  # Same + file-mode/CORS fix
└── AeroVista_Storefront_SEO_SKU_Pages_Pack/
    └── storefront_pack/pages/*.html    # Static SEO product pages (index + SKU pages)
```

---

## 3. Reusable assets (what we could use in av_storefront)

| Asset | Path in dropship.store | What it does | Reuse idea for av_storefront |
|-------|------------------------|--------------|------------------------------|
| **Printful export Flask app** | `app.py` | Serves export UI, runs catalog/my-products export jobs, `/api/run`, `/api/status/<id>`, `/downloads/<file>`, `/api/exports`, `/api/stores` | Optional: add a “Printful export” to av_storefront backend for fulfillment/cost data only; reuse job + status + download pattern. Square remains catalog/checkout source. |
| **Export UI** | `templates/printful.export.html` | Token, region, currency, store selector, export mode (catalog / my_products / both), run, live log, file list/downloads | Use only if you need a UI to run Printful export (e.g. to get fulfillment variant ids or costs). Do not use Printful export to drive catalog. |
| **Ops dashboard** | `templates/printful_ops_dashboard.html` | Load products/variants CSVs from server or upload; tabs: overview/KPIs, product pages (JSON), profit, SEO; export processed data | Optional reference for Printful-side ops (costs, fulfillment variants). Catalog Console stays the Square/overlay editor. |
| **Printful catalog export** | `printful_catalog_export.py` | Full Printful v2 catalog by category; technique-aware pricing; writes `printful_*_products.csv` and `printful_*_variants_prices.csv` | Low priority: Square is source of truth. Use only if you need Printful catalog for reference or cost comparison, not to feed the storefront. |
| **Printful my-products export** | `printful_my_products_export.py` | Exports synced “my products” from one or multiple Printful stores (Native + Square); retail + costs, mockups, print files; merges stores into one CSV set | Use for **fulfillment**: Square variationId/cartKey → Printful variant id mapping, and optionally **cost** data for profit-floor checks. Not for catalog or pricing source. |
| **Standalone catalog pull** | `pull-catalog.py` | Smaller Printful v2 export (hoodies, hats, shirts) to CSV, no Flask | Optional; only if you need a small Printful subset for cost/variant reference. |
| **Data quality report** | `generate_data_quality_report.py` | Reads export CSVs from `exports/`, reports missing descriptions, thumbnails, images, prices; writes CSVs + `docs/DATA_QUALITY_REPORT.txt` | Run on **Square** export CSVs (if you produce them) before feeding Catalog Console / overlay. Not for driving catalog from Printful. |
| **Catalog-driven storefront** | `aerovista_storefront/storefront_dynamic.html` + `catalog.printful.usd_usa.json` | Loads a single catalog JSON and renders products (no build) | Reference only. av_storefront uses Square-shaped catalog + overlay; reuse UI ideas, not Printful as catalog source. |
| **SEO SKU pages** | `AeroVista_Storefront_SEO_SKU_Pages_Pack/storefront_pack/pages/*.html` | Static index + per-SKU product pages | Use structure and styling for av_storefront SEO/SKU pages; drive content from **Square** catalog or overlay. |
| **Storefront HTML** | `index.html`, `storefront.html`, `filled.html` | AeroVista landing and storefront variants | Styling/layout ideas; av_storefront already has a more advanced index.html (two sources, overlay, consistency layer). |
| **Stores API** | `app.py` `/api/stores` | Lists Printful stores (including Square) for dropdown | Only relevant if you add Printful export; use to pick which Printful store to export for fulfillment/cost mapping. |
| **Docs** | `docs/EXPORT_TOOL.md`, `DASHBOARD.md`, `API.md`, `PROJECT_OVERVIEW.md` | How to use export tool, dashboard, APIs, architecture | Base for av_storefront docs; frame as “Square-first; Printful for fulfillment/cost only.” |

---

## 4. What to build out in av_storefront using this (Square = source of truth)

- **Catalog and pricing:** Square only.  
  - Active storefront catalog = Square export / merged output in `square_products_latest.json`, unless you explicitly override with `STORE_CATALOG_PATH`. Catalog Console exports are review files until you promote them to that active path.  
  - **Do not** use Printful as the source for what we sell or what we charge. Dropship.store’s Printful export is useful only as described below.

- **Printful: fulfillment + optional cost reference**  
  - Use **printful_my_products_export.py** only to: (1) get **Printful variant ids** so each Square variation/cart line maps to the correct Printful fulfillment variant; (2) optionally get **cost** data for profit-floor checks (overlay `costByLadder` / `validate_profit_floor.py`).  
  - Do **not** use Printful export to drive catalog or pricing in the storefront; Square (and overlay) do that.

- **Backend: Square first; Printful export optional**  
  - av_storefront backend stays Square-focused (checkout, bootstrap, sku_map).  
  - If you add Printful export (e.g. for variant mapping or cost reports), run it as a **secondary** tool — e.g. separate route or script that writes CSVs/maps for ops, not for replacing Square catalog.

- **Ops dashboard vs Catalog Console**  
  - **Catalog Console** = editor for **Square** catalog (import Square CSV/JSON, edit, export review JSON, then replace `square_products_latest.json` or use `STORE_CATALOG_PATH`).  
  - **printful_ops_dashboard.html** (dropship.store) = optional reference for “load CSVs, profit, SEO”; if reused, treat it as a **Printful-side** ops view (costs, fulfillment variants), not as catalog source.

- **Profit and data quality**  
  - **validate_profit_floor.py** (av_storefront) uses overlay cost/fees/ship buffer; costs can be filled from Printful export **or** manually.  
  - **generate_data_quality_report.py** (dropship.store): if you ever export Square catalog to CSV, run it to catch missing descriptions/prices before pushing to Square or overlay.

- **Printful variant mapping (fulfillment only)**  
  - Use **printful_my_products_export.py** output to build a map: Square variationId / cartKey → **Printful variant id**. Store in sku_map (e.g. `printfulVariantId`) or a separate fulfillment map. Used only when submitting orders to Printful, not for display or price.

- **SEO / SKU pages**  
  - Reuse **AeroVista_Storefront_SEO_SKU_Pages_Pack** structure; drive content from **Square** catalog or overlay (same as index.html), not from Printful.

---

## 5. Caveats (outdated or incorrect possible)

- **API versions:** Printful v1 sync + v2 catalog; Square API may have changed since. Verify endpoints and response shapes before relying on them.
- **Store IDs / env:** dropship.store uses `PRINTFUL_STORE_ID` / `PRINTFUL_STORE_IDS`; av_storefront uses Square + optional Printful. Align env vars and which store(s) we export.
- **Dashboard merge logic:** AUDIT_REPORT mentions “patch layer architecture” and “both stores exporting”; confirm that the merge logic (Native + Square) still matches how we want to combine stores in av_storefront.
- **Cost data:** Some variants had missing cost (API structure); fixes were applied in the export script. Re-validate when porting.
- **File paths and CORS:** The “filemode_fix” bundle addressed file:// vs served; av_storefront already serves from a server. No need to copy that fix blindly.

---

## 6. Quick reference: env vars (dropship.store)

- `PRINTFUL_TOKEN` (required)  
- `PRINTFUL_STORE_ID` or `PRINTFUL_STORE_IDS` (comma-separated)  
- `PRINTFUL_SELLING_REGION` (default `worldwide`)  
- `PRINTFUL_CURRENCY` (default `USD`)  
- `PRINTFUL_TECHNIQUE_PRIORITY` (default `dtg,embroidery,digital,dtf,sublimation`)  
- `PRINTFUL_SUBSCRIPTION_DISCOUNT_PCT` (optional)

---

**See also:** `CATALOG_CONSOLE_COMPARISON_AND_ROADMAP.md` — compares Catalog Console root vs v1.1 and ties treasure trove reuse to the recommended Console workflow (Square-first).

*Doc generated from exploration of `D:\mini.shops\dropship.store` for use in `av_storefront`. Re-validate any rules or processes before production use.*
