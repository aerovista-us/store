#!/usr/bin/env python3
"""Resolve Printful sync variant for shadow pants S via Square-linked store."""
from __future__ import annotations

import os
import requests

TOKEN = (os.environ.get("PRINTFUL_API_TOKEN") or os.environ.get("PRINTFUL_TOKEN") or "").strip()
SQUARE_STORE = "17064001"
NATIVE_STORE = "17194817"
SQUARE_VID = "PUXSQI64MVTC6OTTJRHJ5XUA"
# Printful dashboard product id from user's screenshot
PF_PRODUCT_HINT = "AEITXLBBQB7ATCVL5CD6N6XL"


def get_store_products(store_id: str) -> list:
    h = {"Authorization": f"Bearer {TOKEN}", "X-PF-Store-Id": store_id}
    out = []
    offset = 0
    while offset < 800:
        r = requests.get(
            "https://api.printful.com/store/products",
            headers=h,
            params={"offset": offset, "limit": 100},
            timeout=30,
        )
        data = r.json() if r.text else {}
        if not r.ok:
            return [{"error": (data.get("error") or {}).get("message") or data, "store": store_id}]
        batch = data.get("result") or []
        if not batch:
            break
        out.extend(batch)
        offset += len(batch)
        if len(batch) < 100:
            break
    return out


def describe_product(store_id: str, product_id: int | str) -> None:
    h = {"Authorization": f"Bearer {TOKEN}", "X-PF-Store-Id": store_id}
    r = requests.get(f"https://api.printful.com/store/products/{product_id}", headers=h, timeout=30)
    data = r.json() if r.text else {}
    if not r.ok:
        print("  detail error:", data)
        return
    result = data.get("result") or {}
    print(f"  product id={result.get('id')} name={result.get('name')!r} external={result.get('external_id')}")
    for v in result.get("sync_variants") or []:
        print(
            "    sync_variant_id=%s name=%r external_id=%r sku=%r"
            % (v.get("id"), v.get("name"), v.get("external_id"), v.get("sku"))
        )


def main() -> None:
    print("Looking for shadow pants + Square variation", SQUARE_VID)
    for store_id, label in [(NATIVE_STORE, "native AeroVista"), (SQUARE_STORE, "AeroVista store (Square)")]:
        print(f"\n=== {label} store_id={store_id} ===")
        products = get_store_products(store_id)
        if products and products[0].get("error"):
            print(" ", products[0]["error"])
            continue
        print(f"  products listed: {len(products)}")
        for p in products:
            name = (p.get("name") or "").lower()
            ext = str(p.get("external_id") or "")
            if "shadow" in name and "pant" in name:
                print(f"  MATCH list: id={p.get('id')} name={p.get('name')!r} external={ext}")
                describe_product(store_id, p.get("id"))
            if PF_PRODUCT_HINT in ext or PF_PRODUCT_HINT.lower() in name:
                describe_product(store_id, p.get("id"))

    # Try sync products endpoint (Square stores)
    print("\n=== sync/products (Square store) ===")
    h = {"Authorization": f"Bearer {TOKEN}", "X-PF-Store-Id": SQUARE_STORE}
    r = requests.get("https://api.printful.com/sync/products", headers=h, params={"limit": 100}, timeout=30)
    data = r.json() if r.text else {}
    if r.ok:
        for p in (data.get("result") or []):
            if "shadow" in (p.get("name") or "").lower():
                print(" sync product:", p.get("id"), p.get("name"), "external=", p.get("external_id"))
                pid = p.get("id")
                r2 = requests.get(f"https://api.printful.com/sync/products/{pid}", headers=h, timeout=30)
                d2 = r2.json() if r2.text else {}
                for v in ((d2.get("result") or {}).get("sync_variants") or []):
                    print(
                        "   variant id=%s name=%r external=%r"
                        % (v.get("id"), v.get("name"), v.get("external_id"))
                    )
    else:
        print(" ", (data.get("error") or {}).get("message") or data)


if __name__ == "__main__":
    main()
