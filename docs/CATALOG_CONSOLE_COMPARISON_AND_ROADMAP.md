# Catalog Console: Root vs v1.1 + Treasure Trove Cross-Reference

**Purpose:** Compare `AeroVista_Catalog_Console` (root) to `AeroVista_Catalog_Console/v1.1`, cross-reference with the dropship.store treasure trove, and recommend the best features for catalog management moving forward (Square as source of truth).

---

## 1. Side-by-side comparison: Root vs v1.1

| Aspect | Root (`AeroVista_Catalog_Console/`) | v1.1 (`AeroVista_Catalog_Console/v1.1/`) |
|--------|--------------------------------------|------------------------------------------|
| **Entrypoint** | `index.html` | `index.html` (recommended in root README) |
| **Import** | Import JSON only | Import JSON **+ Import CSV** |
| **Export** | Export JSON, Export Edits CSV | Same |
| **UI structure** | Single edit panel (product list + detail + variants) | **Three tabs:** Edit, **Bulk**, **Validate** |
| **Bulk actions** | None | Mass tag add/remove; set Group/Type in bulk; **pricing rules** (set value, delta +/-, type-based JSON, round .99); **normalize** sizes/colors + sort variants; **merge duplicates** (preview + safe merge) |
| **Validation** | None | **Validation panel:** missing description, missing/invalid price, duplicate SKUs, invalid sizes (XS…5XL), no variants; click issue → jump to product; **Export Issues CSV** |
| **CSV tool** | None | **csv_to_json_converter.html** — standalone CSV → JSON (offline) |
| **Sample / empty state** | Load Sample in empty state | Load Sample + drag-drop import, friendlier empty state |
| **Code size** | `app.js` ~725 lines | `app.js` ~1,476 lines (bulk + validation + CSV import) |
| **Extra files** | `square_products_latest.json` (sample) | Same + `whats_new.txt`, `csv_to_json_converter.html`, dated catalog examples |

**Verdict:** v1.1 is a strict superset of root. Root is the earlier, single-panel editor; v1.1 adds Bulk, Validate, and CSV import/converter. The root README already directs users to **open v1.1/index.html** and Docker serves v1.1.

---

## 2. Feature matrix (what each version has)

| Feature | Root | v1.1 |
|---------|------|------|
| Import JSON (`{products}` or array) | ✅ | ✅ |
| Import CSV | ❌ | ✅ |
| Export JSON (`{meta, products}`) | ✅ | ✅ |
| Export Edits CSV (overlay) | ✅ | ✅ |
| Save/Load localStorage | ✅ | ✅ |
| Filter by group/type/search | ✅ | ✅ |
| Filter by tag (dropdown) | ❌ | ✅ |
| Edit product: title, description, group, type, tags, status | ✅ | ✅ |
| Preset tags (chips) + custom tags per product | ❌ | ✅ |
| Edit variants: SKU, color, size, price, inventory | ✅ | ✅ |
| Auto-split variants (e.g. "Color, Size") | ✅ | ✅ |
| Duplicate / Delete product | ✅ | ✅ |
| Raw JSON edit (Copy / Apply / Rebuild) | ✅ | ✅ |
| **Bulk: scope** (Filtered / Selected / All) | ❌ | ✅ |
| **Bulk: tags / group / type** | ❌ | ✅ |
| **Bulk: pricing** (value, delta, type-based JSON, round .99) | ❌ | ✅ |
| **Bulk: normalize sizes/colors, sort variants** | ❌ | ✅ |
| **Bulk: merge duplicates** (preview + safe) | ❌ | ✅ |
| **Validate: run checks + export issues CSV** | ❌ | ✅ |
| **Validate: click issue → jump to product** | ❌ | ✅ |
| **Standalone CSV → JSON converter** | ❌ | ✅ (separate HTML) |
| **Sample data / empty state** | Basic | Improved (drag-drop, hints) |
| **Orders / DB view** (orders, webhooks, fulfillment from API) | ❌ | ✅ (optional; requires backend) |

---

## 3. Cross-reference with the treasure trove (dropship.store)

Treasure trove doc: `docs/DROPSHIP_STORE_TREASURE_TROVE.md`. Square = source of truth; Printful = fulfillment/cost only.

| Treasure trove asset | Relation to Catalog Console | Best use for catalog management |
|----------------------|-----------------------------|----------------------------------|
| **printful_ops_dashboard.html** | Dashboard loads CSVs, product JSON, profit, SEO. | **Reference only:** Console is the **Square** catalog editor. If we ever add a “profit” or “SEO” tab to Console, reuse ideas (e.g. profit table, issue list). Do not drive catalog from Printful. |
| **generate_data_quality_report.py** | Scans CSVs for missing descriptions, images, prices. | Run on **Square export CSVs** (if we generate them) before importing into Console. Complements v1.1’s **Validate** panel (which works on in-memory catalog). Use script for batch/pre-import; use Validate for post-edit checks. |
| **printful_my_products_export.py** | Exports “my products” (incl. Square-linked) to CSVs. | **Not for catalog source.** Use only to get **Printful variant ids** and optional **cost** data. Console stays Square-focused: import Square CSV/JSON, edit, export review JSON, then replace `square_products_latest.json` or use `STORE_CATALOG_PATH`. |
| **Export UI (printful.export.html)** | Token, store, mode, run, log, downloads. | Only if we add a “Square export” or “Printful export” UI in av_storefront backend. Console itself stays local-first (file import/export). |
| **Data flow (Square → Console → overlay)** | Treasure trove frames Console as Square editor. | Align: **Square export** → import into **Console (v1.1)** → edit + validate + bulk → **Export JSON** → make that file the active storefront catalog by replacing `square_products_latest.json` or using `STORE_CATALOG_PATH` → optionally upsert back to Square. |

**Takeaway:** Use v1.1 as the single Catalog Console. Pull from the treasure trove only for: (1) data quality **script** on Square CSVs before they hit Console, (2) optional profit/SEO **ideas** in Console later, (3) Printful variant/cost **mapping** outside Console (fulfillment, not catalog).

---

## 4. Best features for catalog management moving forward

### 4.1 Standardize on v1.1

- **Use v1.1 as the canonical Catalog Console.** Root can stay as a legacy/backup or be deprecated; all new workflow and docs should point to `v1.1/index.html` (and Docker already serves it).
- **Recommended workflow (Square-first):**
  1. Export catalog from Square (CSV or API) → save as `square_products_latest.json` or CSV.
  2. If CSV: use **v1.1 Import CSV** or **csv_to_json_converter.html** → then Import JSON in Console.
  3. In Console: **Filter** (group/type/search) → **Bulk** (normalize sizes/colors, pricing rules, merge duplicates) → **Validate** (fix issues, export issues CSV if needed) → **Export JSON**.
  4. Save as a review/export JSON or push back to Square (CSV import or API upsert). The storefront still loads one active catalog file: `square_products_latest.json` by default, or a `STORE_CATALOG_PATH` override.

### 4.2 Features to keep and lean on

- **Bulk (v1.1):** Normalize sizes/colors, type-based pricing, merge duplicates. These keep the catalog consistent with storefront overlay (e.g. price ladders, `productKey`/overrides) and reduce manual edits.
- **Validate (v1.1):** Missing description/price, duplicate SKUs, invalid sizes, no variants. Catches issues before export; Export Issues CSV helps batch fixes or reporting. Complements `validate_profit_floor.py` (overlay cost/ship buffer) and, if we use it, `generate_data_quality_report.py` on Square CSVs.
- **Import CSV (v1.1):** Square exports or merged CSVs can be imported directly instead of converting elsewhere. Keeps Console the single place for “Square-shaped” editing.
- **Export Edits CSV:** Overlay-style edits for reapplying later or diffing; aligns with storefront overlay and consistency layer.

### 4.3 Optional next upgrades (from v1.1 whats_new.txt)

- **Rule presets:** Save/load pricing ladders and tag packs (align with `storefront_overlay.json` rules so Console can apply same ladders).
- **Conflict resolver:** Duplicate SKUs → auto-append suffix or choose resolution (reduces Validate noise).
- **Merge by handle/title only + stronger merge heuristics:** Better dedupe when Square has near-duplicates.
- **Inline issue badges:** Show validation issues in the product list so problems are visible without opening the Validate tab.

### 4.4 Orders / DB view (v1.1)

- An optional **Orders** tab in the Console header lets founders view store DB data (orders, webhook events, fulfillment jobs) from the backend API.
- Requires the backend `GET /api/ops/db` endpoint. User sets an API base URL (stored in `localStorage`); Load fetches and renders three read-only tables.
- For founder use over Tailscale. If the Console is on a different origin than the API, add the Console origin to backend `ALLOWED_ORIGINS` (see Console and backend READMEs).

### 4.5 What not to duplicate from the treasure trove

- Do **not** make Console depend on Printful for catalog or pricing. Printful export is for fulfillment variant mapping and cost reference only.
- Do **not** replace Console with the full Printful ops dashboard; use the dashboard only as inspiration for profit/SEO views if we add them to Console later.

---

## 5. Summary and recommendation

| Question | Answer |
|----------|--------|
| **Which Console to use?** | **v1.1** — it has Bulk, Validate, and CSV import; root is legacy. |
| **Root vs v1.1 in one line** | v1.1 = root + Bulk actions + Validation panel + Import CSV + csv_to_json_converter + better empty state. |
| **Treasure trove role** | Data quality **script** on Square CSVs; **ideas** for profit/SEO in Console; **Printful** only for fulfillment/cost mapping. Catalog source = Square; Console = Square editor. |
| **Best features moving forward** | Standardize on v1.1; lean on **Bulk** (normalize, pricing, merge) and **Validate** (issues + export CSV); add **Square export/import** path and optional **rule presets** (overlay-aligned); keep **Export Edits CSV** and **Import CSV** for round-trips. |

---

*Doc ties together `AeroVista_Catalog_Console`, `AeroVista_Catalog_Console/v1.1`, and `docs/DROPSHIP_STORE_TREASURE_TROVE.md` for catalog management with Square as source of truth.*
