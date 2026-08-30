# Product image folders

The tracked canonical image source is:

```text
store/products/{canonical-product-id}/
```

`npm run sync:store` mirrors those folders to
`public/store/products/{canonical-product-id}/`, which is served at the stable
runtime URL `/store/products/{canonical-product-id}/`.

Each product folder contains:

- `01-hero.*` — primary catalog and storefront image.
- `10–19` — front views.
- `20–29` — back views.
- `30–34` — left views.
- `35–39` — left-front views.
- `40–44` — right views.
- `45–49` — right-front and rear-angle views.
- `50–59` — detail and zoom views.
- `60–69` — uncategorized alternates.
- `manifest.json` — product identity, source archives, original filenames, hashes, and gallery order.

The active catalog stores the primary path in `image`, the ordered gallery in
`images`, and the manifest path in `image_manifest`.

Original provider archives remain unchanged in `_incoming` until the import has
been reviewed. Run `scripts/archive-completed-product-zips.ps1` after review to
move every manifest-referenced archive into `_completed`, leaving unresolved
exports in staging. Duplicate downloads are recorded in the destination
manifest and are not imported twice.

Storefront copies use WebP. Original PNG/JPEG assets remain recoverable from the
preserved provider ZIPs. Run `python scripts/optimize-product-images.py` after a
new import, then `npm run sync:store` to refresh the runtime mirror.
