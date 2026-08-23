# Horizon release — Last Light collection edit

**Date:** 2026-07-27  
**Target:** `https://horizon.aerovista.us`  
**State:** public `noindex`, commerce gated  
**Public commit:** `157773546514acd4187896b2e806bbf203791358`  
**Pages run:** `30262564085` — success

## Outcome

- Added `CDA-CAN-014`, **Last Light Over the Resort — Downtown Coeur d’Alene
  at Sunset**, as a 12 × 24-inch gallery-wrapped canvas preview at `$195`.
- Preserved the supplied Square item token `7GHIQT64RIQ7FG75JXRY4WXM`, catalog
  SKU `6A673A0192677_19300`, and suggested internal variant ID
  `CDA-CAN-014-12X24-OE`.
- Archived `CDA-CAN-001`, **Autumn Over Coeur d’Alene**, with its full product,
  variant, media, issue, and provider evidence intact. No product or asset was
  deleted.
- Retained **The Road to the Lake** because its linear approach-to-the-lake
  composition remains distinct from the new sunset/downtown view.
- Excluded the unrelated Launch Pack Square row; it is not a Horizon artwork
  product and was already absent from the Horizon catalog.

## Proportional wall

The consumer wall now reads from smallest to largest:

1. Last Light Over the Resort — 12 × 24
2. Mahogany Wake — 20 × 28
3. The Road to the Lake — 20 × 40
4. Lake, Links, and the Floating Green — 24 × 48

All works use the same scale within a viewport. Desktop changes from 6.1 to
6.8 CSS pixels per listed inch; mobile changes from 6.5 to 7.2. This increases
the whole arrangement slightly while preserving exact relative dimensions.

## Media evidence

| Asset | Dimensions | SHA-256 | Public state |
|---|---:|---|---|
| `gallery/vlcsnap-2026-07-20-21h06m08s834.png` | 3840 × 2160 | `507c6517d904b95df46fc3be5491d286844758e8baafd62e83d13c6282abd247` | Private source evidence |
| `gallery/print-candidates/CDA-CAN-014-last-light-12x24-proofing.jpg` | 3840 × 1920 | `52e96a3b1e84091f32b40fb1f5240f12016df6c346afa5907e77815ff2929024` | Private proofing candidate |
| `gallery/display/CDA-CAN-014-last-light-over-resort.jpg` | 2400 × 1200 | `016bec8b19769838aa112d5bf532c3b54550c05bdddd6c2401564ec4c86cf5a1` | Public display |
| `gallery/wall/CDA-CAN-014-last-light-wall.webp` | 480 × 240 | `130c0c46b6d56c235b18700e07ab51c06ad8acc211b95aca8953316b88d68907` | Public one-fifth wall derivative |

The centered 2:1 proofing crop preserves the resort, downtown lakefront,
Independence Point, park, mountain horizon, and sunset. Denoising and
sharpening are deliberately restrained.

## Proof and commerce boundary

The supplied PNG is a frame from video, not a final print master. Before
checkout can be enabled:

1. Select the sharpest available frame from the original video.
2. Approve the final 2:1 crop, noise treatment, shadow detail, and
   mirrored/digitally extended edge wrap.
3. Approve rights and a physical canvas proof.
4. Confirm the exact Square item and variation IDs.
5. Create or verify the Printful sync product/variant and production file.
6. Audit the NXCore Square and Postgres maps and run the controlled order.

The current catalog intentionally keeps `squareVariationId: null`,
`squareMapped: false`, `printfulMapped: false`, and `checkoutReady: false`.
The product detail therefore displays `$195` and 12 × 24 but shows **Catalog
setup required** instead of sending a checkout request.

## Recovery

`visibility-states.json` contains Last Light in every profile so the profiles
remain schema-complete:

- `gallery-balanced` is the active five-public-work state and archives Autumn.
- `curated` restores the earlier lean curation and hides Last Light.
- `broad-recovery` exposes all eight recoverable individual works, including
  both Autumn and Last Light.

Dry-run before applying a profile:

```powershell
node horizon/scripts/apply-curated-visibility.mjs --profile=gallery-balanced --dry-run
```

## Verification

- `node --check horizon/js/gallery.js`
- `npm run build:horizon-pages`
- `npm run audit:horizon-pages`
- Catalog result: 11 products, 12 variants, 5 public, 0 checkout-ready.
- Public artifact: 17 allowlisted files, 5 products, 0 checkout-ready.
- `gallery-balanced` profile dry-run: no changes.
- Playwright desktop 1440 × 1200: small-to-large wall order visually verified.
- Playwright mobile 390 × 844: `01 / 04` Last Light and `02 / 04` Mahogany
  paging verified.
- Last Light detail: title, subtitle, 12 × 24, `$195`, specs, inquiry link, and
  fail-closed action verified.
- Browser console: 0 errors, 0 warnings.
- Production domain: HTML, catalog, Last Light display, Last Light wall
  derivative, and `/api/health` returned `200`; API `ok: true`.
- Production catalog: 5 public products, 4 consumer products, 0
  checkout-ready variants; Last Light present, Autumn absent.
- Archived Autumn public wall path returned `404`.
