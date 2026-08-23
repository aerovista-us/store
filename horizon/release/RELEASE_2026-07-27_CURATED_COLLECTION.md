# Horizon curated-preview release — 2026-07-27

## Result

`https://horizon.aerovista.us` now presents the intentionally small curated
Coeur d’Alene collection:

1. Mahogany Wake — 0305
2. Autumn Over Coeur d’Alene — 0021
3. The Road to the Lake — 0018

This is a public `noindex`, commerce-gated preview. Checkout remains disabled.

## Release evidence

| Surface | Evidence |
|---|---|
| Public repository | `https://github.com/aerovista-us/horizon-storefront` |
| Frontend commit | `acec063112b8a6701333a694547e532ae75ba092` |
| Pages workflow | `30246589520` — passed |
| Public hostname | `https://horizon.aerovista.us` |
| Public artifact | 10 allowlisted files |
| Public products | 3 |
| Master catalog | 10 products / 11 variants |
| Hidden records retained | 7 |
| Checkout-ready variants | 0 |

## Migration integrity

- No master-catalog product or variant was deleted.
- Every product sets `preserveRecord: true`.
- The former seven-work visibility state is recorded in
  `migrations/curated-2026-07-27/visibility-states.json`.
- The broad public artifact remains recoverable at commit
  `b97823d3951d4afa241ffd477ea3e55761f12bf1`.
- Hidden display images were removed only from the sanitized public artifact;
  their source and display files remain in `horizon/gallery`.
- Public catalog generation now requires `publicVisible: true` and sorts by
  `releasePriority`.
- `published` mirrors `publicVisible` for compatibility and validation fails
  if the fields disagree.

## Production verification

- Build and allowlist audit passed: 10 files, 3 products, 0 checkout-ready.
- The production catalog returned the exact intended order.
- Harbor — 0006, Fairways — 0043, Floating Green — 0044, and Clock — 0056
  public media paths returned `404`.
- Production `/api/health` returned `200`.
- Desktop and 390 × 844 mobile browser checks logged zero errors or warnings.
- Mahogany Wake saved to the Horizon bag and checkout remained disabled.
- `noindex` remains present.

Visual evidence:

- `output/playwright/horizon-curated-desktop.png`
- `output/playwright/horizon-curated-mobile.png`
- `output/playwright/horizon-curated-production-acec063.png`

## Recovery

Preview a source-catalog restoration:

```powershell
node horizon/scripts/apply-curated-visibility.mjs --profile=broad-recovery
```

Apply and validate the restoration:

```powershell
node horizon/scripts/apply-curated-visibility.mjs --profile=broad-recovery --apply
npm run build:horizon-pages
npm run audit:horizon-pages
```

Reapply the curated profile with `--profile=curated --apply`.

For a storefront-only rollback, redeploy public artifact commit `b97823d`.
Neither recovery path enables checkout or mutates Square, Printful, Postgres,
Cloudflare, DNS, or NXCore configuration.
