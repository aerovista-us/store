# Master Fix Plan (Playbook)

This is a single end-to-end checklist to stabilize development, harden security, and ship cleanly.

Stop condition:
- If a phase fails acceptance, do not proceed. Fix it before moving on.

Scope notes:
- This repo: `av_storefront` (root `index.html` storefront + `backend/` Square checkout API).
- Other projects referenced below (ByteCast, parser, Umami): tracked as separate phases with "external repo" checkpoints.

---

## Phase 0 — Stop The Bleeding (Fast Wins)

### 0.0 Preflight snapshot (2 minutes)

- [ ] Record current state (paste into your issue/notes):
  - [ ] `git rev-parse --abbrev-ref HEAD`
  - [ ] `git status -sb`
  - [ ] `docker compose version` (or `docker --version` if compose is not installed)
  - [ ] `node -v && npm -v` (only if Node tooling exists for this repo)

### 0.1 Secrets + repo hygiene

- [ ] Rotate any leaked/at-risk secrets (Square tokens, API keys).
- [ ] Verify secrets are ignored:
  - [ ] `.gitignore` contains: `.env`, `.env.*`, `*.swp`, `__pycache__/`, `*.pyc`, `node_modules/`
  - [ ] `backend/.dockerignore` excludes: `.env`, `.env.*`, swap files, caches
- [ ] Quick leak scan (don’t rely on this alone):
  - [ ] `rg -n "Bearer\\s+|SQUARE_ACCESS_TOKEN=|api[_-]?key|secret|umami" -S .`

Acceptance:
- No secrets appear in `git status`.
- `docker build` context does not include `.env` files.

---

## Phase 1 — Fix Windows Share + npm/Tooling Issues (Unblocker)

### 1.1 Eliminate SMB credential collision (Windows error 1219)

- [ ] Pick ONE hostname form and stick to it for the session:
  - [ ] Use `\\\\100.115.9.61\\...` OR `\\\\nxcore\\...` (not both)
- [ ] Use the chosen hostname consistently in scripts, package paths, and mapped drives. Don’t mix within the same day.
- [ ] Disconnect conflicting mappings (X/Y/Z/D etc) and reconnect once.

Acceptance:
- No more credential collision prompts/errors when accessing the share.

### 1.2 Stop running Node tooling on UNC paths

- [ ] Do active dev on local disk, sync later:
  - Suggested: `C:\\dev\\av_storefront\\`
- [ ] Use git push/pull or robocopy to sync back to the share.

Acceptance:
- `npm install` and builds run reliably from local disk.

---

## Phase 2 — Clean Git State + Push

- [ ] `git status` is clean or intentionally staged.
- [ ] Commit with a meaningful message.
- [ ] Push to the correct remote/branch.

Acceptance:
- GitHub Pages build/deploy points at the intended branch and serves repo root.

---

## Phase 3 — Storefront Backend (Production-Correct)

### 3.1 Confirm Gunicorn is the actual runtime

- [ ] `backend/Dockerfile` uses gunicorn as `CMD`.
- [ ] `backend/requirements.txt` includes `gunicorn`.

Acceptance:
- Container logs show gunicorn boot (not Flask dev server).

### 3.2 Environment correctness

- [ ] `backend/.env.example` stays tracked.
- [ ] `backend/.env` is NOT committed.
- [ ] `FLASK_DEBUG=0` in runtime env.
- [ ] `ALLOWED_ORIGINS` includes your storefront origin (comma-separated).

Acceptance:
- `GET /api/health` returns `{"ok": true, ...}` and includes fields proving debug is off (example: `debug=false`) and the configured Square environment.
- Browser checkout requests succeed with no CORS errors.

### 3.3 One-button health verification

Add a script (optional but recommended) that:
- builds
- runs
- hits `/api/health`
- prints pass/fail and logs on failure

Manual commands (Windows PowerShell):
```powershell
cd backend
docker compose -f docker-compose.local.yml up -d --build
irm http://127.0.0.1:18088/api/health
docker compose -f docker-compose.local.yml logs --tail 200
```

Acceptance:
- Health check returns ok and logs show clean startup.

---

## Phase 4 — Square: Sandbox vs Production Separation

### 4.1 Separate credentials hard

- [ ] Decide `SQUARE_ENV` per environment (`sandbox` for dev, `production` for live).
- [ ] Keep production credentials out of local dev if possible.
- [ ] Ensure `.env.example` variable names are unambiguous.

Acceptance:
- `/api/square/bootstrap` returns the expected environment metadata and IDs for that environment.
- If `SQUARE_ENV` is missing/invalid, `/api/square/bootstrap` returns `400` with a clear error (fail closed, don’t silently default).

### 4.2 Square config checklist doc

- [ ] Add a short doc (could live in `backend/README.md`) listing:
  - where keys are found in Square dashboard
  - which env vars to set
  - how to verify with `/api/square/bootstrap` and a test payment

Acceptance:
- A new operator can set up `.env` without tribal knowledge.

---

## Phase 5 — Catalog Pipeline: Real “Latest” + Correct IDs

### 5.1 Standardize output

- [ ] Generate catalog from the Square export xlsx:
```powershell
python convert_catalog.py 1149XBNG8C8ZE_catalog-2026-02-11-0606.xlsx
```
- [ ] Confirm outputs exist:
  - [ ] `square_products_latest.json`
  - [ ] `square_products_YYYY-MM-DD.json` (dated)

### 5.2 Enforce non-empty catalogs

- [ ] Conversion must fail if product count is 0 (don’t overwrite latest).
- [ ] Write atomically:
  - [ ] write `square_products_latest.tmp.json`
  - [ ] validate
  - [ ] rename to `square_products_latest.json` only if valid

### 5.3 Ensure checkout uses Square variation object IDs

- [ ] Catalog must include `variants[].variation_id` for every variant.
- [ ] Frontend should prefer `variation_id` over SKU.

Acceptance:
- `square_products_latest.json` has `count > 0`.
- Every variant includes `variation_id`.
- Checkout rejects if mapping is missing (no broken orders created).

---

## Phase 6 — Frontend Canon + CSP + Analytics

### 6.1 Lock canonical storefront

- [ ] Canonical storefront is `index.html` at repo root.
- [ ] Archived Firebase/public variants are not deployed from this repo.

Acceptance:
- Deployed site HTML matches root `index.html`.

### 6.2 CSP: allow checkout API + Square requirements

- [ ] `index.html` CSP `connect-src` includes your API origin (example `https://api.aerovista.us`).
- [ ] CSP includes the Square domains needed by the Web Payments SDK (often `script-src`, `frame-src`).
- [ ] Maintain two CSP “modes”:
  - [ ] Dev CSP (localhost allowances for local testing)
  - [ ] Prod CSP (real domains only, no localhost)

Acceptance:
- No DevTools CSP errors during bootstrap/tokenize/checkout.

### 6.3 Analytics (Umami / other)

- [ ] Decide what analytics scripts/domains are allowed.
- [ ] Add minimal CSP allowances for those domains only.

Acceptance:
- Analytics loads with no CSP violations.

---

## Phase 7 — ByteCast Nav + Page Exposure (External Repo)

- [ ] Define "Public vs Internal" pages.
- [ ] Generate nav from one config file (e.g. `nav.json`).
- [ ] Add a route audit page listing detected HTML pages + exposure status.

Acceptance:
- Public nav never links internal/admin pages.

---

## Phase 8 — ChatGPT Parser “1400 projects” Fix (External Repo)

- [ ] Fix clustering rules (don’t split every header, normalize project names).
- [ ] Make one project = one deterministic ID.
- [ ] Add regression test run on a small sample (20 conversations).

Acceptance:
- Output project count matches expectations; duplicates merge correctly.

---

## Final "Done" Checklist

- [ ] Dev workflow stable (no UNC npm/tooling failures).
- [ ] Repo hygiene clean (no secrets, no accidental archived deploys).
- [ ] Backend is prod-correct (Gunicorn + healthcheck + deterministic startup).
- [ ] Catalog pipeline generates `square_products_latest.json` with `variation_id`.
- [ ] Storefront checkout works end-to-end without CSP/CORS issues.
- [ ] Analytics allowed explicitly (no overly-broad CSP).
