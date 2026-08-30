# NXCore Compose Inventory

Single reference for canonical compose files (run these) vs files to review or avoid. Use this on NXCore or in repo for deploy/routing alignment.

**Source of truth for Store API + routing status (working vs 530, verify commands):** [NXCORE_STORE_API_ROUTING_STATUS.md](NXCORE_STORE_API_ROUTING_STATUS.md)

**Store API (canonical hostname):** `api.aerovista.us` → Traefik → av-store-api:8088. Same hostname is used in HOSTING_AND_DNS.md, README, backend compose router rule, and app catalog.

---

## DOC 1 — Canonical Compose Files (Known-Right / Preferred)

Treat these as default truth unless you intentionally say otherwise. No backups or duplicate twins; aligned with what’s proven live (Traefik + Host rules).

### Edge / Routing (start first)

| Path | Notes |
|------|--------|
| `/srv/core/ops/traefik/docker-compose.yml` | ✅ Confirmed by running Traefik container metadata (compose project points here). |

### Store API (Square-facing backend)

| Path | Notes |
|------|--------|
| `/srv/Collab/mini.shops/av_storefront/backend/docker-compose.yml` | ✅ Defines `av-store-api` and Traefik labels. Router rule: `Host(\`api.aerovista.us\`)` → container port **8088**. **Canonical hostname:** api.aerovista.us. **Former/alternate hostnames:** none (retired). |

### Core Ops (platform layer)

| Path | Notes |
|------|--------|
| `/srv/core/ops/workorders/docker-compose.yml` | av-wo-processor, av-wo-ui (ops home). |

### Other canonical (verify paths on your NXCore)

| Path | Notes |
|------|--------|
| `/srv/core/ops/ollama/docker-compose.yml` | ollama. |
| `/srv/core/ops/workershop/docker-compose.yml` | workershop. |
| `/srv/n8n/compose.yml` | n8n automation. |
| `/srv/browser-workspaces/compose.yml` | Browser workspaces. |
| `/srv/autoheal/compose.yml` | Autoheal. |
| `/srv/ACOS/aerovista-command-center/docker-compose.yml` | Command center. |
| `/srv/ACOS/nxhome/docker-compose.yml` | nxhome. |
| `/srv/Collab/av-share/calendar/docker-compose.yml` | Calendar. |
| `/srv/ACOS/Apps/aerocaller/docker-compose.yml` | aerocaller. |
| `/srv/ACOS/Apps/byte/docker-compose.yml` | byte. |
| `/srv/NXDrive/EchoVerse/EchoVerse_Music_Catalog/docker-compose.yml` | EchoVerse (primary). |
| `/srv/NXDrive/EchoVerse/EchoVerse_Music_Catalog/whisper_worker/docker-compose.yml` | whisper_worker. |
| `/srv/NXDrive/EchoVerse/EchoVerse_Music_Catalog/audio_analyzer/docker-compose.yml` | audio_analyzer. |
| `/srv/NXDrive/EchoVerse/homepage/docker-compose.yml` | EchoVerse homepage. |
| `/srv/NXDrive/Divisions/skyforge/docker-compose.yml` | SkyForge. |

---

## DOC 2 — Compose Files To Review / Decide

Not “wrong”—but likely to cause duplicates, conflicts, or “why do I have two?” issues.

### A) Backups (avoid unless intentionally restoring)

Do **not** `docker compose up -d` from these. Keep as cold storage only.

- `/srv/ACOS/aerovista-command-center.backup.20251205_002034/docker-compose.yml`
- `/srv/NXDrive/EchoVerse/EchoVerse_Music_Catalog__backup_20260204_054219/docker-compose.yml`
- `/srv/NXDrive/EchoVerse/EchoVerse_Music_Catalog__backup_20260204_054756/docker-compose.yml`
- `/srv/NXDrive/EchoVerse/EchoVerse_Music_Catalog__backup_20260204_054756/whisper_worker/docker-compose.yml`
- `/srv/NXDrive/EchoVerse/EchoVerse_Music_Catalog__backup_20260204_054756/audio_analyzer/docker-compose.yml`

### B) Duplicate twins (pick ONE canonical path per set)

| Preferred | Review / alternate | Decision |
|-----------|--------------------|----------|
| `/srv/core/ops/workorders/docker-compose.yml` | `/srv/avcc/workorders/docker-compose.yml` | Which is “the” workorders stack you maintain. |
| `/srv/ACOS/aerovista-command-center/docker-compose.yml` | `/srv/ACOS/aerovista/aerovista-command-center/docker-compose.yml` | Which folder is the true deploy target. |
| `/srv/core/server/aerocaller_coturn_pack/docker-compose.yml` | `/srv/ACOS/NXCore-Control/server/aerocaller_coturn_pack/docker-compose.yml` | Is NXCore-Control the new home or an older copy? |
| `/srv/core/server/fleet_layer/docker-compose.yml` | `/srv/ACOS/NXCore-Control/server/fleet_layer/docker-compose.yml` | Same as above. |

### C) Suspicious / typo

| Path | Decision |
|------|----------|
| `/srv/Collab/av-share/calendar/frountend/docker-compose.yml` | Needed or misspelled duplicate of “frontend”? |

### D) Secondary routing layer (may conflict with Traefik)

| Path | Decision |
|------|----------|
| `/srv/ACOS/nxtraefik/routes/docker-compose.yml` | Do you define routers/middlewares here, or is everything via container labels? |

### E) Legacy / unclear role

| Path | Decision |
|------|----------|
| `/srv/core/compose.yml` | Still a real “core” stack or leftover placeholder? |

### F) Optional utilities (on-demand vs required)

| Path | Decision |
|------|----------|
| `/srv/core/utils/coturn/docker-compose.yml` | Required for current ops or on-demand only? |
| `/srv/core/server/nxcore_bootstrap/filebrowser/docker-compose.yml` | Same. |

### G) Mini-shops + client projects (run only when actively working)

Run only when needed; avoid backup/duplicate variants by default.

- `/srv/Collab/mini.shops/agreement/app/docker-compose.yml`
- `/srv/Collab/mini.shops/Valentines/docker-compose.yml`
- `/srv/Collab/mini.shops/Valentines/update/docker-compose.yml` — avoid by default
- `/srv/Collab/mini.shops/Valentines/Valentines.v3/docker-compose.yml` — avoid by default
- `/srv/NXDrive/Clients/Inspiro/ICETAP_FUSION/docker-compose.yml`
- `/srv/NXDrive/Clients/ShortK/Byte Fantasy Chaos Suite/docker-compose.yml`
- `/srv/NXDrive/NeXuS/Agent/MemoryMapping.v2/docker-compose.yml`

---

## Quick reference

| Purpose | Compose path | Host / note |
|--------|--------------|-------------|
| Edge | `/srv/core/ops/traefik/docker-compose.yml` | Traefik. |
| Store API | `/srv/Collab/mini.shops/av_storefront/backend/docker-compose.yml` | `api.aerovista.us` → 8088. |
| Workorders | `/srv/core/ops/workorders/docker-compose.yml` | av-wo-*. |

After changing the Store API compose, apply:

```bash
cd /srv/Collab/mini.shops/av_storefront/backend
docker compose up -d
```

Verify Traefik and Store API (replace `<TRAEFIK_HTTP_PORT>` with Traefik HTTP port from `docker ps`):

```bash
curl -sS http://127.0.0.1:8083/api/http/routers | grep -i avstore
curl -sS -i http://127.0.0.1:<TRAEFIK_HTTP_PORT>/api/health -H "Host: api.aerovista.us"
docker ps --format "table {{.Names}}\t{{.Ports}}"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Networks}}" | grep -i store
```
Full verify list: [NXCORE_STORE_API_ROUTING_STATUS.md](NXCORE_STORE_API_ROUTING_STATUS.md#4-verification-commands-copy-paste).
