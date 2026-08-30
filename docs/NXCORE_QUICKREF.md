# NXCore quick reference (memorable names)

Use these nicknames instead of long paths when talking or typing.

## Nicknames

| Nickname | What it is |
|----------|------------|
| **nxcore** | Server `glyph@100.115.9.61` (Tailscale) |
| **av-store** | Parent folder on nxcore: `/srv/Collab/mini.shops/AV-PNW.com/av_storefront/` |
| **av-backend** | Payment API compose: `av-store/.../backend/` |
| **av-api** | Public URL https://api.aerovista.us |
| **av-gear** | Public shop https://gear.aerovista.us |
| **av-console** | Catalog console https://store-console.aerocoreos.com |

## One-liners

```powershell
# SSH to nxcore
ssh glyph@100.115.9.61

# Jump into backend folder on nxcore
ssh glyph@100.115.9.61 "cd /srv/Collab/mini.shops/AV-PNW.com/av_storefront/backend && bash"

# Deploy backend + catalog from this repo (Windows)
npm run deploy:nxcore -- -BackendOnly

# Regenerate + push checkout SKU map
npm run nxcore:sku-map
```

## Passwords & tokens (memorable defaults)

| Secret | Where | Memorable value / pattern |
|--------|--------|---------------------------|
| **Postgres** | `docker-compose.yml` + `DATABASE_URL` | Runtime credentials are stored only in the protected environment; do not place passwords in source or documentation. |
| **Ops API token** | `.env` → `OPS_SECRET` | Stored only in the protected runtime environment; never place the value in source or documentation (header `X-Ops-Token`) |
| **Square / Printful** | `.env` | From dashboards only — no fixed mnemonic |

Ops routes (need token):

- `GET https://api.aerovista.us/api/ops/db`
- `GET https://api.aerovista.us/ops/printful`

Webhook route (Square Dashboard must match):

- `POST https://api.aerovista.us/api/webhooks/square`

## Docker container names

| Container | Role |
|-----------|------|
| `av-store-api` | Checkout + webhooks |
| `av-store-postgres` | Orders DB |
| `av-store-fulfillment-worker` | Printful jobs |
| `av-store-reconcile-worker` | Job repair |

## After changing `.env` on nxcore

```bash
cd /srv/Collab/mini.shops/AV-PNW.com/av_storefront/backend
docker compose up -d av-store-api fulfillment-worker reconcile-worker
```

Full deploy guide: **`BACKEND_DEPLOY.md`**
