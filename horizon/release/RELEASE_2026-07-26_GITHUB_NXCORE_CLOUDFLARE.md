# Horizon gated-preview release — 2026-07-26

## Result

`https://horizon.aerovista.us` serves the sanitized Horizon frontend through
Cloudflare. Static requests are proxied to the dedicated GitHub Pages origin;
same-origin `/api/*` requests are proxied to the shared NXCore API.

This is a public `noindex`, commerce-gated preview, not a completed commerce
launch.

## Release evidence

| Surface | Evidence |
|---|---|
| Public frontend repository | `https://github.com/aerovista-us/horizon-storefront` |
| Frontend commit | `b97823d3951d4afa241ffd477ea3e55761f12bf1` |
| Pages workflow run | `30211437689` — passed |
| GitHub Pages origin | `https://aerovista-us.github.io/horizon-storefront/` |
| Public hostname | `https://horizon.aerovista.us` |
| Cloudflare Worker | `gear-api-proxy` |
| Worker version | `894c791f-0636-46d0-99e9-35dda97bd1ad` |
| Worker routing | Gear `/api/*` route retained; Horizon Custom Domain serves static GitHub Pages origin and NXCore `/api/*` |
| NXCore API | `av-store-api` healthy after origin-only restart |
| NXCore environment backup | `backups/.env.before-horizon-20260726T153755Z` |
| Horizon CORS | `https://horizon.aerovista.us` verified on health and bootstrap |

## Artifact and smoke results

- `npm run build:horizon-pages` passed.
- `npm run audit:horizon-pages` passed.
- Public artifact: 14 allowlisted files.
- Public catalog: 7 products.
- Hidden bundle exposed: no.
- Checkout-ready variants: 0.
- All 14 public files returned `200` through the Cloudflare edge.
- Operator documentation, SQL, scripts, source masters, and provider evidence
  returned `404`.
- GitHub Pages origin returned `200`.
- Horizon `/api/health` and `/api/square/bootstrap` returned `200`.
- Horizon preflight returned the exact Horizon CORS origin.
- Gear homepage and Gear `/api/health` both remained `200`.
- Local exact-artifact browser smoke rendered all seven works, saved Mahogany
  Wake to the Horizon-only bag, opened the rebuilt room view, exercised the
  three wall-tone controls, kept checkout disabled, and logged no console
  errors or warnings.
- Production hover browser smoke at commit `b97823d` confirmed the four-pixel
  lift, loaded every published display asset, and logged zero console errors
  or warnings. Full-page and room-view evidence from `9864944` remains valid
  for the unchanged layout and feature code.
- The public artifact contains no placeholder product IDs or placeholder
  artwork.
- All HTML, CSS, JS, catalog, favicon, and seven display images return `200`
  through the production hostname.
- The production catalog includes Mahogany Wake and excludes both incomplete
  placeholder products.
- The sanitized artifact still contains 14 allowlisted files because four
  provider-background mockups and the placeholder SVG were replaced by four
  direct artwork derivatives.
- Previous release browser evidence at `cfbac30` remains available for
  rollback comparison.

## Collection and presentation pass

The `b97823d` release changes the public preview catalog and presentation, but
does not activate commerce or change provider, API, Worker, or DNS state.

- Collection spacing and text hierarchy were retuned for a quieter editorial
  rhythm at desktop and mobile widths.
- Filters, format selectors, product detail controls, status labels, and the
  bag use flatter hairline treatments and more deliberate internal spacing.
- Artwork cards use no CSS drop shadow or offset slab. Fine-pointer hover lifts
  the complete canvas object by four pixels.
- Each card and product preview renders image-derived right and bottom faces,
  producing a subtly rounded gallery-wrap edge with physical thickness. The
  faces now use straight, overlapping seams so the outer corner reads as one
  continuous wrapped object instead of two angled pieces.
- The edge URL is resolved against the document origin so the same treatment
  works in local preview, GitHub Pages, and the Cloudflare custom domain.
- Panorama cards now use direct artwork derivatives without the provider-room
  background.
- Mahogany Wake — A Classic Runabout on Lake Coeur d’Alene is the seventh
  finished work.
- Placeholder products are hidden; the bundle remains hidden.
- The SVG favicon now uses a rounded Horizon sun-and-lines mark.
- View in Room now presents format-aware artwork in an architectural scene,
  labels scale against a nine-foot wall, and offers Warm Gallery, Limestone,
  and Charcoal wall tones.

Visual evidence is retained inside the project:

- `output/playwright/horizon-luxury-desktop.png`
- `output/playwright/horizon-luxury-mobile.png`
- `output/playwright/horizon-luxury-product.png`
- `output/playwright/horizon-luxury-bag.png`
- `output/playwright/horizon-production-cfbac30.png`
- `output/playwright/horizon-v8-desktop.png`
- `output/playwright/horizon-v8-mobile.png`
- `output/playwright/horizon-v8-room-warm.png`
- `output/playwright/horizon-v8-room-charcoal.png`
- `output/playwright/horizon-v8-room-mobile.png`
- `output/playwright/horizon-production-9864944.png`
- `output/playwright/horizon-production-room-9864944.png`
- `output/playwright/horizon-edge-clean-hover.png`
- `output/playwright/horizon-edge-clean-detail.png`
- `output/playwright/horizon-edge-clean-mobile-detail.png`
- `output/playwright/horizon-production-edge-hover-b97823d.png`

## Deliberately unchanged

- No Horizon Square production-map entries were deployed.
- No Postgres `product_variant_map` rows were imported.
- No Printful product artwork or provider state was changed.
- No checkout-ready catalog flag was enabled.
- No paid order was placed.
- The hidden bundle and two incomplete products remain absent.
- `noindex` remains in place.

## Rollback

1. Revert the public Pages artifact to commit
   `cfbac309c79c81f572c8422887fbfe640a24a15c` or another verified release.
2. For an edge-integrity failure, roll back Worker version
   `894c791f-0636-46d0-99e9-35dda97bd1ad` and confirm the effect on the Horizon
   Custom Domain before proceeding.
3. For an origin/CORS failure, restore the recorded NXCore `.env` backup and
   restart only `av-store-api`.
4. Do not change Gear DNS, Gear catalog, production product maps, or unrelated
   fulfillment rows during a Horizon rollback.
