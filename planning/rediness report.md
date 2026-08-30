# AeroVista Commerce Readiness Report

**Updated:** July 26, 2026 PT

> The filename is retained for continuity. This report supersedes the July 21
> pre-Phase-0 audit and the July 22 revision.

> **Current Horizon addendum:** the detailed July 25 material below is
> retained as implementation history. Current Horizon runtime and release
> truth lives in the [completion plan](../horizon/COMPLETION_PLAN.md),
> [deployment SOP](../horizon/DEPLOYMENT_SOP.md), and
> [commerce readiness report](../horizon/COMMERCE_READINESS.md).

## Readiness verdict

The multi-store commerce **foundation is implemented, tested, isolated,
merged, and passing its current CI gates**. The working Gear storefront
remains healthy and protected.

The project is **not yet ready to expose production `/v1` traffic or launch
Horizon**. Those are controlled release phases with explicit ingress,
rollback, catalog, provider, hosting, policy, and preview gates.

| Area | Status | Current assessment |
|---|---|---|
| Gear storefront | Green | Plan 1A is live: eight homepage products, one-action product detail, About/policy destinations, collapsed advanced filters, and verified mobile/desktop purchase paths. |
| Gear catalog and checkout | Green | Production catalog, overlay, legacy bootstrap, variation identity, Square checkout, and fulfillment paths remain operational and unchanged by foundation work. |
| Backend foundation | Green / merged | Private versioned source implements store-aware catalog, quote, idempotent sandbox checkout, PII-free status, signed webhooks, and persistent rate limits behind flags. Foundation and Node 24 maintenance PRs are merged. |
| Backend production `/v1` | Amber / not deployed | Existing `/api/*` routes are healthy. Public `/v1/stores` still returns a same-URL `301`; the prepared trusted-source/Traefik release has not been approved or deployed. |
| Operator console | Green for foundation | The private NXCore console supports isolated Gear (live/default) and Horizon (draft) workspaces, and Horizon cannot call the Gear publisher. Its Horizon data directory was last verified empty on July 25; the current local Horizon runtime is maintained separately under root `horizon/`. |
| Scoped catalog credential | Green | Catalog publication uses a dedicated secret; the console no longer requires the broad operations credential. Active environment permissions were tightened. |
| NXCore sandbox | Green | Unpublished API/PostgreSQL Compose project, Square sandbox only, fulfillment disabled, no workers, no Traefik route, and no host-published ports. |
| Dependency/security gate | Green | Flask 3.1.3, Requests 2.33.0, and python-dotenv 1.2.2 pass 58 tests, `pip check`, and `pip-audit` with no known vulnerabilities. |
| Shared storefront core | Amber / pending | Store-aware contracts and fixtures exist. Root `horizon/` is now the canonical dependency-free static design shell, but one maintained commerce core has not yet produced verified independent Gear and Horizon preview artifacts. |
| Shared media model | Amber / pending | Console image roots are isolated; stable shared asset IDs, renditions, assignments, and migration tooling are not complete. |
| Horizon storefront | Amber / public gated preview | The sanitized eight-work GitHub Pages artifact is live at `horizon.aerovista.us` through Cloudflare, with NXCore CORS and `/api/*` verified. It has 2 explicit placeholders, 1 hidden bundle, a working bag, 6 locally verified Square/Printful routes, and 0 checkout-ready variants. No production mapping import or paid order exists yet. |
| Original NAS worktree | Amber / protected | It still contains unrelated tracked and untracked operational changes. Implementation uses clean isolated worktrees/repositories so those changes are not overwritten. |

## Historical baseline — July 25, 2026

- Live non-impact checks re-verified July 23: Gear homepage, About,
  `/api/health`, and same-origin bootstrap return `200`; public `/v1/stores`
  still does not serve customer traffic (same-URL redirect), matching the
  undeployed production `/v1` state.
- Horizon presentation direction selected: the "Horizon Canvas Gallery"
  (Next.js) demo was chosen over the earlier static gallery demo on design
  merit. Its single page was ported to a dependency-free static artifact
  (HTML/CSS/JS — seven retained works, collection filters, artwork modal,
  size/finish
  options, room view) staged for `horizon/` in the NAS worktree, keeping the
  design while avoiding a second frontend stack (Next 16 / vinext / Wrangler /
  Drizzle) that the page did not use.
- Promoted the dependency-free shell to root `horizon/`, parallel to `store/`,
  with seven retained inline artworks, `noindex`, and a preview-only Reserve
  action. It is
  not deployed and does not call catalog, quote, checkout, or fulfillment
  services.
- Checksummed four vendor-rendered canvas mockups and reconciled them against
  five Square export records. The results are three high-confidence matches,
  one provisional generic Canvas match, and one unmatched Center Clock record.
  The export is not safe to import while required fields contain literal `41`
  placeholders and size/provider mappings are missing.
- Recorded Horizon's provider split: Printful handles production, printing,
  fulfillment, and shipping; Square handles payment. AeroVista's backend
  remains authoritative for sellability, prices, quotes, and checkout totals.
- Added an artwork-rights register and attestation template under
  `planning/canvas/`. It is intentionally unsigned and does not clear any
  artwork until source-master checksums, authorship, ownership basis, and a
  signed private record are supplied.
- Recorded AeroVista LLC as the intended artwork rights holder and commercial
  operator, with Horizon treated as a division/brand rather than a separate
  legal owner. The internal capture operator declared personal capture of all
  listed works, with no third-party contributor/licensed element or previous
  exclusive license/ownership claim. No public individual photo credit is
  permitted. The company work-made-for-hire/assignment instrument,
  source-master checksums, capture dates, visual-rights reviews, and private
  signature remain open.
- Recorded the creator-controlled media workflow: drone capture, SD-card
  transfer, occasional editing, Printful upload, and storefront sale. The
  recommended strengthened workflow will retain the untouched originals and
  checksum-link originals, final print masters, Printful products, and Square
  variations.
- Removed five unavailable visual-design placeholders from the canonical
  Horizon gallery and asset directory: Lake Silence, Emerald Divide, Alpine
  Current, Copper Earth, and River Memory. The remaining seven retained
  works now use an alternating, filter-aware layout with more balanced desktop
  spacing and a consistent mobile stack.
- Verified all three foundation and Node 24 maintenance PR sequences are
  merged. Current main heads are backend `f9c28d6`, console `b791bbf`, and
  public contracts/store `82b363f`; latest gates are green.
- Rechecked live and NXCore state: Gear, About, API health, and bootstrap are
  healthy; production `/v1/stores` remains a same-URL `301`; production API is
  healthy, all workers/database are running, the private console is running,
  and the unpublished sandbox API/PostgreSQL containers are healthy.
- Local self-host scripts added for both demos (`serve-canvas-dev.bat`,
  `serve-horizon-static.bat`).
- Watch item for the `/v1` release (Plan 1 Phase 7 task 7): public
  `/api/health` currently returns credential-presence flags (`have: SQUARE_*`)
  and the full allowed-origins list including an internal origin
  (`http://100.115.9.61:8080`). Fold redaction into the production ingress
  release.

## Completed since the original readiness audit

### Gear Plan 1A

- Deployed the commerce-first Gear homepage at `https://gear.aerovista.us`.
- Displays eight purchasable homepage products with names and prices.
- Product details and Add to Bag are reachable from a homepage product in one
  action while required options remain enforced.
- Moved long-form story content to About and provided dedicated FAQ, shipping,
  returns, and contact destinations.
- Collapsed advanced catalog filters under **More Filters**.
- Passed catalog, overlay, storefront, checkout-fix, conversion, desktop, and
  mobile checks with no browser errors or horizontal overflow.
- Preserved distinct Square variation IDs for products sharing a display/cart
  SKU.

### Private backend and contracts

- Established private, versioned backend source at
  `aerovista-us/aerovista-commerce-api`.
- Preserved all protected legacy Gear route shapes while implementing additive
  `/v1` routes behind feature flags.
- Added normalized Gear/Horizon catalog adapters and authoritative 15-minute
  quotes.
- Added database-backed, store-scoped checkout idempotency and Square sandbox
  payment-link creation.
- Added PII-free checkout status and independently signed, duplicate-safe
  webhook processing.
- Added PostgreSQL-backed quote/checkout/webhook rate limits using HMAC-only
  source identifiers.
- Passed the `0006` to `0005` to `0006` isolated rollback rehearsal without
  losing quote, checkout, webhook, order, or fulfillment evidence.
- Added explicit trusted-proxy source handling and a prepared additive
  Cloudflare-to-Traefik production override; it remains undeployed.
- Cleared the dependency audit and GitHub backend contract gate.

### NXCore sandbox

- Directory:
  `/srv/Collab/mini.shops/AV-PNW.com/aerovista-commerce-sandbox`
- Compose project: `aerovista-commerce-sandbox`
- Services: PostgreSQL and commerce API only.
- Current audited API image:
  `sha256:b48f78ce3bec37b81a1b948075902d0f4abd919b1fb642316bbac093782be88a`
- Migration: `0006_commerce_rate_limits (head)`.
- Provider-free refresh smoke passed; checkout was not called.
- Earlier guarded checkout and webhook smokes passed for Gear and Horizon
  without submitting payment or creating fulfillment work.
- Current and pre-dependency images are tagged for sandbox rollback.

### Multi-store operator console

- Established private, versioned console source at
  `aerovista-us/aerovista-catalog-console`.
- Deployed Gear (live/default) and Horizon (draft) store selection to the
  existing private console.
- Added separate catalog, overlay, image, backup, and browser-state boundaries.
- Preserved omitted-`storeId` compatibility for Gear; unknown IDs fail closed.
- Four automated isolation tests and browser switching checks passed.
- Clarified that Gear console files are recoverable staging artifacts: the
  backend catalog is the checkout authority, and public GitHub Pages still
  requires a separately reviewed storefront build.

### July 25 Horizon definition, catalog, and media intake — superseded by the current addendum

- Root `horizon/` is the canonical static frontend design source;
  `planning/canvas/` remains design provenance and intake evidence.
- The shell is intentionally `noindex`, uses inline draft artwork data, and has
  no working Reserve, cart, quote, checkout, or fulfillment integration.
- Four vendor-rendered canvas mockups are preserved with pixel dimensions,
  byte counts, and SHA-256 checksums. They are display mockups, not
  print-ready artwork.
- `horizon/evidence/HORIZON_CATALOG_RECONCILIATION.md` and its JSON companion
  map CDA Clock, Floating Green, and lake cove with high confidence; the
  generic Canvas record is provisional; Center Clock is unmatched.
- The Square export is blocked from import because customer-facing,
  variation, SEO, sellable, stock, option, and inventory fields contain
  literal `41` values. Categories are generic, and provider variants are
  absent.
- The private console's NXCore Horizon directory exists but is empty. No
  candidate product or mockup has been published into the console, backend, or
  a customer-facing storefront.

### Credential and production safety

- Added a dedicated `CATALOG_PUBLISH_SECRET` and matching console-only token.
- Verified that the broad operations token is rejected by catalog publishing
  when the scoped credential is configured.
- Stored backups in protected directories and tightened active environment
  file permissions.
- Rebuilt only the production API for the narrow catalog-auth patch and
  restarted only the console to load its token; PostgreSQL and fulfillment
  workers were not restarted.
- Did not register or enable production `/v1` routes.

## Current verification evidence

### Automated

- Backend: 58 tests passed; one pre-existing `datetime.utcnow()` deprecation
  warning remains in the protected health route.
- Dependencies: `pip check` passed; `pip-audit` reports no known
  vulnerabilities.
- Repository secret and structure scans passed.
- PostgreSQL migrations `0001` through `0006` compile.
- Public Commerce API `/v1` contract audit passes with zero errors.
- Console: four isolation tests passed.
- Backend, console, and public GitHub Actions gates are green at their current
  merged main heads.

### Live non-impact

- `https://gear.aerovista.us/`: `200`
- Gear `about.html`: `200`
- `https://api.aerovista.us/api/health`: `200`
- Gear same-origin `/api/square/bootstrap`: `200`
- Private console unauthenticated health/root: expected `401`
- NXCore private console container: running.
- Production API: healthy; PostgreSQL, fulfillment worker, and reconcile
  worker are running.
- Unpublished sandbox API and PostgreSQL: healthy.
- Production `/v1/stores`: same-URL `301`; route remains undeployed.

Current live production file hashes (July 25 read-only fetch):

```text
square_products_latest.json
1cade759706e26cd9c52a3bb81fdda4bab3f751c9776acead3f6eb4140f63e9d

storefront_overlay.json
e031354f1c86e18dcdb4f0d7015c2c6260613f7063d55d4f078df657afe1c641
```

## Source-control and handoff status

| Component | Main head | Review status | Current gate |
|---|---|---|---|
| Private backend | `f9c28d6` | PRs #1 and #2 merged | Backend contract gate green |
| Private console | `b791bbf` | PRs #1 and #2 merged | Console contract gate green |
| Public contracts/store | `82b363f` | PRs #1 and #2 merged | Contract, Pages, and API-proxy workflows green |

The detailed private implementation handoff is
`HANDOFF_2026-07-22.md` in the private backend repository. It records NXCore
paths, image IDs, credential boundaries, backup locations, rollback commands,
test evidence, and production release gates without reproducing secret values.

## Remaining production `/v1` release gates

These are intentionally deferred release tasks, not missing sandbox
implementation:

1. Confirm ownership and schedule a production ingress/migration window.
2. Confirm rotation of the historically documented operations credential and
   remove credential-presence/origin details from the public health payload.
3. Export/tag the current production API image as an immutable rollback
   artifact.
4. Take and verify a fresh production PostgreSQL backup immediately before
   migrations.
5. Deploy the prepared Cloudflare-to-Traefik `/v1` router and trusted-source
   boundary; resolve the current same-URL `301` response.
6. Prove direct-origin denial, Cloudflare forwarding, client-source
   attribution, request IDs, CORS/redirect allowlists, and rate-limit identity.
7. Deploy the additive backend with every production `/v1` feature flag off.
8. Apply migrations `0003` through `0006`, then rerun legacy regression and
   read-only catalog probes.
9. Enable `/v1` functions gradually with an approved rollback trigger at each
   step.

## Remaining Horizon prerequisites

1. Build and audit the sanitized, deterministic public artifact.
2. Complete the six mapped works’ rights, crop/wrap, provider-artwork, price,
   and physical-proof gates.
3. Resolve the two placeholders or retain them as explicit non-cartable
   previews; keep the bundle hidden.
4. Create and accept an isolated static preview while checkout remains gated.
5. Back up, deploy, and audit the six production Square and Printful mappings.
6. Complete one approved controlled order through Square, webhook, Postgres,
   and Printful.
7. Publish policies, attach `horizon.aerovista.us`, verify monitoring and
   rollback, then remove `noindex` only with launch approval.

## Recommended next sequence

1. Keep Gear on the verified Plan 1A/legacy checkout path.
2. Implement the public-artifact builder and release audit.
3. Finish artwork/right/proof decisions in parallel with the isolated preview.
4. Treat production maps, the controlled order, and DNS attachment as separate
   approval-gated changes.
5. Execute the [Horizon completion plan](../horizon/COMPLETION_PLAN.md) through
   its closeout gate.

No storefront catalog, customer order, production database revision, Gear DNS,
or fulfillment mapping was changed while producing this updated readiness
record.
