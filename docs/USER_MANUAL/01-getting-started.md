# 1 — Getting started

## What this project is

**AeroVista Store (`av-store`)** is a monorepo that powers:

- A **static customer shop** (HTML/JS + catalog JSON) at **gear.aerovista.us**
- A **catalog console** for operators at **store-console.aerocoreos.com**
- A **payment + fulfillment API** (Flask/Docker) at **api.aerovista.us** — lives in `store/backend/`, **not in Git**

Checkout uses **Square hosted payment links**. Fulfillment uses **Printful** via an async worker after Square webhooks confirm payment.

## Dev machine setup

```bash
cd F:/aerovista-store   # or \\Av-mini-t1\fssd\aerovista-store
npm install
npm run sync:all
npm run dev             # http://localhost:5174
```

| URL (local) | What |
|-------------|------|
| `/shop/index.html` | Customer shop |
| `/console/` | Catalog console |
| `/` | React workflow hub |

## Working copy locations

| Edit here | Purpose |
|-----------|---------|
| `store/` | Canonical shop + `square_products_latest.json` |
| `console/` | Catalog console v2 (private) |
| `store/backend/` | Payment API (gitignored — also on NXCore) |
| `scripts/` | Build, sync, audit tools |

**Generated (do not edit):** `public/shop/`, `public/console/`, `dist/`

## First-day checklist

- [ ] Read [02-system-overview.md](02-system-overview.md) — four deploy surfaces
- [ ] Confirm you can open https://gear.aerovista.us and https://store-console.aerocoreos.com
- [ ] Know that backend changes require SSH to NXCore ([07-backend-operations.md](07-backend-operations.md))
- [ ] Bookmark [09-troubleshooting.md](09-troubleshooting.md)

## Repo vs production paths

| Item | Dev / Git | NXCore production |
|------|-----------|-------------------|
| Shop | `store/` → Git → Pages | gear.aerovista.us |
| Backend | `store/backend/` | `/srv/Collab/mini.shops/AV-PNW.com/av_storefront/backend/` |
| Catalog JSON (API mount) | `store/square_products_latest.json` | `../square_products_latest.json` on server |

See [../REPO_LAYOUT.md](../REPO_LAYOUT.md) for gitignore rules.
