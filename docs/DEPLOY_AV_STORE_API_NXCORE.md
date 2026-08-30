# Deploy AeroVista Store API on NXCore

The canonical storefront is `https://aerovista.us` (with `https://www.aerovista.us` as an alias), and it needs **api.aerovista.us** to point at the `av-store-api` container. If that container is not running, you get CORS/502 errors because Traefik has no backend for `api.aerovista.us`.

## 1) Where to run the backend on NXCore

Pick a path, e.g. `/srv/core/ops/av-store-api` (or next to your other services). Clone or copy the **backend** there:

```bash
# Example: clone the repo and use only the backend
git clone https://github.com/aerovista-us/store.git /srv/core/ops/av-store-api
cd /srv/core/ops/av-store-api/backend
# Or if you already have the repo elsewhere, copy just the backend folder to /srv/core/ops/av-store-api
```

## 2) Create `.env`

```bash
cd /srv/core/ops/av-store-api/backend
cp .env.example .env
# Edit .env and set at least:
   #   ALLOWED_ORIGINS=https://aerovista.us,https://www.aerovista.us
#   SQUARE_ENV=production  (or sandbox)
#   SQUARE_ACCESS_TOKEN=...
#   SQUARE_APP_ID=...
#   SQUARE_LOCATION_ID=...
#   SQUARE_FLAT_SHIPPING_CENTS=695  (or your value)
```

**Required for production store:**  
`ALLOWED_ORIGINS=https://aerovista.us,https://www.aerovista.us`  

Legacy GitHub Pages testing, if still used:
`ALLOWED_ORIGINS=https://aerovista-us.github.io`

## 3) Ensure Traefik network exists

The compose file uses external network `nxtraefik_default`. Your Traefik stack likely created it. Check:

```bash
docker network ls | grep nxtraefik
```

If the name is different (e.g. `nxtraefik_default`), the backend `docker-compose.yml` already uses `name: nxtraefik_default`. If your network has another name, edit `docker-compose.yml` under `networks.nxtraefik.name` to match.

## 4) Build and start

```bash
cd /srv/core/ops/av-store-api/backend
docker compose -f docker-compose.yml up -d --build
```

## 5) Verify

- Container running:
  ```bash
  docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep av-store
  ```
- From NXCore (internal), health:
  ```bash
  curl -s http://localhost:8088/api/health
  ```
  (If Traefik doesn’t publish 8088 for this service, use the container name:
  `docker exec av-store-api curl -s http://localhost:8088/api/health` or hit via Traefik hostname.)
- From the internet (after tunnel/DNS):
  ```bash
  curl -sI https://api.aerovista.us/api/health
  ```
  Expect **200** and response body `{"ok":true,...}`.

## 6) CORS check from the store

Open https://aerovista.us/, add to cart, open Checkout. In DevTools → Network, the request to `https://api.aerovista.us/api/square/bootstrap` should return **200** and response headers should include:

`Access-Control-Allow-Origin: https://aerovista.us`

If CORS still fails, confirm `ALLOWED_ORIGINS` in `.env` is exactly that origin, then:

```bash
docker compose -f docker-compose.yml restart av-store-api
```

## Traefik / TLS

The stack expects Traefik to have:

- Entrypoint `websecure` (HTTPS)
- Cert resolver `le_dns` (e.g. Let’s Encrypt DNS challenge)

If your Traefik uses different names, adjust the labels in `backend/docker-compose.yml` (e.g. `traefik.http.routers.avstoreapi.entrypoints` and `tls.certresolver`). See your existing Traefik static/dynamic config on NXCore.

## Summary

| Step | Action |
|------|--------|
| 1 | Put backend at e.g. `/srv/core/ops/av-store-api/backend` |
| 2 | `.env` with `ALLOWED_ORIGINS=https://aerovista.us,https://www.aerovista.us` + Square creds |
| 3 | `docker network ls` to confirm `nxtraefik_default` |
| 4 | `docker compose -f docker-compose.yml up -d --build` |
| 5 | `curl` health and `https://api.aerovista.us/api/health` |
| 6 | Test checkout on the canonical storefront; restart API if you change CORS |
