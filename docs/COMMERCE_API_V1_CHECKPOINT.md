# Commerce API `/v1` Contract Checkpoint

**Contract:** `1.0.0-alpha.1`

**Status:** Approved for isolated sandbox implementation

**Production effect:** None

**Local implementation status:** Catalog, persistent quote, idempotent Square
sandbox checkout, and PII-free checkout status are implemented in the separate
private backend repository. Checkout requires two feature flags and refuses to
run unless `SQUARE_ENV=sandbox`.
**Legacy Gear routes:** Protected and unchanged

This checkpoint converts the Plan 1 API requirements into executable request/response contracts before backend code is changed.

## Versioned routes

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/v1/storefront/{storeId}/catalog` | Customer-safe normalized catalog for one store |
| `POST` | `/v1/cart/quote` | Server-authoritative availability, prices, discounts, shipping, tax state, and totals |
| `POST` | `/v1/checkout/session` | Idempotent checkout creation from an eligible, unexpired quote |
| `GET` | `/v1/checkout/{sessionId}` | Customer-safe checkout status |

The OpenAPI contract is [../contracts/commerce-api-v1.openapi.json](../contracts/commerce-api-v1.openapi.json). Operational decisions are pinned in [../contracts/commerce-api-v1-decisions.json](../contracts/commerce-api-v1-decisions.json).

## Customer request boundary

The quote request sends only:

- `storeId`
- `currency`
- Optional observed `catalogVersion`
- Optional promo code
- Client line ID, public product ID, public variant ID, and quantity

It does not send a trusted price, Square variation ID, provider response, or legacy `Color__Size` identity. The backend resolves public variant IDs through the private provider mapping created by the store-aware compatibility layer.

## Quote rules

- Quotes expire after 15 minutes.
- Maximum 50 lines and 25 units per line.
- Prices and all totals use integer minor units.
- The response names the exact store and catalog version used.
- Unavailable items and catalog/price changes are explicit.
- Checkout is allowed only when `checkoutEligible` is true.
- Shipping and tax state are explicit: not calculated, estimated, or final.

## Checkout idempotency

`POST /v1/checkout/session` requires an `Idempotency-Key` header between 16 and 128 safe characters.

Keys are scoped by `(storeId, Idempotency-Key)`. The canonical request contains exactly `storeId`, `quoteId`, `successUrl`, and `cancelUrl`, serialized with RFC 8785 JSON canonicalization and hashed with SHA-256.

For 24 hours:

| Situation | Required result |
|---|---|
| Same key + same canonical request | Return the original session; no second provider call |
| Same key + different canonical request | `409 IDEMPOTENCY_CONFLICT`; no second provider call |
| Concurrent same key + request | Serialize creation; exactly one provider call |
| Key older than retention window | A new session may be created |

The crash-safe creation sequence is:

1. Insert a pending record under a database uniqueness constraint.
2. Commit the canonical request hash and a deterministic provider idempotency key derived from contract version, store ID, and the client key.
3. Call Square using that deterministic provider key.
4. Persist the customer-safe session response.
5. If a worker stops during creation, retry with the same provider key so Square cannot create a second payment-link operation.

An in-memory lock alone is insufficient across multiple workers or restarts.

## Error and security rules

- Every response carries an `X-Request-Id`; structured errors also include `requestId` in the body.
- Error codes are stable and machine-readable.
- Public errors never contain raw provider responses, access tokens, exception strings, or stack traces.
- Public checkout session IDs require at least 128 bits of entropy, and the status response contains no customer PII.
- Success and cancel redirects must match the exact allowlist for the selected store.
- Store ID, product ID, variant ID, quantity, currency, quote expiry, and checkout eligibility are validated server-side.
- Rate limiting is required for quote and checkout routes before production exposure.

## Compatibility rule

The `/v1` implementation is additive. It must not rename, redirect, or change response shapes for:

```text
/api/health
/api/square/bootstrap
/api/square/checkout
/api/webhooks/square
/api/ops/db
```

Gear continues to use its verified Plan 1A legacy path until a separate migration release passes parity and rollback gates.

## Automated gate

Run:

```bash
npm run audit:commerce-v1-contract
```

The audit validates all fixtures and checks quote arithmetic, currency consistency, provider-data exclusion, store/quote binding, redirect policy, route separation, and all four idempotency scenarios.

## Next implementation checkpoint

Implement these contracts in a private, versioned backend repository using:

1. Read-only Gear catalog adapter first.
2. Persistent quote storage with catalog/store version references.
3. Persistent idempotency records with a uniqueness constraint.
4. Square sandbox payment-link adapter.
5. Non-fulfilling signed webhook test path.
6. Legacy route regression tests executed unchanged beside `/v1` tests.

Do not deploy `/v1` to the production API until the sandbox and backend rollback artifacts exist.
