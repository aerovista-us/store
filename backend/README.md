# AeroVista Store API (NXCore)

## What this is
A minimal Flask API that:
- exposes `/api/square/bootstrap` for the storefront
- processes cart checkout via Square:
q  - CreateOrder (single SHIPMENT fulfillment + flat shipping)
  - CreatePayment (charge immediately)

## Setup
### Docker / Compose (recommended)
1) Copy env template:
- `cp .env.example .env`
- Fill in Square values
- Set `ALLOWED_ORIGINS` to your storefront origin(s)

2) Local dev (no Traefik, exposes port 8088):
- `docker compose -f docker-compose.local.yml up -d --build`
- health: `GET /api/health`

3) Traefik / prod-like:
- `docker compose -f docker-compose.yml up -d --build`
- Requires external network `nxtraefik_default`

### Bare metal (optional)
- `python3 app.py` (dev server)
- or `gunicorn -b 0.0.0.0:8088 app:app` (prod-like)

## Cloudflare Tunnel
Use `cloudflared/config.yml` as a starting point. Route `api.yourdomain.com` to `http://localhost:8088`.

## Linux service template
Systemd unit template: `systemd/av-store-api.service`

## Suggested CORS for GitHub Pages
If your storefront is served from GitHub Pages, set:
- `ALLOWED_ORIGINS=https://aerovista-us.github.io`

## Product mapping (important)
Your storefront must send Square **variation IDs** for each cart item.
In the provided storefront scaffold, each product can define:
`squareVariationMap: { "Color__Size": "SQUARE_VARIATION_ID" }`

You can find variation IDs via:
- Square Developer Console / Catalog API
- or Square Dashboard → item variation details (depending on UI)
