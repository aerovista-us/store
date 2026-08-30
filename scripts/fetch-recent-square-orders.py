#!/usr/bin/env python3
"""Fetch recent Square orders and search for shadow pants / Cindy."""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

import requests

BASE = "https://connect.squareup.com"


def headers() -> dict:
    token = os.environ["SQUARE_ACCESS_TOKEN"]
    ver = os.getenv("SQUARE_VERSION", "2025-01-16")
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Square-Version": ver,
    }


def main() -> None:
    loc = os.getenv("SQUARE_LOCATION_ID", "").strip()
    start = (datetime.now(timezone.utc) - timedelta(days=5)).isoformat()
    body = {
        "location_ids": [loc] if loc else None,
        "query": {
            "filter": {
                "date_time_filter": {
                    "created_at": {
                        "start_at": start,
                    }
                }
            }
        },
        "limit": 50,
    }
    body = {k: v for k, v in body.items() if v is not None}
    r = requests.post(f"{BASE}/v2/orders/search", headers=headers(), json=body, timeout=30)
    data = r.json() if r.text else {}
    if not r.ok:
        print("search failed", r.status_code, data)
        return

    orders = data.get("orders") or []
    print(f"Square orders since {start[:10]}: {len(orders)}")
    for o in orders:
        oid = o.get("id", "")
        created = o.get("created_at", "")
        state = o.get("state", "")
        total = (o.get("total_money") or {}).get("amount")
        fulfillments = o.get("fulfillments") or []
        recip = {}
        if fulfillments:
            recip = (fulfillments[0].get("shipment_details") or {}).get("recipient") or {}
        name = recip.get("display_name") or ""
        items = o.get("line_items") or []
        titles = " | ".join((li.get("name") or "?") for li in items)
        print(f"  id={oid}  created={created}  state={state}  total_cents={total}  customer={name!r}  items={titles[:60]}")

    print("\n--- shadow pants / cindy matches ---")
    for o in orders:
        items = o.get("line_items") or []
        titles = " ".join((li.get("name") or "") for li in items).lower()
        fulfillments = o.get("fulfillments") or []
        recip = {}
        if fulfillments:
            recip = (fulfillments[0].get("shipment_details") or {}).get("recipient") or {}
        name = (recip.get("display_name") or "").lower()
        if "shadow pant" in titles or "cindy" in name:
            print("MATCH:", o.get("id"), o.get("created_at"), name, titles)


if __name__ == "__main__":
    main()
