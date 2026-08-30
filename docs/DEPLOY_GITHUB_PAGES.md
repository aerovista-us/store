# Deploy public storefronts

The existing GitHub Pages workflow publishes the **AV Gear Shop storefront
only**. It does **not** publish Horizon, the catalog console, backend, margin
tools, or operator routes.

| Surface | URL | Hosting |
|---------|-----|---------|
| **Public shop** | https://gear.aerovista.us/ | GitHub Pages (`aerovista-us/store`) |
| **Horizon preview** | https://horizon.aerovista.us/ | Dedicated `aerovista-us/horizon-storefront` GitHub Pages artifact behind the shared Cloudflare Worker |
| **Private console** | https://store-console.aerocoreos.com/ | NXCore / Traefik / Cloudflare Access — see **`docs/NXCORE_CONSOLE.md`** |
| **Payment API** | https://api.aerovista.us/ | NXCore Docker — see **`docs/BACKEND_DEPLOY.md`** |

Pages sites are **public on the internet** even when the source repo is private. Do not rely on hidden paths for the console.

---

## One-time GitHub setup

1. **Settings → Pages → Build and deployment**
   - **Source:** **GitHub Actions** (not “Deploy from a branch”)
   - If **Source** is “branch / (root)”, the site serves repo-root `index.html` (Vite dev shell) → **white screen**. The static shop only appears at `/store/index.html` until you switch to Actions.
2. **Custom domain:** `gear.aerovista.us` → Save → wait for DNS check
3. Enable **Enforce HTTPS** when available
4. Push to `main` or run **Actions → Deploy GitHub Pages**

After a successful Actions deploy, **https://gear.aerovista.us/** should serve the full storefront HTML (~200KB+), not a tiny ~400-byte React shell.

Workflow: `.github/workflows/deploy-github-pages.yml`

## Horizon is a separate deployment

Do not add Horizon files to Gear’s `dist/` or change Gear’s `CNAME`. The
current Pages workflow owns the Gear root artifact and `gear.aerovista.us`.
Horizon requires an isolated artifact, preview, hostname, and rollback target.

Horizon now uses a dedicated GitHub Pages repository containing only the
sanitized prebuilt artifact. Cloudflare’s Worker Custom Domain creates the DNS
record and certificate, proxies static requests to GitHub Pages, and sends
`/api/*` to NXCore. The canonical steps, exclusions, approval gates,
production-map sequence, and rollback procedure are:

- **`horizon/DEPLOYMENT_SOP.md`**
- **`horizon/COMPLETION_PLAN.md`**
- **`horizon/COMMERCE_READINESS.md`**

The host and custom domain are live as a `noindex`, commerce-gated preview.
This does not authorize checkout-ready flags, production product mappings, or
a paid order.

---

## DNS (Cloudflare)

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | `gear` | `aerovista-us.github.io` | **DNS only** until GitHub verifies and issues TLS |

---

## What gets published

After `npm run build:pages`:

- **`dist/`** = copy of sanitized `public/shop/` (storefront at site root)
- **`dist/CNAME`** = `gear.aerovista.us`
- **`dist/404.html`** = minimal real 404 (so `/console/`, `/backend/`, etc. return **404** on Pages, not the shop)
- **No** `/console/`, **no** React shell, **no** `backend/`, **no** operator exports, **no** `.md` files, **no** `store/_internal/`

`npm run sync:store` copies only an **allowlist** from `store/` (see `scripts/lib/public-shop-manifest.mjs`). Operator markdown lives in **`docs/store-internal/`**; operator JSON/scripts/exports live in **`store/_internal/`**.

Build pipeline:

```bash
npm run build:pages
# → sync-store (PUBLIC_SITE_MODE=shop)
# → copy public/shop → dist
# → strip-private-pages-build.mjs
# → audit-public-pages-build.mjs  (fails if forbidden paths remain)
# → gh-pages-postbuild.mjs
```

Local preview:

```bash
npm run preview:pages
# http://localhost:4173/  — shop at root
```

Verify these **404**:

- `/console/`
- `/backend/`
- `/AeroVista_Catalog_Console/`

---

## Updating the live shop

1. Edit catalog locally → `npm run deploy:catalog -- ./export.json`
2. Commit **`store/square_products_latest.json`**, **`store/storefront_overlay.json`**, and any new **`store/img/`** files
3. Push to `main` → CI rebuilds Pages

`deploy:server` is **local only** (not on GitHub).

---

## API proxy (required for checkout on gear.aerovista.us)

The static shop on GitHub Pages cannot call **`api.aerovista.us`** from the browser unless CORS is enabled on the API **or** requests go through same-origin **`/api`** on **`gear.aerovista.us`**.

**Recommended:** deploy the Cloudflare Worker in **`cloudflare/gear-api-proxy/`** (proxies `/api/*` → `api.aerovista.us`):

```bash
# One-time: npx wrangler login
npm run deploy:gear-api-proxy
```

After deploy, verify:

```bash
curl -s -H "Origin: https://gear.aerovista.us" https://gear.aerovista.us/api/square/bootstrap
```

The same Worker also prepares the Horizon storefront route:

```bash
curl -s -H "Origin: https://horizon.aerovista.us" https://horizon.aerovista.us/api/square/bootstrap
```

Do not treat a successful Horizon bootstrap as launch approval. Its catalog
variants remain fail-closed until their Square and Printful mappings are
verified in `horizon/COMMERCE_READINESS.md`.

You should get JSON (not HTML 404) and an `Access-Control-Allow-Origin` header.

Optional CI: add repo secret **`CLOUDFLARE_API_TOKEN`** and run workflow **Deploy gear API proxy**.

---

## API CORS (alternative to the worker)

If you prefer direct browser → **`api.aerovista.us`** without the worker, set on the API host:

```text
ALLOWED_ORIGINS=https://gear.aerovista.us,https://horizon.aerovista.us,https://aerovista-us.github.io,http://localhost:5174,http://127.0.0.1:5174
```

No wildcard CORS for checkout. Local dev without CORS: **`npm run dev:shop`** (Vite proxies `/api`) or run the payment API on **8088** / **18088**.

---

## Repo hygiene (public repo)

This repo is **public**. Treat everything committed as world-readable. The Pages build **strips** private paths from `dist/`, but secrets or margin data must **not** be committed.

**Safe on Pages (customer-facing):** sanitized `square_products_latest.json`, customer overlay fields, `store/img/`

**Never commit / never Pages:** costs, margin ladders, Square tokens, `.env`, backend secrets, operator-only tools

Long term: split **public storefront repo** vs **private console repo** on NXCore.

---

## Alternate domain

To use `shop.aerovista.us` instead, set `PAGES_CNAME=shop.aerovista.us` in the workflow and DNS.
