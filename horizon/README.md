# Horizon Storefront — Final Dev Location

Customer-facing Horizon storefront. This directory is the canonical dev home
for Horizon frontend files, parallel to `store/` (Gear).

## Status: public noindex storefront with real catalog + live checkout

Design source: `planning/canvas` ("Horizon Canvas Gallery" demo, selected
2026-07-24), retained as the visual foundation for dependency-free static
HTML/CSS/JS and refined for the live luxury storefront.

- `index.html` — commerce-forward gallery storefront featuring four consumer
  works on one finite, proportional gallery wall, a separate Harbor
  business-placement feature, a Gear-compatible bag, and Square-hosted
  checkout. Archived, incomplete, and
  bundled products remain recorded but hidden. `noindex` is set; remove only
  at an approved commerce launch.
- `catalog.json` — scalable product and variant catalog. Blocked products stay
  recorded here with `published: false`, so expansion does not require cart
  code changes.
- `catalog.generated.js` — generated fallback for direct-file previews and
  static hosts that cannot serve JSON. `catalog.json` remains authoritative.
- `css/styles.css`, `js/gallery.js` — no build step or dependencies. The cart
  uses `av_horizon_cart_v1`, separate from Gear. Artwork shows a connected
  image-derived wrap on the right and bottom only. The right face uses the
  reduced 75% depth and joins continuously to the retained thin bottom face.
  One image map spans the front and folds, so the source continues past each
  fold line without repeating its boundary pixels. Softly rounded corners and
  a restrained wall-contact shadow keep
  the object grounded. Product information is typeset
  directly on the gallery wall, with a single outlined action below; pointer
  hover adds a restrained four-pixel lift. The
  consumer wall is ordered by listed canvas area from smallest to largest and
  uses one uniform scale factor, increased on July 27 so the 12 × 24 work
  remains legible without falsifying relative dimensions.
- `gallery/` — source artwork, provider evidence, optimized display
  derivatives, photographic gallery and residential-room backgrounds, and four
  `gallery/wall/` thumbnails rendered at one-fifth of each display image's
  linear dimensions. The wall uses these compact derivatives; detail and room
  views retain the full display images.
- `store.json` — store configuration for the planned
  `horizon.aerovista.us` hostname.
- `COMMERCE_READINESS.md` — exact Square, Printful, product, and launch gates.
- `DEPLOYMENT_SOP.md` — canonical sanitized-artifact, preview, production,
  verification, and rollback procedure.
- `COMPLETION_PLAN.md` — gated next steps from the local sprint through public
  launch and closeout.
- `release/RELEASE_2026-07-27_LAST_LIGHT_COLLECTION_EDIT.md` — current
  Last Light intake, recoverable collection edit, proportional-order update,
  proofing boundary, and verification evidence.
- `release/RELEASE_2026-07-27_CHECKOUT_FULFILLMENT_EDGE_POLISH.md` — production
  map activation, no-charge checkout smoke, backup, visual edge polish, and
  rollback evidence.
- `release/RELEASE_2026-07-28_PHOTOGRAPHIC_ROOM_PREVIEW.md` — generated
  lake-house room asset, proportional artwork scaling, lighting treatments,
  and browser verification.
- `release/RELEASE_2026-07-28_CANVAS_EDGE_RATIO_ALIGNMENT.md` — reduced right
  edge, continuous lower-right corner join, single-image wrap mapping, and
  cross-surface browser verification.

Serve locally: any static server, e.g. `python -m http.server 8090` in this
directory, or `serve-horizon-static.bat`.

Validate the expansion catalog before previewing or publishing:

```bash
npm run build:horizon-pages
npm run audit:horizon-pages
```

Refresh the sanitized, read-only Printful product evidence:

```bash
python horizon/scripts/pull-printful-products.py
```

## Commerce behavior

- Customers can open and purchase any of the four consumer pieces from the wall
  or the separate Harbor business-placement work. The five public variants are
  checkout-ready.
- Eight exact Square checkout keys and eight production mapping rows are active
  on NXCore, including Last Light.
- The UI uses the same hosted Square checkout contract as Gear.
- The backend remains price-authoritative; browser totals are display only.
- Checkout is blocked before any network request for a variant that is not
  explicitly checkout-ready.
- The live custom domain, backend CORS, and shared Cloudflare `/api/*` proxy
  are deployed and verified.
- Customer-facing commerce copy names Square checkout only. Production-provider
  identity, mappings, and operational status are private.
- About/policy pages remain gated until policy language is approved.

The storefront product source is `catalog.json`; `store.json` carries
store-level routing and integration configuration.

Do not upload the whole `horizon/` directory. It contains source masters,
provider evidence, SQL, scripts, and operator documentation. The audited
customer-safe GitHub Pages artifact is generated at `horizon/dist`; follow
`DEPLOYMENT_SOP.md`.

Publish the audited artifact to the dedicated repository:

```powershell
pwsh -File horizon/scripts/publish-github-pages.ps1
```

Gallery layout uses one photographic architectural wall and derives each
canvas's display width and height from its listed physical dimensions. Desktop
shows the complete four-piece wall at one time, ordered 12 × 24, 20 × 28,
20 × 40, then 24 × 48; mobile presents the same finite set as four
snap-aligned wall bays with previous/next controls and a position counter. The
four wall thumbnails total roughly 91 KB. Editorial
spacing, product placards, product detail panels, the bag, and the
photographic room preview were verified at 1440 × 1200 and 390 × 844. View in
Room uses a generated 1536 × 1024 lake-house interior rather than CSS scenery,
sizes the artwork from its selected catalog dimensions against a nine-foot
wall, and offers Natural, Soft Ivory, and Evening lighting treatments.

## Historical catalog and media intake provenance

The bullets in this section explain the July 25 source intake and are retained
for provenance; they do not supersede the current catalog or provider evidence.
**Promoted evidence** lives under `horizon/evidence/`. Design tooling leftovers
are staged in `_legacy_export/planning-canvas/` (ready to leave this parent
folder). Current product state is in `catalog.json`; activation blockers are in
`COMMERCE_READINESS.md`.

- Five Square export rows were reviewed.
- Four canvas mockups were checksummed.
- Three new mockup-to-record matches are visually confirmed and use stable
  product-named storefront copies. Two older mockups remain unresolved.
- The export contains blocking literal `41` placeholders and no usable
  size/finish/provider variation mapping.
- The supplied PNGs are product-display mockups, not print-ready source
  artwork.
- Provider roles are selected: Square processes payment and the private
  production service produces and ships. A read-only provider audit confirms
  eight expected variants, sizes, prices, and attached-file metadata; all eight
  production Postgres mappings are active.
- `horizon/evidence/HORIZON_ARTWORK_RIGHTS_ATTESTATION.md` is the unsigned
  ownership-confirmation record. AeroVista LLC is the intended rights holder,
  Horizon is its division/brand, and no individual capture-operator credit may
  appear in customer content. No third-party contributor or prior competing
  claim was declared. No artwork is rights-cleared until its source master,
  checksum, company work-made-for-hire/assignment basis, visual-rights review,
  and signed private record are complete.

Five signature works remain in the public catalog. Last Light Over the Resort,
Mahogany Wake, The Road to the Lake, and Lake, Links, and the Floating Green
form the consumer collection. Harbor at the Heart appears only in the
business/custom-placement section, where its architectural identity is more
useful and does not interrupt the consumer gallery.
Autumn Over Coeur d’Alene is retained intact as `hidden_archive`; Last Light
now fills the broad downtown/skyline role while Road preserves the stronger,
more distinct linear approach-to-the-lake composition.
Every other record remains intact in the master catalog with an explicit
archive or seasonal status. Checkout remains gated independently per variant;
the five public variants are enabled and hidden variants remain unavailable.
See `migrations/curated-2026-07-27/MIGRATION_REPORT.md` for the visual review
and one-command curated, five-public-work, and eight-work recovery profiles.

## Public presentation

- **Last Light Over the Resort — Downtown Coeur d’Alene at Sunset** —
  `CDA-CAN-014`, 12 × 24 in, **$195**
- **Mahogany Wake — A Classic Runabout on Lake Coeur d’Alene** —
  `CDA-CAN-010`, 20 × 28 in, **$275**
- **The Road to the Lake** — `CDA-CAN-002`, 20 × 40 in, **$395**
- **Lake, Links, and the Floating Green** — `CDA-CAN-006`, 24 × 48 in,
  **$525**
- **Business/custom placement:** Harbor at the Heart — `CDA-CAN-003`,
  30 × 40 in, **$495**

Internal lifecycle:

- **Hidden archive:** Autumn Over Coeur d’Alene — 0021; Fairways Along the
  Lake — 0043; The Clock at Resort Circle — 0056; A Window Through the
  Pines — 0016; Where Downtown Opens to the Lake — 0059
- **Seasonal hold:** Lake City Autumn Collection
- Format: gallery-wrapped canvas, open edition
- Cart: active
- Checkout: active for the five public works through Square-hosted checkout
- Production maps: eight Square keys and eight fulfillment rows verified
- Proof state: selected physical-proof and image-master tasks remain open under
  explicit private waivers; `proofApproved` remains false where no proof was
  received
- Recovery: `--profile=curated` previews the earlier lean three-work set,
  `--profile=gallery-balanced` the current five-work set, and
  `--profile=broad-recovery` the eight-work broad recovery set

---

SOT: horizon/ is the canonical Horizon frontend source (see SOT.json); planning/canvas is design provenance only.
