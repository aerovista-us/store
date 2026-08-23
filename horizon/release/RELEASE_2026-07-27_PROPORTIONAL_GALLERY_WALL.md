# Horizon proportional gallery wall release

**Date:** 2026-07-27  
**Target:** `https://horizon.aerovista.us`  
**State:** public `noindex`; commerce remains fail-closed

## Outcome

The former staggered collection-card feed is replaced by one finite,
photographic gallery wall. The room uses real plaster texture, track fixtures,
natural light falloff, panel moulding, walnut baseboard, and wood floor depth
instead of synthetic SVG/CSS light beams and flat architectural shapes.

The four consumer pieces are rendered from their catalog canvas dimensions at
a common physical scale:

| Piece | Catalog format |
|---|---:|
| Mahogany Wake | 20 × 28 in |
| Autumn Over Coeur d’Alene | 20 × 40 in |
| The Road to the Lake | 20 × 40 in |
| Lake, Links, and the Floating Green | 24 × 48 in |

Desktop shows all four works in one room. Mobile shows one wall bay at a time
with previous/next controls, a `01 / 04` position indicator, and snap-aligned
navigation. Every placard retains the title, subtitle, canvas size, price, and
View the Piece action.

The artwork edge is now one continuous, image-derived wrap perimeter. The
former attached right and bottom polygons and their angled corner joins were
removed. No external canvas drop shadow or offset slab is used.

Harbor at the Heart remains public only in the separate business/custom
placement section. Hidden products, placeholder records, and the bundle remain
absent from the public presentation and recoverable in the master catalog.

## Image-loading boundary

The room uses `gallery/wall/gallery-interior.webp`, an optimized 1672 × 940,
42,234-byte photographic background. Its generated source is preserved inside
the project as `gallery/wall/gallery-interior-source.png` and is excluded from
the public artifact.

The artwork wall uses four WebP derivatives at exactly one-fifth of the
corresponding display image's linear dimensions:

| Asset | Source → wall dimensions | Bytes |
|---|---:|---:|
| `CDA-CAN-010-mahogany-wake-wall.webp` | 2100 × 1500 → 420 × 300 | 12,652 |
| `CDA-CAN-001-autumn-wall.webp` | 2000 × 1125 → 400 × 225 | 19,196 |
| `CDA-CAN-002-road-wall.webp` | 2000 × 1125 → 400 × 225 | 24,456 |
| `CDA-CAN-006-floating-green-wall.webp` | 2400 × 1200 → 480 × 240 | 27,810 |

The four artwork wall derivatives total 84,114 bytes. Full display images
remain in the product details and View in Room experiences; no artwork source
master is added to the public artifact.

## Commerce and recovery boundary

- 10 master-catalog products, 11 variants
- 5 public products
- 4 consumer wall pieces
- 1 Harbor business-placement feature
- 0 checkout-ready variants
- 17 customer-safe public files
- no Square, Printful, Postgres, Worker, DNS, price, cart-key, or readiness
  mutation

The `gallery-balanced`, `curated`, and `broad-recovery` visibility profiles
remain available. The new `wallImage` field and gallery-room media are additive
and do not remove or replace any full display media.

## Verification

- catalog and JavaScript syntax validation passed
- sanitized Pages artifact build passed
- release allowlist audit passed
- desktop presentation verified at 1440 × 1000
- mobile presentation verified at 390 × 844
- mobile previous/next position state verified from `01 / 04` to `02 / 04`
- View the Piece opens the correct product details
- Add to bag updates the Horizon-only bag
- checkout remains disabled with the verification-pending message
- browser console: 0 errors, 0 warnings

## Deployment evidence

- public repository commit:
  `139c11bed228ef8579371151b502e10cd47ece29`
- GitHub Pages run: `30254935035`
- production hostname: `https://horizon.aerovista.us`
- HTML, catalog, CSS, photographic wall, and all four wall thumbnails:
  HTTP `200`
- `/api/health`: HTTP `200`
- production catalog: 5 public products, 4 consumer-wall products, 4
  `wallImage` references, 0 checkout-ready variants
- `noindex`: present
- production browser console: 0 errors, 0 warnings
- production screenshot:
  `output/playwright/horizon-gallery-wall-production-139c11b.png`
