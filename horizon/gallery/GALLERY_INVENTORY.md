# Horizon gallery inventory

SOT: Customer-facing artwork files live in this folder. Product publication
state remains authoritative in `../catalog.json`.

Audited July 27, 2026.

## Proportional gallery-wall media

| File | Role | Public state |
|---|---|---|
| `wall/gallery-interior.webp` | 1672 × 940 photographic gallery-room background | Public, optimized WebP |
| `wall/gallery-interior-source.png` | Generated room source retained for recovery/reprocessing | Private; excluded from the public artifact |
| `wall/CDA-CAN-010-mahogany-wake-wall.webp` | 420 × 300 Mahogany wall thumbnail | Public |
| `wall/CDA-CAN-014-last-light-wall.webp` | 480 × 240 Last Light wall thumbnail | Public |
| `wall/CDA-CAN-001-autumn-wall.webp` | 400 × 225 Autumn wall thumbnail | Archived; excluded from the current public artifact |
| `wall/CDA-CAN-002-road-wall.webp` | 400 × 225 Road wall thumbnail | Public |
| `wall/CDA-CAN-006-floating-green-wall.webp` | 480 × 240 Floating Green wall thumbnail | Public |

Each artwork thumbnail is exactly one-fifth of its full display image's linear
dimensions. The photographic room background replaces synthetic wall, light,
moulding, baseboard, and floor shapes. Product details and View in Room retain
the full display images.

## View in Room media

| File | Role | Public state |
|---|---|---|
| `room/horizon-lakehouse-room-v1.webp` | 1536 × 1024 photorealistic contemporary lake-house interior with an unobstructed artwork wall | Public, generated and optimized WebP |

The room image is a background only. Product artwork remains a separate live
canvas overlay, sized from the selected catalog dimensions against a nine-foot
wall reference. The former synthetic CSS moulding, furniture, vessel, books,
rug, and floor layers were removed. Natural, Soft Ivory, and Evening controls
apply subtle lighting treatments without replacing the photographic scene.

## Added to the customer preview

| File | Product | Result |
|---|---|---|
| `03-dji-20230923161411-0006-d-copy.webp` | Harbor at the Heart | Published 30 × 40 in offer; production checkout and routing maps verified |
| `05-dji-20231014111331-0018-d.webp` | The Road to the Lake | Published preview; visual subject matches the approved road-to-downtown/lake description |
| `06-dji-20231015121918-0021-d.webp` | Autumn Over Coeur d’Alene | Retained intact for recovery; archived from the current public edit |

These are suitable as web display images. Final canvas production must still
use approved print masters, not the compressed storefront WebP files.

## Direct panorama display derivatives

| File | Product | Remaining problem |
|---|---|---|
| `display/CDA-CAN-005-fairways-along-the-lake.jpg` | Fairways Along the Lake | Clean direct-artwork display; cropped print-master candidate is present; final stitch/wrap QA, physical proof, and price decision remain |
| `display/CDA-CAN-006-lake-links-floating-green.jpg` | Lake, Links, and the Floating Green | Clean direct-artwork display; cropped print-master candidate is present; final seam/highlight/wrap QA and physical proof remain |
| `display/CDA-CAN-007-clock-at-resort-circle.jpg` | The Clock at Resort Circle | Clean direct-artwork display; cropped print-master candidate is present; distortion/wrap QA, rights record, and physical proof remain |

The provider mockups remain private evidence. They are no longer used as
customer-facing card art because their room/background treatment competed with
the collection layout.

## Last Light Over the Resort

| File | Role | Evidence |
|---|---|---|
| `vlcsnap-2026-07-20-21h06m08s834.png` | Supplied source frame | 3840 × 2160; SHA-256 `507c6517d904b95df46fc3be5491d286844758e8baafd62e83d13c6282abd247`; private |
| `print-candidates/CDA-CAN-014-last-light-12x24-proofing.jpg` | Provisional centered 2:1 proofing crop | 3840 × 1920; SHA-256 `52e96a3b1e84091f32b40fb1f5240f12016df6c346afa5907e77815ff2929024`; private |
| `display/CDA-CAN-014-last-light-over-resort.jpg` | Customer display derivative | 2400 × 1200; SHA-256 `016bec8b19769838aa112d5bf532c3b54550c05bdddd6c2401564ec4c86cf5a1`; public |
| `wall/CDA-CAN-014-last-light-wall.webp` | One-fifth wall derivative | 480 × 240; SHA-256 `130c0c46b6d56c235b18700e07ab51c06ad8acc211b95aca8953316b88d68907`; public |

The supplied PNG is a frame from video and is provisional. Before print
approval, select the sharpest available original-video frame, repeat final
noise/crop/wrap QA, preserve the resort, shoreline, park, city, mountains, and
sunset, then approve a physical canvas proof. Square variation
`7GHIQT64RIQ7FG75JXRY4WXM`, catalog SKU `6A673A0192677_19300`, size 12 × 24,
price `$195`, production sync product `452227092`, and production sync variant
`5415090955` are verified. The source/default-file MD5 also matches. Checkout
is active under the catalog-recorded proof waiver; this does not complete the
image-quality or physical-proof task.

## Mahogany Wake

| File | Product | Result |
|---|---|---|
| `display/CDA-CAN-010-mahogany-wake.jpg` | Mahogany Wake — A Classic Runabout on Lake Coeur d’Alene | Published 20 × 28 in display derivative; local source matches the Printful default-file checksum; active sync variant and `$275` retail price verified |

`DJI_0305.JPG` is the verified production source. The visible person still
requires a documented visual-rights review. Final wrap review, physical proof,
and a paid controlled order remain open; production bootstrap and mapping
verification are complete.

The Lake City Autumn Collection bundle is retained in the catalog but hidden
until its Square and Printful bundle behavior is built.

## Cropped print-master candidates

| File | Product | Current evidence |
|---|---|---|
| `dji_fly_20241022_141230_0043_1729652016096_pano.jpg` | Fairways Along the Lake | 10329 × 5132; SHA-256 `fa3f4b6e8b450672a3b4bb1beafb1b54901b50c4f3cd837d7ff16d62af5cab0b` |
| `DJI_20241022141253_0044_D.JPG` | Lake, Links, and the Floating Green | 10302 × 5142; SHA-256 `94ee0e1d3f75140c871e7c0d596b4874140c19c32d7049e051ef627d68c43e1e` |
| `DJI_20241025153448_0056_D.JPG` | The Clock at Resort Circle | 10334 × 5147 crop; SHA-256 `a580ae8b0d2ba56d4f45b7d835949d5e05d9b80fe8311091814a0b2f98023461`. The 12000 × 6000 provider original was verified before this local file was replaced by the crop. |

## Hidden incomplete products

`placeholders/artwork-pending.svg` remains an internal status asset only.
A Window Through the Pines and Where Downtown Opens to the Lake are
`published: false`; neither appears in the public artifact, bag, or checkout.

## Present but not yet assignable to a sellable product

| File | Visual subject | Why it is not added |
|---|---|---|
| `01-dji-0304-copy.webp` | Resort tower, marina, and reflection | Needs an approved title, product record, price, Square variation, Printful mapping, and print master |
| `02-dji-0305-copy.webp` | Wooden boat from above | Superseded as the display source by `display/CDA-CAN-010-mahogany-wake.jpg`; retained for intake provenance |
| `04-dji-20231008155121-0002-d.webp` | Wide lake panorama | Highest-priority future panorama in the plan, but it still needs an approved title, product record, price, print master, Square variation, and Printful mapping |
| `07-dji-20231015122046-0022-d.webp` | Autumn neighborhood/commercial district | Needs subject/location confirmation, an approved title/product record, print master, and commerce setup |

## Planned source-artwork files still absent

- `DJI_20240913092904_0016_D.JPG` — A Window Through the Pines
- `DJI_20241025153913_0059_D.JPG` — Where Downtown Opens to the Lake

## Non-artwork assets

- `canvas-(in)-16x48-wall.png` and files under `mockups/` are presentation
  mockups, not source artwork.
- `glossy-metal-print-(in)-white-16x20-front-6a6530aae4d24.png` is a metal
  print mockup and does not define a Horizon canvas product.
- The older vendor-named Fairways and Clock PNGs and the generic JPEG uploads
  are retained as intake evidence; the product-named PNG copies are the
  canonical storefront presentation files.
- `placeholders/artwork-pending.svg` is a status graphic, not product artwork.
