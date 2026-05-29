# AeroVista storefront (`store/index.html`)

Customer-facing gear shop: single static HTML file, Square JSON catalog, optional presentation overlay, checkout via **`https://api.aerovista.us`**.

| Environment | URL |
|-------------|-----|
| **Production (Pages)** | https://gear.aerovista.us/ |
| **Local dev (Vite)** | **http://localhost:5174/shop/index.html** — not `http://localhost:5174/` (that is the React bridge) |
| **Local dev (shortcut)** | `npm run dev:shop` — syncs `store/` then opens the shop URL |
| **Local preview (Pages build)** | `npm run preview:pages` then **http://localhost:4173/** (shop at site root in `dist/`) |
| **Checkout API** | https://api.aerovista.us |

Canonical source lives in **`store/`**; run **`npm run sync:store`** before dev/build so **`public/shop/`** matches.

---

## Architecture

| Piece | Path / note |
|-------|-------------|
| Storefront UI + logic | `store/index.html` (no bundler for shop) |
| Catalog | `store/square_products_latest.json` |
| Presentation overlay | `store/storefront_overlay.json` (optional; see **`STOREFRONT_OVERLAY.md`**) |
| Collection lane SVGs | `store/js/collection-lane-svg.js` (home doors via `mountCollectionDoorSvgs`) |
| Collection header banners | `store/js/collection-header-svg.js` (v2 unified panoramic headers — all five lanes) |
| Product image placeholders | `store/js/product-placeholder-svg.js` |
| Policies (injected) | `store/policy-content.js` |
| Product images | `store/img/` |
| Helper routes | `store/collection.html`, `store/catalog.html` (redirect to query routes) |
| Payment backend | **Not in this repo** — Flask service on NXCore; ports **8088** / **18088** locally |

---

## Shop views (multi-page UX)

`body[data-shop-view]` is set by **`parseShopRoute()`** / **`applyShopRoute()`** at load and on navigation.

| View | URL examples | What the customer sees |
|------|----------------|------------------------|
| **home** | `/shop/index.html` | Hero, collection entry doors, featured drop, signal lab — **no product grid** |
| **collection** | `?collection=core` or `collection.html?collection=shadow` | Themed collection hero, filters, grid for that lane only |
| **catalog** | `?view=catalog` or `catalog.html` | Full apparel grid (`All pieces`); collection dropdown hidden |

### Collection lanes (`COLLECTION_LANES`)

Landing doors and collection pages filter products by the export **`collection`** field (regex per lane, with **`COLLECTION_ALIASES`** for messy Square labels like `APEX` → `apex`, `shadowwear` → `shadow wear`). Overlay **`overrides.collection`** is not the primary lane key.

**Curation:** Run **`npm run curate:catalog`** after a raw Square deploy to normalize lane labels and hide off-story SKUs (EchoVerse, Powder Peaks, one-off experiments). Script: `scripts/curate-catalog-lanes.mjs`. Target ~30–35 visible pieces across five live lanes.

| Lane ID | Label | Export `collection` match |
|---------|--------|---------------------------|
| `core` | Core | `^core$`, `^division$` |
| `shadow` | Shadow Wear | `^shadow wear$`, `^apex pattern$` |
| `apex` | Apex | `^apex$` |
| `glitch` | Glitch | `^glitch$`, `^glitch line$` |
| `architect` | Architect | `^architect$`, `^draft series$` |

Lane metadata (eyebrow, lead copy, glow colors) is defined in **`COLLECTION_LANES`** inside `index.html`. Optional PNG references: `store/img/collection-cards/*.png` (design refs; live UI uses SVG).

### UI / UX (inline CSS in `index.html`)

Presentation is token-driven (`:root` colors, radii, `--ease`). Recent polish includes:

- Sticky blurred **topbar** with scroll state (`.topbar.is-scrolled`)
- **44px** touch targets on pills, CTAs, and primary buttons
- Sticky **catalog/collection** filter bar under the header
- Visible **results count** (`#catalogResultsMeta`, `#collectionResultsMeta`) plus screen-reader grid status
- Improved **empty grid** state (dashed card + reset)
- Light **view transition** when entering catalog or collection routes (`body[data-shop-view]`)
- Card, door, guide, and footer hover/focus refinements; `prefers-reduced-motion` respected

---

## Interactive visuals

### Hero card (`#heroVisual`)

- **3D tilt** + holo layer on pointer move (desktop)
- Optional device orientation on supported mobile
- Animated SVG A-mark, morph panels, flip on double-click
- Glow driven by CSS variable **`--logo-phase`**

### Collection doors + collection page art

**Collection page header (`#cvArtSvg`):**

- **Core / Shadow / Glitch / Architect / Apex:** wide panoramic SVG from **`store/js/collection-header-svg.js`** (`collectionHeaderBannerSvg(...)`) — fills the hero band instead of cropping **`cardImg`**. **`collection-lane-svg.js`** is optional / unused on home doors.

Previously rendered by **`collection-lane-svg.js`** (disabled):

| Lane | Background (idle) | Mark (`/\`) |
|------|-------------------|-------------|
| **Core** | `collection-cards/core.png` | |
| **Shadow** | `img/ghost.ridge.drk.png` | |
| **Apex** | `collection-cards/apex.png` | Door art; collection header uses **`apexBanner()`** SVG |
| **Glitch** | `collection-cards/glitch.png` | |
| **Architect** | `img/adrafted.png` | |

**Hero-parity stack (collection-scoped):**

- **Containment:** `.doorArtSvg` / `.doorVisual` use `overflow: hidden` + rounded corners (like `heroFaceFront`). Holo screen-blend stays on **`.doorHolo`** / in-SVG foil layers only — not the whole SVG host (avoids square hover halo).
- **Rounded lane art:** SVG **`cardClip`** (`rx` 22) on each **`.laneBg`**; base fills use reduced opacity so the card gradient shows through.
- **Depth / parallax:** **`.laneBg`** and **`.laneMarkParallax`** move opposite directions from **`--holo-x`** / **`--holo-y`**; mark gets a stronger contact shadow when active.
- **Mark pipeline:** extrusion offset paths, **`markGlowStrong`**, **`metalBrush`**, inset **`faceRad`**, rim strokes; Apex **`prismEdge`**; Glitch **`markGlitchStatic`** + hover **`markDisplace`**.
- **Phase accents:** reticle rings (Core/Apex) and glitch orbit opacity follow **`--holo-phase`** when **`.is-door-active`**.

**Hover-only holo:**

- At rest: dim scenery; idle holo stack; foil/shine hidden; no layer parallax
- On **`mouseenter`** / touch: **`is-door-active`** → tilt on **`.doorVisual`**, conic **`.doorHolo`**, **`.doorNoise`**, differential bg/mark motion
- **`prefers-reduced-motion`**: no sweep/anim/displacement/parallax; tilt may remain minimal

**Mounting:**

- Home doors: **`mountCollectionDoorSvgs()`** fills `.doorArtSvg[data-door-svg-lane]`
- Collection page: **`showCollectionView()`** injects **`collectionHeaderBannerSvg(lane)`** (core, shadow, glitch, architect, apex) or **`cardImg`** into **`#cvArtSvg`**
- Interaction: **`initCollectionDoorHolo()`** on `.collectionDoor.hasArt` and `#collectionViewHero`

To change door art, replace PNGs under **`store/img/collection-cards/`**, then **`npm run sync:store`**.

**Verify locally:** `npm run dev:shop` → **`http://localhost:5174/shop/index.html`**. `npm run dev` alone is the React bridge and does not serve the static shop.

---

## Catalog loading

1. Optional **`window.STORE_CATALOG_PATH`**
2. Else **`./square_products_latest.json`** (+ dated fallbacks)
3. Then **`storefront_overlay.json`** merged in client

Products need top-level **`{ "products": [ ... ] }`**. Collection labels on cards come from export **`collection`** when present.

---

## Checkout

1. **`GET /api/square/bootstrap`**
2. Square Web Payments SDK
3. **`POST /api/square/checkout`**

**API base** (`index.html`):

- Set **`window.STORE_API_BASE`** before scripts, or
- Hostname defaults: production → `https://api.aerovista.us`; localhost → `127.0.0.1:8088` then `18088`
- URL flags: `?api=prod`, `?api=local8088`, `?api=local18088`, `?api=local8009`

| Symptom | Likely cause |
|---------|----------------|
| “Unable to connect to payment service” on **localhost** | Payment API not running — start backend on **8088** or **18088**, or use `?api=prod` if CORS allows |
| Checkout fails on **gear.aerovista.us** | API down, CORS, or Square bootstrap config on server |
| **400** unknown SKU | Regenerate backend map; cart keys must be **`Color__Size`** |

**CORS:** `ALLOWED_ORIGINS` on the API must include the exact shop origin (e.g. `https://gear.aerovista.us`, `http://localhost:5174`). See **`DEPLOY_GITHUB_PAGES.md`**.

---

## Luxury fast-buy UX (Phase A)

Header and home CTAs prioritize shopping over browsing:

| Element | Behavior |
|---------|----------|
| **Shop** (header) | Opens full catalog (`goToCatalog`) |
| **Shop Shadow Wear** (hero) | Opens `?collection=shadow` |
| **Featured Drop** tiles | Show live price from catalog after `loadProducts()`; open product modal |
| **Product cards** | Primary CTA label **Shop** (not Quick View) |

**Product modal (express lane):**

- Collection line + category tag + large price
- **Size pills** (remembers last size in `localStorage` key `av_store_last_size_v1`; defaults to M when available)
- **Color pills** hidden when only one color / `Default`
- **Add to bag** → closes modal, opens cart drawer, toast confirms
- Fit + ship summary in `#modalBrief`; full detail grid hidden on product modal (still used for policy/info modals)
- Provider / external checkout button removed from modal

Promo codes (`SEED10`, `CREW15`) remain client-side estimates only — Square checkout may not apply the same discount.

---

## Product cards

- Prefer **`imagePath`** from catalog when file exists under `store/img/` (built via **`resolveCatalogImagePath`** — spaces in filenames are URL-encoded)
- Fallback: inline **`productSvg()`** placeholder in `index.html`
- Optional **holographic** / **glitch** card overlays when name/tags match

---

## Operator checklist (shop-only deploy)

1. Update **`store/square_products_latest.json`** (+ images)
2. **`npm run clean:overlay`** / **`audit:overlay`** if overlay changed
3. **`npm run sync:store`**
4. **`npm run audit:storefront`** — lane coverage, catalog images, featured-drop IDs, Phase A UX markers
5. Spot-check: home (no grid), each collection lane, catalog, one checkout on staging
6. **`npm run build:pages`** → push for GitHub Pages

---

## Related docs

| Doc | Topic |
|-----|--------|
| **`WORKFLOWS.md`** | Monorepo sync, console, deploy |
| **`STOREFRONT_OVERLAY.md`** | Overlay schema and launch policy |
| **`DEPLOY_GITHUB_PAGES.md`** | Public shop hosting |
| **`CATALOG_PIPELINE.md`** | Square → JSON |
| **`SKU_E2E_AUDIT.md`** | Cart keys and checkout |
| **`store/handoffnotes.md`** | Quick dev map (paths, API, troubleshooting) |
