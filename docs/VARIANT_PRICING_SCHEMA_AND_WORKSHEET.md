# Variant Pricing Schema and Worksheet

Use this to design sizing, color, and per-item pricing before pushing values into:

- `SQUARE_SKU_MAP_JSON` (checkout pricing map)
- `storefront_overlay.json` (tags/featured/order/visibility/copy)

This is a Level A planning tool: fast, editable, and safe.

---

## 1) Practical schema (concept model)

```json
{
  "meta": {
    "currency": "USD",
    "version": 1
  },
  "items": [
    {
      "itemId": "apex-draft-pullover-hoodie",
      "title": "Apex Draft Pullover Hoodie",
      "basePriceCents": 5500,
      "colors": [
        { "colorId": "black", "label": "Black", "cartColorToken": "Default", "colorDeltaCents": 0 },
        { "colorId": "white", "label": "White", "cartColorToken": "White", "colorDeltaCents": 0 }
      ],
      "sizes": [
        { "size": "M", "sizeDeltaCents": 0 },
        { "size": "L", "sizeDeltaCents": 0 },
        { "size": "2XL", "sizeDeltaCents": 500 }
      ],
      "variants": [
        {
          "cartKey": "Default__2XL",
          "variationId": "SQ_VARIATION_ID_OPTIONAL",
          "sku": "OPTIONAL_INTERNAL_SKU",
          "enabled": true,
          "tags": ["division:nexus", "hoodie"]
        }
      ]
    }
  ]
}
```

### What this lets you control

- **Sizing price curves** (`sizeDeltaCents`)
- **Color surcharges** (`colorDeltaCents`)
- **Final variant price** = `basePriceCents + colorDeltaCents + sizeDeltaCents`
- **Dual-key migration path**
  - now: `cartKey` driven checkout map
  - later: `variationId`-first mapping

---

## 2) Worksheet columns (fill this first)

Use `docs/variant_pricing_worksheet.csv`.

Column meaning:

- `itemId` — stable internal item slug
- `itemTitle` — display title
- `color` — customer-facing color label
- `size` — variant size
- `cartColorToken` — token used by cart key (`Default`, `Black`, etc.)
- `cartKey` — computed key used by current checkout map (`<cartColorToken>__<size>`)
- `variationId` — Square variation id (when known)
- `sku` — optional internal sku/handle
- `basePriceCents` — base item price in cents
- `colorDeltaCents` — color adjustment in cents
- `sizeDeltaCents` — size adjustment in cents
- `finalPriceCents` — total for checkout map
- `enabled` — `true/false` for sellability
- `tags` — pipe-separated tags (`division:nexus|featured|hoodie`)
- `notes` — anything operational

---

## 3) Generation targets

From worksheet rows, you can generate:

1. **Checkout map (`SQUARE_SKU_MAP_JSON`)**
   - key = `cartKey`
   - value = `{ "name": itemTitle + variant label, "cents": finalPriceCents }`

2. **Overlay entries (`storefront_overlay.json`)**
   - primary key by `variationId` (when available)
   - fallback key by `cartKey`
   - include `tags`, `order`, `visible`, `title`, `description`

---

## 4) Minimum viable process

1. Fill worksheet rows for 1-2 products first
2. Validate `finalPriceCents`
3. Export/update `SQUARE_SKU_MAP_JSON`
4. Add overlay tags/featured/ordering entries
5. Test checkout (`POST /api/square/checkout`)
6. Expand to full catalog

---

## 5) Notes for future migration

- Keep checkout map cart-key based while stabilizing.
- As Square catalog anchors mature, move pricing and overlay matching toward `variationId`.
- If you add a third key later (canonical AV SKU), lookup order should be:
  - `variationId` -> `canonicalSku` -> `cartKey`.

Identity split (current):
- **Merchandising identity:** `variationId`
- **Checkout identity:** `cartKey` (`cart[].sku`)

---

## 6) Auto-generate SKU map from Square export

Generator script:
- `tools/generate_sku_map.py`

Inputs/outputs:
- input: `square_products_latest.json`
- output JSON: `backend/sku_map.generated.json`
- output env line: `backend/sku_map.generated.env`

Run (Python-enabled environment):

```bash
python tools/generate_sku_map.py --input square_products_latest.json --output backend/sku_map.generated.json --env-output backend/sku_map.generated.env
```

Backend map resolution order:
1. `SQUARE_SKU_MAP_JSON` env
2. `SQUARE_SKU_MAP_FILE` (default `backend/sku_map.generated.json`)

---

## 7) Incident sanity checks (Unknown SKU 400)

### A) What did the UI send?
- Check browser console for:
  - `CHECKOUT payload: { cart: [{ sku, variationId, qty }], ... }`

### B) Does backend contain that key?

On NXCore:

```bash
docker exec av-store-api sh -lc 'python - <<PY
import os, json
raw = os.environ.get("SQUARE_SKU_MAP_JSON","").strip()
if raw:
    m = json.loads(raw)
else:
    path = os.environ.get("SQUARE_SKU_MAP_FILE","/app/sku_map.generated.json")
    m = json.load(open(path))
print("entries:", len(m))
print("sample keys:", list(m)[:15])
PY'
```

### C) Direct checkout probe

```bash
curl -sS -i -X POST https://api.aerovista.us/api/square/checkout \
  -H "Content-Type: application/json" \
  -d '{"cart":[{"sku":"Default__2XL","qty":1}]}'
```

---

## 8) First real `SQUARE_SKU_MAP_JSON` block (Default sizes)

Generated from `docs/variant_pricing_worksheet.csv` starter rows:

```json
{
  "Default__S": { "name": "Apex Draft Pullover Hoodie (Black, S)", "cents": 5500 },
  "Default__M": { "name": "Apex Draft Pullover Hoodie (Black, M)", "cents": 5500 },
  "Default__L": { "name": "Apex Draft Pullover Hoodie (Black, L)", "cents": 5500 },
  "Default__XL": { "name": "Apex Draft Pullover Hoodie (Black, XL)", "cents": 5500 },
  "Default__2XL": { "name": "Apex Draft Pullover Hoodie (Black, 2XL)", "cents": 6000 },
  "Default__3XL": { "name": "Apex Draft Pullover Hoodie (Black, 3XL)", "cents": 6000 },
  "White__L": { "name": "Apex Draft Pullover Hoodie (White, L)", "cents": 5500 }
}
```

Paste-ready `.env` line:

```env
SQUARE_SKU_MAP_JSON={"Default__S":{"name":"Apex Draft Pullover Hoodie (Black, S)","cents":5500},"Default__M":{"name":"Apex Draft Pullover Hoodie (Black, M)","cents":5500},"Default__L":{"name":"Apex Draft Pullover Hoodie (Black, L)","cents":5500},"Default__XL":{"name":"Apex Draft Pullover Hoodie (Black, XL)","cents":5500},"Default__2XL":{"name":"Apex Draft Pullover Hoodie (Black, 2XL)","cents":6000},"Default__3XL":{"name":"Apex Draft Pullover Hoodie (Black, 3XL)","cents":6000},"White__L":{"name":"Apex Draft Pullover Hoodie (White, L)","cents":5500}}
```
