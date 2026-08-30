# 4 — Shop & deploy

## Canonical shop

| Item | Path |
|------|------|
| HTML/JS | `store/index.html`, `store/js/` |
| Catalog | `store/square_products_latest.json` |
| Overlay | `store/storefront_overlay.json` |
| Policies | `store/policy-content.js` |

Customer URL: **https://gear.aerovista.us/**

Shop UX detail: [../STOREFRONT.md](../STOREFRONT.md)

## Local development

```bash
npm run sync:store
npm run dev:shop          # opens /shop/index.html
```

## Publish to production (GitHub Pages)

```bash
npm run build:pages       # local verify
git push origin main      # CI deploys dist/
```

CI workflow: `.github/workflows/deploy-github-pages.yml`

Full doc: [../DEPLOY_GITHUB_PAGES.md](../DEPLOY_GITHUB_PAGES.md)

The Pages build syncs **`store/` → `public/shop/` → `dist/`** using an **allowlist** (`scripts/lib/public-shop-manifest.mjs`). Operator markdown belongs in **`docs/store-internal/`**; snapshots/scripts in **`store/_internal/`**. CI **strips** and **audits** (`audit-public-pages-build.mjs`) — build fails if `.md`, `scripts/`, or other internal paths appear in `dist/`.

## Horizon preview and production deploy

Horizon is not part of the Gear Pages artifact. Current deployed state:

- 8 visible individual works
- 2 explicit non-cartable placeholders
- hidden bundle
- 6 locally prepared Square/Printful routes
- 0 checkout-ready variants
- dedicated GitHub Pages repository and Cloudflare custom domain live
- NXCore Horizon CORS and same-origin API route verified

Do not upload the whole `horizon/` directory; it contains source masters,
provider evidence, SQL, and operator documentation.

Follow:

- [Horizon deployment SOP](../../horizon/DEPLOYMENT_SOP.md)
- [Horizon completion plan](../../horizon/COMPLETION_PLAN.md)
- [Horizon commerce readiness](../../horizon/COMMERCE_READINESS.md)

## API proxy (same-origin checkout)

Production shop calls `/api/*` on gear.aerovista.us, proxied to api.aerovista.us via Cloudflare Worker.

```bash
npm run deploy:gear-api-proxy
```

See [../DEPLOY_GITHUB_PAGES.md](../DEPLOY_GITHUB_PAGES.md) § API proxy.

## Shop routes

| URL | View |
|-----|------|
| `/` | Home — collection doors |
| `?collection=shadow` | Collection page + grid |
| `?view=catalog` | Browse all products |

## When to redeploy shop vs backend

| Change | Deploy |
|--------|--------|
| HTML, JS, images, catalog JSON in `store/` | Git → Pages |
| Checkout resolver, webhooks, workers | NXCore backend ([chapter 7](07-backend-operations.md)) |
| Catalog JSON for API fallback | Copy JSON to NXCore + restart API |
| CORS / allowed origins | NXCore `.env` |
| Horizon static/catalog/display-media change | Rebuild the sanitized Horizon artifact and deploy its isolated target |
| Horizon checkout activation | Horizon SOP: proof → backup → Square map → Postgres map → controlled order |

Both must be aligned for checkout to work ([chapter 5](05-checkout-and-payments.md)).
