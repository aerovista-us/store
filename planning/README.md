# Planning

**Last updated:** 2026-07-26

## Current planning documents

| Document | Status |
|----------|--------|
| `AEROVISTA_COMMERCE_PLAN_1_BACKEND_INTEGRATION.md` | Active — foundation phases 0–4 merged/gated; Phase 5 (shared core), Phase 6 (media), and production `/v1` release pending. Status header 2026-07-25. |
| `AEROVISTA_COMMERCE_PLAN_1A_GEAR_COMMERCE_FIRST_STOREFRONT.md` | **Complete and live** — protected Gear baseline; reverified 07-22, 07-23, and 07-25. |
| `AEROVISTA_COMMERCE_PLAN_2_GEAR_DEPLOYMENT.md` | Local Horizon implementation checkpoint complete; remaining work is governed by `../horizon/COMPLETION_PLAN.md`. |
| `rediness report.md` | Current addendum plus retained July 25 implementation baseline. |
| `coeur-dalene-canvas-collection/` | Collection intake, Square reconciliation, pricing workbook, and QA provenance; current launch execution is governed by the Horizon completion plan. |

## Horizon demos (provenance)

| Folder | Status |
|--------|--------|
| `canvas/` | **Promoted evidence → `horizon/evidence/`.** Remaining design tooling staged in `_legacy_export/planning-canvas/`. Do not develop the runtime storefront here. |
| `horizon gallary/` | Superseded — staged in `_legacy_export/planning-horizon-gallary/`. |
| `horizon-drone-tour/` | Concept demo — staged in `_legacy_export/planning-horizon-drone-tour/`. |

`aerovista-lumina-commerce-overview.html` — overview artifact, reference only.

## Horizon catalog and media intake

- `../horizon/evidence/HORIZON_CATALOG_RECONCILIATION.md` — human-readable mapping of five
  Square export records to four supplied canvas mockups.
- `../horizon/evidence/catalog-reconciliation-2026-07-25.json` — machine-readable mapping,
  confidence, identifiers, prices, blockers, and approvals.
- Design tooling leftovers staged in `_legacy_export/planning-canvas/` (export out of parent).

These are historical intake records, not runtime truth. The current catalog,
media status, provider routes, release gates, and remaining work live in:

- [Horizon completion plan](../horizon/COMPLETION_PLAN.md)
- [Horizon deployment SOP](../horizon/DEPLOYMENT_SOP.md)
- [Horizon commerce readiness](../horizon/COMMERCE_READINESS.md)
