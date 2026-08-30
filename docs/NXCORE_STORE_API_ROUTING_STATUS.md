# NXCore Store API + Routing — Current Status (Source of Truth)

**Owner:** Timbr (NXCore operator)  
**Scope:** Store API routing for `api.aerovista.us` (Traefik + Cloudflare Tunnel)  
**Canonical hostname:** `api.aerovista.us` (store-api.* retired)  
**Last verified (end-to-end):** 2026-04-02  
**Related files (canonical):**
- Traefik compose: `/srv/core/ops/traefik/docker-compose.yml`
- Store API compose: `/srv/Collab/mini.shops/av_storefront/backend/docker-compose.yml`
- Inventory: `docs/NXCORE_COMPOSE_INVENTORY.md`
- Truth inventory: `_truth_docs/invintory_server.md`
- App catalog entry: `_truth_docs/av-store-api_catalog_entry.json`
- Checkout readiness review: `docs/STOREFRONT_REVIEW_CHECKOUT_READINESS.md`

_Last updated: 2026-04-02_

## 0) What this doc is
A single-page snapshot of:
- what's canonical on NXCore right now,
- what hostname is standard,
- what's working internally vs at the public edge,
- historical failure modes worth keeping in the runbook,
- and the exact verify commands + next actions.

---

## Quick triage
- If `curl -H "Host: api.aerovista.us" http://127.0.0.1:<TRAEFIK_HTTP_PORT>/api/health` returns 200 → NXCore routing is good; Cloudflare is the issue.
- If that curl fails → Traefik/router/stack issue (check docker ps + router grep).
- If local passes but external `https://api.aerovista.us/api/health` is 530 → fix tunnel mapping (HTTP origin).

---

## 1) Canonical decisions (locked)
### Canonical Store API hostname
- **api.aerovista.us**
- Former/alternate hostnames: **none (retired)**

### Canonical compose paths
- **Traefik (edge/routing):**
  - `/srv/core/ops/traefik/docker-compose.yml`
- **Store API (av-store-api):**
  - `/srv/Collab/mini.shops/av_storefront/backend/docker-compose.yml`
  - Container port: **8088** (no host port published; routed by Traefik)
- **Workorders (ops home):**
  - `/srv/core/ops/workorders/docker-compose.yml`

### No-drift rule
The canonical hostname **api.aerovista.us** must match in:
1) `backend/docker-compose.yml` Traefik router rule  
2) Hosting/DNS docs  
3) App catalog (ops.healthcheck + access.traefik_route)

### HTTPS at edge, HTTP at origin (payments best practice)
- **Browser → Cloudflare:** MUST be HTTPS (`https://api.aerovista.us/...`). Cloudflare terminates TLS; customers and Square see a secure connection.
- **Cloudflare Tunnel → NXCore:** CAN be HTTP (`http://127.0.0.1:80`). Traffic is inside the tunnel; no origin TLS needed.
- **301 fix:** Traefik no longer redirects HTTP → HTTPS for `/api/*`. The compose defines two routers on `web` (80):
  - **Router 1** (priority 100): `Host(api.aerovista.us) && PathPrefix(/api/)` → service (no redirect). Tunnel gets 200 for `/api/health`.
  - **Router 2** (priority 1): `Host(api.aerovista.us)` → redirect to HTTPS (for everything else). Browsers still get HTTPS for the host.

**Gotcha:** If Traefik’s **static config** has an entrypoint-level redirect (e.g. `entryPoints.web.http.redirections.entryPoint` or a global middleware), it can force a redirect **before** router matching. Use the [two-curl check](#b2-two-curl-check-http-200-vs-301-nxcore) below; if `/api/health` still returns 301, paste `traefik.yml` (entryPoints + any `http.redirections` blocks) from `/srv/core/ops/traefik/` to exclude `api.aerovista.us` from the global redirect.

---

## 2) Current runtime status (what's working)
### NXCore internal routing (PASS)
- Traefik has a router for the Store API:
  - Rule: `Host(\`api.aerovista.us\`)`
  - TLS certResolver: `le_dns`
- Service routes to `av-store-api` on **:8088**
- Store API health endpoint responds through Traefik internally (expected).

---

## 3) Current external status
### Public edge routing (PASS)
- `https://api.aerovista.us/api/health` returned **200 OK** on **2026-04-02** from an external client context.
- Internal host-header checks against `http://100.115.9.61:80/api/health` and `https://100.115.9.61:443/api/health` with `Host: api.aerovista.us` also returned **200 OK** on **2026-04-02**.
- Prior localhost failures came from running NXCore-only loopback commands on a workstation that is **not** the NXCore host.

### Historical 530 guidance
- No active Cloudflare/Tunnel fault is present in the current verification set.
- Keep the HTTP-origin guidance in this doc as regression handling if `https://api.aerovista.us/api/health` ever falls back to **530** again.

---

## 4) Verification commands (copy/paste)
**Order that minimizes confusion:** 1) Local HTTP `/api/health` (200, no redirect) → 2) Local HTTP `/` (301) → 3) Local HTTPS `/api/health` with `-k` (200) → 4) External HTTPS `/api/health` (200).

Expected results at a glance:
- Step 1 (HTTP /api/health): **200** (JSON) — no redirect
- Step 2 (HTTP /): **301** Location: https://api.aerovista.us/
- Step 3 (HTTPS /api/health local with -k): **200** (JSON)
- Step 4 (External HTTPS /api/health): **200**. Verified on **2026-04-02**.

---

### A) Confirm Traefik router exists (NXCore)
```bash
curl -sS http://127.0.0.1:8083/api/http/routers | grep -i avstore -n
```
**Expected:** One or more lines containing router name/labels for the Store API (e.g. `avstoreapi` or `api-aerovista-us`). If empty, the router is missing.

### B) Confirm Traefik can reach the Store API using Host header (NXCore)
Replace `<TRAEFIK_HTTP_PORT>` with Traefik's HTTP entrypoint port on the host (often 80; check `docker ps`).
```bash
curl -sS -i http://127.0.0.1:<TRAEFIK_HTTP_PORT>/api/health -H "Host: api.aerovista.us"
```
**Expected:** `200 OK` and JSON health body. Confirms Traefik → av-store-api:8088 is working.

### B2) Two-curl check (HTTP 200 vs 301) (NXCore)
Proves `/api/*` has no redirect while other paths still redirect to HTTPS. Use port 80 (or your Traefik HTTP port).
```bash
# 1) Should be 200 now (no 301)
curl -sS -i http://127.0.0.1:80/api/health -H "Host: api.aerovista.us"

# 2) Should still redirect (301) for non-/api paths
curl -sS -i http://127.0.0.1:80/ -H "Host: api.aerovista.us"
```
**Expected:** `/api/health` → **200**; `/` → **301** to `https://api.aerovista.us/...`. If `/api/health` still returns 301, see the [global redirect gotcha](#https-at-edge-http-at-origin-payments-best-practice) in section 1.

### C) Find Traefik host port mappings (NXCore)
```bash
docker ps --format "table {{.Names}}\t{{.Ports}}"
```
Use this to see which host port is mapped to Traefik's HTTP entrypoint (e.g. 80).

### D) Confirm Store API container is up and listening (NXCore)
```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Networks}}" | grep -i store
```
**Expected:** `av-store-api` (or similar) running; port 8088 internal (no host port needed; Traefik routes by host).

### E) External (via Cloudflare)
```bash
curl -sS -i https://api.aerovista.us/api/health
```
**Current expected result:** `200 OK` with JSON body. If this regresses to `530`, use the HTTP-origin / DNS checklist in [CLOUDFLARE_530_CHECKLIST.md](CLOUDFLARE_530_CHECKLIST.md).

### F) Optional: 443 router (websecure) (NXCore)
Proves the HTTPS router is healthy for real public + Square traffic. Use `-k` locally only.
```bash
curl -sS -k -i https://127.0.0.1:443/api/health -H "Host: api.aerovista.us"
```
**Expected:** `200 OK`. Public clients use `https://api.aerovista.us` and don’t need `-k`.

### G) Checkout 400 sanity checks (NXCore)
If `/api/square/checkout` returns `400`:

```bash
# 1) Confirm backend map has entries
docker exec av-store-api sh -lc 'python - <<PY
import os, json
raw = os.environ.get("SQUARE_SKU_MAP_JSON","").strip()
if raw:
    m = json.loads(raw)
else:
    path = os.environ.get("SQUARE_SKU_MAP_FILE","/app/sku_map.generated.json")
    m = json.load(open(path))
print("entries:", len(m))
print("sample keys:", list(m)[:15])
PY'

# 2) Probe checkout with known key
curl -sS -i -X POST https://api.aerovista.us/api/square/checkout \
  -H "Content-Type: application/json" \
  -d '{"cart":[{"sku":"Default__2XL","qty":1}]}'
```
Expected: `200 OK` with `checkoutUrl`. If unknown SKU, align frontend payload key with map key.

---

## 5) Cloudflare tunnel target (what it SHOULD be)
- **Service must start with `http://`** — if it’s `https://`, you’re back in TLS/origin verify land and 530 can return.
- Example: `api.aerovista.us` → `http://127.0.0.1:80`

### Dashboard equivalent
**Zero Trust → Networks → Tunnels → (your tunnel) → Public Hostnames:**

| Field | Value |
|--------|--------|
| Hostname | `api.aerovista.us` |
| Service | `http://127.0.0.1:<TRAEFIK_HTTP_PORT>` |

### config.yml equivalent
```yaml
ingress:
  - hostname: api.aerovista.us
    service: http://127.0.0.1:<TRAEFIK_HTTP_PORT>
  - service: http_status:404
```

---

## 6) Truth docs updated
- **_truth_docs/invintory_server.md** — av-store-api row: Compose ` /srv/Collab/mini.shops/av_storefront/backend/docker-compose.yml`, Host `api.aerovista.us` → :8088. Traefik path: `/srv/core/ops/traefik/docker-compose.yml`.
- **docs/NXCORE_COMPOSE_INVENTORY.md** — Store API hostname standardized to `api.aerovista.us`. Former/alternate hostnames: none (retired). Verify examples use `api.aerovista.us`.
- **_truth_docs/av-store-api_catalog_entry.json** — Tier2; run_recipe; healthcheck/access routes set to `api.aerovista.us`.

---

## 7) Deploy and next actions
### Deploy (NXCore)
```bash
# (Preferred) newline-proof:
cd /srv/Collab/mini.shops/av_storefront/backend && pwd && docker compose up -d

# (Readable, but newline-sensitive):
cd /srv/Collab/mini.shops/av_storefront/backend && pwd
docker compose up -d
```
The one-liner is intentionally copy-paste safe; the two-line version is for readability only and can break if the newline is lost.

### Rollback (NXCore)
If a compose change goes sideways, immediate escape hatch:
```bash
cd /srv/Collab/mini.shops/av_storefront/backend && docker compose down
```
Or revert the compose file, then run `docker compose up -d` again.

Stop vs remove:
- `docker compose stop` = stop containers, keep them
- `docker compose down` = remove containers + network (safe; volumes remain unless you add `-v`)

### Show me what's live (post-deploy)
Anchors “did it actually apply?” without hunting:
```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | egrep -i "traefik|store|avstore"
curl -sS http://127.0.0.1:8083/api/http/routers | grep -i avstore -n
```

### Next actions (only what's left)
1. Keep the NXCore host-header checks in the runbook for server-side verification.
2. Do not treat `127.0.0.1:80` / `127.0.0.1:443` failures on a workstation as a routing failure for NXCore.
3. Use the public `https://api.aerovista.us/api/health` check as the definitive edge verification from non-server contexts.
4. When routing is revalidated, record the absolute verification date at the top of this doc.

---

## 8) Notes
- **store-api.*** is retired and should not be used as an alias.
- Do not patch host rules in random clones. Only the canonical compose path is authoritative.

---

## Change log (append-only)
- 2026-02-18: Initial runbook created; standardized hostname to `api.aerovista.us`; added two-router HTTP exception for `/api/*`; added Cloudflare HTTP-origin guardrail; added deploy/rollback/live checks.
- 2026-04-02: Verified `http://100.115.9.61:80/api/health -H "Host: api.aerovista.us"`, `https://100.115.9.61:443/api/health -H "Host: api.aerovista.us"`, and external `https://api.aerovista.us/api/health` all return 200. Routing declared complete end-to-end.

## Definition of Done
Routing is “complete” only when ALL are true:
- Local HTTP `/api/health` with Host header returns 200 (no redirect)
- Local HTTP `/` returns 301 → HTTPS
- Local HTTPS `/api/health` returns 200 (with `-k` locally)
- External `https://api.aerovista.us/api/health` returns 200 (no 530)

