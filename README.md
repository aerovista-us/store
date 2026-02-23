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

**Docs:** [HOSTING_AND_DNS](docs/HOSTING_AND_DNS.md) (DNS, Cloudflare, NXCore). **API/routing status & verify commands:** [NXCORE_STORE_API_ROUTING_STATUS](docs/NXCORE_STORE_API_ROUTING_STATUS.md).

For GitHub Pages frontend origin, backend CORS should allow:
- `ALLOWED_ORIGINS=https://aerovista-us.github.io`

## Holographic overlay & later tagging

Products whose name or tags include "Holographic" (e.g. "Holographic stickers", "Holographic Goat Sticker") get a holographic overlay on their card image automatically.

### Later tagging / enhancements

You can:

- **Use `data-holo="1"` (or new `data-tags="..."`)** for extra styling or behavior.
- **Extend `productHasHolo(p)`** to check more tags (e.g. "audio", "enhanced") and apply different overlays or features.
- **Reuse `.holo-overlay`** anywhere (e.g. modal, featured strip) by adding the class to a positioned container and putting the overlay div inside it.
