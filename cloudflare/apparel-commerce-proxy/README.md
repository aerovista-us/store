# Apparel Commerce Proxy

Production edge companion for the spatial storefront planned at `apparel.aerovista.us`.

The Worker leaves normal static requests on the existing storefront origin and intercepts only:

- `/api/*` -> current AeroVista Commerce legacy API on `api.aerovista.us`
- `/v1/*` -> additive Commerce V1 API when its production release is approved
- `/square_products_latest.json` -> current published Gear catalog

This gives the spatial storefront a stable same-origin commerce path without granting a temporary Vercel preview hostname direct backend CORS access.

## Release order

1. Verify `apparel.aerovista.us` resolves to the intended spatial frontend origin.
2. Review the frontend commerce binding audit: presentation-only products must remain non-purchasable.
3. Merge this edge change in a controlled window. The main-branch path filter deploys the Worker through the existing `CLOUDFLARE_API_TOKEN` secret.
4. Verify read-only paths first:

```bash
curl -i https://apparel.aerovista.us/square_products_latest.json
curl -i https://apparel.aerovista.us/api/square/bootstrap
```

5. Verify one product/variation checkout handoff only after catalog identity and price are confirmed.

## Rollback

Deleting the three `apparel.aerovista.us` Worker routes, or redeploying the prior Worker configuration, returns those paths to the configured static origin. This Worker does not modify the commerce database, Square catalog, or fulfillment workers.
