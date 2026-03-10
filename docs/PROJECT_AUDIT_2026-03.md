# AeroVista Storefront — Project Audit

**Date:** March 9, 2026  
**Scope:** Full project (storefront, backend, Catalog Console, config, security, docs).

---

## Executive summary

The project is a **static storefront** (root `index.html`) for AeroVista Apparel, backed by Square catalog JSON and an optional **Flask backend** for checkout and fulfillment. Structure and documentation are strong; previous storefront-specific issues (Feb 2026) are largely resolved per [AUDIT_RESOLUTION_CHECKLIST.md](AUDIT_RESOLUTION_CHECKLIST.md). This audit covers **structure, security, dependencies, configuration, and gaps**.

**Overall:** Production-ready for the current feature set, with clear follow-ups (tests, .env.example completeness, webhook algorithm).

---

## 1. Project structure

| Area | Status | Notes |
|------|--------|------|
| **Storefront** | OK | Single `index.html` at root (~4.2k lines), no build step; GitHub Pages–friendly. |
| **Catalog** | OK | Live: `square_products_latest.json` + dated fallbacks; Edited: `square_products_edited.json` or localStorage; overlay: `storefront_overlay.json`. |
| **Catalog Console** | OK | `AeroVista_Catalog_Console/v1.1/` — import/clean/merge Square, export JSON. |
| **Backend** | OK | Flask in `backend/`; `app.py`, `db/`, migrations, workers, scripts. |
| **Docs** | OK | `docs/` is comprehensive (handoff, hosting, API routing, data quality, deployment). |
| **Legacy** | OK | `public/` and archived variants documented as not served. |

**Recommendation:** None. Layout matches README and handoff notes.

---

## 2. Security

### 2.1 Frontend

| Item | Status | Notes |
|------|--------|------|
| **CSP** | OK | Meta CSP in `index.html` (line 6): script/style/img/connect/frame/font sources restricted; `unsafe-inline` for script/style (required for inline JS/CSS). |
| **API base** | OK | `window.STORE_API_BASE` configurable; relative fallback for local dev. |
| **Checkout** | OK | Payment via Square Payment Links (redirect); no card data on site. |
| **Catalog/overlay** | OK | JSON loaded from same origin or configured paths; no user input injected into script. |

### 2.2 Backend

| Item | Status | Notes |
|------|--------|------|
| **Secrets** | OK | `.env` in `.gitignore` and `.dockerignore`; `.env.example` tracked with no real values. |
| **CORS** | OK | Origin allowlist via `ALLOWED_ORIGINS`; applied in `after_request`. |
| **Checkout** | OK | Cart validated; prices from `sku_map` only (client price ignored). |
| **Webhook** | OK | Square webhook signature verified with `SQUARE_WEBHOOK_SIGNATURE_KEY` when set; HMAC comparison is constant-time. |
| **Health** | OK | `/api/health` exposes readiness only (no secrets). |

**Recommendations:**

- **Webhook algorithm:** Backend uses SHA1 + base64 for Square webhook verification. Confirm against [Square’s current webhook docs](https://developer.squareup.com/docs/webhooks/step3validate) that the algorithm and header name (`x-square-hmacsha256`) match; update if Square has moved to SHA256-only.
- **Rate limiting:** No application-level rate limit on `/api/square/checkout`. Consider adding (e.g. by IP or origin) for production to reduce abuse risk.

### 2.3 Configuration hygiene

- **.gitignore:** Contains `.env`, `.env.*`, `!.env.example`, `__pycache__/`, `*.pyc`, `backend/.venv/`, etc. — good.
- **.dockerignore (backend):** Excludes `.env`, `.env.*`, swap files, caches — good.

---

## 3. Dependencies

### 3.1 Backend (`backend/requirements.txt`)

- **flask** 3.0.3, **requests** 2.32.3, **python-dotenv** 1.0.1, **gunicorn** 22.0.0
- **SQLAlchemy** 2.0.29, **alembic** 1.13.2, **psycopg[binary]** 3.1.18

All pinned. No known critical CVEs at audit time; run `pip audit` (or your scanner) in CI.

### 3.2 Root `requirements.txt`

- **rembg**, **Pillow**, **tqdm**, **requests** — used by image/script tooling (e.g. Catalog Console or scripts), not by the storefront or backend API. Isolate in a venv if used only for one-off scripts.

### 3.3 Frontend

- No npm/Node build; Square SDK loaded from `https://web.squarecdn.com` (allowed in CSP). No other front-end dependency file.

---

## 4. Configuration and env

### 4.1 Backend `.env.example`

- Covers: Flask, CORS, Square (prod/sandbox), checkout currency, flat shipping, SKU map (JSON or file).
- **Gap:** `DATABASE_URL` and optional `SQUARE_WEBHOOK_SIGNATURE_KEY` are referenced in `backend/README.md` but **not** in `.env.example`. New operators may miss DB or webhook setup.

**Recommendation:** Add to `.env.example`:

```bash
# ---- Database (fulfillment bridge, job queue) ----
# DATABASE_URL=postgresql+psycopg://user:pass@host:5432/dbname
DATABASE_URL=

# ---- Webhooks ----
# Optional: for Square webhook signature verification
# SQUARE_WEBHOOK_SIGNATURE_KEY=
```

### 4.2 Frontend

- Catalog/API paths and canonical URL documented in root README; overrides via `window.STORE_*` are clear.

---

## 5. Backend API and data flow

- **Bootstrap:** `GET /api/square/bootstrap` — returns env, appId, locationId, currency, flatShippingCents.
- **Checkout:** `POST /api/square/checkout` — body: `cart`, optional `currency`; builds line items from `sku_map`; creates Square Payment Link; returns `checkoutUrl`.
- **Health:** `GET /api/health` — readiness and Square cred presence.
- **Webhook:** `POST /api/webhooks/square` — persists to DB; signature verified when key set; 400 if invalid.

Cart keys must match `SQUARE_SKU_MAP_JSON` (or file). Backend ignores client-sent price; Square/sku_map is source of truth. This is correct and secure.

---

## 6. Testing and automation

| Item | Status | Notes |
|------|--------|------|
| **Storefront** | None | No Jest or other front-end test suite. |
| **Backend** | None | No pytest (or other) tests for `app.py` or checkout flow. |
| **Scripts** | Partial | `scripts/test_excel.py` and similar one-off scripts only. |

**Recommendation:** Add at least:

- Backend: a small pytest suite for `build_line_items_from_cart`, `load_sku_map`, and `/api/health` (and optionally checkout with mocked Square).
- Optional: smoke test or E2E (e.g. Playwright) for “load storefront → add to cart → open checkout” to catch regressions.

---

## 7. Documentation

- **README (root):** Clear layout, catalog sources, overlay, backend pointer, docs index.
- **handoffnotes.md:** Referenced from README; if at repo root, ensure it exists (path in README: `handoffnotes.md`; duplicate in `docs/` as `docs/handoffnotes.md`).
- **docs/:** Hosting, DNS, API routing, data quality, Printful, deployment, project review, how-to update products — all present and cross-referenced.
- **AUDIT_REPORT.md / AUDIT_RESOLUTION_CHECKLIST.md:** Storefront a11y and security issues from Feb 2026; resolution status documented.

No major doc gaps for current scope.

---

## 8. Deployment and ops

- **Frontend:** Static; deploy `index.html` and assets (e.g. GitHub Pages, Firebase).
- **Backend:** Dockerfile (Python 3.12-slim, gunicorn); `docker-compose.yml` and `docker-compose.local.yml`; env via `.env`.
- **Database:** Postgres for fulfillment bridge; Alembic migrations in `backend/db/migrations/`.
- **Secrets:** Not in image; `.env` at runtime. Aligns with MASTER_FIX_PLAN and STOREFRONT_REVIEW_CHECKOUT_READINESS.

---

## 9. Checklist summary

| Category | Finding |
|----------|---------|
| **Structure** | Clear; matches README and handoff. |
| **Secrets** | .env excluded from git and Docker build. |
| **CORS** | Allowlist; documented. |
| **CSP** | Present on storefront. |
| **Checkout** | Server-side pricing; Square Payment Links. |
| **Webhook** | Signature verification implemented; verify algorithm vs Square docs. |
| **.env.example** | Add `DATABASE_URL` and optional `SQUARE_WEBHOOK_SIGNATURE_KEY`. |
| **Tests** | No backend or front-end test suite; add minimal pytest (and optional E2E). |
| **Rate limiting** | Consider for `/api/square/checkout`. |
| **Docs** | Strong; no critical gaps. |

---

## 10. References

- [AUDIT_REPORT.md](AUDIT_REPORT.md) — Feb 2026 storefront audit (a11y, CSP, forms, etc.).
- [AUDIT_RESOLUTION_CHECKLIST.md](AUDIT_RESOLUTION_CHECKLIST.md) — Resolution status for that audit.
- [README.md](../README.md) — Repo overview and catalog/API config.
- [backend/README.md](../backend/README.md) — Backend setup, env, CORS, scripts.
- [MASTER_FIX_PLAN.md](../MASTER_FIX_PLAN.md) — Secrets and repo hygiene.
