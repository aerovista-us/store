# Private catalog console (NXCore)

Operator tooling is **not** deployed to GitHub Pages. Host it behind **Cloudflare Access** and/or **Tailscale** on NXCore.

## Target URL

**https://store-console.aerocoreos.com/**

(Alternate: `https://console.aerocoreos.com/store/` — prefer the dedicated subdomain for Traefik routing.)

## What runs here

| Tool | Source in repo |
|------|----------------|
| Catalog console v2 | `console/aerovista_catalog_console_v2.html` |
| Console config | `console/catalog-console-config.js` — lanes, API URLs, AVCC link |
| Static server + APIs | `console/server.js` — deploy, image list/pull, bridge manifest, bootstrap proxy |
| Catalog / overlay data | `store/square_products_latest.json`, `store/storefront_overlay.json` |
| Offline console overlay stub | **`console/overlay_baseline.js`** — auto-generated from `store/storefront_overlay.json` via **`npm run sync:console`** (avoids stray “Unmatched” rows vs `catalog_baseline.js`) |
| Images | `store/img/` |
| Deploy API (optional) | `npm run deploy:server` on NXCore |

When you edit **`store/storefront_overlay.json`**, run **`npm run sync:console`** so **`console/overlay_baseline.js`** (and **`public/console/`**) pick up the same JSON. Catalog Console loads that script before fetching `storefront_overlay.json`; overlay keys that don’t exist on your **imported** catalog still show as **Unmatched** (stale Square tokens or mixed exports).

## Suggested NXCore layout (production)

```text
/srv/Collab/mini.shops/AV-PNW.com/av_storefront/
  backend/                          # payment API (api.aerovista.us)
  square_products_latest.json       # API catalog fallback
  AeroVista_Catalog_Console/        # catalog console (store-console.aerocoreos.com)
    aerovista_catalog_console_v2.html
    server.js
    catalog-console-config.js
    docker-compose.yml
    public/build-source-manifest.json
  store/                            # optional mount target for images + JSON
```

Container **`av-catalog-console`** — host port **3014** → container **80**.

Alternate / dev layout (repo `console/docker-compose.yml` with `../store` mount):

```text
/srv/ACOS/av-store-console/   # optional; not current production path
```

## Deploy console to NXCore

**Last updated:** 2026-06-14

From a machine with the repo and SSH access:

```powershell
# 1. Sync public/console locally (optional verify)
npm run sync:console

# 2. Copy console canon files
$CONSOLE="/srv/Collab/mini.shops/AV-PNW.com/av_storefront/AeroVista_Catalog_Console"
scp console/aerovista_catalog_console_v2.html console/server.js console/catalog-console-config.js `
    console/catalog_baseline.js console/overlay_baseline.js console/SOT.json `
    console/Dockerfile console/docker-compose.yml `
    glyph@100.115.9.61:${CONSOLE}/

# 3. Rebuild on NXCore
ssh glyph@100.115.9.61 "cd $CONSOLE && docker compose up -d --build"

# Or use npm script (sync + deploy):
# npm run deploy:nxcore -- -ConsoleOnly

# 4. Verify
curl -s https://store-console.aerocoreos.com/api/health
```

Ensure **`../store`** and **`../public`** mounts exist per `console/docker-compose.yml` (store rw, public ro for bridge manifest).

If your NXCore layout differs from `/srv/ACOS/av-store-console/`, use the path that serves **store-console.aerocoreos.com** in Traefik.

---

## Docker (from repo)

```bash
# On NXCore — mount store read-only
docker compose -f console/docker-compose.yml up -d --build
```

`console/docker-compose.yml` mounts `../store` **read-write** (for catalog deploy) and `../public` read-only (for `build-source-manifest.json`).

Local dev:

```bash
npm run console:server
# PORT=3014 npm run console:server
```

### Catalog console server APIs (console/server.js)

| Endpoint | Purpose |
|----------|---------|
| `GET /api/health` | Console + store writable status |
| `POST /api/deploy` | Write catalog (+ optional overlay) to `store/` |
| `GET /api/store/images` | List `store/img/` for validation |
| `POST /api/pull-product-images` | Download Square (Printful fallback) images into `store/img/` |
| `GET /api/pull-product-images/status` | Whether Square/Printful credentials are available for image pull |
| `GET /api/store/catalog-meta` | On-disk catalog mtime / product count |
| `GET /api/bridge/manifest` | Read `public/build-source-manifest.json` (AVCC Command Center consumes this) |
| `GET /api/proxy/bootstrap` | Payment API sellable cart keys |
| `POST /api/run-bulk-remove-bg` | Background removal job |

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

1. **Hosted console (NXCore):** **Operator Hub → Deploy to store** (or Exports tab) — writes `store/square_products_latest.json` via `POST /api/deploy`
2. **Local dev:** `npm run deploy:server` (port 5199) *or* `npm run console:server` with writable `store/` mount
3. **Git push** to `aerovista-us/store` `main` → GitHub Pages updates **gear.aerovista.us**
4. Copy catalog to NXCore API path if checkout uses server-side JSON fallback
5. Run Printful variant map audit ([USER_MANUAL/08-audits-and-runbooks.md](USER_MANUAL/08-audits-and-runbooks.md))

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

## Related docs

- **`docs/WORKFLOWS.md`** — sync and deploy commands  
- **`docs/CATALOG_PIPELINE.md`** — Square export intake  
- **`docs/STOREFRONT.md`** — public shop behavior (gear.aerovista.us)  
- **`docs/DEPLOY_GITHUB_PAGES.md`** — Pages build and CORS  
