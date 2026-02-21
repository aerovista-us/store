# AeroVista Catalog Console (Local HTML App)

A local-first HTML editor for Square-style product JSON catalogs.

## Features
- Import `.json` (array of products or `{meta, products}` shape)
- Browse/search/filter (group/type)
- Edit: title, description, group, type, tags, status
- Edit variants (SKU, color, size, price, inventory)
- Auto-split variants if size contains "Color, Size"
- Export edited JSON (keeps `{meta, products}`)
- Export an overlay CSV (`catalog_edits_overlay.csv`) for reapplying edits later
- Save/load from `localStorage`

## Run
Open `index.html` in a browser (Chrome/Edge recommended).

## Notes
- No server needed
- No network calls besides Tailwind CDN


## v1.1 upgrades
- Bulk actions (tags, group/type, pricing rules, normalize sizes/colors, merge duplicates)
- Validation panel (missing desc/price, dup SKUs, invalid sizes, no variants) + export issues CSV
