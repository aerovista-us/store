# Coeur d’Alene Canvas Collection

This folder is the canonical project location for the Coeur d’Alene canvas
collection plan, catalog reconciliation, execution tracker, and supporting QA
artifacts.

The workbook and source files preserve intake and planning evidence. Current
storefront and launch execution truth lives in:

- [Horizon completion plan](../../horizon/COMPLETION_PLAN.md)
- [Horizon deployment SOP](../../horizon/DEPLOYMENT_SOP.md)
- [Horizon commerce readiness](../../horizon/COMMERCE_READINESS.md)
- [Active curated direction](CURATED_COLLECTION_DIRECTION.md)
- [v8 implementation checkpoint](IMPLEMENTATION_CHECKPOINT_V8.md)
- [Curated migration report](../../horizon/migrations/curated-2026-07-27/MIGRATION_REPORT.md)
- [Recoverable visibility profiles](../../horizon/migrations/curated-2026-07-27/visibility-states.json)

Current checkpoint: 4 visible consumer works share one finite, dimension-scaled
photographic gallery wall; 1 Harbor business-placement feature remains
separate; 5 records are hidden archive; 1 bundle is on seasonal hold; 8
checkout and private production routes are active; and all 5 public variants
are checkout-ready. The wall uses one-fifth linear-resolution artwork thumbnails
while full display images remain available in detail and room views. Last
Light Over the Resort is the new 12 × 24 public preview; Autumn Over Coeur
d’Alene is archived without deletion. Recovery profiles retain the earlier
lean curation and the eight-work broad recovery set. Production map activation
and a no-charge checkout-link smoke are complete. A paid controlled order,
physical proof review, policies, and indexed public launch remain open.

## Structure

- `source/` — supplied collection plan and Square catalog export.
- `outputs/` — current working deliverables.
- `review/` — rendered workbook previews and inspection output used for QA.
- `_work/` — internal generation scripts and logs retained for traceability.

## Planning deliverable

`outputs/coeur_dalene_collection_next_steps.xlsx`

The workbook contains:

- a launch dashboard;
- a plan-to-catalog audit;
- a prioritized action queue;
- a formula-driven pricing and margin tracker;
- source notes and catalog-edit cautions.

## Maintenance rule

Future collection updates and generated files should be saved within this
folder. Files in `source/` are treated as immutable snapshots; create a new
dated or versioned source file instead of overwriting an earlier export.
