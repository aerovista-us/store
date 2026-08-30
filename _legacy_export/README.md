# Legacy export staging (ready to leave this parent folder)

**Purpose:** Hold superseded / duplicate trees that were **not** promoted into true folders (`store/`, `console/`, `horizon/`, `docs/`, `scripts/`).

**Action for operator:** Move this entire directory **out** of `aerovista-store` (sibling archive), e.g.:

```powershell
Move-Item F:\aerovista-store\_legacy_export F:\aerovista-store-legacy-$(Get-Date -Format yyyy-MM-dd)
```

Do **not** publish this folder to GitHub Pages. Prefer not committing large binary trees; if needed, keep on NAS / Collab only.

## Contents

| Subfolder | Origin | Notes |
|-----------|--------|-------|
| `store-docs-remainder/` | `store/docs/` leftovers | Junk console dump (`cnots.md`), empty stubs, obsolete indexes |
| `store-ops-junk/` | `store/_internal/ops/` | Old HTML snapshots, docker logs, Datadog dump, temp PNGs |
| `planning-canvas/` | `planning/canvas/` after promotion | Design provenance + Next/Vite tooling; **promoted** rights/reconciliation → `horizon/evidence/` |
| `planning-horizon-gallary/` | `planning/horizon gallary/` | Early gallery demo |
| `planning-horizon-drone-tour/` | `planning/horizon-drone-tour/` | Concept tour |
| `archive/` | repo `archive/` | Pre-monorepo console / Vite shell |

See **[MANIFEST.md](MANIFEST.md)** for the inventory and what was promoted instead.

## Promoted (not here)

High-value unique content was moved into true folders before staging. See `docs/FOLDER_DUPLICATES.md` and `docs/README.md`.
