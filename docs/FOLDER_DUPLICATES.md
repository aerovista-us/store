# Folder duplicates & roles

Tagged map of **canonical** vs **duplicate** folders in `aerovista-store`. Machine registry: `scripts/lib/folder-roles.mjs`. Generated mirrors get `FOLDER_ROLE.md` on sync/build.

**Legacy export staging:** [`_legacy_export/`](../_legacy_export/README.md) — ready to move **out** of this parent folder.

## Role tags

| Tag | Meaning | Edit? |
|-----|---------|-------|
| **CANON** | Source of truth | Yes — edit here |
| **GENERATED_MIRROR** | Full/partial copy from canon | No — run sync/build |
| **JSON_BRIDGE** | Subset copy (catalog JSON only) | No |
| **SUPERSEDED** | Old demo or retired tree | No — reference / export |
| **LEGACY_DOCS** | Stale docs superseded by `docs/` | No — stubs only |
| **OPERATOR_ONLY** | Internal ops data, not customer-facing | Yes — operator tooling |
| **PROVENANCE** | Design/history evidence | Prefer `horizon/evidence/` |
| **LEGACY_EXPORT** | Staged under `_legacy_export/` | Move out of parent |

---

## Gear storefront

| Folder | Role | Canonical winner |
|--------|------|------------------|
| **`store/`** | CANON | — |
| **`public/shop/`** | GENERATED_MIRROR | `store/` |
| **`dist/`** | GENERATED_MIRROR | `public/shop/` |
| **`public/store/`** | JSON_BRIDGE | `store/` (2 JSON files) |
| **`store/_internal/`** | OPERATOR_ONLY | `store/` (snapshots/backups) |
| **`store/docs/`** | LEGACY_DOCS (stub) | `docs/` — content promoted |
| **`store/image/`** | SUPERSEDED | `store/img/` |
| **`store/_archive/`** | SUPERSEDED | `store/` |

## Catalog console

| Folder | Role | Canonical winner |
|--------|------|------------------|
| **`console/`** | CANON | — |
| **`public/console/`** | GENERATED_MIRROR | `console/` |

## Horizon (second store)

| Folder | Role | Canonical winner |
|--------|------|------------------|
| **`horizon/`** | CANON | — |
| **`horizon/evidence/`** | CANON (promoted) | — rights + reconciliation |
| **`planning/canvas/`** | SUPERSEDED (stub) | `horizon/` + `_legacy_export/planning-canvas/` |
| **`planning/horizon gallary/`** | SUPERSEDED (stub) | `_legacy_export/planning-horizon-gallary/` |
| **`planning/horizon-drone-tour/`** | PROVENANCE (stub) | `_legacy_export/planning-horizon-drone-tour/` |

## Documentation

| Folder | Role | Canonical winner |
|--------|------|------------------|
| **`docs/`** | CANON | — |
| **`docs/catalog/`**, **`docs/pricing/`**, **`docs/operator-tools/`** | CANON (promoted) | from `store/docs/` / ops |
| **`docs/store-internal/`** | OPERATOR_ONLY | `docs/` |
| **`docs/archive/`** | CANON (history) | — |
| **`archive/`** (repo root) | SUPERSEDED (stub) | `_legacy_export/archive/` |

## Verify tags

```bash
npm run sync:all
npm run audit:folder-duplicates
```

Export legacy out of parent:

```powershell
Move-Item F:\aerovista-store\_legacy_export F:\aerovista-store-legacy-$(Get-Date -Format yyyy-MM-dd)
```
