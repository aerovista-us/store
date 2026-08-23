# Horizon balanced-gallery release — 2026-07-27

## Outcome

`https://horizon.aerovista.us` now presents a five-work gallery selected from
the preserved ten-product master catalog. Harbor at the Heart adds recognizable
resort architecture; Lake, Links, and the Floating Green adds the collection’s
strongest panoramic counterpoint.

Fairways Along the Lake remains hidden because its fisheye curvature dominates
the composition. The Clock at Resort Circle remains hidden because road,
parking, and construction detail weaken the gallery edit. No product, variant,
media reference, source file, price, issue, or provider evidence was deleted.

## Release identity

| Evidence | Value |
|---|---|
| Public repository | `aerovista-us/horizon-storefront` |
| Frontend commit | `4cb992d32ca272af69bf4054a5d4e4eb731ba9a2` |
| Pages workflow run | `30247582552` — success |
| Public hostname | `https://horizon.aerovista.us` |
| Public artifact | 12 files |
| Master catalog | 10 products / 11 variants |
| Public catalog | 5 products |
| Checkout-ready variants | 0 |

## Public order

1. Mahogany Wake — 0305
2. Autumn Over Coeur d’Alene — 0021
3. Harbor at the Heart — 0006
4. The Road to the Lake — 0018
5. Lake, Links, and the Floating Green — 0044

The gallery uses two complementary wide/narrow pairs and a centered final
panorama. Harbor and Floating Green are public previews only. Their recorded
proof, mapping, and projection-correction blockers still prevent checkout.

## Verification

- Catalog validation: 10 products, 11 variants, 5 published, 0
  checkout-ready.
- Public-artifact audit: 12 allowlisted files, 5 products, 0 checkout-ready.
- Desktop: 1440 × 1000, all five works in order, no console warnings or errors.
- Mobile: 390 × 844, single-column gallery, no clipping, no console warnings
  or errors.
- Floating Green detail identifies the 360° panorama and 24 × 48-inch format.
- Floating Green saves to the bag; checkout remains disabled with the
  fulfillment-verification message.
- Live `/api/health`: `200`.
- Live page retains `noindex`.
- Harbor and Floating Green media: `200`.
- Fairways and Clock media: `404` from the public artifact and preserved in
  the private project.

Presentation evidence:

- `output/playwright/horizon-gallery-balanced-desktop.png`
- `output/playwright/horizon-gallery-balanced-mobile.png`
- `output/playwright/horizon-gallery-balanced-production-4cb992d.png`

## Recovery

Visibility profiles change master-catalog lifecycle fields only. They do not
delete product data, enable checkout, or mutate Square, Printful, Postgres,
Worker, or DNS state.

Preview a profile:

```powershell
node horizon/scripts/apply-curated-visibility.mjs --profile=curated
node horizon/scripts/apply-curated-visibility.mjs --profile=gallery-balanced
node horizon/scripts/apply-curated-visibility.mjs --profile=broad-recovery
```

Apply the current five-work edit:

```powershell
node horizon/scripts/apply-curated-visibility.mjs --profile=gallery-balanced --apply
npm run build:horizon-pages
npm run audit:horizon-pages
```

Use `curated` to recover the lean three-work set or `broad-recovery` to recover
the earlier seven-work set. Publishing remains a separate explicit action.

