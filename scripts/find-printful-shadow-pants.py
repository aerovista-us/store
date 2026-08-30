#!/usr/bin/env python3
"""Find Printful sync variant for shadow pants via API."""
from __future__ import annotations

import os
import requests

TOKEN = (os.environ.get("PRINTFUL_API_TOKEN") or os.environ.get("PRINTFUL_TOKEN") or "").strip()
STORE = (os.environ.get("PRINTFUL_ORDER_STORE_ID") or os.environ.get("PRINTFUL_STORE_ID") or "").strip()
BASE = "https://api.printful.com"


def headers() -> dict:
    h = {"Authorization": f"Bearer {TOKEN}"}
    if STORE:
        h["X-PF-Store-Id"] = STORE
    return h


def main() -> None:
    if not TOKEN:
        print("no token")
        return
    offset = 0
    hits = []
    while offset < 500:
        r = requests.get(
            f"{BASE}/store/products",
            headers=headers(),
            params={"offset": offset, "limit": 100},
            timeout=30,
        )
        data = r.json() if r.text else {}
        if not r.ok:
            print("err", r.status_code, data)
            break
        items = (data.get("result") or [])
        if not items:
            break
        for p in items:
            name = (p.get("name") or "").lower()
            pid = p.get("id")
            if "shadow" in name and "pant" in name:
                hits.append((pid, p.get("name"), p.get("external_id")))
        offset += len(items)
        if len(items) < 100:
            break

    print(f"store products matching shadow+pant: {len(hits)}")
    for pid, name, ext in hits:
        print(f"  product_id={pid} name={name!r} external={ext}")
        r2 = requests.get(f"{BASE}/store/products/{pid}", headers=headers(), timeout=30)
        d2 = r2.json() if r2.text else {}
        variants = ((d2.get("result") or {}).get("sync_variants") or [])
        for v in variants:
            vname = v.get("name") or ""
            if " S" in vname or vname.endswith("S") or "(S)" in vname:
                print(f"    sync_variant_id={v.get('id')} name={vname!r} sku={v.get('sku')}")


if __name__ == "__main__":
    main()
