# AeroVista Hosting & DNS

## Canonical public URLs

- **Storefront:** `https://aerovista.us` and `https://www.aerovista.us`
- **Checkout API:** `https://api.aerovista.us`

These are the production identities the repo should document and the metadata in
`index.html` should advertise.

## Target architecture

| Purpose | Hostname(s) | Target |
|--------|-------------|--------|
| **Storefront** | `aerovista.us`, `www.aerovista.us` | Firebase Hosting → `aerovista-us.web.app` |
| **Checkout API** | `api.aerovista.us` | Cloudflare Tunnel → NXCore → Traefik → `av-store-api` |

- **apex + www** → Firebase serves the static storefront (`index.html`, catalog, etc.).
- **api** → Does **not** go to Firebase. It goes through your Cloudflare Tunnel to NXCore, where Traefik routes `Host(api.aerovista.us)` to the `av-store-api` container.

The storefront (on Firebase) already calls `https://api.aerovista.us` for Square bootstrap and checkout; no code change needed for this split.

---

## DNS (Cloudflare)

- **A** `@` → `199.36.158.100` (Firebase Hosting edge)
- **CNAME** `www` → `ghs.googlehosted.com` (Firebase/Google)
- **TXT** (e.g. `hosting-site=aerovista-us`) for Firebase domain verification
- **CNAME** `api` → your Cloudflare Tunnel hostname (e.g. `xxx.cfargotunnel.com`)

### Cloudflare proxy (orange vs gray cloud)

Firebase often has trouble with SSL/verification when the Firebase records are **proxied** (orange cloud). Recommended:

1. Set **apex** and **www** to **DNS only** (gray cloud) until Firebase shows the domain connected and SSL is issued.
2. After it’s stable, you can turn proxy back on if you need Cloudflare features.

Conflicting A/AAAA/CNAME or proxy can block certificate provisioning; Firebase’s docs mention this as well.

---

## NXCore split DNS gotcha

If NXCore is configured with **split DNS** for `aerovista.us` (e.g. using an internal DNS server like `100.115.9.61`), then **from NXCore**:

- Queries for `api.aerovista.us` may be answered by that internal server instead of the public Cloudflare/Tunnel setup.
- Result: `curl` or health checks from NXCore to `api.aerovista.us` can fail or hit the wrong target, even though **public** resolvers (e.g. 1.1.1.1, 8.8.8.8) resolve it correctly.

**Fix:** Do **not** use a split DNS rule for `aerovista.us` on NXCore if this is your public domain. Let `api.aerovista.us` resolve via the same path as the rest of the internet (Cloudflare → Tunnel).

---

## Backend CORS

The API must allow the **origin** the browser uses when the storefront is loaded. For production that’s the Firebase-backed site:

```bash
ALLOWED_ORIGINS=https://aerovista.us,https://www.aerovista.us
```

Optional, for Firebase’s default hostname:

```bash
ALLOWED_ORIGINS=https://aerovista.us,https://www.aerovista.us,https://aerovista-us.web.app
```

Set this in `backend/.env` (or your deployment env) and restart the API.

---

## Go live checklist (do in order)

### 1) Cloudflare DNS: keep Firebase website clean

Set these to **DNS only** (gray cloud) for now:

- **A** `@` → `199.36.158.100` → **DNS only**
- **CNAME** `www` → `ghs.googlehosted.com` → **DNS only**

Once Firebase shows domain + SSL stable, you can decide whether to turn Cloudflare proxy back on.

---

### 2) Cloudflare Tunnel: API hostname tunnel-managed

- **DNS:** CNAME `api` → `<tunnel-id>.cfargotunnel.com` (or your tunnel hostname). Proxy status is usually **Proxied** (Cloudflare manages it).
- **Tunnel “Public hostnames”:**  
  `api.aerovista.us` → service target = your origin (e.g. `https://192.168.7.253:443` if Traefik terminates TLS, or `http://192.168.7.253:80` if HTTP internally).

---

### 3) NXCore: remove ~aerovista.us split DNS (the blocker)

NXCore must **not** use Tailscale split DNS for `aerovista.us` (no “DNS Domain: ~aerovista.us”, no “DNS Servers: 100.115.9.61” for this domain). Otherwise `api.aerovista.us` resolves via NXCore itself and fails.

**Option A – Tailscale Admin (preferred)**  
In Tailscale Admin → DNS: ensure there is **no** split domain for `aerovista.us` and no “use 100.115.9.61 as global nameserver” for this domain.

**Option B – Hard-fix on NXCore** (if NXCore still shows `~aerovista.us` after Option A):

```bash
# Disable Tailscale DNS and clear per-link config
sudo tailscale set --accept-dns=false
# or: sudo tailscale up --accept-dns=false

sudo resolvectl revert tailscale0 || true
sudo resolvectl dns tailscale0 '' || true
sudo resolvectl domain tailscale0 '' || true

sudo systemctl restart systemd-resolved
sudo resolvectl flush-caches
```

**Verify:**

```bash
resolvectl status | sed -n '1,35p'
getent hosts api.aerovista.us
```

**Success:** no `~aerovista.us` in output, and `api.aerovista.us` resolves to Cloudflare IPs (e.g. 104.21.x.x / 172.67.x.x).

---

### 4) Origin TLS (tunnel → Traefik)

Once DNS resolves and you can hit the hostname:

```bash
curl -I https://api.aerovista.us/api/health --connect-timeout 10
```

If you get a fast **525** or **502**, in the tunnel hostname settings temporarily enable **No TLS verify** for the origin, then retest.

---

### 5) Backend env: CORS required for browser checkout

On NXCore, in the **av-store-api** `backend/.env`:

- **Store on GitHub Pages** (https://aerovista-us.github.io/store/):
  ```bash
  ALLOWED_ORIGINS=https://aerovista-us.github.io
  ```
- **Store on Firebase/custom domain:**
  ```bash
  ALLOWED_ORIGINS=https://aerovista.us,https://www.aerovista.us
  ```
- **Both:** comma-separate origins. Restart the API after changing.

---

### 6) Final live test (from outside)

- From any **external** machine (not NXCore): visit **https://aerovista.us** (Firebase site).
- In browser DevTools (Network tab): confirm the page calls **https://api.aerovista.us/...** (e.g. `/api/square/bootstrap`) and gets **200** or **4xx JSON**, not CORS errors.

---

## Quick reference

- [ ] Apex + www → Firebase; DNS only (gray) until SSL is stable.
- [ ] `api.aerovista.us` CNAME → Cloudflare Tunnel; tunnel → NXCore/Traefik/av-store-api.
- [ ] NXCore: no ~aerovista.us split DNS; `getent hosts api.aerovista.us` returns Cloudflare IPs.
- [ ] Backend `ALLOWED_ORIGINS=https://aerovista.us,https://www.aerovista.us`.
- [ ] External test: https://aerovista.us loads and API calls return 200/4xx, no CORS.
