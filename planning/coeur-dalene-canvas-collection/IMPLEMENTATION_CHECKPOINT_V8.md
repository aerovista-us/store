# Coeur d’Alene collection — v8 implementation checkpoint

**Date:** 2026-07-26  
**Canonical storefront:** `V:\aerovista-store\horizon`

> Historical checkpoint. Public visibility was superseded by the recoverable
> curated migration recorded in
> `horizon/migrations/curated-2026-07-27/MIGRATION_REPORT.md`. Product and media
> evidence from this checkpoint remains preserved.

This checkpoint records the storefront decisions implemented from the supplied
v8 collection plan and the subsequent studio direction. Current product state
remains authoritative in `horizon/catalog.json`; commerce activation gates
remain authoritative in `horizon/COMMERCE_READINESS.md`.

## Implemented

- Seven finished works are public in the gated preview.
- A Window Through the Pines and Where Downtown Opens to the Lake are hidden;
  no public placeholder tiles remain.
- The Lake City Autumn Collection bundle remains hidden.
- Mahogany Wake — A Classic Runabout on Lake Coeur d’Alene is added as
  `CDA-CAN-010`, 20 × 28 in, $275.
- Its local source matches the Printful default-file checksum, and the active
  Printful sync variant is recorded in the local evidence/maps.
- Panorama cards use direct artwork derivatives without provider-room
  backgrounds.
- Canvas geometry uses subtly rounded front and wrap edges without a CSS
  shadow. Straight, overlapping seams keep the wrap faces connected, and a
  fine-pointer hover lifts the complete canvas object by four pixels.
- The SVG favicon has a new rounded Horizon/sun-line mark.
- View in Room is rebuilt as a responsive architectural scene with
  format-aware wall scale and Warm Gallery, Limestone, and Charcoal controls.
- Desktop and 390 × 844 mobile browser checks pass with zero console errors or
  warnings.

## Launch interpretation

The site has enough finished work for a public collection preview. It is not
yet approved for live commerce: all 11 variants remain fail-closed, and
`noindex` remains in place.

## Remaining launch-critical work

1. Complete rights and visual-rights records, including the visible person in
   Mahogany Wake.
2. Approve final crop/wrap masters and physical proofs.
3. Reconcile the Fairways price and Harbor format decision.
4. Back up, deploy, and audit the seven Square and Postgres/Printful mappings.
5. Run an approved controlled Square → webhook → Postgres → Printful order.
6. Publish approved policy/legal content and explicitly approve removal of
   `noindex`.

The source plan is planning evidence. This checkpoint records the implemented
storefront state so ongoing updates stay within the project folder.
