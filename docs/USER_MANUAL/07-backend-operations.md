# 7 — Backend operations

## Location

| | |
|--|--|
| **Host** | `glyph@100.115.9.61` (NXCore) |
| **Path** | `/srv/Collab/mini.shops/AV-PNW.com/av_storefront/backend/` |
| **URL** | https://api.aerovista.us |

Full deploy guide: [../BACKEND_DEPLOY.md](../BACKEND_DEPLOY.md)

## Deploy backend changes

From dev machine (PowerShell-friendly):

```powershell
scp -r store/backend/* glyph@100.115.9.61:/srv/Collab/mini.shops/AV-PNW.com/av_storefront/backend/
```

On NXCore:

```bash
cd /srv/Collab/mini.shops/AV-PNW.com/av_storefront/backend/
docker compose build api fulfillment-worker reconcile-worker
docker compose up -d
docker compose logs -f fulfillment-worker --tail=50
```

**Never** commit `store/backend/` — it is gitignored.

## Docker Compose services

| Service | Image role |
|---------|------------|
| `api` | Flask app, webhooks, checkout |
| `postgres` | Database |
| `fulfillment-worker` | Printful submission loop |
| `reconcile-worker` | Repair missing jobs |

## Environment file

Edit `backend/.env` on NXCore. After changes:

```bash
docker compose up -d
```

### Required variables (production)

```env
SQUARE_ACCESS_TOKEN=...
SQUARE_LOCATION_ID=...
SQUARE_WEBHOOK_SIGNATURE_KEY=...
SQUARE_WEBHOOK_NOTIFICATION_URL=https://api.aerovista.us/api/webhooks/square
PRINTFUL_API_KEY=...
ALLOWED_ORIGINS=https://gear.aerovista.us,https://store-console.aerocoreos.com
OPS_SECRET=...                    # ops DB endpoint
DATABASE_URL=postgresql://...
```

## Running scripts inside Docker

```bash
cd /srv/Collab/mini.shops/AV-PNW.com/av_storefront/backend/
docker compose exec api python scripts/audit-all-orders.py
```

**Do not** use `/home/glyph/scripts` — path does not exist. Use `backend/scripts/` or `/tmp` + `docker cp`.

## Health checks

```bash
curl -s https://api.aerovista.us/api/health
docker compose ps
docker compose logs api --tail=30
docker compose logs fulfillment-worker --tail=30
```

### Ops endpoint auth (pre–live sales gate)

`GET /api/ops/db` requires `X-Ops-Token` matching `OPS_SECRET`. From the dev machine:

```bash
npm run audit:ops-endpoint
OPS_TOKEN='<OPS_SECRET from nxcore .env>' npm run audit:ops-endpoint
```

Results are logged in repo root **`WORKLOG.md`**.

## Webhook verification

If orders stop appearing in Postgres:

1. Confirm `SQUARE_WEBHOOK_NOTIFICATION_URL` in `.env`
2. Check Square Developer Dashboard → webhook subscription URL
3. Query `webhook_events` table or API logs for 400s

See [09-troubleshooting.md](09-troubleshooting.md).

## Console on same host

Console deploy is separate compose stack — [../NXCORE_CONSOLE.md](../NXCORE_CONSOLE.md).
