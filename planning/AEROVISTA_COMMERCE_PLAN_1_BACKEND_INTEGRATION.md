# AeroVista Commerce Plan 1

## Strengthen the Current Gear Store and Create the Multi-Store Commerce Foundation

**Mode:** Controlled, additive change  
**Primary rule:** Keep the current Gear storefront and commerce path operational while new capabilities are added beside it  
**Scope:** Production baseline, backend contract, store-aware catalog data, multi-store operator console, shared storefront core, media handling, cart quoting, checkout, security, tests, and rollback  
**Related storefront release:** Plan 1A makes Gear commerce-first after this plan's Phase 0 safety gate and before Horizon adopts the shared storefront pattern  
**Out of scope:** Unrelated Gear rebranding beyond Plan 1A, destructive catalog migration, unverified DNS cutover, or removal of the legacy API

## Current Status — July 26, 2026 PT

**Overall:** The multi-store commerce foundation is implemented, isolated,
merged, and passing its current CI gates. Plan 1 is not fully complete because
the shared storefront core, shared media model, and controlled production
`/v1` release remain.

Horizon has advanced independently to a working local static preview. Its
remaining release work is governed by
[`horizon/COMPLETION_PLAN.md`](../horizon/COMPLETION_PLAN.md); that progress
does not itself complete Plan 1’s shared-core or production `/v1` gates.

| Plan area | Status | Current evidence / next boundary |
|---|---|---|
| Phase 0 — baseline and safety | Substantially complete | Plan 1A is live and recoverable; clean implementation repositories are merged; production catalog/release evidence is recorded. The original NAS worktree remains dirty and behind remote, and any historically documented broad credential must be rotated before the production `/v1` release. |
| Phase 1 — existing contract | Complete | Sanitized legacy fixtures and regression coverage protect the current Gear `/api/*` behavior. |
| Phase 2 — store-aware schemas | Complete for foundation | Gear and Horizon fixtures validate through the normalized contract without changing production Gear files. |
| Phase 3 — multi-store console | Gate passed | The private console supports Gear (live/default) and Horizon (draft) workspaces. Horizon cannot write Gear artifacts or invoke the Gear publisher. Four isolation tests pass. The NXCore Horizon directory was last verified empty on July 25; the current Horizon runtime is maintained separately under root `horizon/`. |
| Phase 4 — versioned API | Sandbox gate passed | Catalog, quote, idempotent checkout, PII-free status, signed webhooks, and PostgreSQL rate limits pass for Gear/Horizon in the unpublished NXCore sandbox. Production `/v1` is not deployed. |
| Phase 5 — shared storefront core | Pending | Root `horizon/` is now a working standalone local preview with eight visible works and a gated cart, but a sanitized production artifact and independent Gear/Horizon previews have not been generated from one maintained shared core. |
| Phase 6 — shared media | Pending | Workspace image isolation exists, but the shared asset-ID/rendition library and migration path are not implemented. |
| Phase 7 — security/operations | In progress | Scoped catalog credentials, audited dependencies, source-attribution code, rollback evidence, merged repositories, and Node 24 CI maintenance are complete. The Cloudflare-to-Traefik `/v1` router, public health-payload redaction, and broader production hardening remain a controlled release. |
| Phase 8 — verification | Foundation gates passed | Backend/console/public contract gates are green at main heads `f9c28d6`, `b791bbf`, and `82b363f`; 58 backend tests and the recorded dependency/migration/sandbox/isolation checks pass. Shared-core visual/accessibility and production ingress gates remain. |

Current protected-state facts:

- `gear.aerovista.us`, `about.html`, API health, and same-origin checkout
  bootstrap return `200`; live build `2026-07-21-commerce-first-1a` prefers
  `storedVid || mappedVid`.
- Production Gear remains on the legacy `/api/*` path; the public
  `/v1/stores` request currently returns a same-URL `301`, so no `/v1` customer
  traffic is authorized.
- The live production catalog hash still matches the protected baseline. The
  live overlay hash reflects the later Plan 1A artifact and is recorded in the
  readiness report; the older overlay hash must not be reported as current.
- Public `/api/health` still discloses credential-presence flags and the full
  allowed-origins list (including one internal origin); redaction is folded
  into the Phase 7 production ingress release.
- PostgreSQL, fulfillment, and reconciliation workers were not restarted by
  the sandbox/dependency work.
- Detailed implementation and rollback evidence is in the private backend
  handoff `HANDOFF_2026-07-22.md`.

## 1. Outcome

Strengthen the commerce system that already powers `https://gear.aerovista.us`, then extend it so Horizon and future AeroVista storefronts can use the same catalog operations, checkout, fulfillment, and shared frontend source without becoming tightly coupled deployments.

The target is not one customer-facing store with every product line mixed together. The target is:

- One private, multi-store operator console
- One normalized commerce API and checkout system
- One shared storefront source package
- One shared media library
- Independently branded and independently deployable customer storefronts
- Separate store configurations, catalogs, carts, release records, and rollback paths

The first supported stores are:

- `aerovista-apparel` — current Gear storefront
- `horizon` — aerial art, prints, canvas, and related visual products

The model must allow additional stores without copying the operator console, checkout service, or maintained storefront source.

## 2. Current Production Baseline

The implementation must begin from the current working system rather than from the earlier conceptual architecture.

| Surface | Current implementation | Protection requirement |
|---|---|---|
| Gear storefront | `store/index.html`, catalog JSON, overlay JSON, and `store/img/` | Remains customer-facing until an explicitly verified replacement is ready |
| Gear hosting | Cloudflare-proxied `gear.aerovista.us` with GitHub Pages as the static origin | No DNS or origin change during backend/console foundation work |
| API proxy | Cloudflare Worker routes `gear.aerovista.us/api/*` to `api.aerovista.us/api/*` | Keep working until the selected production API routing pattern is verified |
| Commerce API | Flask/Gunicorn on NXCore with legacy `/api/*` routes | Add versioned routes; do not remove or change existing responses in place |
| Catalog | `store/square_products_latest.json` plus `storefront_overlay.json` | Square/provider identifiers and current visibility remain intact |
| Operator console | Private `console/` v2 at `store-console.aerocoreos.com` | Extend to multiple stores; do not create a second unrelated console |
| Fulfillment | Square webhooks, Postgres jobs, and Printful workers | Preserve signature verification, order reconciliation, and existing jobs |
| Deployment | GitHub Actions for Gear; manual NXCore backend deployment | Record exact release and rollback procedures before changing them |

Known production safety work, including the local correction that prefers a cart-stored Square variation ID over a colliding cart-key mapping, must be handled as an isolated stabilization release before the shared-platform refactor.

## 3. Non-Negotiable Safety Rules

1. Gear is the protected baseline. Every phase must leave the last verified Gear release deployable.
2. Do not perform a big-bang replacement of storefront, console, API, hosting, or catalog storage.
3. Add new `/v1` API routes beside the current `/api/*` routes.
4. Do not change existing API response shapes until all current callers have migrated.
5. Do not destructively rewrite Square IDs, Printful mappings, order history, webhook history, or fulfillment jobs.
6. Never put API keys, provider credentials, operations tokens, database passwords, or private provider data in public files or operator documentation.
7. The backend is authoritative for sellability, price, discounts, shipping eligibility, tax, and checkout totals.
8. Every mutation and deployment must be scoped to an explicit `storeId`.
9. Gear and Horizon carts remain separate until mixed-store shipping, returns, taxes, and fulfillment are explicitly designed and tested.
10. Shared source does not mean shared release fate. Each storefront must be deployable and reversible independently.
11. New media storage must preserve current image URLs until redirects or catalog migrations are verified.
12. No production checkout test may create a charge or fulfillment order without explicit authorization.

## 4. Target Architecture

```text
Private operator
      |
      +-- Multi-store Catalog Console
      |       +-- select store
      |       +-- products / variants
      |       +-- images / media
      |       +-- collections / merchandising
      |       +-- validate / preview / deploy / rollback
      |
      +-- AeroVista Commerce API
              +-- store-aware catalog adapter
              +-- authoritative cart quote
              +-- checkout session
              +-- Square adapter
              +-- fulfillment adapters
              +-- webhooks / orders / operations

Customer storefronts
      |
      +-- gear.aerovista.us
      |       +-- shared storefront core
      |       +-- Apparel config and theme
      |       +-- Apparel catalog channel
      |
      +-- Horizon hostname
              +-- shared storefront core
              +-- Horizon config and theme
              +-- Horizon catalog channel

Shared media delivery
      +-- stable asset IDs
      +-- responsive renditions
      +-- store/product assignments
```

Recommended source layout:

```text
apps/
├── gear/
│   ├── store.json
│   ├── theme.css
│   └── metadata.json
└── horizon/
    ├── store.json
    ├── theme.css
    └── metadata.json
packages/
├── storefront-core/
├── catalog-contract/
├── cart/
└── ui/
services/
└── commerce-api/
stores/
├── aerovista-apparel/
└── horizon/
console/
media/
tests/
```

This is a target layout, not permission to move the current `store/` or `console/` directories before compatibility adapters and tests exist.

## 5. Core Data Concepts

Use distinct concepts consistently:

In this plan, **Catalog Console** means the private operator control page under `console/` that manages products, images, overlays, validation, and deployment. **Storefront catalog** means the product data exposed to a customer-facing store. They are related, but they are not the same interface.

- **Storefront:** Customer-facing hostname, identity, theme, metadata, cart namespace, and release target.
- **Store:** Stable operational identifier such as `aerovista-apparel` or `horizon`.
- **Product:** A sellable concept such as a hoodie design or aerial photograph.
- **Variant:** A specific purchasable combination of options, provider mapping, price, and availability.
- **Collection/product line:** A customer-facing grouping within a store, such as Shadow Wear or Limited Editions.
- **Channel assignment:** Controls whether and how a product appears in a store without duplicating the product or provider mapping.
- **Media asset:** A reusable image identified independently from its physical filename or delivery URL.

Tabs are appropriate in the private console and for collections within a storefront. Gear and Horizon should remain separate customer storefront identities unless a later product decision intentionally creates a combined AeroVista marketplace.

## 6. Phase 0 — Stabilize and Freeze the Baseline

Before platform development:

1. Review, deploy, and smoke-test the isolated Gear variation-ID correction, or disable checkout if product integrity cannot be assured.
2. Give the stabilization release a new immutable release identifier; do not reuse the current build ID.
3. Reconcile the dirty worktree and the local commit ahead of `origin/main` into an intentional branch or verified source snapshot.
4. Capture checksums for the live Gear HTML, catalog, overlay, checkout-ready keys, and image manifest.
5. Back up the current public artifact, catalog files, overlay, database, backend image/container version, and Cloudflare Worker configuration.
6. Inventory ignored backend source and establish a canonical private repository or versioned release archive.
7. Remove plaintext operational credentials from working documentation and scripts, rotate exposed credentials, and move secrets to an approved secret store.
8. Record owners for Gear storefront, operator console, commerce API, Square, fulfillment, Cloudflare, DNS, and AVCC.
9. Record the exact commands and access required to restore the current Gear storefront and API.
10. Use a local-drive or Linux worktree for builds; document the current Windows UNC-path limitation for `npm` commands.
11. Reconcile the current console mount (`../store`) with the canonical checkout catalog at the storefront root; until that is complete, production publishing must fail closed instead of reporting a successful write to a non-canonical path.
12. Give the console a console-only authentication secret and, separately, a catalog-publish-only backend credential. Never inject `backend/.env` or the general operations secret into the console container.

Deliverable:

- `CURRENT_GEAR_PRODUCTION_BASELINE.md`
- Verified rollback artifact and commands
- Clean implementation branch

Gate 0 passes when the current Gear checkout is safe, the production state can be reproduced, and the team can restore it without relying on undocumented local files.

## 7. Phase 1 — Capture the Existing Commerce Contract

Document the behavior that existing callers depend on.

Tasks:

1. Inventory all catalog, bootstrap, checkout, order, operations, webhook, health, image, and fulfillment routes.
2. Capture sanitized request and response examples, status codes, error shapes, and required headers.
3. Record the path from the static Gear files through the Cloudflare `/api` Worker to NXCore.
4. Document CORS origins, CSP connections, provider return URLs, webhook endpoints, and rate limits.
5. Document current cart keys, stored `variationId`, Square variation mappings, catalog fallbacks, promo rules, shipping behavior, and checkout redirect behavior.
6. Record which fields are authoritative in Square and which are presentation data from the overlay/console.
7. Document the current fulfillment and reconciliation behavior, including failure and replay handling.
8. Add regression fixtures for current Gear products, cart-key collisions, hidden products, missing images, and invalid variants.

Deliverable:

- `CURRENT_COMMERCE_API_CONTRACT.md`
- Sanitized Gear regression fixtures

Gate 1 passes when automated tests can detect a regression in the current Gear contract before new routes are added.

## 8. Phase 2 — Define Store-Aware Schemas and Compatibility Storage

Create schemas that support Gear, Horizon, and future stores while preserving the current Gear files during migration.

Minimum store configuration:

```json
{
  "store": {
    "id": "aerovista-apparel",
    "name": "AeroVista Apparel",
    "hostname": "gear.aerovista.us",
    "theme": "aerovista-apparel",
    "currency": "USD",
    "locale": "en-US",
    "cartNamespace": "aerovista-apparel"
  },
  "catalog": {
    "channel": "aerovista-apparel",
    "defaultSort": "featured"
  },
  "api": {
    "catalogPath": "/v1/storefront/aerovista-apparel/catalog",
    "quotePath": "/v1/cart/quote",
    "checkoutPath": "/v1/checkout/session"
  }
}
```

Generic product contract:

```json
{
  "id": "stable-public-product-id",
  "slug": "public-product-slug",
  "title": "Product title",
  "description": "Customer-safe description",
  "collections": ["shadow-wear"],
  "media": [{ "assetId": "asset-id", "alt": "Description" }],
  "optionGroups": [
    { "id": "size", "label": "Size", "values": ["S", "M", "L"] }
  ],
  "variants": [
    {
      "id": "stable-public-variant-id",
      "sku": "merchant-sku",
      "options": { "size": "M" },
      "price": 5999,
      "currency": "USD",
      "availability": "available"
    }
  ]
}
```

Tasks:

1. Create JSON Schemas for store configuration, normalized catalog, overlay/merchandising, and media manifest.
2. Support generic option groups; do not hard-code only Apparel size/color or Horizon print dimensions.
3. Add store/channel assignment without copying provider IDs.
4. Store money as integer minor units.
5. Keep sensitive provider identifiers behind the API when they are not required by the browser.
6. Add explicit visibility and availability states.
7. Add catalog version, store version, and media version fields.
8. Build a compatibility reader that can normalize the current Gear JSON without changing it.
9. Build a compatibility writer only after round-trip tests prove it preserves required Gear fields.
10. Validate both Gear and Horizon fixtures in CI.

Gate 2 passes when the current Gear data can be read through the new schema without changing the production files, and Horizon fixtures validate through the same model.

## 9. Phase 3 — Convert the Operator Console to Multi-Store

Extend the existing private `console/` v2 rather than creating a second console.

Recommended console navigation:

```text
Active Store: [ AeroVista Gear ] [ Horizon ] [ + Future Store ]

Products | Images | Collections | Overlay | Validation | Preview | Deploy | History
```

Tasks:

1. Add an explicit active-store selector sourced from a store registry.
2. Scope every catalog, overlay, image, validation, preview, deploy, and rollback operation to `storeId`.
3. Preserve the current Gear console paths through a compatibility adapter during migration.
4. Show a persistent store name, hostname, environment, catalog version, and deployment target.
5. Visually distinguish stores to reduce accidental cross-store edits.
6. Require production deploy confirmation that names the store, hostname, catalog version, and target release.
7. Add separate Preview and Production actions.
8. Add per-store validation summaries and block deployment on schema or provider-mapping failures.
9. Add release history with operator, timestamp, input checksum, output checksum, target, result, and rollback artifact.
10. Permit controlled reuse of a media asset across stores without copying the file.
11. Add store-aware console routes:

```text
GET  /api/stores
GET  /api/stores/{storeId}/catalog
GET  /api/stores/{storeId}/media
POST /api/stores/{storeId}/validate
POST /api/stores/{storeId}/deploy-preview
POST /api/stores/{storeId}/deploy-production
POST /api/stores/{storeId}/rollback
```

12. Keep console authentication and write operations private; do not expose them through the public storefront API. The console container must receive only console-scoped authentication and catalog-publish credentials, never payment, fulfillment, database, webhook, or general operations secrets.
13. Route all production publishes to the canonical store-aware catalog service. A writable compatibility file mount may be retained only when it is the same source consumed by checkout and has backup, validation, and atomic replacement semantics.

Gate 3 passes when the console can load, edit, validate, preview, and produce separate artifacts for Gear and Horizon without one store overwriting the other.

## 10. Phase 4 — Add the Versioned Commerce API

Add the new API beside the current implementation.

Required public routes:

```text
GET  /v1/storefront/{storeId}/catalog
POST /v1/cart/quote
POST /v1/checkout/session
GET  /v1/checkout/{sessionId}
```

Tasks:

1. Normalize the current Gear catalog through an adapter; do not replace the legacy loader first.
2. Validate `storeId`, product IDs, variant IDs, quantities, currency, promo codes, and redirect targets server-side.
3. Return authoritative product price, discounts, shipping, taxes when available, unavailable items, price changes, and final total from the quote endpoint.
4. Create checkout sessions only from a valid unexpired quote or equivalent server-side recomputation.
5. Accept a client-generated idempotency key, persist the result, and return the original result for safe retries.
6. Keep provider IDs and credentials server-side unless a public provider identifier is strictly required.
7. Return structured errors containing a stable code, customer-safe message, request ID, and optional field details.
8. Do not return raw provider responses or internal exception strings to the browser.
9. Add catalog and store versions to quotes, checkout records, orders, webhooks, and logs.
10. Preserve and test Square webhook signature verification and fulfillment job creation.
11. Add rate limiting and abuse controls to quote, checkout, and operations endpoints.
12. Maintain the legacy `/api/square/bootstrap` and `/api/square/checkout` routes until the current Gear frontend has migrated and the deprecation window is approved.

Gate 4 passes when current Gear regression tests pass unchanged and both Gear and Horizon fixtures can complete catalog → quote → sandbox checkout through `/v1`.

## 11. Phase 5 — Extract the Shared Storefront Core

Do not rewrite the live Gear storefront in place. Build the shared core in parallel and prove parity at a preview origin.

Tasks:

1. Extract semantic layout, product rendering, modal behavior, cart, filters, sorting, error states, and checkout integration into maintained shared modules.
2. Extract Gear-specific copy, metadata, theme values, collection definitions, policy content, and feature flags into Gear configuration and theme files.
3. Create Horizon configuration and theme fixtures using the same interfaces.
4. Generate separate deterministic build artifacts from the shared source.
5. Allow store-specific page metadata, canonical URL, social image, robots rules, sitemap, favicon, CSP, and redirects.
6. Keep storefront storage namespaced by `storeId`.
7. Resolve a purchasable variant only after every required generic option is selected.
8. Replace browser-calculated checkout totals with the backend quote.
9. Add loading, empty, unavailable, retry, stale-quote, and partial-media states.
10. Preserve keyboard operation, modal focus trap, Escape behavior, focus return, cart focus management, and live-region announcements.
11. Safely assign API content; do not interpolate untrusted HTML.
12. Use the approved Plan 1A commerce-first Gear release as the parity reference. Further redesign work requires a separate approved scope.

Gate 5 passes when the shared maintained source can generate independent Gear and Horizon preview artifacts, and the Gear preview passes visual and functional parity tests against the verified Plan 1A production release. This gate does not move live Gear onto the shared core.

## 12. Phase 6 — Introduce Shared Media Management

Media migration must be incremental and may follow the first API/console release if necessary.

Tasks:

1. Define a media manifest with stable asset ID, source checksum, MIME type, dimensions, alt text, focal point, ownership, and store/product assignments.
2. Keep logos, icons, and small source-controlled design assets in the repository.
3. Move product photography and generated renditions to approved object storage/CDN storage.
4. Prefer immutable, content-addressed filenames without spaces or case-dependent naming.
5. Generate a controlled set of renditions for thumbnail, card, modal, hero, and social usage.
6. Use responsive `srcset`/`sizes`, lazy loading, explicit dimensions, and automatic modern formats where supported.
7. Preserve current `store/img/` URLs until every production catalog reference has migrated or redirects exist.
8. Add console upload, assignment, alt-text, crop/focal-point, duplicate detection, and orphan detection workflows.
9. Ensure deleting a catalog association does not automatically delete the underlying media object.
10. Back up original media independently from cached renditions.

Gate 6 passes when both stores can reference the same media library safely, current Gear images remain valid, and media rollback is documented.

## 13. Phase 7 — Security and Operations

Tasks:

1. Use exact environment-specific CORS allowlists; remove development and private-IP origins from production unless explicitly required.
2. Decide whether storefront API calls use direct `api.aerovista.us` access or a same-origin Worker proxy, then document one supported production pattern per storefront.
3. Send CSP and other security policies as response headers where possible.
4. Remove unnecessary `unsafe-inline` directives as scripts and styles are extracted.
5. Add HSTS, Referrer Policy, Permissions Policy, content-type protection, and frame restrictions.
6. Add request IDs, structured logs, redaction rules, health checks, and provider-connectivity checks.
7. Do not expose credential-presence flags, complete internal origin inventories, or sensitive operational state publicly unless required.
8. Add alerting for catalog failures, quote failures, checkout creation, webhook rejection, order reconciliation, and fulfillment failures.
9. Define cache policies for HTML, store JSON, API catalogs, media manifests, and immutable assets.
10. Record every deploy and rollback in AVCC.

## 14. Phase 8 — Verification

Required automated coverage:

- Gear legacy API regression tests
- Store/config/catalog/overlay/media schema validation
- Gear and Horizon normalizer fixtures
- Generic option and variant resolution
- Cart namespace and persistence
- Authoritative quote and repricing
- Idempotent checkout retry
- Invalid/sold-out variant handling
- Square sandbox checkout
- Webhook signature and replay behavior
- Fulfillment mapping without production fulfillment
- Console store isolation and deploy-target protection
- CORS and security-header checks
- Broken/missing media behavior
- Deterministic build checks
- Desktop and mobile smoke tests
- Keyboard-only storefront and console tests
- Accessibility checks with an agreed severity threshold

Required Gear parity smoke path:

1. Open the current production storefront and the new Gear preview.
2. Confirm branding, collections, visible products, prices, images, and policies match the approved baseline.
3. Open products with colliding option/cart keys and verify the selected variation remains correct.
4. Add, update, remove, refresh, and restore cart items.
5. Confirm the backend quote replaces browser totals.
6. Start a sandbox checkout and verify the provider URL and variation mappings.
7. Confirm no production fulfillment is triggered.

Required console isolation smoke path:

1. Select Gear and make a preview-only content change.
2. Verify Horizon data and artifact checksums do not change.
3. Select Horizon and repeat the test.
4. Attempt a deliberately invalid product and confirm deployment is blocked only for the active store.
5. Confirm production deployment requires the exact store/target confirmation.

## 15. Deployment and Rollback

Deployment sequence:

1. Complete the isolated Gear safety release.
2. Complete Plan 1A as an isolated Gear presentation release with catalog, checkout, API, fulfillment, DNS, and hosting behavior unchanged.
3. Deploy additive backend contract routes with legacy routes unchanged.
4. Deploy the store-aware console behind existing private access.
5. Generate Gear and Horizon preview artifacts.
6. Verify Gear parity against the Plan 1A release and verify Horizon fixture behavior.
7. Adopt the shared Gear frontend only through a separate, approved release after all parity gates pass.
8. Keep the prior Gear artifact and route available throughout the migration window.

Rollback order:

1. Stop new checkout initiation if pricing or variant integrity is uncertain.
2. Restore the prior storefront artifact for only the affected store.
3. Restore the prior store configuration/catalog artifact.
4. Disable new `/v1` routes or revert the backend image while keeping legacy routes available.
5. Restore console compatibility mode if multi-store operations fail.
6. Restore database state only from a verified backup and only when an actual data migration requires it.
7. Preserve failed artifacts and logs for investigation.

## 16. Completion Criteria

Plan 1 is complete when:

- The current Gear storefront has no known product/variation integrity defect.
- The commerce-first Gear presentation release in Plan 1A is verified and recoverable without changing the existing commerce contract.
- The production baseline, ownership, secrets, source, deployment, and rollback paths are documented.
- The backend is versioned and the existing Gear API behavior has regression coverage.
- Gear and Horizon validate through one store-aware catalog and variant contract.
- The existing operator console manages multiple isolated stores.
- `/v1` catalog, quote, checkout-session, and status routes work in sandbox without breaking legacy routes.
- The shared maintained frontend source generates independent, verified Gear and Horizon preview artifacts; live Gear may remain on the Plan 1A implementation until its separately approved migration.
- Store-specific carts, metadata, themes, deployments, and rollbacks are supported.
- The media model supports shared assets without breaking existing Gear image URLs.
- Security, observability, accessibility, and deterministic-build gates pass.
- AVCC records owner, store, release, catalog version, API version, evidence, rollback path, and next action.
