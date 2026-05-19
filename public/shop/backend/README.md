# AeroVista Store API (NXCore)

**Storefront context:** The storefront loads one catalog JSON at a time: `square_products_latest.json` by default, or whatever file/path is supplied via `STORE_CATALOG_PATH`. This backend does not care which catalog file produced the cart — it only receives cart items keyed by SKU/cart key and looks them up in the SKU map. See repo root [README.md](../README.md) and [handoffnotes.md](../handoffnotes.md).

## What this is
A minimal Flask API that:
- exposes `/api/square/bootstrap` for the storefront
- processes cart checkout via Square:
  - CreateOrder (single SHIPMENT fulfillment + flat shipping)
  - CreatePayment (charge immediately)

## Setup
### Docker / Compose (recommended)
1) Copy env template:
- `cp .env.example .env`
- Fill in Square values
- Set `ALLOWED_ORIGINS` to your storefront origin(s)

2) Local dev (no Traefik, exposes port 8088):
- `docker compose -f docker-compose.local.yml up -d --build`
- health: `GET /api/health`

3) Traefik / prod-like:
- `docker compose -f docker-compose.yml up -d --build`
- Requires external network `nxtraefik_default`

### Bare metal (optional)
- `python3 app.py` (dev server)
- or `gunicorn -b 0.0.0.0:8088 app:app` (prod-like)

## Cloudflare Tunnel
Use `cloudflared/config.yml` as a starting point. Route `api.yourdomain.com` to `http://localhost:8088`.

## Linux service template
Systemd unit template: `systemd/av-store-api.service`

## Database (Postgres) for fulfillment bridge

The fulfillment bridge and internal job queue use **Postgres** via
SQLAlchemy 2.x, Alembic, and psycopg3.

- Set `DATABASE_URL` in `.env`, for example:
  - `DATABASE_URL=postgresql+psycopg://av_store:strongpassword@postgres:5432/av_storefront`
- The **host** in `DATABASE_URL` must be resolvable from the machine/container where the API runs. If you see "Name or service not known": use `postgres` only when the API runs in the same Docker Compose stack; if the API runs on the host or elsewhere, use `localhost` (with Postgres port published) or the DB server’s IP/hostname.
- Optional:
  - `SQLALCHEMY_ECHO=1` to log SQL statements in dev.
  - `SQUARE_WEBHOOK_SIGNATURE_KEY` for verifying Square webhooks.

## Suggested CORS for GitHub Pages
If your storefront is served from GitHub Pages, set:
- `ALLOWED_ORIGINS=https://aerovista-us.github.io`

If you use the **AeroVista Catalog Console** Orders view from a different origin (e.g. `https://console.av.internal` or `http://localhost:8080`), add that origin to `ALLOWED_ORIGINS` in `.env` so the browser can call `GET /api/ops/db`.

## Square webhooks (payment → fulfillment)

Square sends webhook events to a **Notification URL** you configure in the Square Dashboard. For this API the canonical route is:

- `POST https://api.aerovista.us/api/webhooks/square`

That endpoint:

- validates the Square signature when `SQUARE_WEBHOOK_SIGNATURE_KEY` is set
- persists the event to `webhook_events`
- upserts the Square order into `orders` / `order_items`
- enqueues a `FulfillmentJob` (for later Printful integration)

To create the subscription in Square:

1. **Name**: `av-store-payment-updated` (any descriptive name is fine).
2. **Notification URL**: `https://api.aerovista.us/api/webhooks/square`  
   - Use this *only after* the backend is healthy and reachable.
3. **API version**: choose the **current stable** version in the Square UI (or pin the version you configured in `SQUARE_VERSION`).
4. **Events**: select **only** `payment.updated`.  
   - Square documents that payment webhooks notify you when payment fields change, including when a payment becomes `COMPLETED`. This matches the “fulfill only after payment is actually paid” flow.
5. **Leave beta and deprecated events off.** No “all events” subscription is required here.

After saving the subscription:

- Copy the **Signature Key** from that subscription into your `.env`:

  ```bash
  SQUARE_WEBHOOK_SIGNATURE_KEY=your_square_webhook_signature_key_here
  ```

- Ensure the backend has a working database URL:

  ```bash
  DATABASE_URL=postgresql+psycopg://user:pass@postgres:5432/av_storefront
  ```

If `DATABASE_URL` is missing, the API will crash‑loop and webhook deliveries (and delivery tests from Square) will fail until it is fixed.

The webhook route only accepts `POST` requests; Square will send JSON bodies and include a signature header `x-square-hmacsha256` which the backend verifies against the raw request body.

## Product mapping (important)
Your storefront must send Square **variation IDs** for each cart item.
In the provided storefront scaffold, each product can define:
`squareVariationMap: { "Color__Size": "SQUARE_VARIATION_ID" }`

You can find variation IDs via:
- Square Developer Console / Catalog API
- or Square Dashboard → item variation details (depending on UI)

The backend prices line items from **Square-shaped data only** (via
`sku_map` / `SQUARE_SKU_MAP_JSON`) and ignores any client-sent price
fields. Frontend ladders (overlay) are for display; Square remains
checkout truth.

**Generate the map** with `python tools/generate_sku_map.py` from the repo root so keys match the storefront (`Color__Size`, e.g. `Black__M`).

## Checkout returns 400
`POST /api/square/checkout` returns 400 when the cart contains a SKU the server doesn’t know. The backend looks up each `cart[].sku` (e.g. `Black__M`) in **SQUARE_SKU_MAP_JSON** (or SQUARE_SKU_MAP_FILE). Fix:

1. Set **SQUARE_SKU_MAP_JSON** (or populate the map file) with one entry per cart key the storefront can send.
2. Each entry must have `"name"` and `"cents"`, e.g. `{"Black__M": {"name": "Hoodie (Black, M)", "cents": 5500}}`.
3. Optional: add `"variationId": "SQ_..."` for Square catalog linkage.

The response body includes an `error` message listing the unknown SKU. Use the same keys as the frontend’s cart (e.g. `Color__Size`).

## Checkout: shipping address and Printful

- **Shipping address:** The backend creates a Square Payment Link with `checkout_options.ask_for_shipping_address: true`, so Square's hosted checkout page collects the buyer's shipping address and attaches it to the order as a SHIPMENT fulfillment. You can see it in the Square Dashboard for each order.
- **Printful:** Orders are **not** automatically sent to Printful. Payment is captured in Square only. To fulfill, either create the order manually in Printful using the shipping address from Square, or add a webhook/script that reads Square orders and creates Printful orders (using `printful_variant_map.json` and your Printful API).

---

## Scripts and utilities

All scripts below are optional helpers; they do not change the runtime
behavior of the API unless you explicitly wire them in.

- `backend/scripts/update_sku_map_from_catalog.py`  
  Writes `SQUARE_SKU_MAP_JSON` into `backend/.env` from `square_products_latest.json` (or `square_products_merged.json`, or a path you pass). Uses the **same `Color__Size` keys** as `tools/generate_sku_map.py` (must match storefront cart `sku`). Prefer `tools/generate_sku_map.py` when you only need JSON files.

- `backend/scripts/generate_data_quality_report.py`  
  Square-first data quality report. Run it against a Square export CSV
  or a Square-shaped catalog JSON to find missing descriptions, images,
  and prices. See `docs/DATA_QUALITY_AND_VALIDATION.md`.

- `backend/scripts/validate_profit_floor.py`  
  Profit floor validator that reads `storefront_overlay.json` and a
  catalog JSON and fails when any laddered retail price dips below
  `cost + shipBuffer + processor fees`. See
  `docs/DATA_QUALITY_AND_VALIDATION.md`.

- `backend/scripts/printful_my_products_export.py`  
  Optional Printful helper (copied from dropship.store). Exports
  `printful_my_products.csv` and `printful_my_variants.csv` using the
  Printful API. Used **only** for fulfillment / cost reference, not as
  a catalog or price source. See
  `docs/PRINTFUL_FULFILLMENT_AND_MAPPING.md`.

- `backend/scripts/build_printful_variant_map.py`  
  Reads `printful_my_variants.csv` and writes
  `backend/data/printful_variant_map.json` mapping your `external_id`
  (typically a Square variation id) → Printful `variant_id`. This map
  is safe to consume later when you are ready to integrate backend
  fulfillment calls to Printful.
