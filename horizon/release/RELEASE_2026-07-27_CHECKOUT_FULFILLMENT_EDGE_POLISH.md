# Horizon checkout, fulfillment-map, and canvas-edge release

Date: 2026-07-27  
Scope: `horizon.aerovista.us`, shared NXCore commerce bridge, and Horizon documentation

## Outcome

- The five public works are enabled for Square-hosted checkout.
- The production bootstrap exposes eight Horizon cart keys.
- PostgreSQL contains eight active Square-variation-to-production-variant rows.
- Last Light Over the Resort is linked to its exact Square variation and exact
  production sync variant.
- Customer-facing copy refers to secure Square checkout and does not expose the
  production provider.
- Canvas presentation uses a connected right/bottom edge treatment with a
  restrained contact shadow. Detached four-sided bevel geometry was removed.

## Provider identity evidence

Last Light was verified read-only before activation:

- Square variation: `7GHIQT64RIQ7FG75JXRY4WXM`
- Square item: `UYXEDWYIDAOUY4ME73GCC4WI`
- SKU: `6A673A0192677_19300`
- Square price: `$195.00 USD`
- production sync product: `452227092`
- production sync variant: `5415090955`
- catalog variant: `19300`
- source/default-file MD5:
  `8782AB8865EEB67FCD3478689235E375`

The sanitized provider audit and product snapshot are stored in:

- `commerce/printful-sync-audit-2026-07-27.json`
- `commerce/printful-product-snapshot-2026-07-27.json`

## Production change

Before altering the shared maps, the prior generated map, backend environment,
and PostgreSQL table were backed up on NXCore at:

`/srv/Collab/mini.shops/AV-PNW.com/av_storefront/backups/horizon-commerce-20260727T044942`

The deployed shared SKU map contains 216 keys, of which eight are Horizon keys.
The reviewed SQL in `commerce/product-variant-map.horizon.sql` supplies the same
eight active production mappings. The API container was rebuilt so its mounted
map and bootstrap response matched the deployed file.

## Verification

- Frontend commit:
  `6feae8e14e4af084b46b3050ed48ceb081161993`
- GitHub Pages run: `30264761325` (`success`)
- Production home, catalog, API health, and bootstrap returned HTTP `200`.
- API and workers healthy after the map deployment.
- Bootstrap returned all eight Horizon keys.
- PostgreSQL returned all eight expected active Horizon mappings.
- A Last Light checkout request returned HTTP `200`, `ok: true`, and a
  `square.link` checkout URL.
- The verification stopped before payment; no charge and no fulfillment order
  were created.
- The customer artifact contains five public products and five checkout-ready
  variants.
- The public home/catalog scan contains zero production-provider or fulfillment
  terms.
- Browser QA found no console errors or warnings.
- Production desktop and 390 × 844 mobile cart QA passed with the checkout
  action enabled and no clipping.

## Proof boundary

The physical-proof and selected image-master tasks remain open. Checkout was
enabled under the explicit `commerceApproved` and `proofWaiver` records in
`catalog.json`; `proofApproved` was not falsified. The next physical order should
be treated as a controlled production proof, inspected on receipt, and recorded
before removing those waivers.

## Rollback

1. Restore the backed-up generated SKU map and backend environment.
2. Restore or selectively reverse the backed-up `product_variant_map` rows.
3. Rebuild `av-store-api`.
4. Set affected catalog variants to `checkoutReady: false`.
5. Rebuild and republish the sanitized Horizon artifact.
6. Verify bootstrap, API health, the public catalog, and cart state.
