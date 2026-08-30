# Legacy export manifest

Generated: 2026-08-26  
Parent: `aerovista-store`  
Staging: `_legacy_export/`

## Promoted into true folders (do not re-export)

### → `docs/`
- HOW_TO_UPDATE_PRODUCTS.md
- PRODUCT_CATALOG_INTENT_AND_GOALS.md
- PRINTFUL_FULFILLMENT_AND_MAPPING.md
- NXCORE_STORE_API_ROUTING_STATUS.md
- DEPLOY_AV_STORE_API_NXCORE.md
- HOSTING_AND_DNS.md
- CLOUDFLARE_530_CHECKLIST.md
- DATA_QUALITY_AND_VALIDATION.md
- DROPSHIP_STORE_TREASURE_TROVE.md
- CATALOG_CONSOLE_COMPARISON_AND_ROADMAP.md
- STORE_WORKFLOW.md
- CATALOG_CLEANUP.md
- FILES_REQUIRED_FOR_SITE.md
- MASTER_FIX_PLAN.md
- NXCORE_COMPOSE_INVENTORY.md
- STOREFRONT_REVIEW_CHECKOUT_READINESS.md

### → `docs/pricing/`
- VARIANT_PRICING_SCHEMA_AND_WORKSHEET.md
- variant_pricing_worksheet.csv
- variant_pricing_dashboard.html

### → `docs/catalog/` (61 product sheets)
- Former `store/docs/catalog/*.md`

### → `docs/archive/` (point-in-time audits)
- AUDIT_*.md, PROJECT_AUDIT_2026-03.md, PROJECT_REVIEW.md, END_TO_END_AUDIT_2026-03.md, PRODUCT_ADD_AUDIT_2026-05-04.md, LAUNCH_STATUS_2026-04-02.md, FINAL_LAUNCH_CHECKLIST.md, PHASE1_IMPLEMENTATION.md

### → `docs/operator-tools/`
- HOWTO_OPERATOR_PORTAL.html
- store_health_dashboard.html

### → `horizon/evidence/`
- HORIZON_ARTWORK_RIGHTS_ATTESTATION.md
- HORIZON_CATALOG_RECONCILIATION.md
- HORIZON_MOCKUP_README.md
- catalog-reconciliation-2026-07-25.json

### → `store/backend/sql/` (if present)
- trigger-helper.sql (from `trigger helper.sql`)

## Staged here as LEGACY (safe to move out of parent)

| Path under `_legacy_export/` | Former path | Tag |
|------------------------------|-------------|-----|
| `store-docs-remainder/` | `store/docs/` leftovers | LEGACY |
| `store-ops-junk/` | `store/_internal/ops/` | LEGACY |
| `planning-canvas/` | `planning/canvas/` remainder | SUPERSEDED / PROVENANCE |
| `planning-horizon-gallary/` | `planning/horizon gallary/` | SUPERSEDED |
| `planning-horizon-drone-tour/` | `planning/horizon-drone-tour/` | PROVENANCE |
| `archive/` | `archive/` | SUPERSEDED |

## Not staged (remain in-repo operator)

- `store/_internal/commerce/` — Square pull snapshots (active ops)
- `store/_internal/cart_sku_map.generated.json` — generated map
- `docs/store-internal/` — already promoted operator markdown
- `horizon/commerce/` — Horizon provider evidence
