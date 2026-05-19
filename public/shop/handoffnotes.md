# Developer handoff — AeroVista Storefront (`av_storefront`)

Quick map of the repo, how the storefront loads data, and common fixes. Longer guides: [README.md](README.md), [docs/HOW_TO_UPDATE_PRODUCTS.md](docs/HOW_TO_UPDATE_PRODUCTS.md), [docs/STORE_WORKFLOW.md](docs/STORE_WORKFLOW.md).

---

## 1) Where things live

| Area | Path |
|------|------|
| Customer storefront (static, no build) | `index.html` (repo root) |
| Default catalog JSON | `square_products_latest.json` (dated fallbacks in same folder) |
| Presentation / merchandising | `storefront_overlay.json` |
| Catalog editor (local HTML) | `AeroVista_Catalog_Console/v1.1/` |
| Checkout / Square / webhooks API | `backend/app.py` (Flask) |
| SKU map generator (canonical cart keys) | `tools/generate_sku_map.py` |
| API env / Docker | `backend/.env`, `backend/docker-compose*.yml` |

Technical stack detail for the API: [backend/SOT.json](backend/SOT.json).

---

## 2) Catalog loading (what the code actually does)

`index.html` loads **one** Square-shaped JSON catalog:

1. Optional `window.STORE_CATALOG_PATH` (if set, tried first).
2. Else `./square_products_latest.json` / `square_products_latest.json`.
3. Else dated fallbacks (e.g. `square_products_2026-02-11.json`).

There is **no** header toggle and **no** separate “edited” fetch path in the current loader. Refined or Console exports should be **merged or copied into** the file you deploy as `square_products_latest.json`, or you point `STORE_CATALOG_PATH` at that file/URL.

---

## 3) Refined / “edited” workflow (operator)

1. Edit in Catalog Console → export JSON.
2. Replace or merge into `square_products_latest.json` (or set `STORE_CATALOG_PATH` before deploy).
3. Regenerate the backend SKU map and redeploy the API (see §6).

---

## 4) API base URL

Checkout and bootstrap use `window.STORE_API_BASE` when set; otherwise `index.html` picks localhost vs `https://api.aerovista.us` by hostname. URL flag: `?api=local8088` (see `index.html`).

---

## 5) Overlay schema (`storefront_overlay.json`)

Loaded after the catalog; applies to whatever catalog file is active.

- **`rules`** — `titleFormat`, `defaultBrand`, `priceLadders` (per category key), optional `fees` / `shipBufferCents` / `costByLadder` for profit-floor checks.
- **`overrides`** — keyed by `productKey` (`sq_` + Square item id, or slug of name): `collection`, `productType`, `color`, `descriptionShort`, `description`, `ladderKey`, `copyLock`.
- **`itemsByVariationId` / `itemsByCartKey`** — visibility, order, tags, titles; cart key shape is **`Color__Size`** (e.g. `Black__M`).
- **`collections`**, **`ads`** — collection rules and promo tiles.

Square remains source of truth for inventory and paid prices at checkout; the overlay is **presentation** (plus ladder display on the client).

### Current pinned top-six storefront tiles

The overlay currently pins the first six storefront cards in this order:

1. `AeroVista eGift Card`
2. `Synthetic Souls Drop`
3. `glitch logo • AeroVista • Tee - black`
4. `AeroVista “Apex Mesh” Trucker Cap`
5. `AeroVista Apex Draft Pullover Hoodie (Black, M)`
6. `Drafted A • Premium Sweatshirt`

Implementation detail:
- `ads[].order` controls the two promo tiles.
- `itemsByVariationId[].order` controls the four product cards.
- These are display decisions only; they do not change Square retail truth or checkout pricing.

---

## 6) SKU map and checkout keys

The storefront sends cart line `sku` values as **`Color__Size`** (e.g. `Black__M`). The backend map (`SQUARE_SKU_MAP_JSON` / `SQUARE_SKU_MAP_FILE`) must contain those keys.

**Canonical generator:** `python tools/generate_sku_map.py --input square_products_latest.json --output backend/sku_map.generated.json`

Do **not** use a different key shape; `backend/scripts/update_sku_map_from_catalog.py` is a convenience wrapper that writes `.env` from the same `Color__Size` logic as `tools/generate_sku_map.py` (see script header).

---

## 7) Hosting URLs (canonical)

- **Storefront (production):** `https://aerovista.us` and `https://www.aerovista.us` (Firebase Hosting per [docs/HOSTING_AND_DNS.md](docs/HOSTING_AND_DNS.md)). Legacy GitHub Pages URL may still appear in older links: `https://aerovista-us.github.io/store/` — update `index.html` meta/OG/schema if the public URL changes.
- **Store API:** `https://api.aerovista.us`

`ALLOWED_ORIGINS` on the API must include the exact browser origin used to load the storefront.

---

## 8) CORS quick fix

If checkout fails with CORS errors, add your storefront origin to `ALLOWED_ORIGINS` in `backend/.env` and restart the API.

---

## 9) Useful scripts

| Script | Purpose |
|--------|---------|
| `tools/generate_sku_map.py` | Build `Color__Size` → `{ name, cents, variationId? }` map |
| `backend/scripts/generate_data_quality_report.py` | Missing desc/image/price report |
| `backend/scripts/validate_profit_floor.py` | Overlay + cost vs retail |
| `backend/scripts/update_sku_map_from_catalog.py` | Regenerate map into `backend/.env` from repo catalog JSON |

---

## 10) Troubleshooting

| Symptom | Check |
|---------|--------|
| Blank or wrong products | Path deployed is really `square_products_latest.json` (or your `STORE_CATALOG_PATH`); cache-bust with `STORE_BUILD_ID` in `index.html` if needed. |
| “Unable to load product catalog” | 404 / invalid JSON; ensure top-level `{ "products": [ ... ] }`. |
| Checkout **400** unknown SKU | Regenerate SKU map from the same catalog; keys must be `Color__Size`. |
| API unreachable from browser | CORS, wrong `STORE_API_BASE`, or tunnel/DNS — [docs/NXCORE_STORE_API_ROUTING_STATUS.md](docs/NXCORE_STORE_API_ROUTING_STATUS.md), [docs/HOSTING_AND_DNS.md](docs/HOSTING_AND_DNS.md). |

---

## 11) Docs index

See [docs/docs_index.md](docs/docs_index.md) for a list of all guides in `docs/`.
