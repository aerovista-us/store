# Cloudflare 530 Fix Checklist (api.aerovista.us)

When Traefik + Docker routing is correct but **HTTP 530** appears from Cloudflare, the issue is between Cloudflare and the origin (tunnel or TLS). Use this checklist.

---

## 1) Confirm what Cloudflare is trying to connect to

In **Cloudflare Tunnel → Public Hostnames** (or `cloudflared` config), verify `api.aerovista.us` is mapped to the correct origin:

- **Preferred (Tunnel → origin over HTTP):**  
  Service: `http://127.0.0.1:<traefik-entrypoint>` or `http://<nxcore-lan-ip>:<traefik-entrypoint>`  
  Traefik handles HTTPS/certs externally; Cloudflare talks plain HTTP to the tunnel.

- **If you map to HTTPS on origin:**  
  Service: `https://127.0.0.1:<traefik-https-entrypoint>` (or LAN IP)  
  Then `cloudflared` must validate the origin cert, or you must enable **No TLS Verify**.

**Common cause:** Hostname still points at an old target (e.g. store-api.*) or a dead port even though Traefik is correct.

---

## 2) Pick one origin TLS strategy (don’t mix modes)

| Option | Tunnel service | Notes |
|--------|----------------|--------|
| **A: HTTP to origin** | `http://...` | Most reliable. Edge TLS only; origin stays HTTP inside tunnel. |
| **B: HTTPS to origin** | `https://...` | If Traefik uses Let’s Encrypt (le_dns), cloudflared must trust it. If origin cert is self-signed, enable **No TLS Verify** for that hostname. |

If you previously used **No TLS Verify** for store-api and now point `api.aerovista.us` at an HTTPS origin that cloudflared can’t validate, you get this 530 pattern.

---

## 3) Verify tunnel can reach Traefik locally (on NXCore)

```bash
# If tunnel points to Traefik HTTP entrypoint
curl -sS -i http://127.0.0.1:<TRAEFIK_HTTP_PORT>/api/health

# If tunnel points to Traefik HTTPS entrypoint
curl -sS -k -i https://127.0.0.1:<TRAEFIK_HTTPS_PORT>/api/health
```

- If **HTTP** works locally → set tunnel service to `http://...` and you’re done.
- If only **HTTPS** works locally with `-k` → either switch tunnel to `http://...`, or keep `https` and enable **No TLS Verify** for that public hostname in tunnel config.

---

## 4) Cloudflare SSL/TLS mode (edge)

In **Cloudflare → SSL/TLS → Overview**, ensure the mode doesn’t conflict with how the tunnel is configured. For **Tunnel with HTTP to origin**, this is usually fine.

---

## Quick “do this first” recommendation

With Traefik already confirmed correct:

**Set the tunnel mapping for `api.aerovista.us` to HTTP to origin:**

- Service: `http://127.0.0.1:<traefik-http-port>` (or LAN IP)

Then Cloudflare never has to validate origin TLS.

---

## Next step

Paste your current **cloudflared** tunnel config for `api.aerovista.us` (Public Hostname or `config.yml` ingress block) to get the exact line change for a 200 response.
