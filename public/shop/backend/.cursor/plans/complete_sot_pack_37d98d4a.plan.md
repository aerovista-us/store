---
name: Complete SOT Pack
overview: "Read and complete the four SOT (Source of Truth) pack files: SOT_README.md, AEROVISTA_SOT_TEMPLATE_GUIDE.md, EXAMPLE_NOTES.md, and SOT.json. The pack serves as a reusable AeroVista template; completion means filling gaps, adding missing content, and ensuring consistency across all files."
todos: []
isProject: false
---

# Complete SOT Pack

## Current State

The SOT pack consists of four files in the project root:


| File                                                                                                     | Purpose             | Gaps                                                                          |
| -------------------------------------------------------------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------- |
| [SOT_README.md](y:\Apps\Lumina Branding Kit Organizer\SOT_README.md)                                     | Brief pack overview | Minimal; no links to GUIDE, no quick-reference                                |
| [AEROVISTA_SOT_TEMPLATE_GUIDE.md](y:\Apps\Lumina Branding Kit Organizer\AEROVISTA_SOT_TEMPLATE_GUIDE.md) | Field guide         | Mostly complete; minor gaps (docs index naming, validation)                   |
| [EXAMPLE_NOTES.md](y:\Apps\Lumina Branding Kit Organizer\EXAMPLE_NOTES.md)                               | Usage notes         | Very brief; no concrete workflow or step-by-step example                      |
| [SOT.json](y:\Apps\Lumina Branding Kit Organizer\SOT.json)                                               | Template manifest   | Placeholders OK; `purpose.business_role` and entrypoint need clearer guidance |


---

## 1. SOT_README.md

**Add:**

- Explicit links to `AEROVISTA_SOT_TEMPLATE_GUIDE.md` and `EXAMPLE_NOTES.md`
- A "Quick start" section (3–4 bullets) for first-time users
- Clarification that `SOT.json` is a template—copy and customize per project

---

## 2. AEROVISTA_SOT_TEMPLATE_GUIDE.md

**Add:**

- **Docs index naming**: Note that `docs_index.md` and `docs/README.md` or `docs/PACKAGE_INDEX.md` are both valid; projects may use either
- **Entrypoint variants**: Common entrypoints by stack (Next.js `src/app/page.tsx`, Vite `src/main.tsx`, etc.)
- **Validation**: Short note that SOT scanners validate `required_paths_exist`, marker presence, and canon location rules

---

## 3. EXAMPLE_NOTES.md

**Expand with:**

- **Step-by-step fill-in**: Ordered list (e.g., 1. project name/slug, 2. deploy path, 3. canon_files, 4. required_paths_exist)
- **Concrete example**: One or two sample `canon_files` entries with brief rationale
- **Anti-patterns**: Do not list `node_modules`, `dist`, or generated files as canon
- Link back to the full GUIDE for section details

---

## 4. SOT.json

**Adjust:**

- `**purpose.business_role`**: Replace placeholder with a clearer instruction, e.g. `"One sentence describing what this project does in the AeroVista ecosystem."`
- `**entrypoints`**: Add a second example for Vite-style apps (`src/main.tsx`) with `required: false` and a note to pick the one that matches the stack
- `**notes**`: Add a note about choosing the correct app entrypoint (Next.js vs Vite vs other)

---

## Optional: Lumina-Specific SOT

As a worked example, we could create a filled-out `SOT.lumina.json` (or overwrite `SOT.json` if the template is stored elsewhere). This would demonstrate:

- Project: Lumina Branding Kit Organizer
- Stack: React, Vite, Express, SQLite
- Deploy: `/srv/lumina/app`, port 3180
- Canon files: `README.md`, `docs/README.md`, `docs/PACKAGE_INDEX.md`, `docs/ARCHITECTURE.md`, `docs/NXCORE_DEPLOYMENT.md`, etc.

**Recommendation:** Keep `SOT.json` as the generic template. If desired, add `SOT.lumina.json` as a reference implementation and mention it in EXAMPLE_NOTES.

---

## File Change Summary


| File                            | Action                                                          |
| ------------------------------- | --------------------------------------------------------------- |
| SOT_README.md                   | Expand with links, quick start                                  |
| AEROVISTA_SOT_TEMPLATE_GUIDE.md | Add docs index note, entrypoint variants, validation note       |
| EXAMPLE_NOTES.md                | Add step-by-step workflow, concrete example, anti-patterns      |
| SOT.json                        | Refine purpose.business_role, add Vite entrypoint, update notes |


