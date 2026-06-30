# Work log

Chronological record of security checks, deploys, and go-live gates.

---

## 2026-06-30 — `/api/ops/db` authentication gate (pre–live sales)

**Context:** Checkout blocker cleared; ops DB endpoint must not expose customer PII without operator auth before live sales activity.

### Project audit (summary)

| Surface | Path / URL | Notes |
|---------|------------|--------|
| Shop | `store/` → https://gear.aerovista.us | Static GitHub Pages; checkout via Cloudflare API proxy |
| Payment API | `store/backend/` (gitignored) → https://api.aerovista.us | Flask + Gunicorn on NXCore Docker |
| Catalog console | `console/` → https://store-console.aerocoreos.com | Operator catalog; network-gated (Tailscale / Cloudflare Access) |
| Docs | `docs/USER_MANUAL/`, `docs/BACKEND_DEPLOY.md` | Ops auth documented under ch. 6–8 |

**Auth implementation** (`store/backend/app.py`):

- `OPS_SECRET` env var; clients send `X-Ops-Token` header
- `hmac.compare_digest` timing-safe compare
- Fail closed: no `OPS_SECRET` → **404**; wrong/missing token → **401**
- Same guard on `GET /ops/printful`

### Verification (production `https://api.aerovista.us`)

| Test | Expected | Result |
|------|----------|--------|
| `GET /api/ops/db` (no header) | 401 Unauthorized | **PASS** — HTTP 401 |
| `GET /api/ops/db` (`X-Ops-Token: wrong`) | 401 Unauthorized | **PASS** — HTTP 401 |
| `GET /api/ops/db` (valid `X-Ops-Token`) | 200 + JSON (`orders`, `webhook_events`, `fulfillment_jobs`) | **PASS** — HTTP 200, 10 orders in snapshot (`npm run audit:ops-endpoint` with `OPS_TOKEN`) |
| `GET /api/health` (baseline, public) | 200 | **PASS** — checkout health unaffected |

**Repeatable check:**

```bash
node scripts/audit-ops-endpoint.mjs
OPS_TOKEN='<from nxcore .env OPS_SECRET>' node scripts/audit-ops-endpoint.mjs
```

### Outcome

- Ops endpoint is **authenticated and fail-closed** on production.
- Unauthenticated and wrong-token requests are rejected.
- Approved operator access with `X-Ops-Token` still returns read-only DB snapshot.
- **Go-live gate:** satisfied for `/api/ops/db` before live sales.

---

## 2026-06-30 — `fulfillment_status` fulfilled display fix

**Context:** Once Printful ships, ops dashboard must show `fulfillment_status=fulfilled` (not stuck at `submitted`).

### Root cause

`fulfillment_worker.py` line ~248 set `order.fulfillment_status = job.job_status` (`submitted`) and ignored Printful `provider_status`. No poll for in-flight orders after submit.

### Fix

| File | Change |
|------|--------|
| `workers/fulfillment_status.py` | Map `fulfilled`/`shipped`/`delivered` → `fulfilled` |
| `workers/fulfillment_worker.py` | Use mapper at submit; `poll_submitted_statuses()` each loop |
| `scripts/fulfillment_status.py` | Committed copy + unit tests |
| `scripts/seed-fulfilled-test-order.py` | Fixture order `TEST-FULFILLED-OPS-DISPLAY` |
| `scripts/verify-ops-fulfillment-display.mjs` | Asserts `/api/ops/db` shows fulfilled |

### Verification

| Test | Result |
|------|--------|
| `python scripts/fulfillment_status.py` | **PASS** — 9 mapping cases |
| Seed fixture on NXCore (`order_id=15`) | **PASS** — `fulfillment_status=fulfilled` |
| `verify-ops-fulfillment-display.mjs --expect-fixture` | **PASS** — 1 fulfilled in ops snapshot |

**Deploy:** `scp` `workers/fulfillment_*.py` to NXCore → `docker compose up -d fulfillment-worker`
