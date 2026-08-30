#!/usr/bin/env python3
import os, requests

TOKEN = (os.environ.get("PRINTFUL_API_TOKEN") or os.environ.get("PRINTFUL_TOKEN") or "").strip()
for store in ["17194817", "17064001", "15431568", ""]:
    h = {"Authorization": f"Bearer {TOKEN}"}
    if store:
        h["X-PF-Store-Id"] = store
    r = requests.get("https://api.printful.com/store/products", headers=h, params={"limit": 5}, timeout=30)
    ok = r.ok
    n = len((r.json() or {}).get("result") or []) if ok else 0
    err = ((r.json() or {}).get("error") or {}).get("message", "") if not ok else ""
    print(f"store={store or 'default'} ok={ok} count={n} err={err[:80] if err else ''}")
