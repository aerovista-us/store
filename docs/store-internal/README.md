# Store-internal operator docs

Markdown and notes that used to live under `store/` but must **never** ship on [gear.aerovista.us](https://gear.aerovista.us).

| File | Purpose |
|------|---------|
| [handoffnotes.md](handoffnotes.md) | Quick dev map for the storefront |
| [store-folder-readme.md](store-folder-readme.md) | Legacy `store/README.md` |
| [catalog_alignment_report.md](catalog_alignment_report.md) | Catalog alignment audit notes |
| [audio-media.md](audio-media.md) | Store audio asset notes |
| [SOT_README.md](SOT_README.md) | SOT manifest guide |
| [img/](img/) | Lane hero image curation notes (was `store/img/*/README.md`) |

Operator data (JSON snapshots, scripts, exports) lives in **`store/_internal/`** — excluded from `npm run sync:store` by allowlist.

Public shop sync allowlist: **`scripts/lib/public-shop-manifest.mjs`**.
