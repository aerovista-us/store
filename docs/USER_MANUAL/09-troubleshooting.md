# 9 — Troubleshooting

Start with the symptom. Cross-links point to fix procedures.

---

## Orders not appearing in Postgres

**Symptoms:** Customer paid in Square; nothing in `orders` table.

| Check | Fix |
|-------|-----|
| `SQUARE_WEBHOOK_NOTIFICATION_URL` missing/wrong | Set to `https://api.aerovista.us/api/webhooks/square`, restart API |
| Square Dashboard webhook URL mismatch | Update subscription to match |
| Signature key wrong | Align `SQUARE_WEBHOOK_SIGNATURE_KEY` with Square app |
| API down | `docker compose ps`, logs |

Script: `investigate-missing-orders.py`

---

## Order in Postgres but not in Printful

**Symptoms:** `orders` row exists; Printful Orders empty.

| Check | Fix |
|-------|-----|
| `fulfillment_status` = `needs_review` | Missing `product_variant_map` — run import + audit |
| Worker not running | `docker compose up -d fulfillment-worker` |
| Printful 429 rate limit | Retry import script with delays |
| Draft not confirmed | Worker must use `?confirm=true` (fixed in production) |
| Wrong Printful store | Use **AeroVista store**, not another integration |

Scripts: `check-printful-orders.py`, `audit-product-variant-map.py`

---

## Wrong item / size fulfilled

**Symptoms:** Customer got wrong variant.

| Check | Fix |
|-------|-----|
| Cart key collision | Ensure client sends `variationId`; see [../archive/CHECKOUT_COLLISION_AUDIT.md](../archive/CHECKOUT_COLLISION_AUDIT.md) |
| Stale `SQUARE_SKU_MAP_JSON` | Prefer catalog JSON + variationId |
| Wrong map row | Fix Postgres map, cancel/re-submit order |

---

## Checkout fails / CORS error

| Check | Fix |
|-------|-----|
| `ALLOWED_ORIGINS` | Add `https://gear.aerovista.us` |
| API proxy | Redeploy Cloudflare worker |
| Catalog missing variation | Fix JSON, copy to NXCore, restart API |

Browser: Network tab on POST `/api/checkout/hosted`

---

## Product visible on shop but can’t checkout

| Check | Fix |
|-------|-----|
| Not in `sellableCartKeys` | API map / catalog mismatch |
| No `variation_id` in JSON | Re-export from console |
| Size hidden | Bootstrap filters unmapped keys |

For Horizon, this is expected while `checkoutReady` is false. Do not bypass the
catalog gate; follow `horizon/COMMERCE_READINESS.md`.

---

## Horizon says “The collection is temporarily unavailable”

| Check | Fix |
|---|---|
| `catalog.json` blocked, missing, or opened from `file:` | Confirm `catalog.generated.js` loads before `js/gallery.js` |
| Generated fallback stale | Run `node horizon/scripts/build-catalog-fallback.mjs` |
| Catalog invalid | Run `node horizon/scripts/validate-catalog.mjs` |
| Images absent | Confirm every published display path exists in the sanitized artifact |

The validator fails when the generated fallback drifts from `catalog.json`.

---

## Printful shows product but worker fails

**Common confusion:** Published product id (`#AEITXLBB...`) ≠ Square variation id.

Fix: run `import-all-printful-sync-maps.py` — maps **Square variation id** → **sync_variant_id**.

---

## `/api/ops/db` exposed or leaking PII

Expected behavior after hardening:

- No `OPS_SECRET` → **404**
- Wrong token → **401**
- Valid `X-Ops-Token` → JSON (ops use only)

---

## Order shows `submitted` but Printful shipped

**Symptoms:** Ops dashboard / `GET /api/ops/db` shows `fulfillment_status=submitted` after Printful marks the order fulfilled.

**Cause:** Worker used to copy `job_status` only at submit time and never map Printful `provider_status`.

**Fix:** Deploy updated `workers/fulfillment_worker.py` (maps `fulfilled`/`shipped` → `fulfillment_status=fulfilled`, polls Printful for submitted jobs). One-time: `python scripts/backfill-fulfillment-status.py` on NXCore.

**Verify:** `npm run test:fulfillment-status` · seed `scripts/seed-fulfilled-test-order.py` · `OPS_TOKEN=... npm run verify:ops-fulfillment`

On NXCore:

```bash
docker cp /tmp/seed-fulfilled-test-order.py av-store-api:/tmp/
docker compose exec -T -e PYTHONPATH=/app av-store-api python /tmp/seed-fulfilled-test-order.py
```


**Symptoms:** Inline Python over SSH breaks on Windows.

**Fix:** Write script file locally → `scp` to NXCore → `docker compose exec api python /path/script.py`

---

## Deploy mistakes

| Mistake | Reality |
|---------|---------|
| Ran `deploy:server` expecting API update | Only updates local catalog JSON |
| Edited `public/shop/` directly | Overwritten by `sync:store` — edit `store/` |
| Pushed backend to Git | `store/backend/` is gitignored — use scp |
| Only deployed shop | Backend/env must match for checkout + fulfillment |
| Uploaded all of `horizon/` | Unsafe: source masters and operator evidence may be public; use the Horizon sanitized-artifact SOP |

---

## Get logs quickly

```bash
ssh glyph@100.115.9.61
cd /srv/Collab/mini.shops/AV-PNW.com/av_storefront/backend/
docker compose logs api --tail=50
docker compose logs fulfillment-worker --tail=50
```

---

## Escalation data to collect

1. Square order / payment id
2. Postgres `orders.id` and `fulfillment_status`
3. Cart keys + variation ids from browser network tab
4. Worker log snippet around job time
5. Printful order id if any
