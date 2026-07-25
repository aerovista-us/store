# Commerce API `/v1` Contract Checkpoint

**Contract:** `1.0.0-alpha.1`

**Status:** Isolated checkout, webhook, rate-limit, rollback, dependency, and
console-isolation gates verified

**Production effect:** None

**Local implementation status:** Catalog, persistent quote, idempotent Square
sandbox checkout, and PII-free checkout status are implemented in the separate
private backend repository. Checkout requires two feature flags and refuses to
run unless `SQUARE_ENV=sandbox`.

**NXCore sandbox status:** The private backend is running in the isolated
`aerovista-commerce-sandbox` Compose project on an unpublished private bridge,
with separate PostgreSQL at migration `0006_commerce_rate_limits` and no
fulfillment workers. Catalog, persistent quote, and real Square sandbox
payment-link tests pass for both Gear and Horizon. Each store made exactly one
provider call and passed same-key replay. Independently signed synthetic
`payment.updated` events passed invalid-signature rejection, one-row duplicate
handling, store-specific checkout routing, and zero-order/zero-fulfillment
assertions. Production Compose services remain unchanged.

The sandbox was refreshed from private backend checkpoint `285fb10` with Flask
`3.1.3`, Requests `2.33.0`, and python-dotenv `1.2.2`. All 58 backend tests,
dependency compatibility, repository/migration checks, and `pip-audit` pass;
the audit reports no known vulnerabilities. The refresh used only the
provider-free catalog/quote smoke and did not call Square checkout.

Persistent PostgreSQL rate limits now protect quote, checkout, and webhook
routes with HMAC-only source identifiers. The checkout limit returned `429`
with `Retry-After` and made no provider call. An isolated `0006` → `0005` →
`0006` rehearsal preserved all quote, checkout, webhook, order, and fulfillment
evidence and returned the sandbox API to healthy.
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

## Completed implementation checkpoint

The private, versioned backend now includes:

1. Read-only Gear and synthetic Horizon catalog adapters.
2. Persistent quote storage with catalog/store version references.
3. Persistent idempotency records with a uniqueness constraint.
4. Guarded Square sandbox payment-link adapter.
5. PII-free checkout status.
6. Legacy route regression tests executed unchanged beside `/v1` tests.
7. PII-minimized, duplicate-safe Square sandbox webhook receipts with a
   separate kill switch and signature key.
8. Cross-worker rate-limit counters with no raw source-address persistence.
9. A successful isolated database downgrade/restoration rehearsal.
10. Explicit trusted-proxy source attribution with spoofed-header rejection and
    a prepared, not-yet-deployed Cloudflare-to-Traefik `/v1` router.
11. An isolated multi-store operator console: Gear is the protected live
    workspace; Horizon is draft-only and cannot invoke Gear publication.
12. A dedicated catalog publication credential. The operator console no longer
    requires the broad production operations secret.
13. Audited runtime dependency pins verified locally and in the unpublished
    NXCore sandbox, with a tagged pre-update sandbox rollback image.

## Next implementation checkpoint

Approve and deploy the prepared Cloudflare-to-Traefik source boundary in a
controlled release window, then expose `/v1` with production feature flags still
off and run origin/client-source probes. The current public `/v1/stores` path
returns a same-URL `301` loop, confirming that the new router is not active;
legacy `/api/*`, checkout, and the Gear storefront remain healthy.

Do not deploy or enable the production `/v1` application routes until that
ingress release and a fresh rollback image/database backup are approved.
