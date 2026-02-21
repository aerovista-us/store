# av_storefront — Review & Checkout Stub Replacement Readiness

**Date:** 2026-02-20  
**Scope:** Backend API, frontend checkout flow, config, and deployment wiring.

---

## Executive summary

The storefront is in good shape for **replacing the checkout stub** with real Square Orders/Checkout. One contract mismatch was fixed (bootstrap now returns `flatShippingCents`). No blocking issues remain. Optional notes and known external/ops items are documented below.

---

## What was checked

- **Backend:** `backend/app.py`, `requirements.txt`, `Dockerfile`, `docker-compose.yml`, `.env.example`, `.gitignore`, `.dockerignore`
- **Frontend:** Checkout flow in `index.html` (bootstrap, Square SDK, pay overlay, `/api/square/checkout` request/response handling)
- **Docs:** `docs/NXCORE_STORE_API_ROUTING_STATUS.md`, README, deploy docs
- **Security:** `.env` exclusion from git and Docker build context; CORS allowlist; no Square SDK in backend yet (stub only)

---

## Fix applied during review

### Bootstrap missing `flatShippingCents`

- **Issue:** Frontend uses `boot.flatShippingCents` for shipping in the pay overlay; `/api/square/bootstrap` did not return it, so shipping always showed as $0.00.
- **Change:** Bootstrap response now includes `flatShippingCents` from `SQUARE_FLAT_SHIPPING_CENTS` (default 0). Currency fallback uses `CHECKOUT_CURRENCY` when `SQUARE_CURRENCY` is unset so existing `.env` (e.g. `CHECKOUT_CURRENCY=USD`) still works.

---

## Status: no blocking issues

| Area | Status | Notes |
|------|--------|--------|
| Backend health & bootstrap | OK | Health and bootstrap endpoints work; creds required as intended. |
| Checkout stub contract | OK | Stub validates cart, returns 501 with `ok: false`; frontend handles it and shows a generic “server unavailable” style message. |
| Frontend → API | OK | Checkout uses `CHECKOUT_API_BASE` / `CHECKOUT_API_CANDIDATES`; payload matches backend (cart, buyer, shipping, currency, payment_token). |
| CORS | OK | Origin allowlist via `ALLOWED_ORIGINS`; `.env.example` and deploy docs describe it. |
| Secrets & build | OK | `.env` in `.gitignore` and `.dockerignore`; no secrets in image. |
| Docker & Traefik | OK | Compose and routing for `api.aerovista.us` documented in `NXCORE_STORE_API_ROUTING_STATUS.md`. |
| Lint | OK | No linter errors on `backend/app.py`. |

---

## Optional / minor notes

- **Currency env:** Backend reads `SQUARE_CURRENCY` then falls back to `CHECKOUT_CURRENCY` for bootstrap. `.env.example` uses `CHECKOUT_CURRENCY`; both are supported now.
- **PORT vs APP_PORT:** Flask uses `PORT` (default 8088). `.env` has `APP_PORT`; that’s for documentation/local use. Gunicorn in Docker is fixed to 8088; no change needed.
- **501 stub message:** Stub returns `message`, not `error`. Frontend uses `out.error` first, then a generic message; for 5xx it shows “Payment service is temporarily unavailable.” So the stub message is not shown; behavior is acceptable until stub is replaced.

---

## Known external / ops (not code defects)

- **Cloudflare 530:** Documented in `docs/NXCORE_STORE_API_ROUTING_STATUS.md`. Fix: set tunnel origin for `api.aerovista.us` to `http://127.0.0.1:<TRAEFIK_HTTP_PORT>` (no HTTPS at origin).

---

## Option A implemented (2026-02-20): Hosted checkout URL

Checkout stub was replaced with **Square Payment Links API** (Option A):

- **Backend:** `POST /api/square/checkout` accepts `{ cart: [{ sku, qty }, ...], currency? }`, builds line items from `SQUARE_SKU_MAP_JSON`, adds optional flat shipping, creates a Payment Link via Square, returns `{ ok: true, checkoutUrl }` or `{ ok: false, error }`.
- **Frontend:** Checkout button calls bootstrap (for API base + currency), POSTs cart to `/api/square/checkout`; on `ok && checkoutUrl` does `window.location = checkoutUrl`. No in-page card form; customer pays on Square’s hosted page (PCI out of scope).
- **Env:** Add `SQUARE_SKU_MAP_JSON` in `.env`: JSON object mapping SKU string → `{ "name": "Display name", "cents": 5500 }`. SKU keys must match frontend cart item `key` (e.g. `BLK__M` for color__size). See `backend/.env.example`.

---

## Checkout (Option A) env checklist

- `SQUARE_ACCESS_TOKEN` / `SQUARE_LOCATION_ID` (and `*_SANDBOX` when `SQUARE_ENV=sandbox`)
- `SQUARE_SKU_MAP_JSON` — required; keys = cart item keys (e.g. `BLK__M`), values = `{ "name", "cents" }`
- `CHECKOUT_CURRENCY` or `SQUARE_CURRENCY` (default USD)
- `SQUARE_FLAT_SHIPPING_CENTS` (optional; 0 = no shipping line)

---

## Changelog

- 2026-02-20: Initial review; bootstrap updated with `flatShippingCents` and `CHECKOUT_CURRENCY` fallback; report added.
- 2026-02-20: Option A implemented: Payment Links checkout; frontend redirects to `checkoutUrl`; `SQUARE_SKU_MAP_JSON` added to `.env.example` and docs.
