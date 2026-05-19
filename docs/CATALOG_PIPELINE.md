# Catalog pipeline — Square export → console → storefront

Part of **AV Store Static Bridge v1**.

## Where files go

| Stage | Location | Notes |
|--------|----------|--------|
| **Raw Square export (.xlsx)** | `\\100.115.9.61\Collab\av-data\` | Keep dated names, e.g. `1149XBNG8C8ZE_catalog-2026-05-15-0712.xlsx`. This is the shared intake folder on NXCore/Collab — not committed to git. |
| **Console edit** | `console/aerovista_catalog_console_v2.html` | Open in browser (or Docker `:3014`). **Load export** — drag the xlsx from `av-data` or anywhere; no copy into the repo required for editing. |
| **Published catalog JSON** | `store/square_products_latest.json` | After cleanup: **Exports → Export storefront JSON**, save/replace this file. The live storefront loads it from `./square_products_latest.json` next to `store/index.html`. |
| **Storefront overlay** | `store/storefront_overlay.json` | Pricing/visibility/tags overrides. Console reads/writes via **Overlay** tab; export **overlay JSON** here when ready. |
| **Product images** | `store/img/` (source of truth) | Filenames match Square **Image Name** / catalog `image` field. **`public/shop/img/`** is a *copy* created by `npm run sync:store` — if you only add a PNG under `public/shop/img/`, the console will not see it until you also copy to `store/img/` or re-run sync. Console previews try `../store/img/` then `../public/shop/img/`. |
| **Optional baselines** | `console/catalog_baseline.js`, `console/overlay_baseline.js` | Embedded copies for offline open; regenerate when you want the console to boot with latest data without fetch. |
| **Built static shop** | `public/shop/` (after `npm run sync:store`) | Copy of `store/` for Vite / deploy. |
| **Policies & support** | `store/policy-content.js`, `docs/STORE_POLICIES.md` | FAQ / shipping / returns modals; support **orders@aerovista.us**. |
| **Storefront overlay** | `store/storefront_overlay.json`, `docs/STOREFRONT_OVERLAY.md` | Presentation only; `npm run clean:overlay` before launch. |

## Typical workflow

1. Export catalog from Square → save xlsx under **`Collab\av-data`** (your file is already in the right place).
2. Open **Catalog Console v2** → load that xlsx → bulk clean → validate.
3. **Export → Deploy** (recommended):
   - Terminal 1 (leave running): `npm run deploy:server`
   - In console **Exports** tab: **Deploy to store** — writes `store/square_products_latest.json`, optional overlay, runs sync → `public/shop/`
   - Or manual: **Export storefront JSON**, then `npm run deploy:catalog -- path/to/downloaded.json`
4. Confirm **`store/img/`** contains every `image` filename referenced in the JSON.
5. `npm run build` and deploy **`dist`** when publishing to production.

## Next phase (AVCC)

AVCC exports catalog JSON → same **`store/square_products_latest.json`** contract → static bridge syncs to **`public/shop`** → flagship links to **`store.aerovista.us`**.
