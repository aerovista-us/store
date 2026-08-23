# Git reconcile inventory — 2026-08-23

After rebase of local `main` onto `origin/main` (fulfillment-status fix commit
kept; ahead **1**). WIP from before reconcile restored from branch
`backup/wip-dirty-20260823` (commit `2da4b85`). Companion pointer branch:
`backup/pre-reconcile-HEAD-0ac7292`.

## Sync result

| Item | Result |
|------|--------|
| Pre-rebase | ahead 1 / behind 18 vs `origin/main` |
| Post-rebase | ahead **1** / behind **0** (`f3ff40d` on top of `82b363f`) |
| Conflict | none (`package.json` auto-clean; Horizon scripts merged back in) |
| Origin commerce contracts / schemas / CI | **kept** (not overwritten by older WIP) |
| Gear `store/index.html` + Cloudflare proxy | **kept from origin** (commerce-first) |

## Keep in this public repo (restored / staged WIP)

| Path | Notes |
|------|--------|
| `horizon/` | Canonical Horizon storefront source (parallel to `store/`) |
| `docs/STATUS.md`, user-manual chapters, `BACKEND_DEPLOY`, `AVCC_INTEGRATION`, `NXCORE_QUICKREF` | Operator docs from WIP |
| `WORKLOG.md`, refreshed docs under `docs/` | Chronology through 2026-07-28 |
| `planning/` | Plans, readiness, canvas provenance |
| `scripts/*` ops/audit helpers restored from WIP | Prefer review before publishing secrets-adjacent probes |
| `nginx/`, `Dockerfile`, `SOT.json` | Local/ops packaging |
| `package.json` scripts `build:horizon-pages`, `audit:horizon-pages` | Merged with origin commerce audit scripts |
| `stores/horizon/` | From origin Phase 0 — keep (fixture / store definition) |

## Leave untracked / do not commit

| Path | Why |
|------|-----|
| `.dev/` | Local Codex/Cursor caches, `auth.json`, nested private worktrees |
| `.playwright-cli/` | Local browser tooling |
| `output/` | Generated scratch |

## Other repositories (do not flatten into this tree)

| Surface | Where it lives |
|---------|----------------|
| Commerce API `/v1` implementation | Private `aerovista-us/aerovista-commerce-api` |
| Multi-store catalog console | Private `aerovista-us/aerovista-catalog-console` |
| Horizon **Pages** deploy artifact | Public `aerovista-us/horizon-storefront` (built from `horizon/`) |
| NXCore runtime backend | Deploy path on host; often gitignored as `store/backend/` here |

## Discard / review before commit

| Path | Notes |
|------|--------|
| `horizon-write-test` | Scratch file from WIP — confirm before keeping |
| One-off Printful/Square probe scripts under `scripts/` | Useful ops tools; sanitize any embedded IDs before publish |
| `store/storefront_overlay.backup-2026-05-19.json` | Backup JSON — optional archive |

## Intentionally not restored from WIP

Older WIP copies of `store/index.html`, Cloudflare worker sources, and
`.github/workflows/deploy-gear-api-proxy.yml` were **not** reapplied so origin’s
commerce-first + proxy fixes remain authoritative.
