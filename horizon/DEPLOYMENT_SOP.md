# Horizon deployment SOP

**Last updated:** 2026-07-27  
**Target hostname:** `https://horizon.aerovista.us`  
**Current state:** public `noindex` storefront on GitHub Pages through the
Cloudflare Worker Custom Domain. NXCore CORS, `/api/*`, eight checkout keys,
eight production mapping rows, and five public checkout-ready variants are
verified. No provider-artwork mutation or paid order was performed in this
release.

SOT: This is the canonical deployment, verification, launch, and rollback
procedure for the Horizon storefront. Product readiness remains authoritative
in `catalog.json`; activation gates remain authoritative in
`COMMERCE_READINESS.md`.

## Deployment boundary

Horizon has four independent release surfaces:

| Surface | Source | Target | Current state |
|---|---|---|---|
| Static storefront | `horizon/dist` sanitized release artifact | `aerovista-us/horizon-storefront` GitHub Pages behind `horizon.aerovista.us` | Live, `noindex`, five checkout-ready public works |
| Same-origin `/api/*` proxy | `cloudflare/gear-api-proxy/` | Cloudflare Worker Custom Domain | Live; NXCore health/bootstrap verified |
| Square checkout map | Generated shared backend SKU map | NXCore `av-store-api` | Eight Horizon keys active and bootstrap-verified |
| Private production map | `commerce/product-variant-map.horizon.sql` | NXCore Postgres `product_variant_map` | Eight rows active and audited |

Deploying one surface does not authorize or complete the others. A storefront
preview may be deployed while every variant remains fail-closed.

## Hosting decision

Horizon mirrors Gear with an independent GitHub Pages repository:

- the monorepo remains the private source of truth;
- `npm run build:horizon-pages` produces the customer-safe artifact;
- the public Horizon repository contains only the artifact and its Pages
  workflow;
- its Pages site remains the immutable static origin;
- Cloudflare’s Worker Custom Domain owns `horizon.aerovista.us`, proxies static
  requests to GitHub Pages, and sends `/api/*` to the NXCore API.

Do not reuse the Gear Pages repository: a repository Pages site has one custom
domain, and Gear already owns `gear.aerovista.us`.

Official references:

- [Cloudflare Worker Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
- [Cloudflare Worker routes and domains](https://developers.cloudflare.com/workers/configuration/routing/)
- [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

## Public artifact policy

Do not upload the entire `horizon/` directory. It contains production evidence,
provider IDs, source masters, intake records, SQL, and operator documentation.

The public build uses an allowlist and contains only:

- `index.html`
- `favicon.svg`
- `css/styles.css`
- `js/gallery.js`
- a customer-safe catalog JSON and matching generated JavaScript fallback
- display images referenced by published customer products
- the optimized photographic gallery-interior background, generated
  residential View in Room background, and compact consumer-wall derivatives
- `.nojekyll`

The public artifact must exclude:

- `commerce/`
- `scripts/`
- `SOT.json`, `README.md`, `COMMERCE_READINESS.md`,
  `COMPLETION_PLAN.md`, and this SOP
- `gallery/GALLERY_INVENTORY.md`, intake JSON, generic upload aliases, and
  unresolved/superseded mockups
- full-resolution source artwork and cropped print-master candidates
- source hashes, internal issue text, provider evidence, SQL, credentials, and
  provider URLs
- the hidden bundle

The artifact builder is `horizon/scripts/build-public-artifact.mjs`. It strips
unpublished products and internal/provider fields, copies only referenced
published media, enforces a 10 MiB per-file ceiling, and writes a private
release manifest under `horizon/release/`.

## Preflight

Run from `V:\aerovista-store`:

```powershell
npm run build:horizon-pages
npm run audit:horizon-pages
node --check horizon/js/gallery.js
node scripts/build-cart-sku-map.mjs
git diff --check -- horizon
```

Expected catalog result as of 2026-07-27:

```text
11 products, 12 variants, 5 published, 5 checkout-ready
```

Confirm:

- One finite proportional wall renders Last Light Over the Resort, Mahogany
  Wake, The Road to the Lake, and Lake, Links, and the Floating Green in that
  small-to-large order.
- Each canvas's relative display width and height match its listed dimensions:
  12 × 24, 20 × 28, 20 × 40, and 24 × 48 inches. Desktop and mobile use one
  shared proportional scale per viewport; never resize one work independently.
- Desktop shows all four works on one wall; mobile provides four snap-aligned
  wall bays with previous/next controls and a position counter.
- The four wall thumbnails are exactly one-fifth of the corresponding display
  image's linear dimensions. Full display images remain available for product
  details and room preview.
- The wall itself is a 1672 × 940 photographic interior derivative; there are
  no synthetic SVG light beams, panel lines, or floor shapes in the customer
  layout.
- View in Room uses the 1536 × 1024 generated lake-house photograph at
  `gallery/room/horizon-lakehouse-room-v1.webp`; synthetic CSS furniture,
  moulding, rug, and floor elements are absent.
- Harbor at the Heart is absent from the consumer wall and present in the
  business/custom-placement section with its 30 × 40-inch `$495` offer.
- `CDA-SET-001` is absent from the customer grid.
- `CDA-CAN-004` and `CDA-CAN-008` are absent from the customer grid.
- `CDA-CAN-001` Autumn is absent from the customer grid but remains intact in
  the private master catalog and recovery profiles.
- No placeholder tile renders.
- Five public works have product-detail routes and Square checkout enabled.
- Eight mapped records remain preserved internally, including Last Light.
- `catalog.generated.js` exactly matches `catalog.json`.
- Desktop and mobile browser passes have no application errors.
- Artwork uses one connected front/right/bottom object. Only the right and
  bottom image-derived wrap edges are visible; there are no detached polygons
  or conflicting four-sided bevel corners.
- Right wrap depth uses the reduced 75% treatment on wall, detail, room, and
  mobile presentations; the thin bottom face is retained.
- A single full-canvas image map is clipped between the front, right fold, and
  bottom fold. The front stops at the fold allocation and the edge receives
  the next source pixels; no boundary strip is duplicated.
- Right and bottom sampled faces meet continuously at the lower-right corner
  with no wall-background gap.
- A restrained contact shadow seats the canvas on the wall, and fine-pointer
  hover lifts the complete object by four pixels.
- Product title, subtitle, size, price, and status are typeset directly on the
  gallery wall; only the outlined View the Piece control has a defined
  rectangular surface.
- Panorama cards use direct artwork derivatives without provider-room
  backgrounds.
- Room preview shows format-aware scale against a nine-foot wall, photographic
  architectural context, and working Natural, Soft Ivory, and Evening lighting
  controls.
- Wall controls, product selectors, detail copy, and bag controls remain legible and
  unclipped at 1440 × 1000 and 390 × 844.
- No source master or operator-only file is in the release artifact.

## Preview deployment

1. Build and audit the sanitized public artifact.
2. Push the artifact and Pages workflow to the dedicated Horizon GitHub
   repository.
3. Enable GitHub Pages with GitHub Actions as its build source.
4. Record the repository, workflow run, commit, and `github.io` preview URL.
5. Verify the preview with `noindex` still present:

   - HTML, CSS, JS, catalog fallback, favicon, and all five display images
     return `200`.
   - Bundle remains hidden.
   - Incomplete products and the bundle remain absent.
   - Cart namespace is `av_horizon_cart_v1`.
   - No Gear product, cart state, or deployment changed.
   - No source artwork, provider evidence, SQL, or operator doc is reachable.

Do not attach `horizon.aerovista.us` during preview acceptance.

## Commerce activation

**Current status:** completed for the eight verified mappings on 2026-07-27.
The paid controlled-order gate remains separate and incomplete.

Commerce activation is a controlled production change and requires a backup,
review, and explicit execution window.

1. Reconcile rights, final crops/wraps, and physical proofs per product. If
   checkout is intentionally enabled first, record `commerceApproved` and an
   explicit `proofWaiver`; never falsify `proofApproved`.
2. Replace affected production artwork only after an approved master and
   regenerate provider previews.
3. Re-pull the sanitized provider snapshot and reconcile catalog evidence.
4. Back up the active NXCore Square SKU map, backend environment, and eight
   target `product_variant_map` rows. The 2026-07-27 backup is:

   `/srv/Collab/mini.shops/AV-PNW.com/av_storefront/backups/horizon-commerce-20260727T044942`
5. Generate and review the shared Square map:

   ```powershell
   node scripts/build-cart-sku-map.mjs
   ```

6. Deploy the generated map using `docs/BACKEND_DEPLOY.md`.
7. Review and execute `commerce/product-variant-map.horizon.sql` on NXCore.
8. Run the existing product-variant audit and verify all eight Horizon rows.
9. Verify `/api/square/bootstrap` returns all eight Horizon cart keys and correct
   Square variation IDs/prices.
10. Set `squareProductionReady`, `printfulMapped`, and `checkoutReady` only for
    variants whose identities, maps, policies, and approval requirements are
    complete. A proof exception requires a catalog-recorded waiver.
11. Regenerate and revalidate the catalog fallback and sanitized artifact.

The 2026-07-27 deployment completed steps 3–11 for eight mappings. A Last Light
request returned a valid Square checkout link without a payment. Do not enable
incomplete products or the hidden bundle.

## Controlled-order gate

Do not place a paid order without approval for the charge and destination.

For one approved variant:

1. Open the isolated Horizon preview in a clean browser.
2. Add the variant and confirm the cart retains its Horizon-only namespace.
3. Confirm the checkout request contains the correct `cartKey`,
   `variationId`, size, quantity, and store context.
4. Complete Square hosted checkout.
5. Verify Square webhook receipt.
6. Verify the Postgres order and fulfillment job.
7. Verify the exact Printful sync variant, artwork, size, retail amount,
   shipping address, and confirmation state.
8. Track the physical proof through receipt and approve or reject it.

Any identity, price, artwork, size, or fulfillment mismatch fails the gate and
triggers rollback.

## Commerce launch on the production hostname

The hostname already serves the gated preview. Only after preview acceptance
and the controlled-order gate:

1. Deploy the approved immutable artifact to the Pages production environment.
2. Confirm the Cloudflare Worker Custom Domain and certificate remain healthy.
3. Confirm the Worker sends `horizon.aerovista.us/api/*` to
   `api.aerovista.us`.
4. Confirm backend `ALLOWED_ORIGINS` includes exactly
   `https://horizon.aerovista.us`.
5. Verify HTTPS, DNS, HTML, catalog, images, `/api/square/bootstrap`, cart,
   checkout, webhook, and fulfillment.
6. Publish approved shipping, returns, privacy, terms, tax, and support content.
7. Remove `noindex` only after the public-launch approval.
8. Record the artifact hash, deployment ID, DNS state, verification results,
   and rollback target.

## Rollback

Rollback must affect Horizon only.

### Storefront-only failure

1. Restore the previous verified GitHub Pages artifact commit.
2. If necessary, detach only `horizon.aerovista.us` from the failed target.
3. Keep or restore `noindex`.
4. Purge only Horizon cache paths.

### Checkout or fulfillment-integrity failure

1. Set affected Horizon variants to `checkoutReady: false`.
2. Regenerate the catalog fallback and redeploy the gated artifact.
3. Restore the prior Square SKU map if the fault is map-related.
4. Restore or disable only the affected Horizon Postgres map rows.
5. Stop or review affected fulfillment jobs before provider submission.
6. Preserve Square, webhook, order, and provider evidence for reconciliation.

Never roll back Gear DNS, Gear catalog, Gear storefront, or unrelated
fulfillment rows during a Horizon rollback.

## Release record

Every preview and production release must record:

- source commit and dirty-worktree disposition
- catalog and generated-fallback hashes
- public-artifact hash and allowlist-audit result
- GitHub repository commit, Pages workflow run, and origin URL
- DNS and Worker route state
- backend map checksum and database audit result
- enabled Horizon variant IDs
- controlled-order evidence
- smoke-test results
- desktop/mobile presentation evidence, including edge-wrap and control-spacing
  checks
- rollback deployment and map backups

The release is complete only when `COMPLETION_PLAN.md` and
`COMMERCE_READINESS.md` are updated with the evidence.

Current gated-preview evidence:
[`release/RELEASE_2026-07-26_GITHUB_NXCORE_CLOUDFLARE.md`](release/RELEASE_2026-07-26_GITHUB_NXCORE_CLOUDFLARE.md).

Current curated-preview evidence:
[`release/RELEASE_2026-07-27_CURATED_COLLECTION.md`](release/RELEASE_2026-07-27_CURATED_COLLECTION.md).

Current balanced-gallery evidence:
[`release/RELEASE_2026-07-27_GALLERY_BALANCED.md`](release/RELEASE_2026-07-27_GALLERY_BALANCED.md).

Current commerce-layout evidence:
[`release/RELEASE_2026-07-27_COMMERCE_LAYOUT.md`](release/RELEASE_2026-07-27_COMMERCE_LAYOUT.md).

Current proportional-gallery-wall evidence:
[`release/RELEASE_2026-07-27_PROPORTIONAL_GALLERY_WALL.md`](release/RELEASE_2026-07-27_PROPORTIONAL_GALLERY_WALL.md).

Current bevel-and-wall-label evidence:
[`release/RELEASE_2026-07-27_WORD_BEVEL_WALL_LABELS.md`](release/RELEASE_2026-07-27_WORD_BEVEL_WALL_LABELS.md).

Current Last Light and collection-order evidence:
[`release/RELEASE_2026-07-27_LAST_LIGHT_COLLECTION_EDIT.md`](release/RELEASE_2026-07-27_LAST_LIGHT_COLLECTION_EDIT.md).

Current checkout, production-map, and two-edge canvas evidence:
[`release/RELEASE_2026-07-27_CHECKOUT_FULFILLMENT_EDGE_POLISH.md`](release/RELEASE_2026-07-27_CHECKOUT_FULFILLMENT_EDGE_POLISH.md).

Current photographic View in Room evidence:
[`release/RELEASE_2026-07-28_PHOTOGRAPHIC_ROOM_PREVIEW.md`](release/RELEASE_2026-07-28_PHOTOGRAPHIC_ROOM_PREVIEW.md).

Current canvas-edge ratio and alignment evidence:
[`release/RELEASE_2026-07-28_CANVAS_EDGE_RATIO_ALIGNMENT.md`](release/RELEASE_2026-07-28_CANVAS_EDGE_RATIO_ALIGNMENT.md).
