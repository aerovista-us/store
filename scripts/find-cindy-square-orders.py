#!/usr/bin/env python3
"""Find Cindy / shadow pants Square orders Jun 12-15."""
from __future__ import annotations

import os
from datetime import datetime, timezone

import requests

BASE = "https://connect.squareup.com"


def headers() -> dict:
    return {
        "Authorization": f"Bearer {os.environ['SQUARE_ACCESS_TOKEN']}",
        "Content-Type": "application/json",
        "Square-Version": os.getenv("SQUARE_VERSION", "2025-01-16"),
    }


def search(start: str) -> list:
    loc = os.getenv("SQUARE_LOCATION_ID", "").strip()
    body = {
        "location_ids": [loc],
        "query": {"filter": {"date_time_filter": {"created_at": {"start_at": start}}}},
        "limit": 100,
    }
    r = requests.post(f"{BASE}/v2/orders/search", headers=headers(), json=body, timeout=30)
    data = r.json() if r.text else {}
    if not r.ok:
        print("err", r.status_code, data)
        return []
    return data.get("orders") or []


def describe(o: dict) -> None:
    oid = o.get("id")
    created = o.get("created_at")
    state = o.get("state")
    total = (o.get("total_money") or {}).get("amount")
    fulfillments = o.get("fulfillments") or []
    recip = {}
    if fulfillments:
        recip = (fulfillments[0].get("shipment_details") or {}).get("recipient") or {}
    name = recip.get("display_name") or ""
    email = recip.get("email_address") or ""
    items = " | ".join((li.get("name") or "?") for li in (o.get("line_items") or []))
    tenders = o.get("tenders") or []
    pay_info = [(t.get("type"), t.get("payment_id")) for t in tenders]
    print(f"id={oid}\n  created={created} state={state} total={total} customer={name!r} email={email!r}")
    print(f"  items={items}")
    print(f"  tenders={pay_info}\n")


def main() -> None:
    orders = search("2026-06-12T00:00:00Z")
    print(f"orders since Jun 12: {len(orders)}")
    hits = []
    for o in orders:
        items = " ".join((li.get("name") or "") for li in (o.get("line_items") or [])).lower()
        fulfillments = o.get("fulfillments") or []
        recip = {}
        if fulfillments:
            recip = (fulfillments[0].get("shipment_details") or {}).get("recipient") or {}
        name = (recip.get("display_name") or "").lower()
        state = o.get("state", "")
        total = (o.get("total_money") or {}).get("amount") or 0
        if "shadow pant" in items and (state in ("OPEN", "COMPLETED") or "cindy" in name or total == 0):
            hits.append(o)
    print(f"\n=== candidate paid/open shadow pants ({len(hits)}) ===")
    for o in sorted(hits, key=lambda x: x.get("created_at", "")):
        describe(o)

    print("=== payments for candidate order ids ===")
    for o in hits:
        oid = o.get("id")
        r = requests.get(f"{BASE}/v2/orders/{oid}", headers=headers(), timeout=30)
        od = (r.json() or {}).get("order") or {}
        for t in od.get("tenders") or []:
            pid = t.get("payment_id")
            if not pid:
                continue
            pr = requests.get(f"{BASE}/v2/payments/{pid}", headers=headers(), timeout=30)
            p = (pr.json() or {}).get("payment") or {}
            print(f"order={oid} payment={pid} status={p.get('status')} amount={((p.get('amount_money') or {}).get('amount'))}")


if __name__ == "__main__":
    main()
