# Files Required for Site (What to Push to Git)

This doc lists what **must** be in the repo for the storefront and backend to work, and how to **stop tracking** files that are not needed.

---

## Required for storefront to work

Push these so the live site works:

| Path | Purpose |
|------|--------|
| `index.html` | Primary storefront (canonical). |
| `favicon.svg` | Favicon. |
| `storefront_overlay.json` | Overlay: ordering, visibility, consistency rules. |
| `square_products_latest.json` | Live catalog (default). |
| `square_products_2026-02-11.json` | Optional dated fallback (loader uses if latest missing). |
| `square_products_2026-02-10.json` | Optional dated fallback. |
| `square_products_merged.json` | Optional; use only if you deliberately point `STORE_CATALOG_PATH` at it. |
| `README.md` | Repo overview. |

If you use an `img/` folder for assets, include it. The storefront loads **one** catalog JSON at runtime: `square_products_latest.json` by default, or another file you explicitly provide with `STORE_CATALOG_PATH`.

**Store Signal (optional):** The bottom mini-player expects `audio/store-signal.mp3` or set `window.AV_STORE_AUDIO_SRC` before the main script. See `audio/README.md`. The site works without the file; play will show a short toast until you add audio.

---

## Required for backend (checkout API) to work

| Path | Purpose |
|------|--------|
| `backend/app.py` | Flask app, checkout, webhooks. |
| `backend/db/` | SQLAlchemy, tables, Alembic migrations. |
| `backend/workers/` | Fulfillment/reconcile workers. |
| `backend/scripts/` | Helper scripts (update_sku_map, validate_profit_floor, etc.). |
| `backend/templates/` | Dashboard templates. |
| `backend/requirements.txt` | Python deps. |
| `backend/.env.example` | Env template (no secrets). |
| `backend/Dockerfile` | Docker image. |
| `backend/docker-compose.yml` | Compose (prod-like). |
| `backend/docker-compose.local.yml` | Compose (local dev). |
| `backend/.dockerignore` | Keep .env out of build. |
| `backend/systemd/` | Service template. |
| `backend/cloudflared/` | Tunnel config template. |

Do **not** push: `backend/.env`, `backend/sku_map.generated.json`, or `backend/square_products_*.json` (generated or copies).

---

## Required for Catalog Console (editing catalog)

| Path | Purpose |
|------|--------|
| `AeroVista_Catalog_Console/v1.1/index.html` | Console UI. |
| `AeroVista_Catalog_Console/v1.1/app.js` | Console logic. |
| `AeroVista_Catalog_Console/v1.1/csv_to_json_converter.html` | Converter. |
| `AeroVista_Catalog_Console/v1.1/README.md` | Console docs. |
| `AeroVista_Catalog_Console/README.md` | Console overview. |

You do **not** need to push: `AeroVista_Catalog_Console/v1.1/archive/`, `AeroVista_Catalog_Console - Copy.zip`, or dated `1149*.csv` / `ava_catalog-*.csv` inside Console.

---

## Docs and tools (recommended to push)

- `docs/*.md`, `docs/*.html`, `docs/*.csv` — hosting, audits, how-tos, variant worksheet.
- `handoffnotes.md` (root or `docs/`) — developer handoff.
- `tools/generate_sku_map.py` — SKU map generation.
- `scripts/` — run scripts, normalize_categories, etc.
- Root `requirements.txt` — used by some scripts (e.g. image tools).

---

## Removing unnecessary files from git

Files that are **not** needed for the site are listed in `.gitignore`. If they were already committed, remove them from **tracking** (they stay on disk) by running from the repo root:

```bash
# Remove from git index only (files remain on disk)
git rm -r --cached public/ 2>/dev/null || true
git rm --cached "index.temp.save.html" 2>/dev/null || true
git rm --cached "backend/ - Copy.env" 2>/dev/null || true
git rm --cached "AeroVista_Catalog_Console - Copy.zip" 2>/dev/null || true
git rm --cached square_products_merge_report.csv 2>/dev/null || true
git rm --cached square_products_merged_flat.csv 2>/dev/null || true
git rm -r --cached data_quality_reports/ 2>/dev/null || true
git rm --cached backend/sku_map.generated.json 2>/dev/null || true
git rm --cached backend/square_products_2026-02-10.json 2>/dev/null || true
git rm --cached backend/square_products_2026-02-11.json 2>/dev/null || true
git rm --cached "AeroVista_Catalog_Console/v1.1/1149XBNG8C8ZE_catalog-2026-02-22-0922.csv" 2>/dev/null || true
git rm --cached "AeroVista_Catalog_Console/v1.1/1149XBNG8C8ZE_catalog-2026-02-22-0922.json" 2>/dev/null || true
git rm --cached "AeroVista_Catalog_Console/ava_catalog-2026-02-22-0922.csv" 2>/dev/null || true
git rm -r --cached "AeroVista_Catalog_Console/v1.1/archive" 2>/dev/null || true
git rm --cached "AeroVista_Catalog_Console/v1.1/square_products_latest.json" 2>/dev/null || true
git rm --cached "AeroVista_Catalog_Console/square_products_latest.json" 2>/dev/null || true
git rm --cached "trigger helper.sql" 2>/dev/null || true
git rm --cached backend/api.txt 2>/dev/null || true
git rm --cached MASTER_FIX_PLAN.md 2>/dev/null || true
git rm --cached "1149XBNG8C8ZE_catalog-2026-02-24-0235.csv" 2>/dev/null || true
```

Then commit:

```bash
git add .gitignore docs/FILES_REQUIRED_FOR_SITE.md
git commit -m "chore: ignore and stop tracking files not needed for site"
```

After this, only required (and docs/tools) files will be tracked; `.gitignore` prevents re-adding the rest.
