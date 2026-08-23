# AeroVista Store — documentation index

**Last updated:** 2026-07-26

## Start here

| Document | Description |
|----------|-------------|
| **[STATUS.md](STATUS.md)** | **Current production status** — shop, API, fulfillment, drift |
| [RECONCILE_INVENTORY_2026-08-23.md](RECONCILE_INVENTORY_2026-08-23.md) | Post-rebase keep vs private / other-repo inventory |
| **[USER_MANUAL/README.md](USER_MANUAL/README.md)** | **Primary operator manual** — architecture, deploy, orders, fulfillment, runbooks |
| **[AVCC_INTEGRATION.md](AVCC_INTEGRATION.md)** | **AVCC (Command Center)** ↔ commerce storefront bridge and service links |
| **[SOT manifests](../SOT.json)** | Monorepo + subtree `SOT.json` (store, console, backend) — see [store/SOT_README.md](../store/SOT_README.md) |

---

## Reference docs (detail)

| Document | Description |
|----------|-------------|
| [STOREFRONT.md](STOREFRONT.md) | Customer shop: routing, collection lanes, SVG art, checkout |
| [WORKFLOWS.md](WORKFLOWS.md) | Daily commands, sync, catalog deploy, Docker |
| [CATALOG_PIPELINE.md](CATALOG_PIPELINE.md) | Square xlsx → console → `square_products_latest.json` |
| [STOREFRONT_OVERLAY.md](STOREFRONT_OVERLAY.md) | `storefront_overlay.json` schema and launch policy |
| [DEPLOY_GITHUB_PAGES.md](DEPLOY_GITHUB_PAGES.md) | Public shop at gear.aerovista.us + API proxy |
| [BACKEND_DEPLOY.md](BACKEND_DEPLOY.md) | Payment API on NXCore (manual SSH deploy) |
| [NXCORE_CONSOLE.md](NXCORE_CONSOLE.md) | **Catalog console** at store-console.aerocoreos.com |
| [REPO_LAYOUT.md](REPO_LAYOUT.md) | What is committed vs generated |
| [STORE_POLICIES.md](STORE_POLICIES.md) | Policy copy source |
| [../horizon/README.md](../horizon/README.md) | **Horizon storefront shell** — second store, static shell at final dev location |
| [../horizon/DEPLOYMENT_SOP.md](../horizon/DEPLOYMENT_SOP.md) | **Horizon deployment SOP** — artifact policy, preview, commerce activation, launch, rollback |
| [../horizon/COMPLETION_PLAN.md](../horizon/COMPLETION_PLAN.md) | **Horizon completion plan** — gated next steps through launch and closeout |
| [../planning/README.md](../planning/README.md) | Commerce plans (Plan 1 / 1A / 2), readiness report, demo sources |

---

## Archived (historical)

Resolved incidents and point-in-time audits: **[archive/README.md](archive/README.md)**

---

**Repo root:** [../README.md](../README.md)  
**Store folder:** [../store/README.md](../store/README.md), [../store/handoffnotes.md](../store/handoffnotes.md)
