# AeroVista Store — User Manual

**Last updated:** 2026-07-26  
**Audience:** Operators, developers, and anyone running the Gear or Horizon storefronts end-to-end.

This manual is the **single entry point** for how the AeroVista apparel store works today: catalog → shop → checkout → fulfillment.

**Current production snapshot:** [../STATUS.md](../STATUS.md)

---

## Quick links (production)

| Surface | URL |
|---------|-----|
| Customer shop | https://gear.aerovista.us/ |
| Horizon | https://horizon.aerovista.us/ — public noindex preview; checkout gated |
| Catalog console | https://store-console.aerocoreos.com/ |
| AVCC (Command Center) | https://avcc.aerocoreos.com/ |
| Payment + fulfillment API | https://api.aerovista.us/ |
| Printful (Square store) | Printful Dashboard → **AeroVista store** |

| Server | SSH / path |
|--------|------------|
| NXCore | `ssh glyph@100.115.9.61` |
| Backend compose | `/srv/Collab/mini.shops/AV-PNW.com/av_storefront/backend/` |

---

## Manual chapters

| # | Chapter | You’ll use it when… |
|---|---------|---------------------|
| 1 | [Getting started](01-getting-started.md) | First time in the repo or onboarding |
| 2 | [System overview](02-system-overview.md) | Understanding what deploys where |
| 3 | [Catalog & console](03-catalog-and-console.md) | Adding/editing products |
| 4 | [Shop & deploy](04-shop-and-deploy.md) | Publishing gear.aerovista.us |
| 5 | [Checkout & payments](05-checkout-and-payments.md) | Square checkout, cart keys, API |
| 6 | [Orders & fulfillment](06-orders-and-fulfillment.md) | Orders, Printful, variant maps |
| 7 | [Backend operations](07-backend-operations.md) | NXCore API deploy, env, webhooks |
| 8 | [Audits & runbooks](08-audits-and-runbooks.md) | Pre-flight checks, scripts |
| 9 | [Troubleshooting](09-troubleshooting.md) | Something broke — start here |

---

## Deep-dive reference docs

These stay in `docs/` for detail; the manual summarizes and links to them.

| Doc | Topic |
|-----|--------|
| [STOREFRONT.md](../STOREFRONT.md) | Shop UX, lanes, SVG, routing |
| [WORKFLOWS.md](../WORKFLOWS.md) | Daily npm commands |
| [CATALOG_PIPELINE.md](../CATALOG_PIPELINE.md) | Square xlsx intake |
| [STOREFRONT_OVERLAY.md](../STOREFRONT_OVERLAY.md) | Overlay JSON schema |
| [DEPLOY_GITHUB_PAGES.md](../DEPLOY_GITHUB_PAGES.md) | Pages CI + API proxy |
| [BACKEND_DEPLOY.md](../BACKEND_DEPLOY.md) | NXCore SSH deploy |
| [NXCORE_CONSOLE.md](../NXCORE_CONSOLE.md) | Console on NXCore |
| [AVCC_INTEGRATION.md](../AVCC_INTEGRATION.md) | Command Center ↔ store bridge |
| [STORE_POLICIES.md](../STORE_POLICIES.md) | Policy copy source |
| [Horizon deployment SOP](../../horizon/DEPLOYMENT_SOP.md) | Horizon artifact, preview, launch, verification, rollback |
| [Horizon completion plan](../../horizon/COMPLETION_PLAN.md) | Gated next steps through completion |

**Historical audits** (resolved incidents, point-in-time): [../archive/README.md](../archive/README.md)

---

## Three rules to remember

1. **`npm run deploy:server` ≠ backend deploy** — it only writes catalog JSON locally for the console.
2. **`store/backend/` is not in Git** — payment API is copied to NXCore manually ([BACKEND_DEPLOY.md](../BACKEND_DEPLOY.md)).
3. **Fulfillment needs three layers aligned:** Square catalog → Printful sync → Postgres `product_variant_map` ([chapter 6](06-orders-and-fulfillment.md)).
4. **Horizon is independent of Gear:** never publish the whole `horizon/`
   directory or attach its hostname before the Horizon SOP gates pass.
