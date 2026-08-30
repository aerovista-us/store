#!/usr/bin/env python3
"""Search native Printful store for shadow pants variants."""
from __future__ import annotations

import os
import requests

TOKEN = (os.environ.get("PRINTFUL_API_TOKEN") or os.environ.get("PRINTFUL_TOKEN") or "").strip()
STORE = "17194817"
BASE = "https://api.printful.com"


def headers() -> dict:
    return {"Authorization": f"Bearer {TOKEN}", "X-PF-Store-Id": STORE}


def main() -> None:
    offset = 0
    while offset < 600:
        r = requests.get(f"{BASE}/store/products", headers=headers(), params={"offset": offset, "limit": 100}, timeout=30)
        data = r.json() if r.text else {}
        if not r.ok:
            print("list err", data)
            break
        batch = data.get("result") or []
        if not batch:
            break
        for p in batch:
            name = (p.get("name") or "")
            if "shadow" in name.lower() and "pant" in name.lower():
                pid = p.get("id")
                print(f"PRODUCT id={pid} name={name!r} external={p.get('external_id')}")
                r2 = requests.get(f"{BASE}/store/products/{pid}", headers=headers(), timeout=30)
                d2 = r2.json() if r2.text else {}
                for v in ((d2.get("result") or {}).get("sync_variants") or []):
                    print(f"  variant id={v.get('id')} name={v.get('name')!r} sku={v.get('sku')} external={v.get('external_id')}")
        offset += len(batch)
        if len(batch) < 100:
            break


if __name__ == "__main__":
    main()
