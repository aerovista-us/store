# Square Cleanup Todo

Date: 2026-04-02

Source export:
- [1149XBNG8C8ZE_catalog-2026-04-02-0541.csv](\\100.115.9.61\Collab\mini.shops\av_storefront\1149XBNG8C8ZE_catalog-2026-04-02-0541.csv)

This report answers one question: what still exists in Square as of the April 2, 2026 export, and what should be edited, merged, hidden, archived, or removed to get to a clean starter set.

## Summary

- 294 export rows
- 48 distinct Square item names
- Row visibility:
  - 272 `visible`
  - 14 `hidden`
  - 8 `unavailable`
- Archived rows:
  - 287 `N`
  - 7 `Y`

Important constraint:
- This Square CSV does not contain image URLs or image filenames.
- Image cleanup still has to be checked against the deployed storefront catalog JSON and local image assets.

## Remove Or Archive In Square

These are still present in Square and should be fully archived or removed if the goal is a clean starter set.

### Already hidden, but still present

- `Powder Peaks 8-Ball Hoodie — Black / White Ink`
  - rows: 6
  - visibility: hidden
  - action: archive or remove, not just hide
- `Powder Peaks 8-Ball Tee — Black / White Ink`
  - rows: 8
  - visibility: hidden
  - action: archive or remove, not just hide

### Still visible and should be removed

- `Observer • eye sigel • Pullover Hoodie • Black w/blue print`
  - rows: 6
  - visibility: visible
  - note: still uses generic hoodie stock copy
- `BONSAID bubble-free stickers`
  - rows: 2
  - visibility: visible
- `BONSAID “Rooted Resilience” Hoodie – Premium Print`
  - rows: 60
  - visibility: visible
- `BONSAID “Rooted Resilience” Oversized Heavyweight Hoodie`
  - rows: 36
  - visibility: visible
- `Bubble-free stickers`
  - rows: 2
  - visibility: visible

### Already gone from Square

- `echoverse`
  - rows: 0
  - action: no Square cleanup needed

## Review Families In Square

These are families that still need a decision, but they should not all be treated the same way.

### Neck gaiters

Current rows:
- `Neck Gaiter - Crypt tech - Gray`
- `Neck Gaiter - Crypt tech - Orange`
- `Neck Gaiter - Crypt tech - Red`

Current state:
- 3 separate visible items
- each has 1 row
- all three share the same generic neck gaiter description

Starter-set action:
- keep these as separate Square items if the prints are intentionally different
- do not combine them into one Square product
- audit the storefront image assignment for each one, because the current shared image pattern suggests an asset mismatch
- keep the storefront quick view and checkout path mapped to the correct separate product/variation for each print

### Wave Mark pair

Current rows:
- `AeroVista Wave Mark Full-Zip Hoodie – White`
  - rows: 6
  - visibility: visible
- `AeroVista “Wave Mark” Zip Hoodie (White)`
  - rows: 6
  - visibility: visible

Why this needs review:
- these look like the same family with naming drift
- local storefront catalog still uses the older name `AeroVista “Wave Mark” Zip Hoodie`

Starter-set action:
- decide whether these are intentionally separate products
- if not, keep one canonical item name in Square
- republish catalog so storefront and Square use the same title

## Fix Names Or Remove

These are visible in Square and still read like placeholders, internal rows, or stock-template product pages.

- `Glitch Orbit Logo - Black`
  - rows: 1
  - visibility: visible
  - action: keep, name is correct
- `Holographic stickers`
  - rows: 2
  - visibility: visible
  - action: keep, name is correct
- `glitch_drone • AeroVista • Tee - black`
  - rows: 6
  - visibility: visible
  - action: keep, name is corrected in the local starter catalog

## Additional Removals Requested

These are present in the April 2, 2026 Square export and should be removed or archived.

- `hy.go`
  - rows: 12
  - visibility: visible
- `Rental`
  - rows: 1
  - visibility: visible
- `Deported Comic Tee`
  - rows: 2
  - visibility: visible
- `Launch Pack — Brand, Website & Offer System (Deposit)`
  - rows: 1
  - visibility: unavailable
- `Temp`
  - rows: 1
  - visibility: visible

## Like-Product / Duplicate-Upload Review Targets

These are the strongest same-design or same-template signals from the current Square export plus storefront catalog analysis.

### Same description reused across multiple unrelated products

- `Observer • eye sigel • Pullover Hoodie • Black w/blue print`
- `glitch_drone • AeroVista • Tee - black`
- `hy.go`

Shared issue:
- all three use the same generic hoodie stock description

Recommended action:
- if they are not ready, remove/archive
- if they stay, rewrite each with product-specific copy before publishing

### Sticker duplicate family

- `BONSAID bubble-free stickers`
- `Bubble-free stickers`

Why it is suspicious:
- same product type
- overlapping sticker naming
- prior storefront-catalog audit showed shared image reuse in this family

Recommended action:
- keep one sticker listing only
- archive the duplicate row

### BONSAID hoodie family

- `BONSAID “Rooted Resilience” Hoodie – Premium Print`
- `BONSAID “Rooted Resilience” Oversized Heavyweight Hoodie`

Why it is suspicious:
- same design family
- large visible variant count
- earlier storefront-catalog audit showed shared BONSAID art/image family

Recommended action:
- if only one BONSAID hoodie belongs in the starter set, archive the other
- if both stay, make the garment difference obvious in the title, copy, and images

## Image Follow-Up

The Square CSV cannot answer image coverage, so image truth still comes from the storefront catalog.

Products still lacking an image in the current local starter catalog:
- None

Notes:
- `AeroVista Premium Embroidered Hat – Black Cap with Signature Apex Mark` now has a local storefront asset at `img/AeroVista Premium Embroidered Hat.png`; republish after the next Square-aligned catalog update.
- `AeroVista • Apex Draft • Full-Zip Hoodie • Black` should use `drafted_a__zip_hoodie.png` in the storefront catalog after the next publish.

## Square Versus Local Catalog Drift

The export shows a few items that do not line up cleanly with the current local storefront catalog.

### Present in local storefront catalog but not in this Square export

- `AeroVista Apex Flexfit Structured Cap`
- `AeroVista “Wave Mark” Zip Hoodie`
- `CDA Pool League Circuit Long Sleeve Tee — Vintage Comic Print`

### Present in this Square export but not in the current local storefront catalog

- `BONSAID bubble-free stickers`
- `BONSAID “Rooted Resilience” Hoodie – Premium Print`
- `BONSAID “Rooted Resilience” Oversized Heavyweight Hoodie`
- `Bubble-free stickers`
- `Observer • eye sigel • Pullover Hoodie • Black w/blue print`
- `Powder Peaks 8-Ball Hoodie — Black / White Ink`
- `Powder Peaks 8-Ball Tee — Black / White Ink`
- `Launch Pack — Brand, Website & Offer System (Deposit)`
- `MuseFace`
- `Temp`

Interpretation:
- the local starter-set trim has not yet been pushed into Square
- there are also a few title drifts and legacy rows still hanging around upstream

## Non-Store Or Internal Review Targets

These should be explicitly removed from Square unless they are intentionally part of the storefront product universe.

- `MuseFace`
  - rows: 1
  - visibility: unavailable
  - archived: yes

Recommended action:
- archive or remove any item not meant to be in the storefront product universe

## Updated Todo List

1. Archive or remove the two hidden Powder Peaks items so they stop existing upstream.
2. Archive or remove the five visible starter-set removals still present in Square: Observer, BONSAID bubble-free stickers, BONSAID Premium Print hoodie, BONSAID Oversized Heavyweight hoodie, Bubble-free stickers.
3. Keep the three neck gaiters as separate Square products, but audit their storefront image assignments because the current shared image pattern looks wrong.
4. Decide whether the two Wave Mark white zip hoodies are both intentional; if not, keep one name only.
5. Remove or archive `hy.go`, `Rental`, `Deported Comic Tee`, `Temp`, and `Launch Pack — Brand, Website & Offer System (Deposit)`.
6. Keep the names `Glitch Orbit Logo - Black`, `Holographic stickers`, and `glitch_drone • AeroVista • Tee - black`.
7. Republish the storefront catalog from the cleaned Square source so the local JSON and Square export stop drifting.
