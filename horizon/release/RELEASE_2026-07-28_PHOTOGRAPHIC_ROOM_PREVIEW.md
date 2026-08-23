# Horizon photographic View in Room release

Date: 2026-07-28  
Scope: customer artwork detail modal and sanitized GitHub Pages artifact

## Outcome

- Replaced the synthetic CSS room, furniture, moulding, rug, and floor with one
  optimized photorealistic room background.
- Preserved the artwork as a separate live overlay, including its connected
  right/bottom canvas wrap and contact shadow.
- Canvas width now derives from the selected catalog dimensions. A 12 × 24
  canvas and a 24 × 48 canvas therefore appear at materially different sizes
  against the same nine-foot-wall reference.
- Reframed the old wall-tone controls as photographic lighting treatments:
  Natural, Soft Ivory, and Evening.
- Kept checkout, product selection, and the customer-safe catalog unchanged.

## Generated asset

- Workspace asset:
  `gallery/room/horizon-lakehouse-room-v1.webp`
- Dimensions: `1536 × 1024`
- WebP size: approximately `178 KB`
- Generation mode: built-in image generation
- Use case: `photorealistic-natural`

Final prompt:

> Create a genuinely photorealistic high-end contemporary lake-house interior
> for a responsive View in Room feature: a large uninterrupted warm-plaster
> wall, pale oak floor, low walnut credenza, restrained olive lounge chair,
> ceramic vessel, books, and wool rug. Use straight-on eye-level architectural
> photography, realistic late-afternoon indirect light, straight geometry, and
> a large empty central hanging area. No artwork, people, text, logos,
> watermark, CGI styling, distorted furniture, dramatic beams, or clutter.

## Implementation

- `index.html` removes the decorative synthetic-room elements and updates the
  lighting control labels.
- `css/styles.css` uses the generated room as the stage background and adds
  subtle non-destructive lighting overlays.
- `js/gallery.js` reads the second catalog dimension as artwork width and sets
  a responsive room-scale variable.
- `scripts/build-public-artifact.mjs` explicitly allowlists the customer-safe
  room WebP.

## Verification

- Catalog: 11 products, 12 variants, 5 public, 5 checkout-ready
- Public artifact: 18 files
- Desktop: 1440 × 1200
- Mobile: 390 × 844
- Scale checks: 12 × 24 and 24 × 48
- Lighting checks: Natural and Evening
- Browser console: 0 errors, 0 warnings

## Deployment

- Frontend commit:
  `27f470242e64f68e804963d59e83d2459768e282`
- GitHub Pages run: `30413328079` (`success`)
- Production home, CSS, catalog, and room WebP returned HTTP `200`.
- Production room asset length: `177614` bytes.
- Production browser console: 0 errors, 0 warnings.
