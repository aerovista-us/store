# Coeur d’Alene canvas collection — active curated direction

**Effective:** 2026-07-27  
**Replaces:** broad-catalog public launch strategy  
**Core rule:** hide more, present better, and never delete historical product
or media evidence.

This project copy normalizes the supplied
`cda_canvas_curated_collection_direction.md` into the current Horizon data and
release model. Implementation evidence is in
`../../horizon/migrations/curated-2026-07-27/MIGRATION_REPORT.md`.

## Balanced public presentation

1. Last Light Over the Resort — video frame — featured preview — 12 × 24 in
   — $195
2. Mahogany Wake — 0305 — featured — 20 × 28 in — $275
3. The Road to the Lake — 0018 — featured — 20 × 40 in — $395
4. Lake, Links, and the Floating Green — 0044 — featured preview — 24 × 48 in
   — $525

Harbor at the Heart — 0006 — 30 × 40 in — $495 remains public but is removed
from the consumer card sequence with `consumerVisible: false`. It anchors the
business/custom-placement section instead. Harbor still needs final proof and
production mapping. Floating Green remains checkout-gated for projection
correction and physical-proof approval.
Last Light is also checkout-gated: its supplied PNG is a video frame, and its
original-video frame selection, final 2:1 crop/wrap, Square variation ID,
Printful sync mapping, and physical proof remain open.

The four consumer works are presented on one finite photographic gallery wall.
Their on-wall widths and heights are calculated from the listed canvas
dimensions, so the 12 × 24, 20 × 28, 20 × 40, and 24 × 48 formats retain
their true relative proportions. They are ordered from smallest to largest,
and all use the same slightly increased wall scale. Desktop shows the complete
arrangement; mobile uses four
snap-aligned wall bays rather than a vertical product feed. Compact wall images
are one-fifth of the full display image's linear dimensions, while full display
images remain available for details and room preview. The artwork wrap is one
connected, image-derived perimeter; historical media and visibility profiles
remain unchanged and recoverable.

Fairways Along the Lake and The Clock at Resort Circle remain hidden after
visual review because fisheye curvature and traffic/parking clutter weaken the
gallery edit.
Autumn Over Coeur d’Alene is now `hidden_archive`, not deleted. Last Light
fills the broad downtown/skyline role; Road remains active because its
approach-to-the-lake axis contributes a distinct composition.

## Preservation rules

- Preserve every product object, variant, title, description, source filename,
  capture ID, price, issue, provider mapping, and media reference.
- Use explicit lifecycle fields: `featured`, `conditional`, `b2b_only`,
  `hidden_archive`, `seasonal_hold`, `custom_only`, `skip_print`, or `retired`.
- `publicVisible` is the authoritative customer-visibility flag.
- `published` mirrors `publicVisible` during the compatibility transition.
- Every master-catalog product sets `preserveRecord: true`.
- Hidden records remain internally searchable and recoverable.
- Do not invent unresolved filenames, locations, editions, SKUs, or provider
  variants.
- Do not publish unfinished or unproved work.

## Current source reconciliation

- Mahogany Wake is `DJI_0305.JPG`, 3968 × 2976.
- Last Light’s supplied provisional source is
  `vlcsnap-2026-07-20-21h06m08s834.png`, 3840 × 2160. Replace it with the
  sharpest frame from the original video before print approval.
- Autumn Over Coeur d’Alene remains recoverable as
  `DJI_20231015121918_0021_D.JPG`.
- The Road to the Lake is
  `DJI_20231014111331_0018_D.JPG`; the verified record is not reassigned to
  0021 or 0022.
- Signed and limited-edition pricing is retained as strategy only. No
  Square/Printful edition variants exist, so none are advertised as available.

## Promotion gate

A hidden or conditional work may become public only after artistic, technical,
commercial, and operational review passes, including final crop and wrap,
source identity, rights, physical proof, provider records, price, and explicit
visibility approval.

## Recovery

Preview any preserved presentation:

```powershell
node horizon/scripts/apply-curated-visibility.mjs --profile=curated
node horizon/scripts/apply-curated-visibility.mjs --profile=gallery-balanced
node horizon/scripts/apply-curated-visibility.mjs --profile=broad-recovery
```

Apply a selected profile only after review:

```powershell
node horizon/scripts/apply-curated-visibility.mjs --profile=gallery-balanced --apply
```

Rebuild and audit before any publication. Recovery never enables checkout or
changes external commerce systems.
