#!/usr/bin/env python3
import os, requests
TOKEN = (os.environ.get("PRINTFUL_API_TOKEN") or os.environ.get("PRINTFUL_TOKEN") or "").strip()
STORE = "17194817"
h = {"Authorization": f"Bearer {TOKEN}", "X-PF-Store-Id": STORE}
offset = 0
while offset < 600:
    r = requests.get("https://api.printful.com/store/products", headers=h, params={"offset": offset, "limit": 100}, timeout=30)
    batch = (r.json() or {}).get("result") or []
    if not batch: break
    for p in batch:
        name = (p.get("name") or "")
        nl = name.lower()
        if "shadow" in nl or "pant" in nl or "wide" in nl:
            print(p.get("id"), name)
    offset += len(batch)
    if len(batch) < 100: break
print("done")
