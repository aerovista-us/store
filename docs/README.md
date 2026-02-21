# AeroVista Storefront

> Canonical storefront: `index.html` at repo root (Square JSON-fed catalog).
> Archived Firebase/public variants are not used or served.

## Current structure
- **Live frontend:** root `index.html` — deploy to Firebase Hosting (e.g. aerovista.us, www.aerovista.us → aerovista-us.web.app)
- **Product catalog:** root `square_products_latest.json` (recommended) + dated fallbacks
- **Backend API:** `backend/` — served at **api.aerovista.us** via Cloudflare Tunnel → NXCore → Traefik → av-store-api

See **[docs/HOSTING_AND_DNS.md](docs/HOSTING_AND_DNS.md)** for DNS, Firebase, Cloudflare Tunnel, and NXCore split-DNS notes.

## Frontend API configuration
In root `index.html`, checkout uses:
- `window.STORE_API_BASE` (recommended), or
- Built-in default: **https://api.aerovista.us** when not on localhost

Override example (only if needed):
```html
<script>
  window.STORE_API_BASE = "https://api.aerovista.us";
</script>
```

## Backend
See `backend/README.md` for backend setup and env variables.

## Catalog planning helpers
- `docs/VARIANT_PRICING_SCHEMA_AND_WORKSHEET.md` — schema + process for sizing/color/price-per-item planning.
- `docs/variant_pricing_worksheet.csv` — fillable worksheet for variant pricing and key mapping (`cartKey`, `variationId`, tags).
- `docs/variant_pricing_dashboard.html` — browser helper to convert worksheet CSV into `SQUARE_SKU_MAP_JSON` and a paste-ready `.env` line.

**CORS:** Backend must allow your storefront origin(s), e.g.:
- Production (Firebase): `ALLOWED_ORIGINS=https://aerovista.us,https://www.aerovista.us`
- GitHub Pages: `ALLOWED_ORIGINS=https://aerovista-us.github.io`
