# 3 — Catalog & console

## Pipeline summary

1. Export from Square → `.xlsx` on `\\100.115.9.61\Collab\av-data\`
2. Open **catalog console v2** → load, clean, validate, set `collection` lane
3. **Deploy to store** → writes `store/square_products_latest.json`
4. Sync + publish shop ([chapter 4](04-shop-and-deploy.md))
5. Ensure Printful sync + variant map ([chapter 6](06-orders-and-fulfillment.md))

Full detail: [../CATALOG_PIPELINE.md](../CATALOG_PIPELINE.md) · Product updates: [../HOW_TO_UPDATE_PRODUCTS.md](../HOW_TO_UPDATE_PRODUCTS.md)

> **Horizon is separate.** The console workflow on this page publishes Gear.
> Maintain Horizon in `horizon/catalog.json`, rebuild its generated fallback,
> and follow the [Horizon deployment SOP](../../horizon/DEPLOYMENT_SOP.md).

## Console access

| Environment | URL | Deploy |
|-------------|-----|--------|
| Production | https://store-console.aerocoreos.com/ | **Deploy to store** → `POST /api/deploy` writes `store/` |
| AVCC (Command Center) | https://avcc.aerocoreos.com/ | Parent operator hub — links to catalog console, CRM, orders |
| Local hosted | `npm run console:server` → http://localhost:3014 | Same `/api/deploy` when store mount is writable |
| Local Vite | `npm run dev` → `/console/` | Run **`npm run deploy:server`** for deploy button (port 5199) |

Open **Operator Hub** in the catalog console for bridge manifest, API cart-key alignment, and pre-deploy checklist.

AVCC ↔ store integration: [../AVCC_INTEGRATION.md](../AVCC_INTEGRATION.md)

Deploy catalog console on NXCore: [../NXCORE_CONSOLE.md](../NXCORE_CONSOLE.md)

## Deploy catalog to `store/`

**Recommended:**

```bash
npm run deploy:server    # listens on http://127.0.0.1:5199/deploy
```

Then in console: **Exports → Deploy to store**

**CLI alternative:**

```bash
npm run deploy:catalog -- ./export.json
npm run deploy:catalog -- ./export.json --overlay ./overlay.json
```

This updates `store/square_products_latest.json`, runs sync, and refreshes `public/shop`.

## Required fields per variant

| Field | Source | Used for |
|-------|--------|----------|
| `variation_id` | Square Token | Checkout truth, fulfillment map key |
| `sku` | Square merchant SKU | Reference only in hosted checkout path |
| `size`, `color` | Export | Cart key `Color__Size` (e.g. `Default__S`) |
| `collection` | Console | Home lane grouping |
| `visibility` | Console/overlay | Show/hide on shop |

**Rule:** No `variation_id` → variant is not sellable on the shop.

## Images

- Files referenced in JSON must exist under **`store/img/`**
- After adding images: `npm run sync:store`
- Overlay presentation: [../STOREFRONT_OVERLAY.md](../STOREFRONT_OVERLAY.md)

## After catalog changes

| Also update | When |
|-------------|------|
| GitHub Pages (shop) | Push / CI — customer sees new products |
| NXCore `square_products_latest.json` | API catalog fallback for checkout |
| Printful sync | New product or size — link in Printful Dashboard |
| `product_variant_map` | Run import script on NXCore ([chapter 8](08-audits-and-runbooks.md)) |
