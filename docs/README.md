# AeroVista Store — documentation index

**Last updated:** 2026-08-26

## Start here

| Document | Description |
|----------|-------------|
| **[STATUS.md](STATUS.md)** | **Current production status** — shop, API, fulfillment, drift |
| [RECONCILE_INVENTORY_2026-08-23.md](RECONCILE_INVENTORY_2026-08-23.md) | Post-rebase keep vs private / other-repo inventory |
| **[USER_MANUAL/README.md](USER_MANUAL/README.md)** | **Primary operator manual** — architecture, deploy, orders, fulfillment, runbooks |
| **[AVCC_INTEGRATION.md](AVCC_INTEGRATION.md)** | **AVCC (Command Center)** ↔ commerce storefront bridge and service links |
| **[SOT manifests](../SOT.json)** | Monorepo + subtree manifests — see [store-internal/SOT_README.md](store-internal/SOT_README.md) |
| **[HOW_TO_UPDATE_PRODUCTS.md](HOW_TO_UPDATE_PRODUCTS.md)** | Step-by-step catalog / product update playbook |

---

## Reference docs (detail)

| Document | Description |
|----------|-------------|
| [STOREFRONT.md](STOREFRONT.md) | Customer shop: routing, collection lanes, SVG art, checkout |
| [WORKFLOWS.md](WORKFLOWS.md) | Daily commands, sync, catalog deploy, Docker |
| [CATALOG_PIPELINE.md](CATALOG_PIPELINE.md) | Square xlsx → console → `square_products_latest.json` |
| [STORE_WORKFLOW.md](STORE_WORKFLOW.md) | What to edit, where, and why |
| [PRODUCT_CATALOG_INTENT_AND_GOALS.md](PRODUCT_CATALOG_INTENT_AND_GOALS.md) | Product-add intent and publish rules |
| [PRINTFUL_FULFILLMENT_AND_MAPPING.md](PRINTFUL_FULFILLMENT_AND_MAPPING.md) | Square-first Printful mapping |
| [DATA_QUALITY_AND_VALIDATION.md](DATA_QUALITY_AND_VALIDATION.md) | Square-first data quality workflow |
| [CATALOG_CLEANUP.md](CATALOG_CLEANUP.md) | Catalog cleanup / polish |
| [catalog/](catalog/) | Per-product operator sheets (61) |
| [pricing/](pricing/) | Variant pricing worksheet toolkit |
| [STOREFRONT_OVERLAY.md](STOREFRONT_OVERLAY.md) | `storefront_overlay.json` schema and launch policy |
| [DEPLOY_GITHUB_PAGES.md](DEPLOY_GITHUB_PAGES.md) | Public shop at gear.aerovista.us + API proxy |
| [BACKEND_DEPLOY.md](BACKEND_DEPLOY.md) | Payment API on NXCore (manual SSH deploy) |
| [DEPLOY_AV_STORE_API_NXCORE.md](DEPLOY_AV_STORE_API_NXCORE.md) | Extended NXCore API deploy notes |
| [NXCORE_STORE_API_ROUTING_STATUS.md](NXCORE_STORE_API_ROUTING_STATUS.md) | Traefik / Cloudflare tunnel status |
| [HOSTING_AND_DNS.md](HOSTING_AND_DNS.md) | Hosting and DNS |
| [CLOUDFLARE_530_CHECKLIST.md](CLOUDFLARE_530_CHECKLIST.md) | API 530 fix checklist |
| [NXCORE_CONSOLE.md](NXCORE_CONSOLE.md) | **Catalog console** at store-console.aerocoreos.com |
| [CATALOG_CONSOLE_COMPARISON_AND_ROADMAP.md](CATALOG_CONSOLE_COMPARISON_AND_ROADMAP.md) | Console v1.1 vs v2 roadmap |
| [NXCORE_COMPOSE_INVENTORY.md](NXCORE_COMPOSE_INVENTORY.md) | Compose inventory |
| [DROPSHIP_STORE_TREASURE_TROVE.md](DROPSHIP_STORE_TREASURE_TROVE.md) | Reusable patterns from dropship.store |
| [operator-tools/](operator-tools/) | HOWTO portal + health dashboard HTML |
| [REPO_LAYOUT.md](REPO_LAYOUT.md) | What is committed vs generated |
| [FOLDER_DUPLICATES.md](FOLDER_DUPLICATES.md) | Canonical vs duplicate folder tags |
| [STORE_POLICIES.md](STORE_POLICIES.md) | Policy copy source |
| [../horizon/README.md](../horizon/README.md) | Horizon storefront |
| [../horizon/evidence/](../horizon/evidence/) | Horizon rights + catalog reconciliation |
| [../horizon/DEPLOYMENT_SOP.md](../horizon/DEPLOYMENT_SOP.md) | Horizon deployment SOP |
| [../horizon/COMPLETION_PLAN.md](../horizon/COMPLETION_PLAN.md) | Horizon completion plan |
| [../planning/README.md](../planning/README.md) | Commerce plans (Plan 1 / 1A / 2) |

---

## Archived (historical)

Point-in-time audits: **[archive/README.md](archive/README.md)**

Legacy trees were staged under `_legacy_export/` and **moved out of this parent folder** (2026-09). Stubs remain at old paths.

---

**Repo root:** [../README.md](../README.md)  
**Store folder notes:** [store-internal/store-folder-readme.md](store-internal/store-folder-readme.md), [store-internal/handoffnotes.md](store-internal/handoffnotes.md)
