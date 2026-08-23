# Horizon completion plan

**Last updated:** 2026-07-27  
**Target:** `https://horizon.aerovista.us`  
**Execution state:** public `noindex` storefront deployed; five public variants
are checkout-ready and the production maps are active. Physical proof, policy,
paid controlled-order, and launch-indexing completion remain open.

SOT: This plan carries Horizon from the current local preview to an independently
deployed, recoverable, commerce-verified storefront. The deployment procedure
is `DEPLOYMENT_SOP.md`; per-product activation truth is
`COMMERCE_READINESS.md`.

## Current baseline

| Area | Current result |
|---|---|
| Storefront design | Connected right/bottom canvas wrap, contact shadow, photographic proportional wall, and direct-on-wall purchasing copy verified |
| Customer catalog | 11 records / 12 variants |
| Visible collection | 4 dimension-scaled consumer works on one finite wall + 1 Harbor business-placement feature |
| Hidden content | 5 hidden archive, 1 seasonal-hold bundle |
| Placeholders | 0 public; incomplete products are hidden |
| Private provider evidence | 8 mapped individual works |
| Provider API audit | 8/8 expected sync variants active and enabled |
| Cropped master candidates | Fairways, Floating Green, Clock; provisional Last Light video-frame proofing crop |
| Cart | Horizon-isolated and wired; hidden/non-ready variants remain fail-closed |
| Checkout | 5 public variants active through Square-hosted checkout |
| Static hosting / DNS | Live: GitHub Pages behind Cloudflare Worker Custom Domain |
| Production maps | 8 checkout keys and 8 production rows deployed and audited; backup recorded |
| Checkout-link smoke | Last Light returned HTTP 200 and a `square.link` URL; no charge |
| Paid controlled order | Not run |
| Public launch | Not approved |

## Definition of complete

Horizon is complete only when:

- a sanitized, reproducible static artifact is deployed independently of Gear;
- `horizon.aerovista.us` serves the approved artifact over HTTPS;
- customer policies and legal/contact identity are approved and published;
- every enabled variant has approved artwork, rights, size, price, crop/wrap,
  physical proof, Square variation, Printful sync variant, and Postgres map;
- a controlled Square → webhook → Postgres → Printful order passes;
- monitoring and Horizon-only rollback are verified;
- incomplete products remain hidden and the bundle remains hidden until their
  separate gates pass;
- `noindex` is removed only by explicit public-launch approval.

## Phase 1 — Build a safe release artifact

**Status:** complete

Tasks:

1. Keep `horizon/scripts/build-public-artifact.mjs` aligned with the frontend
   contract.
2. Generate the customer-safe catalog from `catalog.json`.
3. Remove internal issues, source paths/hashes, provider evidence, SQL, scripts,
   and operator documentation from the public artifact.
4. Copy only published display media.
5. Fail the build on missing referenced images, stale catalog fallback,
   unexpected files, source masters, or files over the host limit.
6. Run the local release audit and browser smoke.
7. Record artifact hashes from `horizon/release/horizon-pages-manifest.json`.

Exit gate:

- Two builds from the same source are byte-equivalent.
- The allowlist audit passes.
- The artifact renders four purchase-oriented consumer works on one finite
  proportional wall and Harbor in its separate business-placement section;
  archive, placeholder, and bundle records remain absent.
- Wall thumbnails are exactly one-fifth of each display image's linear
  dimensions; full display images remain available only for details and room
  previews.
- Consumer works are ordered by listed canvas area from smallest to largest:
  Last Light, Mahogany Wake, Road to the Lake, then Floating Green. One shared
  scale factor preserves the physical relationship.
- No internal or full-resolution file is reachable.

## Phase 2 — Finish product, rights, and proof work

**Status:** open

For the eight mapped products:

1. Confirm AeroVista LLC’s private rights/work-made-for-hire or assignment
   record and visual-rights review.
2. Finalize exact 2:1 trim, gallery-wrap bleed, seam, distortion, highlights,
   and horizon treatment.
3. Approve the final print-master checksum.
4. Upload approved cropped masters to the correct Printful sync products.
5. Regenerate mockups and re-pull provider evidence.
6. Order and approve physical proofs.
7. Resolve the Fairways `$495` plan versus `$525` Square price.
8. Decide whether Harbor’s planned `$345` 24 × 32 variation will be created or
   deferred; do not confuse it with the verified `$495` 30 × 40 variant.

Incomplete products:

- `CDA-CAN-004` and `CDA-CAN-008` remain hidden.
- Do not add cart keys or checkout until real artwork, price, provider product,
  rights, and proof gates are complete.

Last Light quality follow-up:

- The supplied 3840 × 2160 PNG is a video frame, not an approved source master.
- Replace it with the sharpest available frame from the original video,
  approve the final 2:1 crop and edge treatment, and approve a physical proof.
- Its exact Square variation and production sync identity are verified and
  active. Checkout is covered by the catalog-recorded proof waiver until the
  quality follow-up is complete.

Bundle:

- Keep `CDA-SET-001` hidden.
- Defer its Square bundle record and multi-item Printful behavior until after
  the individual-product launch is stable.

Exit gate:

- Every intended launch variant has signed rights evidence, final master,
  provider preview, and approved physical proof.

## Phase 3 — Create isolated hosting preview

**Status:** complete; promoted to the public hostname with `noindex`

Tasks:

1. Maintain the dedicated `aerovista-us/horizon-storefront` repository.
2. Push only the sanitized artifact and Pages workflow.
3. Verify both the `github.io` origin and Cloudflare public edge.
4. Run desktop, mobile, accessibility, keyboard, image, link, and direct catalog
   fallback tests.
5. Verify no Gear artifact, cart, hostname, or API behavior changed.
6. Keep `noindex`.

Exit gate:

- Preview acceptance is signed off and the prior deployment can be restored.

## Phase 4 — Activate production commerce maps

**Status:** complete

Tasks:

1. Back up the production Square SKU map and target Postgres map rows.
2. Review the eight Horizon cart keys in
   `commerce/square-sku-map.horizon.json`.
3. Build and deploy the shared backend map.
4. Review and execute `commerce/product-variant-map.horizon.sql`.
5. Audit all eight Square variation → production-variant rows.
6. Verify Horizon cart keys in `/api/square/bootstrap`.
7. Confirm prices match Square and the latest Printful evidence.
8. Enable catalog readiness flags only for proof-approved variants or variants
   with an explicit commerce approval and proof waiver.
9. Rebuild and redeploy the preview artifact.

Exit gate:

- Bootstrap, catalog, Square map, Printful map, price, and size agree for every
  enabled variant.

Completed evidence:

- backup:
  `/srv/Collab/mini.shops/AV-PNW.com/av_storefront/backups/horizon-commerce-20260727T044942`
- bootstrap: eight Horizon keys
- database: eight active expected rows
- public catalog: five checkout-ready variants

## Phase 5 — Controlled order and fulfillment proof

**Status:** ready when a paid test, recipient, and destination are approved;
do not perform a charge implicitly

Tasks:

1. Obtain approval for the paid test, recipient, and product.
2. Run a clean-browser Horizon checkout.
3. Verify the Square payment link and completed order.
4. Verify webhook authenticity and idempotency.
5. Verify Postgres order and fulfillment job.
6. Verify the exact Printful variant, artwork, address, amount, and submission.
7. Receive and inspect the physical product.
8. Record pass/fail evidence and remediate any mismatch.

Exit gate:

- One complete production path passes without manual data repair.

## Phase 6 — Policy and indexed launch

**Status:** hostname live with `noindex`; policy approval and Phase 5 still
block indexed launch

Tasks:

1. Publish approved shipping, returns, privacy, terms, tax, accessibility, and
   support content.
2. Deploy the approved production artifact.
3. Reverify the existing `horizon.aerovista.us` Cloudflare Custom Domain.
4. Reverify the Horizon `/api/*` Worker route and backend origin allowlist.
5. Run HTTPS, DNS, content, cart, checkout, webhook, fulfillment, and rollback
   smokes.
6. Remove `noindex` only after explicit launch approval.
7. Monitor errors, payment creation, webhooks, fulfillment jobs, and support
   contacts during the first 24 hours.

Exit gate:

- Public hostname, policies, commerce, monitoring, and rollback are all
  verified; Gear remains unchanged.

## Phase 7 — Closeout and deferred expansion

Tasks:

1. Update `COMMERCE_READINESS.md`, `DEPLOYMENT_SOP.md`, `docs/STATUS.md`,
   root/subtree SOT manifests, and `WORKLOG.md` with final evidence.
2. Archive release hashes, deployment IDs, backups, controlled-order evidence,
   and proof decisions.
3. Decide when the two hidden incomplete products have approved artwork and
   product evidence to enter the collection.
4. Design and test bundle commerce separately.
5. Add a second controlled order before enabling any new size, finish, product,
   or bundle.

Exit gate:

- No open launch-critical item remains, documentation matches production, and
  every deferred product is explicitly hidden or non-sellable.

## Required approvals

Explicit approval is required before:

- replacing the hosting repository or changing DNS/custom-domain state;
- changing the Worker, backend configuration, or production mappings again;
- uploading/replacing Printful product artwork;
- executing additional SQL or deploying another production Square map;
- charging a controlled order;
- enabling checkout-ready flags for any additional variant;
- removing `noindex`.

## Immediate next actions

1. Publish and verify this five-product checkout release on the production
   hostname.
2. Replace Last Light’s provisional PNG with the sharpest original-video
   frame; approve its 2:1 master, wrap, rights record, and physical proof.
3. Complete crop/wrap review and rights records for the remaining featured
   works, including the visible-person review for Mahogany Wake and projection
   correction for Floating Green.
4. Resolve Harbor’s 24 × 32 decision; keep that unavailable option, Fairways,
   and Clock hidden until separately approved.
5. Upload approved masters and order physical proofs.
6. Run an approved paid controlled order and inspect the received canvas.
7. Publish policies, verify monitoring/rollback, and remove `noindex` only
   after explicit launch approval.
