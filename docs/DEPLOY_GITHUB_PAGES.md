# Deploy public shop to GitHub Pages

GitHub Pages publishes the **AV Gear Shop storefront only**. It does **not** publish the catalog console, backend, margin tools, or operator routes.

| Surface | URL | Hosting |
|---------|-----|---------|
| **Public shop** | https://gear.aerovista.us/ | GitHub Pages (`aerovista-us/store`) |
| **Private console** | https://store-console.aerocoreos.com/ | NXCore / Traefik / Cloudflare Access — see **`docs/NXCORE_CONSOLE.md`** |

Pages sites are **public on the internet** even when the source repo is private. Do not rely on hidden paths for the console.

---

## One-time GitHub setup

1. **Settings → Pages → Build and deployment**
   - **Source:** GitHub Actions
2. **Custom domain:** `gear.aerovista.us` → Save → wait for DNS check
3. Enable **Enforce HTTPS** when available
4. Push to `main` or run **Actions → Deploy GitHub Pages**

Workflow: `.github/workflows/deploy-github-pages.yml`

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
- **No** `/console/`, **no** React shell, **no** `backend/`, **no** operator exports

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

## API CORS

Allow checkout from the public shop origin on **`api.aerovista.us`**, e.g.:

```text
ALLOWED_ORIGINS=https://gear.aerovista.us,https://aerovista-us.github.io
```

No wildcard CORS for checkout.

---

## Repo hygiene (public repo)

This repo is **public**. Treat everything committed as world-readable. The Pages build **strips** private paths from `dist/`, but secrets or margin data must **not** be committed.

**Safe on Pages (customer-facing):** sanitized `square_products_latest.json`, customer overlay fields, `store/img/`

**Never commit / never Pages:** costs, margin ladders, Square tokens, `.env`, backend secrets, operator-only tools

Long term: split **public storefront repo** vs **private console repo** on NXCore.

---

## Alternate domain

To use `shop.aerovista.us` instead, set `PAGES_CNAME=shop.aerovista.us` in the workflow and DNS.
