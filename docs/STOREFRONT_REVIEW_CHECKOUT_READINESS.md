# av_storefront — Checkout Readiness

**Date:** 2026-04-02  
**Scope:** Backend API, frontend checkout flow, config, and deployment wiring.

---

## Executive summary

The checkout stack is operational: the backend answers through Traefik and the public `https://api.aerovista.us/api/health` route is live as of **2026-04-02**. The remaining meaningful defects are now catalog-quality issues, not edge-routing or missing-price blockers.

---

## What was checked

- **Backend:** `backend/app.py`, `requirements.txt`, `Dockerfile`, `docker-compose.yml`, `.env.example`, `.gitignore`, `.dockerignore`
- **Frontend:** Checkout flow in `index.html` (bootstrap, Square SDK, pay overlay, `/api/square/checkout` request/response handling)
- **Docs:** `docs/NXCORE_STORE_API_ROUTING_STATUS.md`, README, deploy docs
- **Security:** `.env` exclusion from git and Docker build context; CORS allowlist; hosted Square checkout keeps card handling off the storefront/backend runtime

---

## Fix applied during review

### Bootstrap missing `flatShippingCents`

- **Issue:** Frontend uses `boot.flatShippingCents` for shipping in the pay overlay; `/api/square/bootstrap` did not return it, so shipping always showed as $0.00.
- **Change:** Bootstrap response now includes `flatShippingCents` from `SQUARE_FLAT_SHIPPING_CENTS` (default 0). Currency fallback uses `CHECKOUT_CURRENCY` when `SQUARE_CURRENCY` is unset so existing `.env` (e.g. `CHECKOUT_CURRENCY=USD`) still works.

---

## Status: checkout path live, catalog quality still open

| Area | Status | Notes |
|------|--------|--------|
| Backend health & bootstrap | OK | Health path answers via internal host-header checks and public `https://api.aerovista.us/api/health` on 2026-04-02. |
| Checkout flow | OK | Frontend posts cart to `/api/square/checkout`; backend returns Square-hosted `checkoutUrl` when order creation succeeds. |
| Frontend → API | OK | Checkout uses `CHECKOUT_API_BASE` / `CHECKOUT_API_CANDIDATES`; payload matches backend (cart, buyer, shipping, currency, payment_token). |
| CORS | OK | Origin allowlist via `ALLOWED_ORIGINS`; `.env.example` and deploy docs describe it. |
| Secrets & build | OK | `.env` in `.gitignore` and `.dockerignore`; no secrets in image. |
| Docker & Traefik | OK | Compose and routing for `api.aerovista.us` documented in `NXCORE_STORE_API_ROUTING_STATUS.md`; public and internal checks both returned 200 on 2026-04-02. |
| Lint | OK | No linter errors on `backend/app.py`. |
| Catalog price coverage | OK | `MuseFace` removed from `square_products_latest.json`; data quality report now shows 0 missing prices. |
| Catalog descriptions/images | FAIL | Active catalog still shows 48/48 missing descriptions and 48/48 missing images. |

---

## Optional / minor notes

- **Currency env:** Backend reads `SQUARE_CURRENCY` then falls back to `CHECKOUT_CURRENCY` for bootstrap. `.env.example` uses `CHECKOUT_CURRENCY`; both are supported now.
- **PORT vs APP_PORT:** Flask uses `PORT` (default 8088). `.env` has `APP_PORT`; that’s for documentation/local use. Gunicorn in Docker is fixed to 8088; no change needed.
- **Error surfacing:** Frontend prefers `out.error`; fallback UX still covers 5xx/API failures with a generic payment-unavailable message.

---

## Known external / ops (not code defects)

- **No active edge outage:** `http://100.115.9.61:80/api/health -H "Host: api.aerovista.us"`, `https://100.115.9.61:443/api/health -H "Host: api.aerovista.us"`, and public `https://api.aerovista.us/api/health` all returned `200 OK` on `2026-04-02`.
- **Historical 530 guidance:** Keep `docs/NXCORE_STORE_API_ROUTING_STATUS.md` and `docs/CLOUDFLARE_530_CHECKLIST.md` as regression docs only.

---

## Option A implemented (2026-02-20): Hosted checkout URL

Checkout stub was replaced with **Square Payment Links API** (Option A):

- **Backend:** `POST /api/square/checkout` accepts `{ cart: [{ sku, qty }, ...], currency? }`, builds line items from `SQUARE_SKU_MAP_JSON`, adds optional flat shipping, creates a Payment Link via Square, returns `{ ok: true, checkoutUrl }` or `{ ok: false, error }`.
- **Frontend:** Checkout button calls bootstrap (for API base + currency), POSTs cart to `/api/square/checkout`; on `ok && checkoutUrl` does `window.location = checkoutUrl`. No in-page card form; customer pays on Square’s hosted page (PCI out of scope).
- **Env:** Add `SQUARE_SKU_MAP_JSON` in `.env`: JSON object mapping SKU string → `{ "name": "Display name", "cents": 5500 }`. SKU keys must match the canonical frontend cart key shape (for example `Black__M`). See `backend/.env.example`.

### Identity split (current bridge model)

- **Merchandising identity:** `variationId` (primary in overlay and reconciliation)
- **Checkout identity:** `cartKey` via `cart[].sku` (current live contract)
- **Backend bridge:** if cartKey lookup misses and payload includes `variationId`, backend can resolve by `variationId`.

---

## Checkout (Option A) env checklist

- `SQUARE_ACCESS_TOKEN` / `SQUARE_LOCATION_ID` (and `*_SANDBOX` when `SQUARE_ENV=sandbox`)
- `SQUARE_SKU_MAP_JSON` — required; keys = cart item keys in canonical `Color__Size` form (for example `Black__M`), values = `{ "name", "cents" }`
- `CHECKOUT_CURRENCY` or `SQUARE_CURRENCY` (default USD)
- `SQUARE_FLAT_SHIPPING_CENTS` (optional; 0 = no shipping line)

## 2026-04-02 verification notes

- Active catalog: `square_products_latest.json`
- Removed product: `MuseFace` (zero-price visible item)
- `python backend/scripts/generate_data_quality_report.py --input square_products_latest.json`
  - Total products: 48
  - Missing prices: 0
  - Missing descriptions: 48
  - Missing images: 48
- `python tools/generate_sku_map.py --input square_products_latest.json --output backend/sku_map.generated.json --env-output backend/sku_map.generated.env`
  - Succeeds on Windows console
  - Collision warnings remain; use `python tools/report_sku_collisions.py` to review them in a sorted report

---

## Overlay catalog (Level A) implemented

Static overlay support is now enabled to control storefront presentation without changing payment routing.

- **Overlay file:** `storefront_overlay.json` at repo root.
- **Load behavior:** frontend fetches overlay at startup (`cache: no-store`). If missing or invalid, storefront fails open to base catalog.
- **Dual-key resolution (locked):**
  1. Match `itemsByVariationId[variationId]` first
  2. Fallback to `itemsByCartKey[cartKey]`
  3. Otherwise no overlay
- **Mergeable fields:** `title`, `subtitle`, `description`, `tags`, `order`, `visible`.
- **Collections:** overlay `collections[]` adds dynamic collection tabs using `rule` values (for example `tag:featured`).
- **Ads:** overlay `ads[]` renders product-like ad tiles with CTA links in the catalog grid.

### Overlay schema (current)

- `meta`
- `itemsByVariationId` (primary key space)
- `itemsByCartKey` (fallback key space)
- `collections[]` with `{ id, title, rule, order }`
- `ads[]` with `{ id, title, body, cta{label,href}, order, visible }`

### Safety/compatibility notes

- Option A checkout flow remains unchanged (`POST /api/square/checkout` -> `checkoutUrl` redirect).
- `SQUARE_SKU_MAP_JSON` stays cart-key driven for now (recommended during migration).
- Hidden overlay items (`visible: false`) are excluded from rendered products.

---

## Changelog

- 2026-02-20: Initial review; bootstrap updated with `flatShippingCents` and `CHECKOUT_CURRENCY` fallback; report added.
- 2026-02-20: Option A implemented: Payment Links checkout; frontend redirects to `checkoutUrl`; `SQUARE_SKU_MAP_JSON` added to `.env.example` and docs.
- 2026-02-21: Level A overlay implemented: static `storefront_overlay.json`, dual-key resolver (`variationId` then cart key), overlay collections, and ad tiles.
- 2026-04-02: Verified `api.aerovista.us` health internally and publicly; removed `MuseFace` from the active catalog; catalog now has no missing prices, but descriptions/images remain missing across all live products.
