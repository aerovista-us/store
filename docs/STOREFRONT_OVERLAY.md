# Storefront overlay (`storefront_overlay.json`)

The overlay is a **presentation layer** on top of `square_products_latest.json`. It does not replace Square as the source of truth for **checkout prices** or **variation IDs**.

**Catalog-export-only mode:** An empty overlay (`itemsByVariationId`, `overrides`, `ads`, `collections` all empty) means the shop uses each product’s **`collection`**, **`tags`**, **`visibility`**, and **`description_text`** from `square_products_latest.json` only. Landing lanes (Core, Shadow Wear, …) filter on that same export `collection` field.

To reset after experimentation, replace `store/storefront_overlay.json` with the minimal template in-repo (or restore from `storefront_overlay.backup-*.json` if you kept one).

### Catalog Console: “Unmatched” overlay rows

Catalog Console v2 compares each `itemsByVariationId` and `itemsByCartKey` entry to variants in the catalog **currently loaded**. Keys with no matching variant appear under **Unmatched Overlay Entries**.

- **Stale Square tokens:** An overlay from an old export pasted on top of a **newer** export leaves orphan variation IDs.
- **`console/overlay_baseline.js`:** The offline default is **generated from `store/storefront_overlay.json`** when you run **`npm run sync:console`** (also run from **`npm run sync:all`**). If this file differs from both your loaded catalog *and* the store overlay, you’ll see bogus unmatched rows until you trim the overlay JSON or regenerate the baseline.

## Resolution order

1. **`itemsByVariationId[variationId]`** — preferred (matches Square Token)
2. **`itemsByCartKey[cartKey]`** — fallback (`{color}__{size}`)

Product-level merge walks all variation IDs on a card; see visibility rules below.

## What the overlay controls

| Field | Purpose |
|--------|---------|
| `visible` | Storefront show/hide per variation (curation) |
| `order` | Featured sort (lower = higher) |
| `tags` | Featured flag, collection rules (`tag:featured`, `tag:division:nexus`) |
| `title` | Display name override |
| `overrides[sq_<catalogId>]` | Collection label, short blurb, product type metadata |
| `collections` | Extra dropdown filters (e.g. Featured, Nexus) |
| `ads` | Sponsored tiles (gift card, drops) |

## What Square controls (checkout truth)

- **Prices** at payment — Square catalog / hosted checkout
- **`variation_id`** on each variant — required for `POST /api/square/checkout`
- **Merchant SKU** — export metadata; cart uses `color__size` keys

Storefront cart subtotals use **catalog prices** from JSON when `rules.applyPriceLadders` is `false` (production default).

## Production rules (`rules`)

```json
{
  "applyPriceLadders": false,
  "presentationOnly": true,
  "titleFormat": "",
  "defaultBrand": "AeroVista"
}
```

- **`applyPriceLadders: false`** — Do not override display/cart prices with `operator.priceLadders`. Prevents cart showing $34.99 while Square charges $52.
- Set to `true` only after Square prices are synced to ladders (Console bulk pricing).

## Operator block (`operator`)

Margin ladders, cost ladders, and fee assumptions live under **`operator`**, not `rules`. The storefront ignores them unless `applyPriceLadders` is explicitly `true`.

Use this block in Catalog Console for planning — not for customer-facing price.

## Visibility policy

- **`visible: true`** on any variant → product card can show (uses that hit for tags/order/title).
- **`visible: false`** on **all** variants with overlay rows → product card hidden.
- ~67 hidden variations are **intentional curation** (legacy lines, duplicates, BONSAID bulk, etc.). Many remain `visibility: visible` in Square — overlay hides them from the shop only.

After each catalog export, run:

```bash
node scripts/clean-storefront-overlay.mjs
node scripts/audit-storefront-overlay.cjs
```

This prunes stale variation IDs and flags placeholder copy.

## Featured order (launch)

| Order | Product (representative variant) |
|------:|----------------------------------|
| 3 | Glitch Logo Classic Tee |
| 4 | Apex Mesh Trucker Cap |
| 5 | Apex Draft Pullover Hoodie (Black, M) |
| 6 | Drafted A Premium Sweatshirt |
| 7 | Apex Glitch Pullover Hoodie |
| 8 | Apex Glitch Tee |
| 9 | Retro Trucker Hat Orbit "A" |
| 10 | Holographic stickers |
| 11 | Neon BillyGoat Pullover Hoodie |

Gift card ad uses `order: 1`; Synthetic Souls ad `order: 2`.

## Overrides

Keys must use catalog id form: **`sq_<product.id>`** (e.g. `sq_aerovista-apex-draft-pullover-hoodie`).

- Do **not** use placeholder `description` strings.
- Prefer Square `description_text` in catalog; use `descriptionShort` in overlay only for curated blurbs.

## Collections in overlay

| id | rule | Purpose |
|----|------|---------|
| `featured` | `tag:featured` | Featured filter |
| `division-nexus` | `tag:division:nexus` | Nexus TechWorks tag filter |

**Collection landing lanes** (Core, Shadow Wear, Apex, Glitch, Architect) filter by export field **`collection`** via `COLLECTION_LANES` in `index.html`. Overlay `overrides.collection` affects card copy/metadata, not lane membership. See **`docs/STOREFRONT.md`**.

## Scripts

| Command | Action |
|---------|--------|
| `npm run audit:overlay` | Report placeholders, stale IDs, ladder drift, featured slots |
| `npm run clean:overlay` | Prune stale IDs, fix override keys, enforce schema v2 |

Then `npm run sync:store` before deploy.

## Launch decisions (confirmed)

| Decision | Call | Rationale |
|----------|------|-----------|
| ~59 shop-hidden / Square-visible variants | **Keep hidden in overlay** | Curated storefront beats dumping full catalog on day one |
| 32 SKUs vs operator ladder targets | **Defer** | Not blocking while `applyPriceLadders` is false; margin review later |
| Featured slots 1–11 | **Lock for launch** | Ads 1–2 + featured products 3–11; enough structure without overload |
| Next Square update | **Controlled test import** | 5 items first → verify Square UI, storefront, cart, checkout price |

### Readiness (post overlay cleanup)

| Area | Status |
|------|--------|
| Square as checkout truth | Green |
| Overlay presentation role | Green |
| Placeholder overlay copy | Green |
| Visibility logic | Green |
| Featured order | Green |
| Collection definitions | Green |
| Price ladder vs checkout | Green (ladders in `operator` only) |
| Catalog copy / Square import | Mostly green — pending 5-item test import |
| Storefront publish | Near-ready after test import |

### Pre-publish sequence

1. `npm run clean:overlay` → `npm run audit:overlay` (after any catalog export)
2. Controlled Square import (5 SKUs) from corrected workbook
3. Re-export → `store/square_products_latest.json` → `npm run sync:store`
4. Spot-check: featured order, hidden lines stay hidden, one cart → hosted checkout price matches Square
5. `npm run build` → deploy `dist`

## Related docs

- **`docs/STOREFRONT.md`** — shop views, collection SVG, hero/door holo, checkout
- **`docs/CATALOG_PIPELINE.md`** — export and deploy flow
- **`docs/SKU_E2E_AUDIT.md`** — checkout cart keys and variation IDs
- **`docs/WORKFLOWS.md`** — sync and deploy commands
