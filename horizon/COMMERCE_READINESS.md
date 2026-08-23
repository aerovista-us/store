# Horizon commerce readiness

SOT: This file records Horizon checkout and private production-routing state.
Customer product state remains authoritative in `catalog.json`.

Release procedure: [DEPLOYMENT_SOP.md](DEPLOYMENT_SOP.md). Remaining proof,
policy, and launch work: [COMPLETION_PLAN.md](COMPLETION_PLAN.md).

## Current result

As of 2026-07-27:

- five products are public and all five public variants are checkout-ready;
- eight exact Horizon cart keys are active in the production Square bootstrap;
- eight exact production-routing rows are active in PostgreSQL;
- Last Light is verified as Square variation
  `7GHIQT64RIQ7FG75JXRY4WXM`, production sync product `452227092`, and
  production sync variant `5415090955`;
- a Last Light checkout request returned HTTP `200` and a valid `square.link`
  URL without completing payment;
- customer-facing copy refers to Square’s secure checkout and does not name the
  production provider;
- the bundle, incomplete works, and archived works remain unavailable.

The current production backup is:

`/srv/Collab/mini.shops/AV-PNW.com/av_storefront/backups/horizon-commerce-20260727T044942`

## Active public offers

| Product | Size | Price | Checkout | Remaining private quality work |
|---|---:|---:|---|---|
| Last Light Over the Resort | 12 × 24 in | $195 | Active | Replace the provisional video frame with the sharpest original frame; approve final crop/wrap and physical proof |
| Mahogany Wake | 20 × 28 in | $275 | Active | Complete visible-person/rights review and physical wrap proof |
| The Road to the Lake | 20 × 40 in | $395 | Active | Complete final print-master/wrap proof |
| Lake, Links, and the Floating Green | 24 × 48 in | $525 | Active | Complete projection/seam/highlight review and physical proof |
| Harbor at the Heart | 30 × 40 in | $495 | Active | Complete final print-master and physical proof; keep the unbuilt 24 × 32 option hidden |

Checkout activation is recorded through `commerceApproved: true` and an
explicit `proofWaiver` in the private catalog. It does not assert that a
physical proof was received: `proofApproved` remains false where proof work is
open.

## Wiring contract

- Cart namespace: `av_horizon_cart_v1`
- Request fields: `sku`, `variationId`, `qty`, `size`, and `color`
- Customer request path: same-origin `/api/square/checkout`
- Local API origin: `https://api.aerovista.us`
- Prices: server-authoritative from the Square SKU map
- Static artifact: provider fields, SQL, source hashes, internal issues, and
  operator documents are removed before publication

The cart refuses to send a checkout request unless every selected variant has
`checkoutReady: true`. Hidden variants remain fail-closed even when their
private mapping evidence is preserved.

## Production mapping evidence

- `commerce/square-sku-map.horizon.json` — eight Horizon cart keys
- `commerce/printful-variant-map.horizon.json` — eight exact private production
  mappings
- `commerce/product-variant-map.horizon.sql` — reviewed eight-row PostgreSQL
  upsert
- `commerce/printful-sync-audit-2026-07-27.json` — sanitized store-wide
  read-only audit
- `commerce/printful-product-snapshot-2026-07-27.json` — sanitized read-only
  product, variant, size, price, and file evidence

Production verification after deployment:

- API, PostgreSQL, and workers healthy
- bootstrap: eight Horizon keys
- database: eight active expected rows
- Last Light checkout-link smoke: HTTP `200`, `ok: true`, host `square.link`
- paid test: not performed
- charge/order created by smoke: no

## Deferred products

| Product | State | Reason |
|---|---|---|
| Autumn Over Coeur d’Alene | Hidden archive | Recoverable; removed from the active consumer edit |
| Fairways Along the Lake | Hidden archive | Final stitch/wrap QA, price decision, provider-artwork update, and physical proof remain |
| The Clock at Resort Circle | Hidden archive | Distortion/wrap QA, rights record, provider-artwork update, and physical proof remain |
| A Window Through the Pines | Hidden | No approved source/product record |
| Where Downtown Opens to the Lake | Hidden | No approved source/product record |
| Lake City Autumn Collection | Hidden seasonal hold | No tested bundle checkout and multi-item production behavior |

## New-product gate

Keep a new product `published: false` until real artwork, title, size, price,
rights, and product identity are known. Checkout additionally requires:

1. exact Square variation and price;
2. exact active production variant;
3. production bootstrap and database rows;
4. policy and support readiness;
5. approved physical proof, or a deliberate documented commerce approval and
   proof waiver;
6. successful no-charge checkout-link smoke.

Do not expose provider names or fulfillment implementation details in customer
copy. “You’ll be connected to Square’s secure checkout to confirm shipping and
complete payment” is the approved handoff context.

