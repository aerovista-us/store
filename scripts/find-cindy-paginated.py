#!/usr/bin/env python3
"""Paginate Square orders Jun 12+ for Cindy Santi."""
from __future__ import annotations

import os
import requests

BASE = "https://connect.squareup.com"


def headers() -> dict:
    return {
        "Authorization": f"Bearer {os.environ['SQUARE_ACCESS_TOKEN']}",
        "Content-Type": "application/json",
        "Square-Version": os.getenv("SQUARE_VERSION", "2025-01-16"),
    }


def main() -> None:
    loc = os.getenv("SQUARE_LOCATION_ID", "").strip()
    cursor = None
    all_orders = []
    for page in range(10):
        body = {
            "location_ids": [loc],
            "query": {"filter": {"date_time_filter": {"created_at": {"start_at": "2026-06-12T00:00:00Z"}}}},
            "limit": 100,
        }
        if cursor:
            body["cursor"] = cursor
        r = requests.post(f"{BASE}/v2/orders/search", headers=headers(), json=body, timeout=30)
        data = r.json() if r.text else {}
        if not r.ok:
            print("err", r.status_code, data)
            break
        batch = data.get("orders") or []
        all_orders.extend(batch)
        cursor = data.get("cursor")
        if not cursor:
            break
    print(f"total orders fetched: {len(all_orders)} pages={page+1}")

    for o in all_orders:
        fulfillments = o.get("fulfillments") or []
        recip = {}
        if fulfillments:
            recip = (fulfillments[0].get("shipment_details") or {}).get("recipient") or {}
        name = (recip.get("display_name") or "").lower()
        email = (recip.get("email_address") or "").lower()
        if "cindy" not in name and "cindy" not in email:
            continue
        oid = o.get("id")
        state = o.get("state")
        total = (o.get("total_money") or {}).get("amount")
        created = o.get("created_at")
        items = " | ".join((li.get("name") or "?") for li in (o.get("line_items") or []))
        print(f"CINDY id={oid} created={created} state={state} total={total} items={items}")


if __name__ == "__main__":
    main()
