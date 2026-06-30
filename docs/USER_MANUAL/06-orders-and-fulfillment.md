# 6 — Orders & fulfillment

## Order lifecycle

```
Payment complete (Square)
    → webhook: order.created / payment.updated
    → orders row in Postgres
    → fulfillment_jobs queued
    → fulfillment_worker
    → Printful POST /orders?confirm=true
    → order.fulfillment_status = submitted (or needs_review)
```

## Where to look

| System | What you see |
|--------|----------------|
| **Postgres** (`orders`, `fulfillment_jobs`) | Source of truth for custom shop |
| **Printful → Orders** | Submitted print jobs (path B) |
| **Printful → Published** | Synced products (not the same as Orders) |
| **Square Dashboard** | Payment / catalog |

Printful store name: **AeroVista store** (Square integration, id `17064001`).

## Fulfillment statuses

| Status | Meaning |
|--------|---------|
| `pending` | Job queued, not yet submitted to Printful |
| `submitted` | Printful order created (has `provider_order_id`) |
| `fulfilled` | Printful reports shipped/fulfilled (`fulfilled`, `shipped`, `delivered`) |
| `needs_review` | Missing variant map or validation error |
| `cancelled` | Operator cancelled job |

Worker sets `orders.fulfillment_status` from Printful `provider_status` (initial submit + periodic poll while `submitted`). Ops dashboard reads this via `GET /api/ops/db`.

## Variant map (required for path B)

Postgres table **`product_variant_map`** links:

```
square_variation_id  →  printful_sync_variant_id
```

**Before launch / after new products:**

1. Sync product in Printful (Published tab)
2. Run import on NXCore:

```bash
docker compose exec api python scripts/import-all-printful-sync-maps.py
docker compose exec api python scripts/audit-product-variant-map.py
```

Target: **171/171** visible catalog variants mapped (as of 2026-06-14).

## Printful ID confusion

| You see in Printful Published | You need for API |
|------------------------------|------------------|
| Product id `#AEITXLBB...` | Not used directly in worker |
| Square variation in sync UI | Maps to `sync_variant_id` in Postgres |

Example: Shadow pants Size S  
- Square variation: `PUXSQI64MVTC6OTTJRHJ5XUA`  
- Printful sync_variant_id: `5318529312`

## Manual order actions

Scripts on NXCore (`backend/scripts/`):

| Script | Use |
|--------|-----|
| `audit-all-orders.py` | Summary of all orders |
| `check-printful-orders.py` | Cross-check Printful API |
| `cancel-order-fulfillment.py` | Cancel duplicate/error order |
| `enable-promo-order-fulfillment.py` | Re-queue specific order |
| `backfill-fulfillment-status.py` | Fix stale `fulfillment_status` |

Copy scripts from dev: `scp store/backend/scripts/*.py glyph@100.115.9.61:.../backend/scripts/`

## Ops endpoint (PII)

`GET /api/ops/db` requires **`X-Ops-Token`** matching `OPS_SECRET`. Returns 404 if secret unset. Token stored on server: `backend/.ops_secret.local` (chmod 600).

Do not expose ops routes publicly without the token.
