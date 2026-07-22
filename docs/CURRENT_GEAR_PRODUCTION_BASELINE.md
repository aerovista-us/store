# Current Gear Production Baseline

**Captured:** July 22, 2026 PT

**Protected storefront:** `https://gear.aerovista.us`

**Deployed source:** `origin/main` at `9c06a7b`

**Release:** Plan 1A commerce-first Gear storefront
**Store ID reserved for the shared platform:** `aerovista-apparel`

## Baseline decision

The deployed Plan 1A storefront is the protected visual and purchase-path reference for Plan 1. New multi-store work must be additive. It must not rewrite the live Gear catalog, cart, checkout, provider mappings, fulfillment path, DNS, or hosting in place.

The complete storefront release evidence and rollback procedure are in [releases/GEAR_PLAN_1A_RELEASE_2026-07-21.md](releases/GEAR_PLAN_1A_RELEASE_2026-07-21.md).

## Production route

```text
Customer
  -> Cloudflare-proxied gear.aerovista.us
      -> GitHub Pages for static storefront files
      -> Cloudflare Worker for /api/*
          -> api.aerovista.us/api/*
              -> Flask/Gunicorn commerce API on NXCore
                  -> Square payment links and webhooks
                  -> Postgres order/fulfillment records
                  -> Printful fulfillment worker
```

## Verified storefront state

- Eight purchasable products appear on the homepage.
- A homepage product opens the existing product modal in one action.
- Add to Bag continues to require a sellable selected variation.
- About/Story and customer-care destinations are real pages or policy sections.
- Secondary catalog filters are collapsed under More Filters.
- Desktop and phone paths have no reported browser errors or horizontal overflow.
- Two products with the same display/cart key retain distinct Square variation IDs.
- Catalog, overlay, storefront, checkout-fix, and conversion audits passed for the release.

## Recorded release artifacts

| Artifact | SHA-256 / status |
|---|---|
| Pre-release live root HTML | `b659c33cad3aa20e7f50f3f0da7498bc324e89b3ebee918934982fe0d1f45327` |
| Canonical catalog JSON | `c61854fe0883bfec527504780b5580839517eabbdb77ff3f1f5c9fed76dceca0` |
| Canonical storefront overlay JSON | `8f82fa028347358a31f28f8cb0b21d81f2c075aaeb136c4988e19e7d4c6af756` |
| Canonical checkout-ready fallback | `4590f4d140e27e98bddcdd4ef907b483c940fe654ba266e44d900d73ce758758` |
| Released `dist/index.html` | `320889cfe138f91851a9429d1aba6254c20aff51954abe2c44e410c354c9cf41` |
| Released `dist/about.html` | `e0e5e9c5c8b5eba93546cff06d08cc11509d67604e726897d1ec54027faf9f83` |
| Released `dist/policies.html` | `9d6596f88980e7a55c91952c5ca2bf7330619f080b31429c2c2d981bf25ad0d1` |

## Read-only API observation

On July 22, 2026, the same-origin production Health and Bootstrap routes returned successfully:

- Health reported ready in Square production mode.
- Bootstrap reported USD, integer shipping minor units, and 29 sellable cart keys.
- Bootstrap retained the seven legacy fields recorded in the current contract.
- No checkout session, payment, webhook, order, or fulfillment object was created by this check.

## Source-control isolation

The original NAS worktree is intentionally left untouched because its local `main` contains unrelated operational changes and diverges from the deployed branch. Plan 1 implementation continues from deployed commit `9c06a7b` in a separate clean branch:

```text
codex/commerce-plan1-contract
```

This prevents Plan 1 work from overwriting fulfillment, console, deployment, or documentation changes in the original worktree.

## Rollback

If a future Gear release changes product identity, cart identity, checkout behavior, or critical storefront operation:

1. Stop checkout initiation only if price or product integrity is uncertain.
2. Redeploy or revert to the verified Plan 1A release at `9c06a7b`.
3. If the regression is limited to the original Plan 1A presentation changes, the pre-Plan-1A rollback commit is `acbbf29`.
4. Purge only affected Gear static cache paths when required.
5. Recheck a homepage product, two colliding cart keys with distinct variation IDs, cart persistence, and checkout handoff.
6. Do not roll back Square, orders, webhooks, fulfillment, or catalog data for a static-only failure.

## Prerequisite status

- Complete: private, versioned repositories now hold the sanitized backend and
  operator-console source.
- Complete: the isolated NXCore/Square sandbox has no public route or
  fulfillment workers and has passed checkout, webhook, rate-limit, migration,
  rollback, and legacy regression gates.
- Complete: normalized store/catalog schemas and the additive `/v1` contract
  are approved in executable fixtures.
- Complete: Gear and Horizon are isolated console workspaces; Horizon remains
  draft-only.
- Complete: the console uses a catalog-only production credential instead of
  the broad operations secret.
- Complete: the private backend dependency gate passes with 58 tests and no
  known `pip-audit` vulnerabilities; the updated runtime is deployed only to
  the isolated sandbox.
- Remaining for production `/v1` only: approve/deploy the prepared
  Cloudflare-to-Traefik router and trusted-source boundary, then take fresh
  immutable image and database rollback artifacts immediately before the
  production migration.

These additions have not changed Gear's public catalog files, checkout path,
DNS, GitHub Pages origin, workers, or production database revision.
