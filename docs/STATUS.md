# Production status report

**Last audited:** 2026-08-23 (America/Los_Angeles)  
**Refresh:** re-run checks in [§ Audit commands](#audit-commands) after deploys.

Living snapshot of **shop**, **backend**, and **repo drift**. Supersedes ad-hoc chat summaries.

---

## Summary

| Surface | URL | Status | Notes |
|---------|-----|--------|-------|
| **Gear shop** | https://gear.aerovista.us | **Up** | Build `2026-07-21-commerce-first-1a`; `storedVid \|\| mappedVid`; `verify:checkout-fix` **PASS** (2026-08-23) |
| **Payment API** | https://api.aerovista.us | **Up** | Square **production**; `/api/health` + Gear bootstrap `200`; Horizon origin in CORS |
| **Production `/v1`** | https://api.aerovista.us/v1/stores | **Not deployed** | Cloudflare `308` redirect loop to same URL; no customer `/v1` traffic authorized |
| **Catalog console** | https://store-console.aerocoreos.com | **Up / protected** | Unauthenticated request hits Cloudflare Access sign-in (not a public JSON health) |
| **Ops `/api/ops/db`** | https://api.aerovista.us/api/ops/db | **Auth OK** | Unauthenticated + wrong token → **401** (`audit-ops-endpoint.mjs`) |
| **NXCore Docker** | `glyph@100.115.9.61` | **Not re-checked** | Last container audit 2026-07-25; SSH probe not run 2026-08-23 |
| **Horizon** | https://horizon.aerovista.us | **Public noindex / checkout active** | HTML `200`; `noindex` present; public `catalog.json` 5 published / 5 checkout-ready; `/api/health` via Worker `200` |

**Top open items:** complete rights/crop/proof work, pass an approved paid
controlled order, publish policies, and approve removal of
`noindex`. Product/provider mutations remain approval-gated.

**2026-07-27 Horizon commerce release:** eight exact provider routes, including
Last Light Over the Resort, are active in production. Five public variants can
create Square-hosted checkout sessions. A Last Light link smoke returned
HTTP 200 and a `square.link` URL without payment. Autumn Over Coeur d’Alene is
archived without deletion. The storefront renders four consumer works in
small-to-large physical order plus Harbor in business placement, hides all
placeholders and the bundle, and keeps non-public variants fail-closed. See
`horizon/DEPLOYMENT_SOP.md` and `horizon/COMPLETION_PLAN.md`.

## Horizon deployment readiness

| Check | Result |
|---|---|
| Catalog validator | 11 products, 12 variants, 5 published, 5 checkout-ready |
| Visible media | 4 consumer works + 1 Harbor business-placement feature; 0 placeholders |
| Bundle | Hidden |
| Catalog loading | `catalog.json` with synchronized `catalog.generated.js` fallback |
| Checkout / production routes | 8 deployed and verified, including Last Light |
| Public artifact | 18-file allowlisted artifact; 5 customer products; generated photographic room included; private/provider fields excluded |
| Hosting / DNS | GitHub Pages commit `68555ce`, run `30424671811`, behind Cloudflare Worker Custom Domain |
| NXCore / API | API healthy; Horizon CORS and same-origin `/api/*` verified |
| Production maps | 8 checkout keys + 8 database rows active; backup recorded |
| Controlled order | Checkout-link smoke passed; no charge or production order submitted |

---

## Shop (gear.aerovista.us)

| Check | Result |
|-------|--------|
| HTTP | 200 OK |
| `STORE_BUILD_ID` (live) | `2026-07-21-commerce-first-1a` |
| Checkout `variationId` order (live) | `storedVid \|\| mappedVid` — **corrected** |
| Checkout `variationId` order (local `store/index.html`) | `storedVid \|\| mappedVid` — **fixed** |
| Homepage / About / bootstrap | `200` at `/`, `/about.html`, and `/api/square/bootstrap` |

The known shop-side variation-priority defect is no longer an open production
issue. Products that share display/cart keys still require regression coverage
because distinct Square variation IDs are a protected invariant.

---

## Backend (api.aerovista.us)

### Health (`GET /api/health`)

| Field | Value |
|-------|--------|
| `ok` | `true` |
| `square_env` | `production` |
| Square creds | present |
| CORS | includes `https://gear.aerovista.us`, console, Pages origins |

The public health payload still exposes credential-presence flags and the full
allowed-origins list. Redact those details during the controlled production
`/v1` ingress/security release.

### NXCore containers (2026-07-25)

| Container | Status |
|-----------|--------|
| `av-store-api` | Up 3 days (**healthy**) |
| `av-store-postgres` | Up 4 weeks |
| `av-store-fulfillment-worker` | Up 3 weeks |
| `av-store-reconcile-worker` | Up 4 weeks |

Compose path: `/srv/Collab/mini.shops/AV-PNW.com/av_storefront/backend/`

### Ops & webhooks

| Item | Status |
|------|--------|
| `OPS_SECRET` | Set in the protected runtime environment; value intentionally omitted (`X-Ops-Token`) |
| `GET /api/ops/db` without token | **401** (expected) |
| Webhook URL | `https://api.aerovista.us/api/webhooks/square` |

Quick ref: [NXCORE_QUICKREF.md](NXCORE_QUICKREF.md) · Deploy: [BACKEND_DEPLOY.md](BACKEND_DEPLOY.md)

### Checkout resolution (API)

Deployed fixes, verified against the July 25 live HTML/API path:

- Client `variationId` preferred over stale SKU-map collisions
- `square_products_latest.json` mounted in `av-store-api`
- SKU map via `sku_map.generated.json` (not inline stale JSON)

**Live API probe (2026-07-07):** `node scripts/audit-checkout-variation-collisions.mjs`

| Probe | Result |
|-------|--------|
| Bootstrap `sellableCartKeys` | 29 |
| Single-item `Default__M` checkout (5 distinct products) | **5/5 OK** |
| Multi-item `Default__M` cart | **OK** |

API accepts the correct `variationId` per product, and the live Gear HTML now
prefers `storedVid || mappedVid`.

Local `store/checkout_ready_keys.json` meta (2026-06-14): **171 ready / 0 failed** — re-run `npm run nxcore:sku-map` after catalog changes.

---

## Fulfillment queue (last authenticated snapshot)

Source: `GET /api/ops/db?limit=50` with valid ops token (**2026-07-07**).
These counts are historical and must not be presented as the current queue
without a new authenticated audit.

| Metric | Count |
|--------|-------|
| Orders in DB | 11 |
| Fulfillment jobs | 11 |

| `job_status` / `fulfillment_status` | Count |
|-------------------------------------|-------|
| `submitted` | 6 |
| `needs_review` | 3 |
| `fulfilled` | 1 |
| `cancelled` | 1 |

**`needs_review` (3):** older orders (Apr 2026) — *“No mapped variants for any items”* (test / non-Printful SKUs).  
**Recent apparel orders:** `submitted` — Printful jobs created.

Runbook: [USER_MANUAL/06-orders-and-fulfillment.md](USER_MANUAL/06-orders-and-fulfillment.md), [USER_MANUAL/09-troubleshooting.md](USER_MANUAL/09-troubleshooting.md)

---

## Catalog console

| Field | Value |
|-------|--------|
| Service | `av-catalog-console` — running on NXCore |
| Public unauthenticated health | `401` — expected private-access boundary |
| Store mount | NXCore `AeroVista_Catalog_Console/store-data` → container `/app/stores` |
| Horizon workspace | NXCore console directory remains empty; canonical local source and evidence are under repo `horizon/` |
| Production publish boundary | Gear-only compatibility publisher remains protected; Horizon must not invoke it |
| Local catalog (2026-08-23) | Deployed Console export `square_products_cleaned_v2 (6).json` → `store/square_products_latest.json` (85 products, 36 visible). Normalized DockLife image to `docklife/docklife-drip_hat.png`. Synced `public/shop/` + console baselines. **Not yet pushed to GitHub Pages.** |

The unpublished `aerovista-commerce-sandbox` API and PostgreSQL containers are
also running and healthy. They have no public Traefik route or host-published
ports and remain separate from production fulfillment workers.

---

## Git / repo drift

```
main...origin/main [ahead 1, behind 16]
```

| Item | Detail |
|------|--------|
| Unpushed commit | `0ac7292` — ops dashboard fulfilled status display |
| Uncommitted | Large mixed operational worktree: storefront, docs, scripts, SKU maps, Horizon source, planning, and generated/support files |
| `store/backend/` | gitignored — lives on NXCore only |
| Clean implementation repositories | Backend main `f9c28d6`, console main `b791bbf`, public contracts main `82b363f`; latest CI gates green |

---

## Recommended next actions

1. **Preserve Gear** — keep the verified Plan 1A/legacy checkout path in place.
2. **Repair source control** — reconcile the original NAS worktree without
   discarding unrelated operational changes; use the clean repositories for
   reviewed platform work.
3. **Maintain the Horizon artifact** — rebuild, audit, publish, and verify the
   dedicated GitHub Pages artifact after customer-safe changes.
4. **Finish products and proofs** — approve rights and cropped masters, update
   Printful artwork, resolve price/size decisions, and approve physical proofs.
5. **Keep indexing gated** — retain `noindex`, hidden incomplete works, and the
   hidden bundle until the policy, proof, and launch gates pass.
6. **Controlled order** — the eight checkout and production maps are active;
   run one separately approved paid end-to-end order and inspect the received
   canvas.
7. **Complete separately from `/v1`** — publish policies, verify rollback and
   monitoring, then approve removal of `noindex`. The broader
   production `/v1` ingress remains a separate release.

---

## Audit commands

```powershell
# Live health
curl.exe -s https://api.aerovista.us/api/health
curl.exe -s https://store-console.aerocoreos.com/api/health

# Ops auth (no token → 401)
node scripts/audit-ops-endpoint.mjs
$env:OPS_TOKEN = "<load from the approved secret store>"
node scripts/audit-ops-endpoint.mjs

# Storefront checkout patterns
npm run verify:checkout-fix
curl.exe -s https://gear.aerovista.us/ | findstr /i "storedVid mappedVid STORE_BUILD_ID"

# Checkout collisions + API probe
node scripts/audit-checkout-variation-collisions.mjs

# NXCore containers
ssh glyph@100.115.9.61 "cd /srv/Collab/mini.shops/AV-PNW.com/av_storefront/backend && docker compose ps"
```

---

## Repo sync (2026-08-23)

| Item | Result |
|------|--------|
| Local `main` vs `origin/main` | Rebased; **ahead 1** (fulfillment `fulfilled` display fix `f3ff40d`); behind **0** |
| WIP backup branch | `backup/wip-dirty-20260823` (`2da4b85`) |
| Restored WIP | `horizon/`, docs, planning, ops scripts — see [RECONCILE_INVENTORY_2026-08-23.md](RECONCILE_INVENTORY_2026-08-23.md) |
| Left untracked | `.dev/`, `.playwright-cli/`, `output/` (gitignored) |
| Not pushed | Local ahead commit + restored WIP remain unpushed / uncommitted until explicitly requested |

---

## Related docs

| Doc | Purpose |
|-----|---------|
| [USER_MANUAL/08-audits-and-runbooks.md](USER_MANUAL/08-audits-and-runbooks.md) | Checklists and runbooks |
| [WORKLOG.md](../WORKLOG.md) | Dated change log |
| [RECONCILE_INVENTORY_2026-08-23.md](RECONCILE_INVENTORY_2026-08-23.md) | Post-rebase keep vs private inventory |
| [docs/store-internal/handoffnotes.md](../docs/store-internal/handoffnotes.md) | Developer quick map |
