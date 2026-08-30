# 8 — Audits & runbooks

**Living status:** [../STATUS.md](../STATUS.md) — last audited production snapshot (shop, API, fulfillment, git drift).

## Pre-launch / periodic checklist

Run before go-live or after major catalog changes.

### Shop & catalog

- [ ] `npm run sync:all && npm run build:pages` succeeds
- [ ] Every sellable variant has `variation_id` in JSON
- [ ] Legacy images exist under `store/img/`; canonical `image`/`images` paths exist under `store/products/{product-id}/`
- [ ] Every canonical/runtime gallery hash matches its `manifest.json`; every WebP decodes
- [ ] `_incoming` contains no completed ZIPs; completed sources are under `_completed`
- [ ] Push to `main` — Pages deploy green

### Horizon public preview / release

- [ ] `node horizon/scripts/build-catalog-fallback.mjs` completes
- [ ] `node horizon/scripts/validate-catalog.mjs` passes
- [ ] CDA-SET-001 remains hidden until bundle fulfillment is approved
- [ ] CDA004 and CDA008 remain explicit, non-cartable placeholders until
      approved media and provider records exist
- [ ] The public artifact contains only the deployment allowlist; source
      masters, SQL, provider evidence, planning records, and credentials are
      absent
- [ ] All six current Square and Printful routes are backed up, imported, and
      audited before checkout flags change
- [ ] A controlled paid order passes before DNS launch

Canonical procedure:
[Horizon deployment SOP](../../horizon/DEPLOYMENT_SOP.md). Remaining work:
[Horizon completion plan](../../horizon/COMPLETION_PLAN.md).

### Backend (NXCore)

- [ ] `curl https://api.aerovista.us/api/health` OK
- [ ] `SQUARE_WEBHOOK_NOTIFICATION_URL` set in `.env`
- [ ] `ALLOWED_ORIGINS` includes shop + console
- [ ] `OPS_SECRET` set; `/api/ops/db` returns **401** without/wrong token (404 only if `OPS_SECRET` unset — fail closed)
- [ ] `node scripts/audit-ops-endpoint.mjs` passes (set `OPS_TOKEN` for full operator-access check)
- [ ] Fresh `square_products_latest.json` on server

### Fulfillment

- [ ] Printful: new products appear under **Published** (AeroVista store)
- [ ] `audit-product-variant-map.py` — 0 missing for visible variants
- [ ] Test checkout (small item) → order in Postgres → Printful order submitted

### Repo hygiene

```bash
npm run audit:repo
```

See archived [../archive/FILE_AUDIT.md](../archive/FILE_AUDIT.md) for file layout reference.

---

## Audit scripts (NXCore)

Copy latest scripts from dev `store/backend/scripts/` then:

| Command | Purpose |
|---------|---------|
| `python scripts/audit-all-orders.py` | All orders + fulfillment status |
| `python scripts/audit-product-variant-map.py` | Catalog vs Printful vs Postgres |
| `python scripts/check-printful-orders.py` | Printful API order list |
| `python scripts/import-all-printful-sync-maps.py` | Bulk import sync ids (rate-limit aware) |
| `python scripts/investigate-missing-orders.py` | Webhook / DB gap analysis |
| `python scripts/fetch-recent-square-orders.py` | Square-side comparison |
| `python scripts/backfill-fulfillment-status.py` | Fix status column after worker fix |

Run via: `docker compose exec api python scripts/<name>.py`

---

## Runbook: new product go-live

1. Square catalog + xlsx export
2. Console: load → clean → assign collection → **Deploy to store**
3. Add legacy hero art to `store/img/`, or import provider galleries into `store/products/{product-id}/` using the `_incoming/README.md` workflow
4. Run image optimization, sync, storefront/overlay audits, and `npm run build:pages`
5. Printful: sync/link product (Published)
6. NXCore: copy JSON if needed, restart API
7. `import-all-printful-sync-maps.py` → `audit-product-variant-map.py`
8. Git push (shop)
9. Test add-to-cart + checkout on staging or low-cost SKU

---

## Runbook: order stuck / not in Printful

1. `audit-all-orders.py` — find order id and `fulfillment_status`
2. If no Postgres row → webhook issue ([09-troubleshooting.md](09-troubleshooting.md))
3. If `needs_review` → run variant map audit for that variation id
4. Check worker logs: `docker compose logs fulfillment-worker --tail=100`
5. Re-queue if needed: `enable-promo-order-fulfillment.py` or manual job insert

---

## Runbook: duplicate / wrong order

1. Identify Square order id in Postgres
2. `cancel-order-fulfillment.py` for duplicate
3. Confirm Printful order cancelled if already submitted
4. Document in ops notes (customer comms outside this manual)

---

## Historical pre-launch snapshot

Point-in-time audit (2026-06-14): [../archive/PRE_LAUNCH_AUDIT.md](../archive/PRE_LAUNCH_AUDIT.md)

**Current status (rolling):** [../STATUS.md](../STATUS.md)

Current procedures supersede archived audits; use this manual first.
