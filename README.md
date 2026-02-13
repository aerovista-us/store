# AeroVista Storefront

> Canonical storefront: `index.html` at repo root (Square JSON-fed catalog).
> Archived Firebase/public variants are not used or served.

## Current structure
- Live frontend: root `index.html` (GitHub Pages friendly)
- Product catalog: root `square_products_latest.json` (recommended) + dated fallbacks
- Backend API: `backend/`

## Frontend API configuration
In root `index.html`, checkout uses:
- `window.STORE_API_BASE` (recommended), or
- `CHECKOUT_API_BASE` directly

Example:
```html
<script>
  window.STORE_API_BASE = "https://api.aerovista.us";
</script>
```

## Backend
See `backend/README.md` for backend setup and env variables.

For GitHub Pages frontend origin, backend CORS should allow:
- `ALLOWED_ORIGINS=https://aerovista-us.github.io`
