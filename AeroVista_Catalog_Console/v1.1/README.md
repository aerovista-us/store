# AeroVista Catalog Console (Local HTML App)

A local-first HTML editor for Square-style product JSON catalogs.

## Features
- Import `.json` (array of products or `{meta, products}` shape) or Square Excel/CSV
- Browse/search/filter (group/type)
- Edit: title, description, group, type, tags, status
- Edit variants (SKU, color, size, price, inventory)
- Auto-split variants if size contains "Color, Size"
- **Export JSON** — Store catalog format (`square_products_edited.json`)
- **Export Overlay JSON** — Store overlay format (`storefront_overlay.json`); Load overlay to merge with existing
- **Export table** — Square CSV for re-import
- **Export Edits CSV** — Overlay-style CSV for reapplying edits
- **Save to Project** — Writes catalog + overlay directly to project folder with pre-export autobackup (Chrome/Edge)
- Save/load from `localStorage`

## Run
Open `index.html` in a browser (Chrome/Edge recommended).

## Notes
- No server needed
- No network calls besides Tailwind CDN


## v1.1 upgrades
- Bulk actions (tags, group/type, pricing rules, normalize sizes/colors, merge duplicates)
- Validation panel (missing desc/price, dup SKUs, invalid sizes, no variants) + export issues CSV
