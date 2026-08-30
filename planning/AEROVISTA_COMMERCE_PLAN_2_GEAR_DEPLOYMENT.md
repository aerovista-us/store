# AeroVista Commerce Plan 2

## Add Horizon as the Second Storefront and Establish the Repeatable Storefront Launch Process

**Mode:** Controlled, additive launch  
**Dependency:** AeroVista Commerce Plan 1 gates and the Plan 1A Gear commerce-first storefront release must pass  
**Protected production surface:** `https://gear.aerovista.us`  
**Scope:** Horizon onboarding, multi-store console use, preview hosting, commerce integration, launch, Gear protection, and future-store repeatability  
**Out of scope:** Unrelated Gear redesign, combined Gear/Horizon cart, destructive provider migration, or simultaneous multi-domain cutover

> The filename is retained for planning continuity. This revision reflects the actual situation: Gear is already live, and Horizon is the next storefront to add without destabilizing Gear.

## Current Status — July 26, 2026 PT

**Overall:** Horizon now has a public noindex, commerce-gated preview: 9 catalog
records, 10 variants, 8 visible individual works, 2 explicit image
placeholders, 1 hidden bundle, a working bag, and 6 locally verified
Square/Printful route records. Checkout remains intentionally fail-closed with
0 checkout-ready variants. No public host, DNS route, production mapping
import or paid order has been completed. The frontend is deployed from
`aerovista-us/horizon-storefront` GitHub Pages through a Cloudflare Worker
Custom Domain, and the shared NXCore API allows the Horizon origin.

Current Horizon execution truth is maintained in the
[completion plan](../horizon/COMPLETION_PLAN.md),
[deployment SOP](../horizon/DEPLOYMENT_SOP.md), and
[commerce readiness report](../horizon/COMMERCE_READINESS.md). This longer
plan remains architectural background.

### July 26 checkpoint

- The eight individual works render locally from `horizon/catalog.json`.
- `horizon/catalog.generated.js` provides a synchronized fallback when
  `catalog.json` cannot be fetched.
- CDA004 and CDA008 deliberately use non-cartable placeholders until approved
  product media exists.
- CDA-SET-001 remains hidden.
- Checkout activation remains gated on production mappings, evidence, policy
  readiness, and a controlled paid order.

Foundation milestones retained from July 25:

- Plan 1A Gear commerce-first release is live, verified, and recoverable.
- The private operator console supports Gear (live/default) and Horizon
  (draft) with tested cross-store write isolation.
- Horizon draft files use their own persistent catalog, overlay, image, and
  backup roots and cannot call the Gear publisher.
- The normalized Horizon catalog/provider fixture passes `/v1` catalog, quote,
  idempotent Square sandbox checkout, signed webhook, and rate-limit tests in
  the unpublished NXCore sandbox.
- The backend, console, and public contract foundation PRs plus their Node 24
  maintenance PRs are merged. Current main heads are `f9c28d6`, `b791bbf`, and
  `82b363f`; their latest CI gates are green.
- Horizon presentation direction selected (July 24): the "Horizon Canvas
  Gallery" demo was chosen and ported to a dependency-free static artifact
  (`horizon/` in the NAS worktree) — seven retained works, collection
  filters, artwork
  modal, size/finish options, and room view — as the theme/content reference
  for the shared storefront core. It is a design reference, not the deployable
  shared-core package.
- Five visual-design placeholders (Lake Silence, Emerald Divide, Alpine
  Current, Copper Earth, and River Memory) were removed from the canonical
  Horizon shell and its asset directory. The seven remaining works use a
  rebalanced responsive gallery layout.
- Four vendor-rendered canvas mockups have checksum-backed intake records.
  Reconciliation against five Square export rows produced three
  high-confidence matches, one provisional generic Canvas match, and one
  unmatched Center Clock record.
- Horizon's provider roles were selected July 25: Printful for production,
  printing, fulfillment, and shipping; Square for payment processing.
  AeroVista's backend remains authoritative for customer price, sellability,
  quotes, and checkout totals.
- An unsigned artwork-rights register and attestation template now provides
  the approval path. It does not confirm ownership until the source masters,
  authors, rights basis, and signed private record are supplied.
- AeroVista LLC is selected as the Horizon artwork rights holder and commercial
  operator; Horizon is a division/brand, not a separate legal owner. The
  internal capture operator declared personal capture of all listed works,
  with no third-party contributors/licensed elements and no prior exclusive
  licenses or competing ownership claims. Individual attribution is
  internal-only and must not appear in customer content. The company
  work-made-for-hire/assignment instrument, source-master checksums, capture
  dates, artwork-specific visual-rights reviews, and private signature remain
  open.
- The reported artwork workflow is creator-operated drone capture, SD-card
  transfer to PC, occasional creator editing, Printful upload, and storefront
  sale. The strengthened intake path preserves untouched originals and
  checksum-links each original, final print master, Printful mapping, and
  Square variation.
- The NXCore Horizon workspace directory exists behind the private
  multi-store console, but it currently contains no catalog, overlay, or media
  files. Candidate assets remain local planning evidence only.

Remaining work is tracked as approval-gated phases:

1. Build and audit a sanitized public release artifact.
2. Finish rights, product-media, pricing, and proof acceptance.
3. Publish an isolated preview without checkout activation.
4. Back up, import, and audit the production Square and Printful mappings.
5. Complete one controlled paid order and verify the full event chain.
6. Attach `horizon.aerovista.us`, publish policies, and complete post-launch
   monitoring.

See the [Horizon completion plan](../horizon/COMPLETION_PLAN.md) for owners,
gates, evidence, and the definition of complete.

The shared console and backend sandbox shorten Plan 2, but they do not authorize
a Horizon production launch or a live Gear migration to the shared core.

## 1. Outcome

Launch Horizon as an independently branded storefront using the shared AeroVista commerce foundation while the current Gear store remains available and recoverable.

The completed production shape will provide:

- `gear.aerovista.us` — AeroVista Apparel/Gear
- An approved Horizon hostname — Horizon aerial art and visual products
- One private multi-store operator console
- One versioned catalog, quote, checkout, order, webhook, and fulfillment system
- One shared storefront source package
- Separate configuration, theme, metadata, catalog channel, cart, deployment, and rollback per store
- A documented template for adding later AeroVista storefronts

## 2. Guiding Decisions

In this plan, the **Catalog Console** is the private operator page in `console/`; references to a storefront catalog mean only the customer-facing product data produced for a particular store.

1. Gear and Horizon are separate customer storefronts, not top-level tabs in one public catalog.
2. Product-line tabs or collection navigation may be used within each storefront.
3. The operator console is the shared tabbed/store-aware catalog and media control surface.
4. Horizon is a separate deployment built from shared source, not a copied standalone codebase.
5. Gear remains on its verified Plan 1A commerce-first release until a later shared-core migration is separately approved.
6. Horizon launch must not require changing Gear DNS, Gear catalog paths, Gear checkout routes, or Gear fulfillment mappings.
7. Storefront hosting must be appropriate for production commerce and support independent preview deployments, security headers, custom domains, and rollback.
8. Horizon uses Printful for product production, printing, fulfillment, and
   shipping, and Square for payment processing. The AeroVista backend owns
   sellability and price authority; provider identifiers remain private
   variant mappings.

## 3. Production Shape

```text
Operator
   |
   +-- store-console.aerocoreos.com
           +-- Gear workspace
           +-- Horizon workspace
           +-- future store workspaces

Customers
   |
   +-- gear.aerovista.us
   |       +-- Gear release
   |       +-- Apparel config/theme/catalog/cart
   |
   +-- Horizon hostname
           +-- Horizon release
           +-- Horizon config/theme/catalog/cart

Both storefronts
   +-- api.aerovista.us `/v1`
   +-- shared media domain
   +-- Square-hosted checkout
   +-- store-aware order and fulfillment records
```

## 4. Preconditions

Do not begin Horizon production launch until all are true:

- Plan 1 stabilization and contract gates pass.
- The Plan 1A Gear commerce-first release is live, verified, and recoverable.
- The Gear rollback artifact has been tested.
- Gear legacy API regression tests pass.
- The multi-store console prevents cross-store writes and deployments.
- Horizon store configuration and catalog fixtures validate.
- The Horizon product/variant/provider mapping is complete.
- Every published artwork has a checksum-backed print master and completed
  rights record linked to a privately retained signed attestation or agreement.
- Horizon shipping, returns, support, tax, and fulfillment language is approved.
- Horizon sandbox checkout and non-production fulfillment tests pass.
- A Horizon preview deployment exists on an isolated target.
- Storefront, API, media, DNS, payment, fulfillment, and AVCC owners are recorded.
- The Horizon hostname and hosting target are explicitly approved.

## 5. Phase 0 — Define the Horizon Commerce Model

Inventory the existing Horizon prototype and define what is actually sellable.

Tasks:

1. Treat root `horizon/` as the canonical static design source, retain
   `planning/canvas/` as provenance and catalog/media intake evidence, and
   treat `planning/horizon gallary/` as superseded reference material.
2. Confirm the approved Horizon public name, hostname, contact address, and legal/business identity.
3. Define Horizon product types, such as canvas, fine-art print, metal print, digital product, or limited edition.
4. Define generic option groups for each product type, such as size, material, frame, orientation, or finish.
5. Configure the selected provider roles: Square for payment processing and
   Printful for production, printing, fulfillment, and shipping.
6. Preserve backend authority for customer price, sellability, quotes, and
   checkout totals; map Printful availability and fulfillment identifiers
   without exposing them as public product identity.
7. Define stable public product and variant IDs and private provider mappings.
8. Identify the initial collections and customer navigation.
9. Approve shipping, damage, return, edition, authenticity, licensing, and contact language.
10. Decide whether Horizon uses the shared media domain from launch or begins with compatible static URLs that can migrate later.

Deliverable:

- `HORIZON_STORE_DEFINITION.md`
- `horizon/evidence/HORIZON_CATALOG_RECONCILIATION.md`
- `horizon/evidence/HORIZON_ARTWORK_RIGHTS_ATTESTATION.md`
- Validated Horizon product and variant fixtures
- Approved, checksum-backed source-artwork and product-mockup assignments with
  a signed private chain-of-rights record

Gate 0 passes when no public Horizon product depends on placeholder price, option, image, policy, or fulfillment behavior.

## 6. Phase 1 — Create the Horizon Store Package

Create Horizon as a new store configuration using the shared schemas and frontend core.

Recommended package:

```text
apps/horizon/
├── store.json
├── theme.css
├── metadata.json
├── redirects.json
└── policy-content.json
```

Tasks:

1. Create `horizon` store configuration with hostname, currency, locale, cart namespace, catalog channel, API routes, and support links.
2. Create the Horizon theme using the approved visual direction.
3. Move Horizon copy, navigation, trust statements, FAQ, shipping, returns, and contact content into validated configuration.
4. Configure Horizon collections and filters without adding Horizon-specific branches to shared cart or checkout code.
5. Use the Plan 1A commerce-first information architecture: compact hero, immediate featured products, collections, trust content, then story.
6. Configure product option presentation through generic `optionGroups`.
7. Add canonical URL, metadata, social image, favicon, robots rules, and sitemap generation.
8. Add controlled redirects for any existing Horizon product/gallery URLs that should be retained.
9. Generate a deterministic Horizon deploy artifact from shared source.
10. Confirm the Horizon artifact contains no Gear-only copy, products, images, catalog identifiers, or cart keys.

Gate 1 passes when the Horizon package builds without modifying shared source or the current Gear artifact.

## 7. Phase 2 — Onboard Horizon in the Operator Console

Tasks:

1. Register Horizon in the console store registry.
2. Create a clearly identified Horizon workspace and visual indicator.
3. Import or create the Horizon catalog through the normalized schema.
4. Assign media assets, alt text, focal points, collections, visibility, and featured ordering.
5. Map every sellable Horizon variant to its payment and fulfillment provider identifiers.
6. Validate that Gear product counts, catalog checksum, overlay checksum, media assignments, and deploy artifact remain unchanged.
7. Test Horizon preview deployment from the console.
8. Test validation failures, cancellation, and Horizon-only rollback.
9. Record all Horizon preview releases in AVCC.

Gate 2 passes when an operator can manage Horizon independently and cannot accidentally deploy Horizon data to Gear.

## 8. Phase 3 — Prepare Isolated Horizon Hosting

Use a hosting target separate from the current Gear production origin.

Recommended characteristics:

- Commerce-appropriate terms and operational limits
- Custom-domain and managed TLS support
- Immutable or atomic deployments
- Unique preview URLs
- Response security headers
- Explicit redirects and real 404 behavior
- Independent rollback
- Static asset caching and API route control

Because AeroVista already uses Cloudflare, a dedicated Cloudflare Workers Static Assets deployment is the preferred initial target unless another hosting decision is approved.

Tasks:

1. Create a dedicated Horizon deployment target with no Gear hostname attached.
2. Deploy the Horizon artifact to a unique preview URL.
3. Configure HTML and store JSON for revalidation or short-lived caching.
4. Configure fingerprinted JavaScript, CSS, and images for long-lived immutable caching.
5. Configure CSP, HSTS, Referrer Policy, Permissions Policy, content-type protection, and frame restrictions.
6. Configure real `404.html`, robots behavior, sitemap, canonical URL, and social-image paths.
7. Configure only the required API and media origins.
8. Keep preview access controlled when products, pricing, or policies are not ready for public use.
9. Record deployment command, artifact checksum, target identifier, and rollback command.

Gate 3 passes when the Horizon preview is independently healthy and no request or deployment has changed Gear.

## 9. Phase 4 — Connect Horizon to the Shared Commerce API

Tasks:

1. Configure Horizon to request only the `horizon` catalog channel.
2. Add the exact Horizon preview origin to the sandbox/test API allowlist.
3. Verify catalog version, product IDs, generic variants, pricing, availability, and media.
4. Quote carts through `/v1/cart/quote`; do not trust browser totals.
5. Create checkout sessions through `/v1/checkout/session` using persisted idempotency keys.
6. Validate provider redirect and return URLs against an exact allowlist.
7. Verify expired quotes, repricing, unavailable variants, and duplicate checkout retries.
8. Verify Square sandbox order creation or the approved provider sandbox equivalent.
9. Verify webhook processing and store-aware order records.
10. Verify fulfillment routing in non-production mode without submitting a live production order.
11. Confirm Horizon events, logs, and failures are distinguishable from Gear by `storeId`.

Gate 4 passes when Horizon completes catalog → variant → quote → sandbox checkout → webhook → non-production fulfillment without touching Gear orders or mappings.

## 10. Phase 5 — Horizon Pre-Launch Verification

Functional checks:

- Correct Horizon identity, theme, copy, policies, products, options, and media
- No Gear branding or Gear catalog leakage
- Filters, sorting, product details, option resolution, cart, quantity, and removal
- Separate Horizon cart namespace
- Authoritative quote and clear repricing behavior
- Sandbox checkout and approved return URL
- Order/webhook store attribution
- Failed fulfillment recovery path

Quality checks:

- Mobile layouts at agreed phone and tablet widths
- Keyboard-only product, modal, cart, and checkout flow
- Screen-reader names and live-region announcements
- No broken media, mixed content, console errors, or blocked CORS calls
- Performance budgets on a throttled mobile connection
- Correct title, description, canonical URL, social image, favicon, robots, sitemap, redirects, and 404
- Security response headers and cache policy

Isolation checks:

- Gear production URL remains healthy
- Gear catalog and overlay checksums remain unchanged
- Gear checkout verification still passes
- Gear API regression suite still passes
- Horizon deploy and rollback commands cannot target Gear without an explicit target change and confirmation

Create a release record containing:

- Store ID and hostname
- Frontend release identifier and artifact checksum
- Store configuration checksum
- Catalog and media versions
- API version
- Hosting target
- Verification timestamp and operator
- Rollback artifact and command

Gate 5 passes only after the release record, verification evidence, and rollback artifact exist.

## 11. Phase 6 — Launch Horizon

Preferred sequence:

1. Confirm the final Horizon artifact on the immutable preview URL.
2. Confirm API, media, checkout provider, and return URLs before DNS changes.
3. Reduce TTL only for the exact Horizon hostname if a DNS record already exists and a change is required.
4. Attach only the approved Horizon hostname to the verified Horizon target.
5. Confirm managed TLS before broad traffic is sent.
6. Run the Horizon production smoke path.
7. Monitor frontend errors, catalog failures, quote failures, checkout creation, webhook processing, order attribution, and fulfillment routing.
8. Leave Gear DNS, Gear hosting, Gear caches, Gear catalog, and Gear deployment untouched.

Production smoke path:

1. Open the Horizon hostname in a clean browser session.
2. Confirm HTTPS, canonical URL, Horizon theme, and current catalog.
3. Open a product and select every required option.
4. Add the resolved variant to the Horizon cart.
5. Refresh and confirm Horizon cart persistence.
6. Change quantity and confirm a fresh backend quote.
7. Start checkout and verify the approved provider URL.
8. Use an authorized low-risk production verification method.
9. Confirm the order is attributed to `horizon`.
10. Confirm webhook, fulfillment mapping, confirmation/return page, and customer communication.

## 12. Horizon Rollback

Rollback triggers include:

- Horizon storefront or TLS unavailable
- Wrong store identity or catalog served
- Catalog, quote, or checkout unavailable
- Incorrect price, option, or provider mapping
- Broken media across material product areas
- Order attributed to the wrong store
- Webhook or fulfillment failure
- Any unexpected Gear regression associated with the launch

Rollback sequence:

1. Stop Horizon checkout initiation if order or pricing integrity is uncertain.
2. Restore the prior Horizon artifact or detach the new Horizon route.
3. Restore the previous Horizon DNS record only if DNS changed.
4. Purge only Horizon cache paths.
5. Disable Horizon catalog visibility through the store registry if required.
6. Verify Gear remains on its prior known-good state.
7. Record the failed Horizon release and evidence in AVCC.
8. Preserve failed artifacts and logs.

Do not use Gear rollback as the default response to a Horizon-only failure.

## 13. Optional Later Phase — Adopt the Shared Core for Gear

Moving Gear from the improved Plan 1A implementation into the shared core, or changing its hosting, is a separate controlled release after Horizon and the shared core are stable.

Tasks:

1. Build Gear from the shared core using the Gear configuration and theme.
2. Run full visual, catalog, cart, checkout, accessibility, security, and performance parity checks.
3. Preserve the current Gear artifact and origin as rollback.
4. Deploy to a Gear preview target.
5. Approve any hosting migration separately from the frontend migration.
6. Prefer an atomic release switch over simultaneous code and DNS changes.
7. Monitor Gear independently after adoption.

This phase must never be treated as an automatic consequence of launching Horizon.

## 14. Future Storefront Onboarding Template

After Horizon is stable, adding a storefront should require only:

1. Allocate a stable `storeId`.
2. Assign owner, hostname, support identity, currency, locale, and policies.
3. Create configuration, theme, metadata, redirects, and cart namespace.
4. Create or assign products, variants, collections, provider mappings, and media in the console.
5. Validate schemas and provider coverage.
6. Create an isolated preview deployment.
7. Add exact preview/production CORS and redirect origins.
8. Complete sandbox quote, checkout, webhook, and fulfillment verification.
9. Create a release and rollback record.
10. Attach the approved hostname and run the production smoke path.

Adding a future store must not require:

- Copying the operator console
- Forking checkout or cart logic
- Copying the commerce API
- Editing another store's catalog
- Sharing another store's cart storage
- Coordinating a simultaneous release of every storefront

## 15. Completion Criteria

Plan 2 is complete when:

- Horizon is live on its approved hostname as an independently branded storefront.
- Horizon is managed through the existing multi-store operator console.
- Horizon uses the shared `/v1` catalog, quote, checkout, order, webhook, and fulfillment path.
- Gear remains verified and recoverable throughout the launch.
- Horizon and Gear have separate configurations, catalogs/channels, carts, artifacts, hostnames, releases, and rollback paths.
- Horizon is built from the shared maintained source, and a verified Gear shared-core preview exists; live Gear may remain on the Plan 1A release until the separately approved Gear migration.
- Shared media can be assigned without duplicating operational workflows.
- Security, metadata, accessibility, mobile, performance, and commerce smoke checks pass.
- AVCC contains the final Horizon release state, owner, versions, evidence, rollback path, and next action.
- The future-store onboarding template has been exercised successfully with Horizon.
