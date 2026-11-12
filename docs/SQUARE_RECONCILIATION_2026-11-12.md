# Square live reconciliation — 2026-11-12

## Authority and scope

- Live Square API: **141 ITEM objects**; Gear/Apparel legacy public feed: **115 product records**.
- Latest Square item update observed: **2026-11-06 14:04:36 UTC** (AV Owl sticker). **No Square item was newly changed since the prior November 6 audit**.
- **20 Square items are not represented in the legacy public feed.** This is a publication/destination backlog, not automatically 20 sale-ready products.
- 3 matched records have differences: one actively listed Lumina hoodie has 6 stale prices; a hidden Burst Lens hoodie has an alternate display name; Consultation (service) has a provider SKU discrepancy.
- This change updates **only the six existing Lumina hoodie prices** to Square’s verified $58.00 per variation. It does not change Square, publish new products, alter sticker bundling, or expand distribution across Gear/Apparel/Horizon.

## Released price correction

| Product | Existing sizes | Feed prior | Square current / corrected feed |
|---|---|---|---|
| Lumina premium mid-weight hoodie | S / M / L / XL | $34.00 | $58.00 |
| Lumina premium mid-weight hoodie | 2XL | $37.00 | $58.00 |
| Lumina premium mid-weight hoodie | 3XL | $40.00 | $58.00 |

Square item ZV5P42AMDXFPBEB7XYC3U6DW, six stable variation IDs. Existing storefront IDs, SKUs, descriptions, images, category, collection and visibility are unchanged.

## Square-only items needing destination/fulfillment review

| Square item | Variations | Images | Workflow |
|---|---:|---:|---|
| AV Owl - Sticker | 1 | 1 | Candidate — validate Printful mapping, shipping margin and destination approval |
| Bubble-free stickers | 2 | 2 | Candidate — validate Printful mapping, shipping margin and destination approval |
| Whats Next?- Bold, Bright and Glitchy Kiss Cut Sticker | 4 | 4 | Candidate — validate Printful mapping, shipping margin and destination approval |
| Aerovista Arrow Women's Racerback Cropped Tank- Follow your Path | 5 | 2 | Candidate — validate Printful mapping, shipping margin and destination approval |
| mount sled sticker | 1 | 1 | Already present in flagship-only sticker contract — no Gear exposure |
| owl | 1 | 1 | Hold — review duplicate against AV Owl |
| The EchoVerse After Dark — Haunted Mixtape Vol. 1 Hoodie | 6 | 1 | Candidate — validate Printful mapping, shipping margin and destination approval |
| EchoVerse After Dark — Ghost Frequency Beanie | 1 | 2 | Candidate — validate Printful mapping, shipping margin and destination approval |
| AeroVista After Dark — Neon Velocity Hoodie | 6 | 4 | Candidate — validate Printful mapping, shipping margin and destination approval |
| AeroVista After Dark — Midnight Signal Hoodie | 6 | 1 | Candidate — validate Printful mapping, shipping margin and destination approval |
| LotScope Advanced — Paid | 1 | 0 | Internal/service — exclude from public Apparel |
| LotScope Advanced — Pilot | 1 | 0 | Internal/service — exclude from public Apparel |
| Shadow scale camouflage beanie | 3 | 5 | Candidate — validate Printful mapping, shipping margin and destination approval |
| RidgeLine Cuffed Beanie | 2 | 3 | Candidate — validate Printful mapping, shipping margin and destination approval |
| W | 1 | 0 | Internal/service — exclude from public Apparel |
| MuseFace | 1 | 1 | Internal/service — exclude from public Apparel |
| Burst Lens • Lumina • Pullover Hoodie | 6 | 2 | Hold — hidden Lumina duplicate / identity review |
| Rental | 1 | 0 | Internal/service — exclude from public Apparel |
| Launch Pack — Brand, Website & Offer System (Deposit) | 1 | 0 | Internal/service — exclude from public Apparel |
| Temp | 1 | 0 | Internal/service — exclude from public Apparel |

## Outstanding gates for new product publication

1. Match Square Item ID and every variation ID to exact Printful sync external IDs, verify sizes, costs, shipping and fulfillment eligibility.
2. Verify product artwork, copy, price and margin; exclude client/internal/service items.
3. Assign deliberate destinations and physical showroom fixtures; preserve themed Drops and Women’s Studio.
4. Preserve Apparel-only sticker bundle pricing and SKU allowlist; do not globally change other stores’ sticker offers.
5. Validate catalog, draft checkout/order totals and post-deployment product rendering before expanding public visibility.

## Audit boundaries

Only an existing published price was reconciled. Product additions and broader sync remain held for catalog import-review and distribution workflow; Square itself was not written to.
