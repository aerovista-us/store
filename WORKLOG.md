# Work log

Chronological record of security checks, deploys, and go-live gates.

---

## 2026-08-25 — Collection page upgrade pass (DockLife parity)

**Audit:** All six lanes have visible products; themes realigned to catalog membership.

| Lane | Visible | Theme fit | Featured hero |
|------|---------|-----------|---------------|
| Core | 6 | Essentials + Division/signal — copy updated | Core Hoodie |
| Shadow | 11 | Shadow Wear + Apex Pattern (by design) — copy names Ghost Ridge + pattern system | Ghost Ridge |
| Apex | 6 | Emblem headwear/accessories — copy matches A-mark products | Signature Apex Cap |
| Glitch | 4 | Coherent Glitch Line — thin but aligned | Apex Glitch Hoodie |
| Architect | 7 | Draft Series field issue — copy matches | Built Different Hoodie |
| DockLife | 1 | Harbor opener — already strong | Osprey lifestyle hero |

**Ship:** Lane-tinted `#collectionHeroAd` CSS, `heroAd` on every `COLLECTION_LANES` entry, overlay `ads[]` for all six lanes, hero PNGs under `store/img/<lane>/`, synced door leads.

---

## 2026-08-23 — Deploy Catalog Console export to local store/

**Source:** `Downloads/square_products_cleaned_v2 (6).json` (Console v2, 85 products / 36 visible).

**Checks:** No missing images, variation IDs, or collections on visible SKUs. Fixed DockLife image path `\\docklife\\docklife-drip_hat.png` → `docklife/docklife-drip_hat.png` (file present under `store/img/docklife/`).

**Deploy:** Wrote `store/square_products_latest.json` + `sync:store` / `sync:console` / build manifest. Live Pages still needs `git push` when ready.

---

## 2026-06-30 — `/api/ops/db` authentication gate (pre–live sales)

**Context:** Checkout blocker cleared; ops DB endpoint must not expose customer PII without operator auth before live sales activity.

### Project audit (summary)

| Surface | Path / URL | Notes |
|---------|------------|--------|
| Shop | `store/` → https://gear.aerovista.us | Static GitHub Pages; checkout via Cloudflare API proxy |
| Payment API | `store/backend/` (gitignored) → https://api.aerovista.us | Flask + Gunicorn on NXCore Docker |
| Catalog console | `console/` → https://store-console.aerocoreos.com | Operator catalog; network-gated (Tailscale / Cloudflare Access) |
| Docs | `docs/USER_MANUAL/`, `docs/BACKEND_DEPLOY.md` | Ops auth documented under ch. 6–8 |

**Auth implementation** (`store/backend/app.py`):

- `OPS_SECRET` env var; clients send `X-Ops-Token` header
- `hmac.compare_digest` timing-safe compare
- Fail closed: no `OPS_SECRET` → **404**; wrong/missing token → **401**
- Same guard on `GET /ops/printful`

### Verification (production `https://api.aerovista.us`)

| Test | Expected | Result |
|------|----------|--------|
| `GET /api/ops/db` (no header) | 401 Unauthorized | **PASS** — HTTP 401 |
| `GET /api/ops/db` (`X-Ops-Token: wrong`) | 401 Unauthorized | **PASS** — HTTP 401 |
| `GET /api/ops/db` (valid `X-Ops-Token`) | 200 + JSON (`orders`, `webhook_events`, `fulfillment_jobs`) | **PASS** — HTTP 200, 10 orders in snapshot (`npm run audit:ops-endpoint` with `OPS_TOKEN`) |
| `GET /api/health` (baseline, public) | 200 | **PASS** — checkout health unaffected |

**Repeatable check:**

```bash
node scripts/audit-ops-endpoint.mjs
OPS_TOKEN='<from nxcore .env OPS_SECRET>' node scripts/audit-ops-endpoint.mjs
```

### Outcome

- Ops endpoint is **authenticated and fail-closed** on production.
- Unauthenticated and wrong-token requests are rejected.
- Approved operator access with `X-Ops-Token` still returns read-only DB snapshot.
- **Go-live gate:** satisfied for `/api/ops/db` before live sales.

---

## 2026-06-30 — `fulfillment_status` fulfilled display fix

**Context:** Once Printful ships, ops dashboard must show `fulfillment_status=fulfilled` (not stuck at `submitted`).

### Root cause

`fulfillment_worker.py` line ~248 set `order.fulfillment_status = job.job_status` (`submitted`) and ignored Printful `provider_status`. No poll for in-flight orders after submit.

### Fix

| File | Change |
|------|--------|
| `workers/fulfillment_status.py` | Map `fulfilled`/`shipped`/`delivered` → `fulfilled` |
| `workers/fulfillment_worker.py` | Use mapper at submit; `poll_submitted_statuses()` each loop |
| `scripts/fulfillment_status.py` | Committed copy + unit tests |
| `scripts/seed-fulfilled-test-order.py` | Fixture order `TEST-FULFILLED-OPS-DISPLAY` |
| `scripts/verify-ops-fulfillment-display.mjs` | Asserts `/api/ops/db` shows fulfilled |

### Verification

| Test | Result |
|------|--------|
| `python scripts/fulfillment_status.py` | **PASS** — 9 mapping cases |
| Seed fixture on NXCore (`order_id=15`) | **PASS** — `fulfillment_status=fulfilled` |
| `verify-ops-fulfillment-display.mjs --expect-fixture` | **PASS** — 1 fulfilled in ops snapshot |

**Deploy:** `scp` `workers/fulfillment_*.py` to NXCore → `docker compose up -d fulfillment-worker`

---

## 2026-07-07 — Production status audit

**Context:** Rolling status report for shop + backend; documented in **`docs/STATUS.md`**.

### Live checks

| Surface | Result |
|---------|--------|
| `https://api.aerovista.us/api/health` | OK — production Square |
| `https://gear.aerovista.us/` | OK — build `2026-06-06-checkout`, CDN last-mod **2026-06-07** |
| `https://store-console.aerocoreos.com/api/health` | OK — `storeWritable: true` |
| NXCore `docker compose ps` | All 4 containers up; API **healthy** (11 days) |
| `audit-ops-endpoint.mjs` | Unauthenticated → **401** |

### Findings

| Area | Status |
|------|--------|
| Backend checkout (`variationId` priority) | Deployed fix assumed live on API |
| Storefront checkout (`storedVid \|\| mappedVid`) | **Not on production** — live still `mappedVid \|\| storedVid` |
| Fulfillment queue | 11 orders: 6 submitted, 3 needs_review (stale), 1 fulfilled, 1 cancelled |
| Git | `main` **ahead 1**; large uncommitted working tree |

### Follow-ups

1. Deploy `store/index.html` checkout fix to GitHub Pages.
2. Commit/push docs and scripts when ready.
3. `verify-live-checkout-fix.mjs` now **fails** if production still uses `mappedVid || storedVid`.

**Canonical doc:** [docs/STATUS.md](docs/STATUS.md)

---

## 2026-07-25 — Horizon storefront shell created at final dev location

**Context:** Horizon demo evaluation, promotion, and documentation catch-up after the 07-22 readiness report.

### Decision

Compared the two Horizon demos in `planning/`: **`horizon gallary`** (static single page) vs **`canvas`** ("Horizon Canvas Gallery" — Next 16 / Vite / Wrangler / Drizzle scaffold around one static page). **Kept the canvas design, dropped its stack:** the page was ported 1:1 to dependency-free static HTML/CSS/JS.

### Created `horizon/` at repo root (final dev location, parallel to `store/`)

| File | Role |
|------|------|
| `index.html`, `css/styles.css`, `js/gallery.js` | Gallery storefront: 12 works, collection filters, artwork modal (size/finish), room view |
| `gallery/` | Artwork images — byte-verified against `planning/canvas/public/gallery/` |
| `store.json` | Plan 1 Phase 2 store config; hostname pending Plan 2 approval |
| `README.md` | Status, provenance, deliberate exclusions |

Static shell only: inline artwork data, stubbed Reserve button, `noindex`. Commerce wiring waits on the shared storefront core and the production `/v1` release gates.

### Verification and watch items

- Live checks 07-23: gear.aerovista.us **OK**, `/api/health` **OK** (production Square), public `/v1/stores` still not serving (same-URL redirect) — matches undeployed production `/v1`.
- **Watch:** public `/api/health` discloses credential-presence flags and the full allowed-origins list (incl. one internal origin). Fold redaction into the Phase 7 `/v1` ingress release.
- Planning docs (Plan 1 / 1A / 2 + readiness report) updated to 07-24/07-25 status; `serve-canvas-dev.bat` / `serve-horizon-static.bat` added for local hosting.

---

## 2026-07-25 — Current-state reconciliation and documentation repair

**Context:** A broad documentation refresh retained the Horizon static-shell
decision but dropped the newer catalog/mockup reconciliation and restored
several stale review/deployment claims.

### Read-only verification

| Surface | Result |
|---|---|
| Gear homepage | `200`; build `2026-07-21-commerce-first-1a` |
| Gear About | `200` at `about.html` |
| Gear bootstrap | `200` |
| Live checkout priority | `storedVid || mappedVid` present; stale reverse order absent |
| Production API health | `200`, Square production |
| Production `/v1/stores` | same-URL `301`; not deployed |
| Production Docker | API healthy; PostgreSQL, fulfillment, and reconcile workers running |
| Private console | NXCore container running; unauthenticated public health returns `401` |
| NXCore Horizon workspace | Directory exists; no catalog, overlay, or media files present |
| Commerce sandbox | API and PostgreSQL containers healthy; no public route/host port |
| Merged repository heads | backend `f9c28d6`, console `b791bbf`, public store/contracts `82b363f` |
| CI | Latest backend, console, contract, Pages, and API-proxy workflows green |

### Horizon intake restored

- Re-linked the four checksum-backed mockups and the five-row Square export
  reconciliation from `planning/canvas/`.
- Recorded three high-confidence matches, one provisional generic Canvas
  match, and one unmatched Center Clock record.
- Kept the export fail-closed because required fields contain literal `41`
  placeholders and usable size/finish/provider mappings are absent.
- Kept mockups non-sellable; print-ready source artwork and rights evidence are
  still required.

### Documentation/security corrections

- Updated Plan 1, Plan 2, readiness, planning index, Horizon README, and the
  production status report with current verified boundaries.
- Removed a plaintext operations credential from two documentation files.
  Rotation remains required if that historically documented value is still
  accepted anywhere.
- Updated the current live overlay checksum while preserving the unchanged
  production catalog checksum.

No customer catalog, order, database migration, storefront artifact, API
route, DNS record, provider mapping, or fulfillment state was changed.

---

## 2026-07-26 — Horizon missing-item pass

Expanded the private Horizon preview from three to seven catalog presentations:

- Added stable, product-named storefront mockups for Fairways Along the Lake,
  Lake, Links, and the Floating Green, and The Clock at Resort Circle.
- Added a live two-image diptych presentation for the Lake City Autumn
  Collection without inventing a new artwork file.
- Reconciled the mockup intake manifest, including duplicates, unresolved
  golf/shore images, and the unsupported metal-print finish.
- Added all six known Horizon Square cart keys to the local map and taught the
  shared map builder to validate and merge them.
- Staged a reviewable Postgres upsert for all six verified Printful sync
  variants.
- Added a repeatable, read-only Printful sync-product pull and a sanitized
  provider snapshot. All six expected variants are active and enabled; the
  API resolves Harbor at 30 × 40 and the three $525 panoramas at 24 × 48.
- Confirmed the three generic `.jpeg` mockup uploads contain PNG data and are
  byte-identical to the corresponding Printful preview attachments; the
  canonical storefront copies now use `.png` filenames.
- Recovered `DJI_20241025153448_0056_D.JPG` for The Clock at Resort Circle.
  Its MD5, byte length, and 12000 × 6000 dimensions exactly match Printful’s
  default-file evidence, clearing the missing-source blocker.
- Strengthened catalog validation so mapped variants must agree with the
  Square and Printful evidence, and future checkout activation also requires
  an approved physical proof.

Checkout remains deliberately disabled. No production database, Square,
Printful, DNS, Worker, or hosting state was changed.

### Cropped-master and placeholder sprint

- Reconciled new cropped candidates for Fairways, Floating Green, and Clock,
  recording their current dimensions and SHA-256 values without confusing
  them with the provider’s existing 12000 × 6000 default files.
- Hid the Lake City Autumn Collection bundle until its Square record and
  Printful bundle behavior exist.
- Published A Window Through the Pines and Where Downtown Opens to the Lake
  with an explicit shared artwork-pending SVG. Placeholder products cannot be
  added to the bag or checkout.
- Added a generated JavaScript catalog fallback so the gallery renders when
  opened directly from disk or when a static host cannot fetch `catalog.json`.
  The validator fails if that fallback drifts from the authoritative catalog.

### Documentation, deployment SOP, and completion plan

- Established `horizon/DEPLOYMENT_SOP.md` as the canonical release procedure,
  including the public-artifact allowlist, preflight checks, isolated preview,
  commerce activation gates, controlled paid-order gate, domain launch, and
  rollback.
- Established `horizon/COMPLETION_PLAN.md` as the phased path from the current
  local preview to a monitored production launch, with an explicit definition
  of complete.
- Reconciled repository, planning, deployment, backend, catalog, AVCC, status,
  workflow, and operator-manual documentation with the current 9-record /
  10-variant catalog state.
- Documented a dedicated Cloudflare Pages Direct Upload project as the
  recommended Horizon static host; this is a recommendation only and no Pages
  project, DNS record, or deployment was created.
- Preserved the July 25 planning narrative as historical context while making
  the Horizon SOP, completion plan, readiness file, and catalog the current
  execution sources of truth.

No production database, Square, Printful, DNS, Worker, or hosting state was
changed during the documentation pass.

---

## 2026-07-26 — Horizon GitHub, NXCore, and Cloudflare gated preview

- Added and verified a deterministic customer-safe `horizon/dist` builder.
- Restored the two missing established-work WebP files from checksum-matching
  retained design sources.
- Created public repository `aerovista-us/horizon-storefront`.
- Published the 14-file audited artifact through GitHub Pages; final release
  commit `9d8d12575da98f93abc08e14312e8438fef2349d`, workflow run
  `30209064290`.
- Backed up the NXCore backend environment, added only the Horizon browser
  origin, restarted only `av-store-api`, and verified health/CORS/bootstrap.
- Deployed Cloudflare Worker version
  `894c791f-0636-46d0-99e9-35dda97bd1ad` with
  `horizon.aerovista.us` as a Custom Domain. Static requests use the GitHub
  Pages origin; `/api/*` uses the NXCore API.
- Verified all public files, blocked private paths, the hidden bundle, 0
  checkout-ready variants, Horizon API routing, and Gear regressions.

No production Square map, Postgres Printful mapping, Printful artwork,
checkout-ready flag, or paid order was changed.

---

## 2026-07-27 — Horizon Last Light collection edit

- Added Last Light Over the Resort as a 12 × 24, `$195`, commerce-gated public
  preview from the supplied video-frame PNG.
- Created and checksummed a private 3840 × 1920 proofing crop, a 2400 × 1200
  display derivative, and a 480 × 240 one-fifth wall derivative.
- Archived Autumn Over Coeur d’Alene without deleting its catalog, media,
  variant, or provider evidence; retained The Road to the Lake.
- Reordered the four consumer works by listed canvas area from smallest to
  largest and increased every canvas by one shared scale factor per viewport.
- Updated the catalog, generated fallback, store/SOT records, recovery
  profiles, deployment SOP, completion plan, commerce gates, gallery
  inventory, curated direction, migration report, and status documentation.
- Built and audited the 17-file public artifact: 11 products, 12 variants, 5
  public products, and 0 checkout-ready variants.
- Published commit `157773546514acd4187896b2e806bbf203791358` through Pages
  run `30262564085`.
- Verified the live domain in desktop and mobile browsers with 0 console
  errors/warnings; Last Light assets and `/api/health` return `200`, Autumn is
  absent from the public catalog and its former wall asset returns `404`.

Last Light remains deliberately fail-closed until the sharpest original-video
frame, final 2:1 master/wrap, physical proof, Square variation, Printful sync
product, NXCore mappings, and controlled order are verified. No production
commerce map, provider artwork, checkout flag, or paid order was changed.

---

## 2026-07-27 — Horizon checkout, production maps, and edge polish

- Reworked every canvas presentation into one connected front/right/bottom
  object. Only the right and bottom image-derived edges remain visible; rounded
  corners, a restrained wall-contact shadow, and the existing hover lift remove
  the detached four-sided bevel appearance.
- Removed production-provider and fulfillment implementation language from the
  customer storefront. The approved handoff explains that the customer will be
  connected to Square’s secure checkout to confirm shipping and payment.
- Independently verified Last Light’s Square variation
  `7GHIQT64RIQ7FG75JXRY4WXM`, `$195` price, production sync product
  `452227092`, production sync variant `5415090955`, attached filename, and
  source checksum.
- Backed up the active generated SKU map, backend environment, and PostgreSQL
  mappings at
  `/srv/Collab/mini.shops/AV-PNW.com/av_storefront/backups/horizon-commerce-20260727T044942`.
- Deployed and audited eight Horizon Square checkout keys and eight active
  PostgreSQL production mappings. Rebuilt the API container so the bootstrap
  uses the deployed generated map.
- Enabled checkout for the five public works. Physical-proof and selected
  master-quality tasks remain explicitly recorded as private proof waivers;
  `proofApproved` was not falsified.
- A Last Light checkout-link request returned HTTP 200, `ok: true`, and a
  `square.link` URL. The test stopped before payment, so no charge or production
  order was created.
- Built the sanitized artifact at 11 products, 12 master variants, 5 public
  products, and 5 checkout-ready public variants. Customer output contains no
  production-provider or fulfillment language.
- Published frontend commit `6feae8e14e4af084b46b3050ed48ceb081161993`
  through successful Pages run `30264761325`; verified production HTTP,
  catalog, bootstrap, desktop, and mobile behavior.

---

## 2026-07-28 — Horizon photographic View in Room

- Generated a photorealistic contemporary lake-house interior with a large
  unobstructed plaster artwork wall, low walnut credenza, restrained chair,
  ceramic objects, and wool rug.
- Optimized the 1536 × 1024 generated source to the 178 KB project asset
  `horizon/gallery/room/horizon-lakehouse-room-v1.webp`.
- Removed the synthetic CSS moulding, chair, credenza, vessel, books, rug, and
  floor from the artwork modal.
- Made room-view artwork width responsive to the selected catalog dimensions,
  preserving the visual difference between 12 × 24 and 24 × 48 canvases.
- Replaced flat wall-tone controls with Natural, Soft Ivory, and Evening
  photographic lighting treatments.
- Built and audited the 18-file public artifact and verified 1440 × 1200
  desktop and 390 × 844 mobile views with zero console errors or warnings.
- Published frontend commit `27f470242e64f68e804963d59e83d2459768e282`
  through successful Pages run `30413328079`; production HTTP and browser
  verification passed.

---

## 2026-07-28 — Horizon canvas edge ratio and alignment

- Split canvas geometry into independent right and bottom wrap variables across
  gallery-wall, product-detail, View in Room, and mobile presentations.
- Reduced the bottom edge to exactly one-fifth of the right-edge depth:
  6/1.2 px on the wall, responsive 9–13/1.8–2.6 px in desktop details, and
  10/2 px on mobile.
- Replaced the shared cover-scaled edge background with aligned artwork
  sampling: the right face uses the rightmost image strip and the bottom face
  uses the bottom image strip.
- Preserved the separate wall-contact shadow and hover lift.
- Built and audited the 18-file public artifact and verified desktop wall,
  desktop detail, desktop room, and mobile room views with zero console errors
  or warnings.
- Hardened the Pages packaging copy to preserve nested public paths such as
  `site/css/styles.css`.
- Published frontend commit `919952f211a44a8d5c1fe09406c905a24d67711f`
  through successful Pages run `30414242368`; production HTTP, desktop wall,
  product-detail, and photographic-room browser verification passed.

## 2026-07-28 — Horizon canvas right-edge and corner refinement

- Reduced the right wrap depth by 25% across gallery-wall, product-detail,
  View in Room, and mobile canvas presentations.
- Retained the existing thin bottom wrap and extended both sampled faces
  through the lower-right corner so no wall background can show between them.
- Rebuilt and audited the 18-file public artifact and verified the four-work
  gallery wall, product-detail canvas, and photographic room canvas with zero
  browser-console errors or warnings.
- Published frontend commit `5cc669808e5ef4daf17b0042efdaa636fc18c24a`
  through successful Pages run `30417112307`; production HTML, stylesheet,
  gallery wall, desktop detail, and mobile detail verification passed.

## 2026-07-28 — Horizon continuous-image canvas wrap

- Replaced independently scaled edge backgrounds with one shared image map
  spanning the canvas front, right fold, and bottom fold.
- Clipped the front at each fold allocation so the next source pixels continue
  onto the edge instead of repeating the image boundary.
- Preserved the reduced right depth, thin bottom depth, sealed lower-right
  corner, contact shadow, proportional wall sizing, and room scaling.
- Verified gallery, detail, room, and mobile canvas views with zero browser
  console errors or warnings.
- Published frontend commit `68555cec2b8c7d3f8582fdcfdb426a20da48025d`
  through successful Pages run `30424671811`; production HTTP, gallery,
  detail, room, and mobile verification passed.

---

## 2026-08-23 — Git reconcile + live status refresh

**Context:** Local `main` was ahead 1 / behind 18 with a large dirty tree.
No formal EOS reports existed; canonical handoffs remained `docs/STATUS.md`,
`WORKLOG.md`, and `store/handoffnotes.md`.

### Reconcile

- Backed up dirty tree on `backup/wip-dirty-20260823` (`2da4b85`); pointer
  `backup/pre-reconcile-HEAD-0ac7292`.
- Rebased fulfillment-status fix onto `origin/main` → `f3ff40d` (ahead 1,
  behind 0). No conflict.
- Restored WIP adds (`horizon/`, docs, planning, ops scripts); kept origin
  Gear storefront + Cloudflare + commerce contracts; merged Horizon npm
  scripts into `package.json`.
- Inventory: [docs/RECONCILE_INVENTORY_2026-08-23.md](docs/RECONCILE_INVENTORY_2026-08-23.md).

### Live checks (2026-08-23)

| Check | Result |
|-------|--------|
| `GET https://api.aerovista.us/api/health` | **200** — Square production; Horizon CORS present |
| `GET https://gear.aerovista.us/` | **200** — build `2026-07-21-commerce-first-1a`; `storedVid \|\| mappedVid` |
| `npm run verify:checkout-fix` | **PASS** |
| `node scripts/audit-ops-endpoint.mjs` | Unauth + wrong token → **401** |
| `GET https://horizon.aerovista.us/` | **200** — `noindex` present |
| Horizon public `catalog.json` | 5 published / 5 checkout-ready |
| `GET https://horizon.aerovista.us/api/health` | **200** |
| `GET https://api.aerovista.us/v1/stores` | **308** same-URL redirect — `/v1` still not deployed |
| Console public health | Cloudflare Access sign-in HTML (protected) |

NXCore `docker compose ps` was not re-run over SSH this session.

---

## 2026-08-23 — DockLife collection lane

- Added **DockLife** as a sixth Gear collection door + `?collection=docklife` page.
- Collection page includes a **hero image ad** band (`#collectionHeroAd`) for the
  Osprey Rope Cap opening drop; overlay `ads` with `"lane": "docklife"` can override
  copy/image. Place art at `store/img/docklife/hero.jpg`.
- Lane SVG door/header palettes (harbor teal), curation aliases, and docs updated.
- Product grid stays empty until Square export `collection=DockLife` (hat first);
  more DockLife SKUs attach to the same page as they land.

---

## 2026-08-23 — Square SOT refresh through Catalog Console

- Confirmed Square Catalog API as inventory SOT; Printful remains fulfillment evidence.
- Added `scripts/pull-square-catalog.py`, `scripts/merge-square-catalog-to-storefront.mjs`,
  and `npm run catalog:refresh` (pull → merge → curate → sync:all).
- Merged live Square catalog into `store/square_products_latest.json` (85 products;
  DockLife Osprey Rope Cap visible with variation `GGYNCQMLXX6R4QCEEXLRVJHR`).
- Catalog Console: DockLife lane in `catalog-console-config.js`, auto-detect in
  console HTML; `sync:console` regenerates `catalog_baseline.js` + overlay baseline
  from store JSON so admins adjust/deploy on the fly.
