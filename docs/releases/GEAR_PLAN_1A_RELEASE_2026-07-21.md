# Gear Plan 1A Release Record — 2026-07-21

**Release:** Commerce-first Gear storefront

**Branch:** `codex/gear-commerce-first-1a`

**Protected production URL:** `https://gear.aerovista.us`

**Baseline source:** `origin/main` at `acbbf29`

**Scope:** Static storefront presentation, About/Story, customer-care navigation, and regression audits only

## Production baseline

Captured immediately before the release:

| Artifact | SHA-256 / semantic status |
|---|---|
| Live root HTML | `b659c33cad3aa20e7f50f3f0da7498bc324e89b3ebee918934982fe0d1f45327` |
| Catalog | Semantically identical to release source; canonical JSON SHA-256 `c61854fe0883bfec527504780b5580839517eabbdb77ff3f1f5c9fed76dceca0` |
| Storefront overlay | Semantically identical to release source; canonical JSON SHA-256 `8f82fa028347358a31f28f8cb0b21d81f2c075aaeb136c4988e19e7d4c6af756` |
| Checkout-ready fallback | Semantically identical to release source; canonical JSON SHA-256 `4590f4d140e27e98bddcdd4ef907b483c940fe654ba266e44d900d73ce758758` |

Differences in raw JSON byte counts are line-ending formatting only; parsed catalog, overlay, and checkout-ready data compare equal.

## Release artifact

| Artifact | SHA-256 |
|---|---|
| `dist/index.html` | `320889cfe138f91851a9429d1aba6254c20aff51954abe2c44e410c354c9cf41` |
| `dist/about.html` | `e0e5e9c5c8b5eba93546cff06d08cc11509d67604e726897d1ec54027faf9f83` |
| `dist/policies.html` | `9d6596f88980e7a55c91952c5ca2bf7330619f080b31429c2c2d981bf25ad0d1` |

## Verified gates

- `npm run build:pages`
- `npm run audit:storefront-conversion` — 26 checks, 0 errors
- `npm run audit:storefront` — 0 errors
- `npm run audit:overlay` — 0 errors
- `npm audit --omit=dev` — 0 production vulnerabilities
- Live `npm run verify:checkout-fix` — all checks pass before release
- Browser verification at 1440×900 and 390×844
- Eight homepage products rendered from Square-sellable catalog products
- Mobile product grid begins inside the initial 844 px viewport
- Mobile document width equals viewport width; no horizontal overflow
- Homepage product -> modal -> Add to bag verified
- Two products sharing `Default__M` retained distinct Square variation IDs in local cart data
- Catalog, collection routes, collapsed secondary filters, About/Story, FAQ, Shipping, Returns, and Contact verified
- Browser console: 0 errors and 0 warnings on the final production-style artifact
- Production CSP explicitly allows the Cloudflare Insights script and beacon endpoint injected at the Pages edge

`audit:checkout-keys` was intentionally not executed because it creates a production Square checkout session for every visible variant and rewrites the fallback file. Sellability was verified through bootstrap data, current storefront audits, focused cart tests, and the existing live checkout-fix verifier.

## Unchanged systems

- Catalog products and visibility
- Storefront overlay merchandising data
- Square variation IDs and checkout-ready fallback data
- Cart namespace and checkout request contract
- Cloudflare `/api` proxy
- NXCore API, webhooks, orders, and fulfillment
- DNS and hosting origin

## Rollback

If product discovery, product identity, cart variation identity, checkout initiation, navigation, or critical mobile behavior regresses:

1. Revert the Plan 1A release commit or redeploy baseline commit `acbbf29` through the existing GitHub Pages workflow.
2. Purge only affected Gear static cache paths if the prior artifact does not appear after deployment.
3. Verify root HTML, product modal, two-product cart identity, and checkout handoff.
4. Leave catalog, API, Square, order, webhook, and fulfillment state untouched; this release performs no data migration.
