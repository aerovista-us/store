# 2 — System overview

## Five deploy surfaces

These are **independent**. Confusing them is the #1 operator mistake.

| # | Surface | Source | In Git? | Deployed to | How |
|---|---------|--------|---------|-------------|-----|
| 1 | **Shop** | `store/` | Yes | gear.aerovista.us | GitHub Actions → Pages |
| 2 | **Horizon storefront** | sanitized artifact from `horizon/` | Dedicated public repo | horizon.aerovista.us | GitHub Pages → Cloudflare Worker Custom Domain |
| 3 | **Catalog console** | `console/` | No* | store-console.aerocoreos.com | NXCore Docker |
| — | **AVCC** (Command Center) | `aerovista-command-center/` | Separate repo | avcc.aerocoreos.com | Links/proxies to store services |
| 4 | **Payment API** | `store/backend/` | **No** | api.aerovista.us | Manual `scp` + Docker |
| 5 | **API proxy** | `cloudflare/gear-api-proxy/` | Yes | Cloudflare Worker | `npm run deploy:gear-api-proxy` |

\*Console is gitignored in this working copy; may exist in other forks.

**Not a deploy surface:** `npm run deploy:server` — local endpoint for console to write JSON into `store/` only.

Horizon’s canonical procedure is
[`horizon/DEPLOYMENT_SOP.md`](../../horizon/DEPLOYMENT_SOP.md). Its release is
independent of Gear and must use a sanitized artifact.

## Data flow (happy path)

```
Square xlsx → Console → store/square_products_latest.json
                              ↓
                    npm run sync:store → public/shop
                              ↓
                    npm run build:pages → gear.aerovista.us

Customer checkout → api.aerovista.us → Square hosted pay
                              ↓
              Square webhook → Postgres → fulfillment_worker → Printful
```

Horizon uses the same payment/fulfillment bridge only after its per-variant
Square and Printful maps, proofs, and readiness flags pass. Its cart namespace
is `av_horizon_cart_v1`.

## Staged vs deployed

```
EDIT          store/              console/           store/backend/
GENERATED     public/shop/        public/console/    (Docker image)
BUILD OUT     dist/
DEPLOYED      gear.aerovista.us   store-console…     api.aerovista.us
```

## Two fulfillment paths (important)

| Path | When it applies |
|------|-----------------|
| **A — Printful Square integration** | Orders imported by Printful from Square automatically (Dashboard → Orders) |
| **B — Custom API (gear.aerovista.us)** | Hosted checkout via our Flask API → worker submits to Printful API |

**gear.aerovista.us uses path B.** Product must be:

1. Synced in Printful (Published tab, AeroVista store)
2. Mapped in Postgres `product_variant_map` (our worker)

Path A settings (Import unsynced orders) do **not** replace path B for the custom storefront.

## Key IDs (don’t mix these up)

| ID | Example | Layer |
|----|---------|-------|
| Square **variation id** | `PUXSQI64MVTC6OTTJRHJ5XUA` | Catalog, checkout, webhooks |
| Printful **product** id | `AEITXLBBQB7ATCVL5CD6N6XL` | Printful Published list |
| Printful **sync_variant_id** | `5318529312` | API order submission |
| Cart key (`sku` in API) | `Default__S` | Browser cart → checkout POST |

## Docker services (NXCore backend)

| Container | Role |
|-----------|------|
| `av-store-api` | Flask + Gunicorn :8088 |
| `av-store-postgres` | Orders, webhooks, variant map |
| `av-store-fulfillment-worker` | Square → Printful bridge |
| `av-store-reconcile-worker` | Backfill missing fulfillment jobs |
