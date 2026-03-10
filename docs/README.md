# AeroVista Storefront — Docs

This folder holds hosting, routing, deployment, and planning docs. The **canonical storefront** is `index.html` at repo root; archived Firebase/public variants are not served.

## Quick links

- **Repo overview & catalog sources:** [../README.md](../README.md)
- **Developer handoff (where to look, troubleshooting):** [../handoffnotes.md](../handoffnotes.md)
- **Backend setup:** [../backend/README.md](../backend/README.md)

## Storefront in brief

- **Live frontend:** root `index.html` — deploy to Firebase Hosting or GitHub Pages.
- **Two catalog sources:** Live (e.g. `square_products_latest.json`) and Edited (e.g. `square_products_edited.json` or localStorage). Toggle in storefront header **Catalog** dropdown. See root README and handoffnotes.
- **Catalog Console:** `AeroVista_Catalog_Console/v1.1/` — import Square export, clean/merge, export JSON for the storefront (edited source).
- **Backend API:** `backend/` — served at **api.aerovista.us** via Cloudflare Tunnel → NXCore → Traefik → av-store-api.

## What to push (site requirements)

- **[FILES_REQUIRED_FOR_SITE.md](FILES_REQUIRED_FOR_SITE.md)** — which files are required for the site to work; how to stop tracking unnecessary files. Run `scripts/remove-unneeded-from-git.ps1` to untrack unneeded paths.

## Hosting & DNS

- **[HOSTING_AND_DNS.md](HOSTING_AND_DNS.md)** — DNS, Firebase, Cloudflare Tunnel, NXCore split-DNS, CORS.

## API routing (NXCore)

- **[NXCORE_STORE_API_ROUTING_STATUS.md](NXCORE_STORE_API_ROUTING_STATUS.md)** — canonical hostname, Traefik, health checks, 530 triage.
- **[CLOUDFLARE_530_CHECKLIST.md](CLOUDFLARE_530_CHECKLIST.md)** — when external API returns 530.

## Frontend API configuration

In root `index.html`, checkout uses `window.STORE_API_BASE` (e.g. `https://api.aerovista.us`). See root README for examples.

**CORS:** Backend `ALLOWED_ORIGINS` must include the storefront origin(s), e.g.:
- Production (Firebase): `ALLOWED_ORIGINS=https://aerovista.us,https://www.aerovista.us`
- GitHub Pages: `ALLOWED_ORIGINS=https://aerovista-us.github.io`

## Catalog and variant planning

- **[VARIANT_PRICING_SCHEMA_AND_WORKSHEET.md](VARIANT_PRICING_SCHEMA_AND_WORKSHEET.md)** — schema and process for sizing/color/price-per-item planning.
- **variant_pricing_worksheet.csv** — fillable worksheet for variant pricing and key mapping (`cartKey`, `variationId`, tags).
- **variant_pricing_dashboard.html** — browser helper to convert worksheet CSV into `SQUARE_SKU_MAP_JSON` and a paste-ready `.env` line.

## Data quality, validation, and Printful mapping

- **[DATA_QUALITY_AND_VALIDATION.md](DATA_QUALITY_AND_VALIDATION.md)** — Square export data quality script, Catalog Console v1.1 Validate tab, and profit floor validator; recommended pre-publish order.
- **[PRINTFUL_FULFILLMENT_AND_MAPPING.md](PRINTFUL_FULFILLMENT_AND_MAPPING.md)** — how to run Printful exports and build a Square → Printful variant map without making Printful a catalog or price source.

## Project review

- **[PROJECT_REVIEW.md](PROJECT_REVIEW.md)** — full project review: layout, tech stack, Catalog Console root vs v1.1, storefront/backend behavior, findings and recommendations.
- **[HOW_TO_UPDATE_PRODUCTS.md](HOW_TO_UPDATE_PRODUCTS.md)** — step-by-step guide for updating catalog (live/edited), overlay, and validation.

## Audits

- **[PROJECT_AUDIT_2026-03.md](PROJECT_AUDIT_2026-03.md)** — March 2026 project audit: structure, security, dependencies, config, testing gaps.
- **[AUDIT_REPORT.md](AUDIT_REPORT.md)** — Feb 2026 storefront audit (a11y, CSP, forms); **[AUDIT_RESOLUTION_CHECKLIST.md](AUDIT_RESOLUTION_CHECKLIST.md)** — resolution status.

## Other docs

- **STOREFRONT_REVIEW_CHECKOUT_READINESS.md** — checkout flow and readiness.
- **DEPLOY_AV_STORE_API_NXCORE.md**, **DEPLOYMENT_WHICH_FILES.md** — deployment details.
- **NXCORE_COMPOSE_INVENTORY.md** — compose/inventory reference.
