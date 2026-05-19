# Backend — SOT notes

- **Paths in SOT.json** are relative to **backend/**.
- **parent_manifest:** `../SOT.json` links to the av_storefront root manifest.
- **Secrets:** Never commit **.env**; **.env.example** documents variables (Square, `ALLOWED_ORIGINS`, `DATABASE_URL`, Printful tokens, webhook keys).
- **SKU map:** Checkout resolves cart keys / variation IDs via `SQUARE_SKU_MAP_JSON` or **sku_map.generated.json** produced at repo root (see **../tools/generate_sku_map.py** or **../scripts/refresh_catalog.py**).
- **Health:** `GET /api/health` on port **8088** inside the container; Traefik routes **api.aerovista.us** in production compose.
