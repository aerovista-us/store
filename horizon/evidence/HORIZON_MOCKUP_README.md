# Horizon Canvas Gallery Mockup

Gallery-first storefront prototype for Horizon Aerial & Visual.

## Included

- Editorial, full-viewport gallery landing page
- Staggered canvas-style artwork cards with physical depth
- Collection filtering
- Artwork detail overlay
- Canvas size and finish selectors
- Interactive artwork-only and room-preview modes
- Responsive mobile layout
- Seven Coeur d’Alene field captures leading the collection, plus five generated placeholder artworks

## Run locally

```bash
npm install
npm run dev
```

Then open the local address shown by the development server.

## Production build

```bash
npm run build
```

## Commerce integration boundary

The current catalog is a local fixture in `app/page.tsx`. The final implementation should replace that fixture through the shared Horizon commerce adapter while preserving the same component-level artwork contract. Pricing, inventory, Square variation identifiers, fulfillment rules, and checkout URLs must remain backend-authoritative.

The Reserve button is intentionally preview-only.

## Candidate product mockups

Vendor-rendered canvas mockups are staged under
`public/gallery/mockups/`. Their intake manifest records dimensions,
checksums, and approval state.

These files are reference and product-display assets only. They are not
print-ready source artwork, are not connected to catalog products, and must
not be published or sent to fulfillment until the manifest's pending product,
rights, title, alt-text, and provider fields are resolved.

The July 25 catalog reconciliation is recorded in
`HORIZON_CATALOG_RECONCILIATION.md` and
`catalog-reconciliation-2026-07-25.json`. It proposes three high-confidence
matches, one provisional match, and leaves Center Clock unmatched. The source
workbook is not safe to import while its placeholder `41` values and missing
variant/provider fields remain.
