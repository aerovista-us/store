# AeroVista Store API — SOT

**[SOT.json](SOT.json)** in this folder is the Source of Truth manifest for the **backend/** subtree (Flask API, workers, database, Docker).

## Parent repo

The full storefront manifest is **[../SOT.json](../SOT.json)**.

## What this SOT covers

- **app.py** — Flask routes (`/api/health`, `/api/square/*`, webhooks, ops).
- **docker-compose.yml** and **docker-compose.local.yml** — runtime topology.
- **workers/fulfillment_worker.py** — Printful submission path.
- **scripts/** — Printful export and variant map build helpers.
- **db/** — SQLAlchemy models and Alembic migrations.

## Other files in this pack

| File | Role |
|------|------|
| **SOT_AEROVISTA_TEMPLATE_GUIDE.md** | Generic schema / layout guide. |
| **SOT_EXAMPLE_NOTES.md** | Backend-specific SOT notes. |

## Public URL

Production API: **https://api.aerovista.us** (see **../docs/DEPLOY_AV_STORE_API_NXCORE.md** and **../docs/HOSTING_AND_DNS.md**).
