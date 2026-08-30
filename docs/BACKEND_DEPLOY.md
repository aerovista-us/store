# Payment API deploy (NXCore)

**Last updated:** 2026-07-26  
**See also:** [USER_MANUAL/07-backend-operations.md](USER_MANUAL/07-backend-operations.md), [USER_MANUAL/06-orders-and-fulfillment.md](USER_MANUAL/06-orders-and-fulfillment.md), [STATUS.md](STATUS.md)

The Flask payment service that powers Square checkout is **not** in the public Git repo and **not** deployed by GitHub Actions. It runs in Docker on **NXCore** and is updated manually over SSH.

| Surface | URL | Deploy |
|---------|-----|--------|
| **Public shop** | https://gear.aerovista.us/ | GitHub Pages — **`docs/DEPLOY_GITHUB_PAGES.md`** |
| **Horizon storefront** | https://horizon.aerovista.us/ | GitHub Pages behind the shared Cloudflare Worker; checkout gated — **`horizon/DEPLOYMENT_SOP.md`** |
| **Payment API** | https://api.aerovista.us/ | NXCore Docker — **this doc** |
| **Catalog console** | https://store-console.aerocoreos.com/ | NXCore — **`docs/NXCORE_CONSOLE.md`** |

**Do not confuse** `npm run deploy:server` with backend deploy. That command only serves a local endpoint for the catalog console to write JSON into `store/` — it does **not** publish the payment API.

---

## Production layout (NXCore)

| Item | Value |
|------|--------|
| **SSH** | `ssh glyph@100.115.9.61` (Tailscale) |
| **Compose project** | `/srv/Collab/mini.shops/AV-PNW.com/av_storefront/backend/` |
| **Catalog JSON (checkout fallback)** | `/srv/Collab/mini.shops/AV-PNW.com/av_storefront/square_products_latest.json` |
| **Public hostname** | `api.aerovista.us` → Traefik → container `av-store-api:8088` |
| **Local source (dev machine)** | `store/backend/` (gitignored) |

Docker services in the same compose stack:

| Container | Role |
|-----------|------|
| `av-store-api` | Flask + Gunicorn on port **8088** |
| `av-store-postgres` | Fulfillment / job queue DB |
| `av-store-fulfillment-worker` | Printful fulfillment bridge |
| `av-store-reconcile-worker` | Order reconciliation |

Traefik labels on `av-store-api` route `Host(\`api.aerovista.us\`)` to the service. The container port is **not** published to the host; health checks and probes use the Docker network.

**Memorable quick ref:** [NXCORE_QUICKREF.md](NXCORE_QUICKREF.md) — nicknames (`av-backend`, `av-api`), ops token, Postgres password, webhook URL.  
**Current status:** [STATUS.md](STATUS.md)

---

## Prerequisites

### On your dev machine

- Local copy of `store/backend/` (including `app.py`, `Dockerfile`, `docker-compose.yml`, workers)
- SSH access to NXCore as `glyph@100.115.9.61`
- `scp` / SFTP for file transfer

### On NXCore (one-time)

1. **`backend/.env`** — copy from `store/backend/.env.example` and fill secrets (never commit `.env`):

   | Variable | Purpose |
   |----------|---------|
   | `SQUARE_ACCESS_TOKEN`, `SQUARE_APP_ID`, `SQUARE_LOCATION_ID` | Square production credentials |
   | `SQUARE_ENV=production` | Environment selector |
   | `ALLOWED_ORIGINS` | CORS — must include `https://gear.aerovista.us` and `https://horizon.aerovista.us` (if set, overrides app.py defaults) |
   | `DATABASE_URL` | Postgres connection for workers |
   | `SQUARE_SKU_MAP_JSON` or `SQUARE_SKU_MAP_FILE` | Optional price/name fallback by cart key |
   | `SQUARE_WEBHOOK_*` | Square webhook verification |
   | `OPS_SECRET` | Ops dashboard auth — **required** before `/api/ops/db` returns data; pass as `X-Ops-Token` header |

2. **External Docker network** — compose expects `nxtraefik_default` (Traefik edge).

3. **Catalog file** — `square_products_latest.json` one directory above `backend/` (or mounted at `/app/square_products_latest.json` in the API container) so `load_catalog_checkout_meta()` can resolve `variationId` when the env sku map collides (e.g. many products share `Default__M`).

The compose file mounts `../square_products_latest.json` read-only into `av-store-api`. After updating catalog JSON, sync to the server parent path and restart the API (no rebuild required if only JSON changed).

---

## Production deploy (typical)

### 1. Copy changed files

After editing **`app.py`** (most common):

```powershell
scp F:/aerovista-store/store/backend/app.py glyph@100.115.9.61:/srv/Collab/mini.shops/AV-PNW.com/av_storefront/backend/app.py
```

When workers, dependencies, or migrations change, sync the relevant files or the whole `store/backend/` tree (excluding `.env`).

When checkout depends on new catalog tokens, also refresh catalog JSON on the server:

```powershell
scp F:/aerovista-store/store/square_products_latest.json glyph@100.115.9.61:/srv/Collab/mini.shops/AV-PNW.com/av_storefront/square_products_latest.json
```

Regenerate the checkout SKU map from the visible catalog (writes `store/backend/sku_map.generated.json` with `variationId` keys + `variationsById` for colliding cart keys):

```powershell
npm run build:cart-sku-map
scp F:/aerovista-store/store/backend/sku_map.generated.json glyph@100.115.9.61:/tmp/sku_map.generated.json
scp F:/aerovista-store/scripts/deploy-sku-map-nxcore.py glyph@100.115.9.61:/tmp/deploy-sku-map-nxcore.py
ssh glyph@100.115.9.61 "python3 /tmp/deploy-sku-map-nxcore.py /tmp/sku_map.generated.json && cd /srv/Collab/mini.shops/AV-PNW.com/av_storefront/backend && docker compose up -d av-store-api"
```

This disables the stale inline `SQUARE_SKU_MAP_JSON` in `.env` and uses `SQUARE_SKU_MAP_FILE=sku_map.generated.json` instead.

**Note:** Printful fulfillment uses the Postgres `product_variant_map` table (Square `variation_id` → Printful sync variant), not the checkout SKU map. If payment succeeds but fulfillment shows `needs_review`, run `docker exec av-store-api python qf.py` (see `scripts/query-fulfillment-failures.py`) to see missing Printful mappings.

Regenerate **`sku_map.generated.json`** on the server when cart-key pricing fallback is used and the catalog changed (see **`docs/USER_MANUAL/05-checkout-and-payments.md`**).

### 2. Rebuild and restart

```powershell
ssh glyph@100.115.9.61
cd /srv/Collab/mini.shops/AV-PNW.com/av_storefront/backend
python3 -m py_compile app.py
docker compose up -d --build av-store-api fulfillment-worker reconcile-worker
docker compose ps
```

Rebuild **`av-store-api`** alone for API-only changes. Include workers when they import shared modules from the same image.

Database migrations (if any): run Alembic/SQL steps documented in your backend change **before** restarting workers.

### 3. Verify

**Health** (from NXCore — port 8088 is internal only):

```bash
docker run --rm --network backend_backend_internal curlimages/curl:latest \
  -s http://av-store-api:8088/api/health
```

Expect `"ok": true` and `"square_env": "production"`.

**Confirm new code is running:**

```bash
docker exec av-store-api grep -c resolve_checkout_meta /app/app.py
```

**Checkout smoke test** — multi-item cart with colliding cart keys but distinct Square variation IDs:

```bash
# /tmp/checkout-test.json — two lines both sku Default__M, different variationId values
docker run --rm --network backend_backend_internal \
  -v /tmp/checkout-test.json:/body.json:ro curlimages/curl:latest \
  -s -m 30 -X POST http://av-store-api:8088/api/square/checkout \
  -H "Content-Type: application/json" --data-binary @/body.json
```

Expect `"ok": true` and a `checkoutUrl`.

**End-to-end (shop + API):**

1. Hard refresh https://gear.aerovista.us/ and **clear cart**
2. Add 2–3 different products
3. DevTools → Console → **Checkout** → confirm each line has a distinct **`variationId`**
4. Square hosted checkout should list all items (not duplicate one SKU)

Optional repo checks:

```bash
npm run verify:checkout-fix
npm run audit:checkout-keys
```

---

## Local development

```powershell
cd F:/aerovista-store/store/backend
copy .env.example .env   # fill Square sandbox or production creds
docker compose up -d --build
```

API listens on **8088** inside the container. The storefront defaults to `127.0.0.1:8088` on localhost, or use:

- **`npm run dev:shop`** — Vite proxies `/api` to production or local backend
- URL flags on the shop: `?api=prod`, `?api=local8088`, `?api=local18088`

See **`docs/STOREFRONT.md`** § Checkout for CORS and connection troubleshooting.

---

## What to redeploy when

| Change | Action |
|--------|--------|
| Checkout logic, Square integration (`app.py`) | `scp app.py` → rebuild `av-store-api` (+ workers if shared code) |
| Worker behavior | Rebuild `fulfillment-worker` / `reconcile-worker` |
| Python dependencies | `scp requirements.txt` → full rebuild |
| New sellable variants / `variation_id` tokens | Update `square_products_latest.json` on server **and** deploy storefront via GitHub Pages |
| Horizon variant activation | Back up maps → deploy reviewed generated SKU map → execute/audit Horizon Postgres rows → follow `horizon/DEPLOYMENT_SOP.md` |
| SKU map / legacy cart-key pricing | Update `SQUARE_SKU_MAP_JSON` or `sku_map.generated.json`, restart API |
| CORS / allowed origins | Edit `.env` on server → `docker compose up -d av-store-api` (no rebuild needed) |
| DB schema | Run migration on server → restart all backend containers |

---

## Storefront ↔ API coordination

Checkout is correct only when **both** sides are aligned:

1. **Storefront** (GitHub Pages) — cart lines must include Square **`variationId`** at add-to-bag; deploy via push to `main` / **`docs/DEPLOY_GITHUB_PAGES.md`**
2. **API** (NXCore) — `resolve_checkout_meta()` must prefer client **`variationId`** over shared cart keys like `Default__M`; deploy via this doc

If the shop shows the right cart but Square checkout shows the wrong item, the API is likely still on old code or missing catalog fallback JSON.

For same-origin checkout on **gear.aerovista.us** and
**horizon.aerovista.us**, deploy the Cloudflare Worker proxy —
**`docs/DEPLOY_GITHUB_PAGES.md`** § API proxy — or ensure
**`ALLOWED_ORIGINS`** includes each shop origin.

---

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| `curl https://api.aerovista.us/...` hangs from Windows | Local/network path to public URL; probe via SSH + Docker network instead |
| Container unhealthy | Check `docker logs av-store-api`; verify `.env` Square creds |
| **400** unknown SKU | Missing entry in `SQUARE_SKU_MAP_JSON` / `sku_map.generated.json`; cart key must be `Color__Size` (use `Default__M` not `__M`) |
| Square shows wrong item | API not using `variationId`; redeploy `app.py` and clear/re-add cart lines on the shop |
| CORS error in browser | Add shop origin to `ALLOWED_ORIGINS` or use gear API proxy worker |
| Traefik 404 | Confirm compose project path is `AV-PNW.com/av_storefront/backend` (not stale worktree paths) |

---

## Deploy (NXCore)

One-shot from repo root (after `npm run sync:all`):

```powershell
npm run deploy:nxcore              # console + backend
npm run deploy:nxcore -- -ConsoleOnly
npm run deploy:nxcore -- -BackendOnly
```

See **`scripts/deploy-nxcore.ps1`** and **`docs/NXCORE_CONSOLE.md`** § Deploy console to NXCore.

---

## Related docs

| Doc | Topic |
|-----|--------|
| **`docs/USER_MANUAL/README.md`** | Operator manual (orders, fulfillment, runbooks) |
| **`docs/STOREFRONT.md`** | Checkout UX, `variationId`, retest checklist |
| **`docs/DEPLOY_GITHUB_PAGES.md`** | Public shop + API proxy / CORS |
| **`docs/USER_MANUAL/05-checkout-and-payments.md`** | Cart keys, bootstrap, checkout |
| **`docs/WORKFLOWS.md`** | Catalog → shop pipeline (not API deploy) |
| **`docs/NXCORE_CONSOLE.md`** | Private catalog console on NXCore |
| **`horizon/DEPLOYMENT_SOP.md`** | Horizon-specific map activation, controlled order, launch, and rollback |
| **`store/backend/.env.example`** | Full environment variable reference |
