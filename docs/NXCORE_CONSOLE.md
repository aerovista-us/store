# Private catalog console (NXCore)

Operator tooling is **not** deployed to GitHub Pages. Host it behind **Cloudflare Access** and/or **Tailscale** on NXCore.

## Target URL

**https://store-console.aerocoreos.com/**

(Alternate: `https://console.aerocoreos.com/store/` — prefer the dedicated subdomain for Traefik routing.)

## What runs here

| Tool | Source in repo |
|------|----------------|
| Catalog console v2 | `console/aerovista_catalog_console_v2.html` |
| Static server + bg removal API | `console/server.js` |
| Catalog / overlay data | `store/square_products_latest.json`, `store/storefront_overlay.json` |
| Images | `store/img/` |
| Deploy API (optional) | `npm run deploy:server` on NXCore |

## Suggested NXCore layout

```text
/srv/ACOS/av-store-console/
  docker-compose.yml
  console/          # copy from repo console/
  store/            # mount or sync from repo store/ (catalog + img)
  data/
    overlays/
    exports/
    reports/
```

## Docker (from repo)

```bash
# On NXCore — mount store read-only
docker compose -f console/docker-compose.yml up -d --build
```

`console/docker-compose.yml` mounts `../store` at `/app/store` for catalog JSON and images.

Local dev:

```bash
npm run console:server
# PORT=3014 npm run console:server
```

## Traefik labels (concept)

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.av-store-console.rule=Host(`store-console.aerocoreos.com`)"
  - "traefik.http.routers.av-store-console.entrypoints=websecure"
  - "traefik.http.routers.av-store-console.tls=true"
  - "traefik.http.services.av-store-console.loadbalancer.server.port=80"
```

Protect with **Cloudflare Access** (operator email / IdP) and optionally **Tailscale-only** ingress.

## Deploy catalog to public shop

From an operator machine with repo access:

1. `npm run deploy:server` (or run on NXCore bound to localhost)
2. Console **Exports → Deploy to store** → writes `store/` + sync
3. **Git push** to `aerovista-us/store` `main` → GitHub Pages updates **gear.aerovista.us**

Console does not push to GitHub by itself.

## Local dev vs production

| | Local (`npm run dev`) | GitHub Pages | NXCore console |
|--|----------------------|--------------|----------------|
| Console | `/console/` iframe if `VITE_OPERATOR_MODE=true` | **Not published** | Full v2 HTML |
| Shop | `/shop/index.html` | **gear.aerovista.us** root | N/A |

Set in `.env.development`:

```bash
VITE_OPERATOR_MODE=true
```

Public Pages build sets `VITE_OPERATOR_MODE=false` and does not include console assets.
