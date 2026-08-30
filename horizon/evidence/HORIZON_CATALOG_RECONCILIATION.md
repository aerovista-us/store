# Horizon Catalog and Mockup Reconciliation

**Date:** July 25, 2026  
**Status:** Draft; approval and signed rights record required  
**Source:** `1149XBNG8C8ZE_catalog-2026-07-25-0932.xlsx`, `Sheet1!A1:AL6`

This reconciliation links the five Horizon candidate catalog records to the
four newly supplied canvas mockups. It does not authorize a catalog import,
provider submission, preview publication, or live storefront change.

## Candidate mapping

| Catalog record | Price | Candidate mockup | Canvas size | Confidence | Result |
| --- | ---: | --- | --- | --- | --- |
| CDA Clock | $250 | `canvas-(in)-30x60-wall-6a645d403c53d.png` | 60 × 30 in | High | Subject and `6A645D` identifier prefix agree |
| Canvas | $250 | `canvas-(in)-30x60-wall-6a64660c12e12.png` | 60 × 30 in | Provisional | Match by elimination and `6A646` prefix; rename and confirmation required |
| Floating Green | $250 | `canvas-(in)-40x60-wall-6a6479ac402eb.png` | 60 × 40 in | High | Subject and `6A6479` identifier prefix agree |
| lake cove | $150 | `canvas-(in)-16x20-wall-6a6463370a8c2.png` | 20 × 16 in | High | Rocky Tubbs Hill cove subject and `6A646` prefix agree |
| Center Clock | $250 | None confirmed | Unknown | Unmatched | Could overlap CDA Clock, but no supplied asset identifier supports assignment |

The existing `canvas-(in)-16x48-wall.png` also shows the downtown clock scene,
but it has no vendor asset ID. It remains unassigned until the relationship
between CDA Clock and Center Clock is confirmed.

## Import blockers

- The workbook contains the literal value `41` in customer-facing name,
  variation, SEO, permalink, GTIN, sellable, stock, option, and inventory
  fields.
- All five records use the generic `Utility` category.
- The size encoded in each mockup filename is not represented by a valid
  Square variation or option value.
- The generic `Canvas` record has no artwork-specific title or description.
- Print-ready source artwork, approved alt text, a completed and signed
  `HORIZON_ARTWORK_RIGHTS_ATTESTATION.md` record, and Printful variant mappings
  are absent. AeroVista LLC is the selected rights holder, and the internal
  capture declaration is recorded without public individual attribution. The
  company work-made-for-hire/assignment instrument and private signature
  remain pending.
- Provider roles are selected: Square handles payment; Printful handles
  production, printing, fulfillment, and shipping. This decision does not
  resolve item- and size-level provider mappings.

## Safe next action

Approve or correct the four candidate matches and explain whether CDA Clock
and Center Clock are separate works. Then create clean, Horizon-only catalog
records from the approved values rather than importing this workbook as-is.
For ownership confirmation, complete the artwork register and sign the private
record described in `HORIZON_ARTWORK_RIGHTS_ATTESTATION.md`; do not commit
personal ID or the signed original to this repository.

The machine-readable evidence and unresolved fields are recorded in
`catalog-reconciliation-2026-07-25.json`.
