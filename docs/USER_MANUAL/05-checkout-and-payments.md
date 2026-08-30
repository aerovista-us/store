# 5 — Checkout & payments

## Checkout flow

1. Customer adds items to cart (keys like `Default__S`, `black__M`)
2. Shop POSTs to `/api/checkout/hosted` (via gear.aerovista.us proxy)
3. API resolves **Square variation id** from cart key + optional client `variationId`
4. Square hosted payment link returned → customer pays
5. Square webhook → Postgres → fulfillment worker

## Three meanings of “SKU”

| Term | Example | Where |
|------|---------|--------|
| **Merchant SKU** | `69B1C9EB37723_15898` | Square export → JSON `variants[].sku` |
| **Square variation id** | `PUXSQI64MVTC6OTTJRHJ5XUA` | Token column → checkout truth |
| **Cart key** | `Default__S` | Browser cart → API `cart[].sku` |

Checkout uses **cart key** + **variationId**; it does not send merchant SKU on the hosted path.

## Resolver rules (api.aerovista.us)

Priority in `resolve_checkout_meta()`:

1. Client **`variationId`** when it matches a catalog variant (fixes same-size collisions)
2. **`SQUARE_SKU_MAP_JSON`** env map (legacy)
3. Catalog JSON lookup by cart key

Shop loads **`sellableCartKeys`** from API bootstrap so unmapped sizes are hidden before add-to-cart.

## Required env (backend)

| Variable | Purpose |
|----------|---------|
| `SQUARE_ACCESS_TOKEN` | Square API |
| `SQUARE_LOCATION_ID` | Location for checkout |
| `SQUARE_SKU_MAP_JSON` | Legacy cart-key → variation id |
| `SQUARE_WEBHOOK_SIGNATURE_KEY` | Verify webhooks |
| **`SQUARE_WEBHOOK_NOTIFICATION_URL`** | Must be `https://api.aerovista.us/api/webhooks/square` |
| `ALLOWED_ORIGINS` | CORS — include `https://gear.aerovista.us`, `https://horizon.aerovista.us` when launched, and the console URL |

**Critical:** If `SQUARE_WEBHOOK_NOTIFICATION_URL` is missing, Square events return 400 and **no orders land in Postgres**.

Horizon remains fail-closed until a variant has all catalog readiness flags,
the generated Square map, the Postgres Printful map, an approved proof, and a
controlled-order pass. See
[`horizon/DEPLOYMENT_SOP.md`](../../horizon/DEPLOYMENT_SOP.md).

## Catalog on the API

The API reads catalog from a mounted path (NXCore: sibling `square_products_latest.json`). After console deploy:

```bash
# On NXCore — copy fresh JSON if not already synced
scp store/square_products_latest.json glyph@100.115.9.61:/srv/Collab/mini.shops/AV-PNW.com/av_storefront/
docker compose restart api
```

## Historical note: checkout collision

Same cart key for different products (e.g. two “Size S” items) was fixed by preferring client `variationId`. Archived write-up: [../archive/CHECKOUT_COLLISION_AUDIT.md](../archive/CHECKOUT_COLLISION_AUDIT.md)
