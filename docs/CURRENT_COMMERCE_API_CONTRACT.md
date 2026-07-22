# Current Commerce API Contract

**Contract ID:** `legacy-gear-v0`

**Captured:** July 22, 2026 PT

**Protected caller:** the Plan 1A Gear storefront

**Public path:** same-origin `https://gear.aerovista.us/api/*`
**Upstream:** `https://api.aerovista.us/api/*`

This document records behavior that must remain compatible while the store-aware `/v1` API is developed beside it. It is descriptive, not permission to expose additional backend data or to copy the existing contract into Horizon.

The machine-readable manifest is [../contracts/current-commerce-api.v0.json](../contracts/current-commerce-api.v0.json). Sanitized regression examples live under [../tests/fixtures/commerce](../tests/fixtures/commerce).

## Routes

| Method | Path | Authentication | Side effect | Routine live audit |
|---|---|---|---|---|
| `GET` | `/api/health` | Public | None | Yes |
| `GET`, `HEAD`, `OPTIONS` | `/api/square/bootstrap` | Public | None | Yes |
| `POST`, `OPTIONS` | `/api/square/checkout` | Public | Creates a Square payment link | No |
| `POST` | `/api/webhooks/square` | Square HMAC signature | Stores webhook/order data and may enqueue fulfillment | No |
| `GET`, `OPTIONS` | `/api/catalog/live` | Public | Reads Postgres; may initialize it from the mounted catalog | No |
| `GET`, `OPTIONS` | `/api/catalog/meta` | Public | None | No |
| `POST` | `/api/catalog/publish` | `X-Ops-Token` | Replaces the live catalog snapshot | No |
| `POST` | `/api/catalog/sync-from-disk` | `X-Ops-Token` | Replaces the live snapshot from mounted files | No |
| `GET` | `/api/ops/db` | `X-Ops-Token` | None; returns private operational data | No |
| `GET` | `/ops/printful` | `X-Ops-Token` | None; private operator UI | No |

The Cloudflare Worker proxies only `/api/*`. Non-API storefront traffic continues to the static origin.

## `GET /api/health`

Current success status: `200`.

Current response fields:

```json
{
  "ok": true,
  "time": "ISO-8601 UTC timestamp",
  "square_env": "production",
  "have": {
    "SQUARE_APP_ID": true,
    "SQUARE_LOCATION_ID": true,
    "SQUARE_ACCESS_TOKEN": true
  },
  "allowed_origins": ["https://gear.aerovista.us"]
}
```

The current route exposes credential-presence flags and the configured origin list. Those details are not needed by shoppers. A hardened readiness route should return a smaller response, but changing the legacy shape must be treated as a compatibility/security release rather than an incidental `/v1` edit.

## `GET /api/square/bootstrap`

Current success status: `200`. `OPTIONS` returns `204`.

Required response fields:

```json
{
  "env": "production",
  "appId": "public Square application identifier",
  "locationId": "public Square location identifier",
  "currency": "USD",
  "flatShippingCents": 0,
  "promoCodes": {},
  "sellableCartKeys": ["Default__M"]
}
```

Compatibility behavior:

- `flatShippingCents` is an integer in minor currency units.
- `promoCodes` contains only customer-safe rule data.
- `sellableCartKeys` is a compatibility list, not a globally unique variant identity list.
- A backend configuration error currently returns `500` with `{ "error": "..." }`.
- The storefront may use `store/checkout_ready_keys.json` as a fallback when Bootstrap is unavailable.

## `POST /api/square/checkout`

This route creates a Square payment link and is not safe for routine read-only audits.

Minimum request:

```json
{
  "currency": "USD",
  "cart": [
    {
      "productId": "public-product-id",
      "sku": "Default__M",
      "variationId": "selected-square-variation-id",
      "qty": 1
    }
  ]
}
```

The route also accepts `variation_id`, `promo_code`, and `promoCode` compatibility spellings. Client-sent `price` or `cents` may be present but is ignored.

Success status and shape:

```json
{
  "ok": true,
  "checkoutUrl": "https://square.link/...",
  "idempotencyKey": "server-generated UUID"
}
```

Current error behavior:

| Status | Example condition | Shape |
|---:|---|---|
| `400` | Missing or invalid JSON body | `ok`, `error`, optional `detail` |
| `400` | Empty cart | `ok`, `error` |
| `400` | Missing SKU, invalid quantity, unknown variation, invalid promo | `ok`, `error` |
| `500` | Missing configuration or unhandled backend/provider failure | `ok`, `error` |
| `502` | Square response has no checkout URL | `ok`, `error`, currently `raw` |

The legacy endpoint currently generates its own idempotency UUID for every request. It does not accept and persist a caller idempotency key. Raw provider and exception details may appear in some error responses. Both behaviors must be corrected in `/v1`; they are not safe patterns to reproduce.

## Identity and authority

| Concern | Current source of truth | Protected behavior | Planned `/v1` direction |
|---|---|---|---|
| Product identity | Catalog `product.id` | Cards, modal, and cart resolve by ID | Stable public product ID scoped through store/channel assignment |
| Cart compatibility key | `Color__Size` | Preserved for the current Gear API | Never treated as globally unique; generic option selections are explicit |
| Checkout variant | Cart line `variationId` | Selected/stored ID wins over a colliding cart-key mapping | Stable public variant ID resolves to provider ID server-side |
| Price | Backend SKU map or catalog checkout metadata | Browser price is ignored at checkout | `/v1/cart/quote` returns authoritative integer minor-unit totals |
| Visibility | Catalog plus storefront overlay | Hidden products stay unavailable to the storefront | Explicit store/channel visibility and availability states |
| Collection | Catalog/overlay presentation data | Filters and merchandising only | Store-scoped collection assignments |
| Square identifier | `variation_id` / `variationId` | Required for unambiguous checkout | Kept server-side when the browser does not need it |
| Fulfillment mapping | Backend provider map | Created only after verified Square events | Store/version-aware provider adapter and replay-safe jobs |

## Collision invariant

Many Gear products legitimately share display keys such as `Default__M`. Therefore:

```text
cart key identifies selected options for compatibility
variationId identifies the actual Square item
```

The storefront must keep this precedence in both cart normalization and checkout payload creation:

```text
stored selected variationId -> mapping fallback
```

A mapping result must never replace a different stored selected variation ID. The sanitized two-product fixture permanently covers this case.

## Webhook and operations behavior

- The private operator console also depends on the deployed `catalog_live`
  table and `/api/catalog/*` routes discovered during the NXCore parity check.
- `GET /api/catalog/live` is not strictly read-only: if the table is empty, it
  initializes the row from the mounted catalog. Routine production audits must
  therefore not call it.
- Catalog publish and disk-sync routes require `X-Ops-Token` and must remain
  unavailable to customer storefront code.
- Square webhook verification uses HMAC-SHA256 over the configured notification URL plus the exact raw request body.
- Invalid or missing signatures return `400` before event processing.
- Completed/approved payment events retrieve the corresponding Square order before normalization.
- Supported order events are normalized into orders and order items and ensure a Printful fulfillment job exists.
- Unhandled signed Square event types return `200` without creating an order.
- The operations JSON route fails closed when its secret is absent and returns `401` for an invalid token.
- Operations responses contain customer and shipping data and must never be exposed through the public storefront API.

## CORS and proxy contract

- Production storefront calls use same-origin `/api/*` through the Cloudflare Worker.
- The Worker forwards the path and query to `api.aerovista.us`, preserves the request method/body, and adds CORS only for approved origins.
- Approved origins must be exact; wildcard credentialed CORS is not allowed.
- Plan 1 must decide whether all storefronts use their own same-origin Worker route or call the central API directly. Do not mix routing patterns accidentally.

## Regression commands

Offline, deterministic, and side-effect free:

```bash
npm run audit:commerce-contract
```

Adds read-only production Health and Bootstrap checks:

```bash
npm run audit:commerce-contract:live
```

Neither command calls Checkout, Webhooks, or Ops. Any test that creates a sandbox checkout session belongs in the future isolated sandbox suite and must use explicit fixture IDs plus a non-fulfilling test path.

## Compatibility exit gate

The legacy routes may be deprecated only after:

1. Gear has migrated to versioned catalog, quote, and checkout-session routes.
2. Cart and checkout parity tests pass for colliding variation IDs.
3. Webhook and fulfillment replay behavior is verified in sandbox.
4. A documented compatibility window has elapsed.
5. The deployed Plan 1A storefront remains immediately recoverable.
