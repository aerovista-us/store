# Horizon commerce-forward layout release — 2026-07-27

## Outcome

`https://horizon.aerovista.us` now keeps its editorial gallery character while
making the purchase path explicit. The hero, consumer cards, Mahogany feature,
product detail, bag, and business-placement section expose clear formats,
prices, and next actions without adding a promotional ecommerce banner.

Harbor at the Heart remains in the public catalog and cart system but uses
`consumerVisible: false`. It appears only in the business/custom-placement
section and does not interrupt the four-work consumer collection.

## Release identity

| Evidence | Value |
|---|---|
| Public repository | `aerovista-us/horizon-storefront` |
| Frontend commit | `f52e6c04d685ce5fa96cfdebf06a4da214946fa7` |
| Pages workflow run | `30250633004` — success |
| Public hostname | `https://horizon.aerovista.us` |
| Public artifact | 12 files |
| Master catalog | 10 products / 11 variants |
| Public catalog | 5 products |
| Consumer collection | 4 products |
| Business placement | Harbor at the Heart |
| Checkout-ready variants | 0 |

## Purchasing mechanics

- Hero exposes Mahogany Wake’s 20 × 28-inch format and `$275` price.
- Hero actions provide `View the Piece` and `Explore the Collection`.
- Each consumer card shows title, subtitle, canvas size, finish, exact price,
  and a persistent `View the Piece` button.
- Four-column production strip covers made-to-order production, mounting
  hardware, fade-resistant canvas, and solid wood stretcher bars.
- Mahogany Wake has a full editorial product section with description, close
  crop, specifications, price, and `View & Purchase`.
- Harbor has a dedicated business/custom-placement section with its verified
  30 × 40-inch `$495` offer and studio inquiry path.
- Header bag access remains visible on desktop and mobile.
- Product details retain format selection, room preview, save-to-bag, and
  customer inquiry controls.

## Verification

- Catalog validation: 10 products, 11 variants, 5 published, 0
  checkout-ready.
- Public artifact: 12 allowlisted files, 5 products, 0 checkout-ready.
- Live catalog: 5 public products, 4 with `consumerVisible: true`, Harbor with
  `consumerVisible: false`.
- Desktop: 1440 × 1000, four consumer cards and business placement verified.
- Mobile: 390 × 844, purchase controls remain visible and unclipped.
- Hero `View the Piece` opens Mahogany Wake’s 20 × 28-inch / `$275` detail.
- Mahogany saves to the bag at `$275`; checkout remains disabled with the
  fulfillment-verification message.
- Harbor opens from business placement with 24 × 32-inch pending and verified
  30 × 40-inch / `$495` formats visible.
- Live `/api/health`: `200`.
- Live page retains `noindex`.
- Local and production browser consoles: 0 errors, 0 warnings.

Presentation evidence:

- `output/playwright/horizon-commerce-layout-desktop.png`
- `output/playwright/horizon-commerce-layout-mobile.png`
- `output/playwright/horizon-commerce-layout-production-f52e6c0.png`

## Recovery

The `gallery-balanced` visibility profile records Harbor’s business-only
consumer placement. The `curated` and `broad-recovery` profiles also preserve
their intended `consumerVisible` states.

```powershell
node horizon/scripts/apply-curated-visibility.mjs --profile=gallery-balanced
node horizon/scripts/apply-curated-visibility.mjs --profile=gallery-balanced --apply
npm run build:horizon-pages
npm run audit:horizon-pages
```

Recovery does not enable checkout or mutate Square, Printful, Postgres,
Worker, or DNS state.

