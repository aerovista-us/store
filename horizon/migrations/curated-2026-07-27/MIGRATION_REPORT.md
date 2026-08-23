# Horizon curated-collection migration

**Migration:** `curated-2026-07-27`  
**Source catalog before migration:** SHA-256
`05d803549fdb3e0c0a95457a0021ef7752e15551bd195eafceb3931458cd0a8f`  
**Last broad public artifact:** commit
`b97823d3951d4afa241ffd477ea3e55761f12bf1`  
**Current proportional-wall public artifact:** commit
`e35d6eba7d3be24eb4d5248c0324cd95b6a2e2ec`, Pages run `30255642320`
**Last Light collection edit:** commit
`157773546514acd4187896b2e806bbf203791358`, Pages run `30262564085`; evidence
is recorded in
`../../release/RELEASE_2026-07-27_LAST_LIGHT_COLLECTION_EDIT.md`.

## Result

No product, variant, media reference, source filename, description, price,
issue, or provider record was deleted. The migration changes lifecycle and
visibility fields only.

### Current balanced public set

| Priority | Product | Capture | Status |
|---:|---|---:|---|
| 1 | Last Light Over the Resort | supplied video frame | `featured` preview; checkout gated |
| 2 | Mahogany Wake | 0305 | `featured` |
| 3 | Harbor at the Heart | 0006 | `featured` preview; checkout gated |
| 4 | The Road to the Lake | 0018 | `featured` |
| 5 | Lake, Links, and the Floating Green | 0044 | `featured` preview; checkout gated |

Harbor was restored because its architecture adds a clean, recognizable local
anchor. Floating Green was restored because it is the strongest panoramic
counterpoint. Its projection-correction and physical-proof blockers remain
recorded and prevent checkout.
Last Light replaces Autumn in the active consumer edit because it supplies a
stronger sunset/downtown anchor. Road remains because its linear
approach-to-the-lake composition is distinct. Last Light’s original-video
frame, print master, wrap, physical proof, Square variation, and Printful map
remain gated.

### Hidden archive

| Product | Capture |
|---|---:|
| Autumn Over Coeur d’Alene | 0021 |
| Fairways Along the Lake | 0043 |
| The Clock at Resort Circle | 0056 |
| A Window Through the Pines | 0016 |
| Where Downtown Opens to the Lake | 0059 |

The Lake City Autumn Collection bundle is retained as `seasonal_hold`.

The earlier three-work curation remains stored as profile `curated`; the
current five-work edit is `gallery-balanced`; the eight-work visibility state
is `broad-recovery`.

The profiles also preserve `consumerVisible`. In the active
`gallery-balanced` presentation, Harbor remains in the public catalog but uses
`consumerVisible: false` so it appears in business/custom placement instead of
the consumer gallery wall. The four consumer works now share one finite,
photographic wall, retain their true relative canvas dimensions, and are
ordered from smallest to largest. The active profile records that order;
commerce flags remain unchanged.

## Source reconciliation

- Mahogany Wake is resolved to `DJI_0305.JPG`, 3968 × 2976.
- Last Light’s provisional source is resolved to
  `vlcsnap-2026-07-20-21h06m08s834.png`, 3840 × 2160; the original-video frame
  still must be selected before print approval.
- Autumn Over Coeur d’Alene remains resolved and recoverable as
  `DJI_20231015121918_0021_D.JPG`.
- The Road to the Lake is resolved in the existing catalog to
  `DJI_20231014111331_0018_D.JPG`. It is not reassigned to 0021 or 0022.
- No signed or limited-edition commerce variants were invented. Only existing
  open-edition variants remain.

## Recovery

The complete product objects remain in `horizon/catalog.json`. Visibility
profiles are stored in `visibility-states.json`.

Preview a recovery without changing the catalog:

```powershell
node horizon/scripts/apply-curated-visibility.mjs --profile=broad-recovery
```

Restore the eight-work broad public set:

```powershell
node horizon/scripts/apply-curated-visibility.mjs --profile=broad-recovery --apply
npm run build:horizon-pages
npm run audit:horizon-pages
```

Apply the lean three-work curated set:

```powershell
node horizon/scripts/apply-curated-visibility.mjs --profile=curated --apply
npm run build:horizon-pages
npm run audit:horizon-pages
```

Reapply the current five-work balanced set:

```powershell
node horizon/scripts/apply-curated-visibility.mjs --profile=gallery-balanced --apply
npm run build:horizon-pages
npm run audit:horizon-pages
```

Publishing remains a separate explicit step. Recovery does not activate
checkout or change Square, Printful, Postgres, Worker, or DNS state.
