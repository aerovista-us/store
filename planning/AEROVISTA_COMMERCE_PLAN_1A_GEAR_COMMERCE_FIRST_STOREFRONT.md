# AeroVista Commerce Plan 1A

## Make the Live Gear Storefront Commerce-First Without Changing the Commerce Backend

**Mode:** Controlled presentation-layer release  
**Protected production surface:** `https://gear.aerovista.us`  
**Execution point:** After Plan 1 Phase 0 establishes a verified Gear baseline and rollback artifact; before Horizon adopts the shared storefront pattern  
**Canonical storefront source:** `store/index.html`, synchronized by `scripts/sync-store.mjs` into the public build  
**Primary rule:** Improve product discovery and shorten the path to checkout without changing catalog truth, product/variation identity, cart semantics, Square checkout, fulfillment, DNS, or hosting

## Current Status — Complete and Live

Plan 1A is deployed at `https://gear.aerovista.us` and was reverified on July
22, 2026 PT, and again on July 23, 2026 PT (homepage, About, health, and
same-origin bootstrap checks). A July 25 read-only audit again confirmed the
homepage, `about.html`, API health, and bootstrap return `200`; the live build
is `2026-07-21-commerce-first-1a`, and the corrected
`storedVid || mappedVid` priority remains deployed.

- Eight purchasable products appear directly on the homepage.
- A customer can open product details and reach Add to Bag in one product-card
  action, with required variation selection still enforced.
- Story content moved to the dedicated About page.
- Shipping, returns, FAQ, and contact information have dedicated policy
  destinations.
- Advanced catalog filters are collapsed under **More Filters**.
- Catalog, overlay, storefront, checkout-fix, and conversion audits passed.
- Desktop and mobile production checks passed without browser errors or
  horizontal overflow.
- Two products sharing a display/cart SKU retained distinct Square variation
  IDs through selection and checkout handoff.
- Existing catalog, console, Square checkout, backend data flows, DNS, and
  hosting were not replaced by this presentation release.

This plan is now the protected customer-experience baseline for the shared
storefront work and Horizon planning. Future changes require a new release and
must not be treated as unfinished Plan 1A work.

## 1. Outcome

Change Gear from a story-first landing experience to a commerce-first storefront while preserving its visual identity and current working purchase path.

The new customer journey is:

```text
Open Gear
  -> see real products, names, and prices on the homepage
  -> open a product in one action
  -> choose required options and add to bag
  -> checkout through the existing Square path
```

The longer AeroVista narrative remains available through an About/Story destination and a short homepage teaser, but it no longer blocks product discovery.

This release also establishes the default information architecture that Horizon and future storefronts will receive from the shared storefront core.

## 2. Why This Release Comes Before Horizon

The current Gear homepage deliberately makes visitors pass through brand and collection explanation before normal product browsing. The live audit found:

- The hero contains several competing actions and explanatory blocks before products.
- The collection-entry section explicitly prioritizes understanding the brand world before browsing.
- The first product imagery appears in the later Featured Drop section and does not initially expose complete product-card information such as name and price.
- The full catalog requires a separate `All pieces` or `Shop` action.
- The full catalog places category and tag controls before the product grid; the tag row can create additional visual noise.
- The observed path is approximately homepage -> catalog/collection -> product modal -> add to bag -> cart/checkout.

Fixing this pattern on Gear first prevents the same conversion problem from becoming the reusable template for Horizon.

## 3. Scope and Safety Boundary

### In scope

- Homepage section order and responsive layout
- A catalog-driven homepage product grid
- Compact hero copy and action hierarchy
- Collection shortcuts after products
- About/Story navigation and content destination
- Consolidated catalog filters
- Real FAQ, Shipping, Returns, and Contact destinations or existing accessible policy views
- Accessibility, performance, analytics, visual regression, and conversion-path checks
- Store-aware configuration requirements needed by the later shared core and operator console

### Explicitly out of scope

- Catalog migration or destructive overlay changes
- Square product, variation, price, inventory, or provider mapping changes
- Cart-key or stored `variationId` changes
- Checkout API, webhook, order, fulfillment, tax, promotion, or shipping calculation changes
- Gear DNS, GitHub Pages origin, Cloudflare `/api` proxy, or NXCore backend changes
- Horizon launch
- Rewriting the 300 KB storefront monolith into the shared core during this release
- Adding speculative quick-add behavior that bypasses required product options
- A complete AeroVista rebrand

If implementation reveals that any required UX change needs a checkout, catalog, or provider-contract change, stop that item and move it to the relevant Plan 1 backend phase rather than expanding this release.

## 4. Non-Negotiable Guardrails

1. `store/index.html` remains the canonical source. Do not hand-edit generated `public/shop/` or `dist/` copies.
2. The same normalized product object and sellability rules must power homepage, collection, catalog, modal, and cart behavior.
3. Homepage products must be drawn only from products that are visible and have a sellable Square variation under the current bootstrap/fallback logic.
4. Product identity remains catalog `id`; checkout identity remains the selected Square `variationId`.
5. The product modal continues to require all necessary options before Add to bag.
6. The existing cart namespace, local-storage compatibility, `/api/square/bootstrap`, and `/api/square/checkout` behavior remain unchanged.
7. Do not enable client-side Quick Add for products with unresolved options.
8. Preserve collection and catalog deep links, browser Back behavior, keyboard focus, modal focus return, and reduced-motion behavior.
9. No production test may create a charge or fulfillment order without explicit authorization.
10. A verified prior Gear artifact and rollback command must exist before deployment.

## 5. Target Storefront Information Architecture

### Homepage order

| Order | Section | Required behavior |
|---:|---|---|
| 1 | Header | `Shop`, `Collections`, `About`, Search, and Cart are clear; Shop is the primary navigation action |
| 2 | Compact hero | One headline, one short supporting sentence, primary `Shop products`, secondary `Our story`; no three-card explanation block before products |
| 3 | Featured products | Display 6-12 catalog-driven products with image, name, price, and one-click access to the existing product modal |
| 4 | Shop all | Clear route to the full searchable/filterable catalog |
| 5 | Collections | Compact Core, Shadow Wear, Apex, Glitch, and Architect shortcuts; collection pages remain optional browsing paths, not required purchase steps |
| 6 | Trust strip | Secure Square checkout, made-to-order timing, shipping, and returns links near the commerce content |
| 7 | Story teaser | Short AeroVista introduction and `Read our story` link |
| 8 | Signup/footer | Existing signal/signup treatment plus working FAQ, Shipping, Returns, and Contact links |

### Full catalog

- Keep search, category filters, collection selection, sorting, and results count.
- Keep the primary category choices visible.
- Move the long tag list behind a single `Filters` or `More filters` disclosure, especially on mobile.
- Display products before secondary filter noise.
- Preserve current collection and `?view=catalog` routes during this release.

### About/Story destination

The destination may initially use the existing storefront routing shell to minimize duplicated code, but it must have a stable linkable URL, semantic heading structure, and working browser navigation. It should contain:

- AeroVista Apparel purpose and origin
- Curation, palette, and signal principles
- Collection-world explanations
- Architect/build-story content
- A clear `Shop products` return action

`Signal Lab / Coming Online` should move off the primary shopping path. If retained, it belongs on About/Story or a separate future-projects section.

## 6. Merchandising Rules

Homepage selection must be deterministic and operator-controlled.

For the current compatibility release:

1. Prefer visible products tagged `featured` in `storefront_overlay.json`.
2. Respect the existing overlay `order` field when present.
3. Use an explicit, reviewed fallback list of catalog product IDs only if the overlay does not supply enough products.
4. Exclude hidden products, products with no image, and products with no sellable variation.
5. Never infer checkout eligibility from display tags alone.
6. Display a minimum of four products when available; target eight on the initial Gear release.
7. Include a balanced mix of categories instead of allowing one product type to occupy the entire homepage.

The later multi-store console/shared-core model should expose these fields per store:

```json
{
  "home": {
    "hero": {
      "headline": "Quiet essentials. Confident marks.",
      "summary": "A short commerce-focused statement."
    },
    "featuredProductIds": [],
    "featuredLimit": 8,
    "collectionOrder": ["core", "shadow", "apex", "glitch", "architect"],
    "sectionOrder": ["hero", "featured", "collections", "trust", "story"]
  }
}
```

That normalized configuration is a later Plan 1 deliverable. This release should use a compatibility reader instead of requiring a schema migration.

## 7. Phase 0 — Baseline, Evidence, and Rollback

Do not edit the live storefront until the Plan 1 stabilization gate is satisfied.

Tasks:

1. Reconcile the current dirty worktree into an intentional implementation branch or immutable source snapshot without discarding unrelated work.
2. Record the exact Gear source commit/release, production HTML checksum, catalog checksum, overlay checksum, checkout-ready checksum, and public artifact checksum.
3. Capture desktop and mobile screenshots of home, catalog, one collection, product modal, cart, and checkout handoff.
4. Record visible product count, sellable product count, missing-image count, and the featured product IDs currently used.
5. Run the existing storefront, checkout-key, checkout-collision, and live checkout-fix audits at their appropriate local or production stage.
6. Confirm the previous Gear build can be restored from an exact artifact or commit.
7. Record the rollback owner and command.

Gate 0 passes when the present Gear customer path is reproducible, the known variation-ID correction is verified, and rollback does not depend on reconstructing files from the dirty working tree.

## 8. Phase 1 — Add Conversion Regression Coverage

Create protection before changing layout.

Tasks:

1. Add a browser test that loads a local production-style preview and verifies homepage, catalog, collection, product modal, cart, and checkout-initiation behavior.
2. Assert that at least four eligible products expose image, name, and formatted price on the homepage.
3. Assert that one product action opens the correct modal and retains the expected product ID.
4. Assert that required options and sellable variants still control Add to bag.
5. Assert that different products retain different `variationId` values in cart payloads.
6. Assert that catalog search, category filtering, collection filtering, sorting, Back, and refresh continue to work.
7. Assert keyboard access, modal focus trap, Escape close, and focus return.
8. Add structural checks for working About, FAQ, Shipping, Returns, and Contact destinations.
9. Capture baseline screenshots at desktop and phone widths for visual comparison.
10. Add a focused audit script for commerce-first homepage requirements rather than overloading the checkout audit.

Gate 1 passes when the new tests fail against the missing commerce-first requirements while the existing purchase-path assertions pass against the current implementation.

## 9. Phase 2 — Build the Commerce-First Homepage

Implement this phase in `store/index.html` using current rendering and modal functions wherever possible.

Tasks:

1. Reduce hero height and remove the Curation/Palette/Signal cards from the pre-product area.
2. Make `Shop products` the primary hero action and `Our story` secondary.
3. Add a semantic homepage product section directly after the compact hero.
4. Render homepage cards through the same product-card/product-modal behavior used by the catalog; do not create a second product-data interpretation.
5. Show image, collection/category, product name, formatted price, and `Choose options` or `Shop` action.
6. Open the existing modal from the card image, title, and action with correct accessible names.
7. Add a visible `Shop all products` action after the featured grid.
8. Move the current large collection-door experience below the product grid and reduce its vertical dominance while preserving collection routes.
9. Move long Curation/Palette/Signal, visitor-map, and Signal Lab content to the About/Story destination.
10. Add a compact trust strip beside or immediately after product content.
11. Update the skip link to target products first, with a secondary skip/navigation path for collections.
12. Preserve the current hero visual only if it fits the compact layout and does not delay product rendering or materially harm mobile performance.

Gate 2 passes when a first-time visitor can see a real product name and price without choosing a collection or opening the full catalog, and can open a product in one action.

## 10. Phase 3 — Simplify Navigation and Secondary Content

Tasks:

1. Add explicit `Collections` and `About` navigation while retaining Shop, Search, and Cart.
2. Make the brand/home link use a stable home route instead of an inert `href="#"` destination.
3. Create a stable About/Story URL or view and move the approved narrative content into it.
4. Replace placeholder footer links with actual routes or accessible policy views whose URLs and Back behavior work.
5. Put secondary catalog tags behind a filters disclosure; retain category chips and collection selector.
6. Ensure the search shortcut opens/focuses the catalog search predictably from any storefront view.
7. Keep all customer-facing policy statements consistent with the existing modal text and approved operations policy.
8. Update metadata and internal links if a separate About page is created.

Gate 3 passes when every primary navigation and footer destination is functional, product browsing remains the default homepage priority, and narrative content is reachable without occupying the purchase path.

## 11. Phase 4 — Quality and Purchase-Path Verification

Run all checks against the synchronized source and the production-style Pages artifact, not only by opening `store/index.html` directly.

Required commands/checks:

```text
npm run audit:overlay
npm run audit:storefront
npm run audit:checkout-keys
npm run audit:checkout-collisions
npm run build:pages
```

Run `npm run verify:checkout-fix` only against the appropriate deployed target because it validates live HTML.

Required browser matrix:

- Current Chrome/Edge desktop at approximately 1440 x 900
- Phone viewport approximately 390 x 844
- Tablet viewport approximately 768 x 1024
- Keyboard-only pass
- Reduced-motion pass
- Fresh storage and existing-cart compatibility pass

Required customer paths:

1. Home -> featured product -> options -> Add to bag -> cart -> checkout initiation.
2. Home -> Shop all -> search/filter -> product -> Add to bag.
3. Home -> collection -> product -> Add to bag.
4. Home -> About/Story -> Shop products -> product.
5. Home -> Shipping/Returns/FAQ/Contact -> Back -> preserved shopping state.
6. Cart containing two or more products with overlapping cart keys -> checkout payload with correct distinct variation IDs.

Quality budgets:

- Product content must not wait for nonessential hero animation to finish.
- Homepage images must use dimensions, lazy loading below the initial product row, and existing safe URL encoding.
- No new console errors, broken images, layout shift from missing image dimensions, inaccessible controls, or dead links.
- The initial mobile view must clearly indicate that products are available without requiring a collection choice.

Gate 4 passes when existing checkout regression tests remain green and the commerce-first acceptance criteria pass on the production-style artifact.

## 12. Phase 5 — Controlled Gear Release

Deployment sequence:

1. Freeze catalog and overlay publishing for the short release window.
2. Build from the reviewed canonical source.
3. Record source commit, catalog/overlay checksums, build artifact checksum, and rollback artifact.
4. Verify the exact artifact locally or at an isolated preview origin.
5. Deploy only the Gear static artifact through the existing GitHub Pages workflow.
6. Leave API proxy, NXCore backend, Square configuration, DNS, catalog, and fulfillment services unchanged.
7. Run the production smoke path in a clean browser.
8. Monitor homepage errors, product-modal opens, Add to bag, checkout initiation errors, and customer reports.
9. Record the release and evidence in AVCC.

Production smoke path:

1. Confirm HTTPS, Gear identity, catalog version, and expected featured products.
2. Open one featured product and confirm title, price, image, sizes, and sellability.
3. Add it to the bag and verify cart persistence after refresh.
4. Add a second different product and verify both retain distinct variation IDs.
5. Start checkout without completing an unauthorized charge and verify the correct Square destination and line items.
6. Verify Shop, Collections, About, Search, Cart, FAQ, Shipping, Returns, and Contact.
7. Repeat the homepage/product path on a phone viewport.

## 13. Rollback

Rollback triggers include:

- Products do not appear or show incorrect products/prices
- Product action opens the wrong modal
- Required options or Add to bag regress
- Cart loses or substitutes a product/variation ID
- Checkout cannot start or shows incorrect line items
- Catalog or collection routes break
- Critical mobile, keyboard, or navigation failure
- Material increase in JavaScript errors or broken media

Rollback sequence:

1. Stop new checkout initiation only if product or pricing integrity is uncertain.
2. Restore the prior verified Gear static artifact or revert to the exact prior release commit.
3. Purge only affected Gear static cache paths when required.
4. Verify the previous homepage, product modal, cart, and checkout handoff.
5. Leave backend, provider, and fulfillment state untouched because this plan performs no data migration.
6. Preserve the failed artifact, screenshots, console output, and release record for diagnosis.

## 14. Acceptance Criteria

Plan 1A is complete when:

- A homepage visitor sees product images, names, and prices before being required to choose a collection or full catalog view.
- At least four eligible products appear on the homepage, with eight as the initial merchandising target.
- A product can be opened from the homepage in one action.
- The normal homepage path to checkout initiation is no more than three meaningful actions after any required option choice: open product, Add to bag, Checkout.
- Shop is the primary action; About/Story is clearly available but secondary.
- Collections remain useful shortcuts rather than mandatory gateways.
- The long brand narrative and Signal Lab no longer precede product discovery.
- Secondary tag filters no longer dominate the catalog before products.
- FAQ, Shipping, Returns, Contact, About, and primary navigation destinations work.
- Catalog, overlay, Square bootstrap, stored variation IDs, cart, checkout, API proxy, orders, and fulfillment behavior are unchanged.
- Existing audits plus the new conversion-path browser tests pass.
- Desktop, phone, keyboard, and reduced-motion checks pass.
- The prior Gear release remains restorable and the release record contains evidence and rollback instructions.

## 15. Relationship to the Multi-Store Roadmap

After this plan passes:

1. Plan 1 continues the store-aware schema, console, API, shared-core, and media work.
2. The shared storefront core treats this commerce-first information architecture as the Gear reference, not the older story-first layout.
3. Horizon uses the same structural pattern with its own hero, featured products, collections, trust content, About/Story copy, theme, catalog channel, cart namespace, deployment, and rollback.
4. The operator console eventually manages homepage merchandising per `storeId` using featured products and section ordering.
5. Each storefront remains independently deployable; improving Gear does not authorize a Horizon or backend cutover.
