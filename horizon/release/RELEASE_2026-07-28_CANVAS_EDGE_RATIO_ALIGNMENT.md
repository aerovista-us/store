# Horizon canvas edge alignment and corner-join release

Date: 2026-07-28  
Scope: proportional gallery wall, product detail modal, and View in Room

## Outcome

- The right canvas wrap is 25% narrower than the preceding edge treatment.
- The existing thin bottom wrap is retained.
- One image coordinate system now spans the front, right fold, and bottom
  fold. The front stops at each fold line and the next source pixels continue
  across the corresponding edge.
- No boundary strip is repeated or independently rescaled.
- The two sampled faces overlap at the lower-right corner so wall background
  cannot show through between them.
- The contact shadow remains independent from the wrap geometry, preserving
  believable wall lift without making the bottom edge appear thicker.
- The same system applies to every public wall canvas, product-detail canvas,
  and View in Room canvas.

## Ratios

| Surface | Right wrap | Bottom wrap |
|---|---:|---:|
| Gallery wall | 4.5 px | 1.2 px |
| Desktop detail / room | 6.75–9.75 px responsive | 1.8–2.6 px responsive |
| Mobile detail / room | 7.5 px | 2 px |

## Implementation

- Uses independent `--wrap-right` and `--wrap-bottom` geometry.
- Reduced every right-wrap value to 75% of its preceding value while leaving
  the thin bottom-wrap values unchanged.
- Maps the artwork once across the entire canvas footprint.
- Clips the front image before the fold allocation, then clips the same
  full-canvas image map to the right and bottom faces.
- Extended both sampled faces through the shared lower-right corner, with the
  right face painting last to create a sealed, consistent join.
- Updated front-image border and rounding positions to use the new variables.
- Bumped the storefront stylesheet cache key to
  `20260728-continuous-canvas-wrap`.
- Hardened the GitHub Pages packaging script to copy each public file by its
  relative path, preserving the required `site/css/styles.css` directory.

## Verification

- Catalog: 11 products, 12 variants, 5 public, 5 checkout-ready
- Public artifact: 18 files
- Desktop gallery wall: passed
- Desktop product detail: passed
- Desktop photographic room: passed
- Mobile photographic room: passed
- Browser console: 0 errors, 0 warnings
- Production HTML and stylesheet: HTTP 200
- Production HTML and stylesheet: HTTP 200
- Frontend commit: `68555cec2b8c7d3f8582fdcfdb426a20da48025d`
- GitHub Pages run: `30424671811` — successful
