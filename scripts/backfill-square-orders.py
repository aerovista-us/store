#!/usr/bin/env python3
"""Backfill Square order(s) into Postgres + create fulfillment job."""
from __future__ import annotations

import os
import sys

import requests

# Run inside av-store-api container where app modules exist
sys.path.insert(0, "/app")
from app import _square_retrieve_order, _upsert_order_from_square_payload, _ensure_fulfillment_job  # noqa: E402
from db import get_session  # noqa: E402


def backfill(order_id: str) -> None:
    order_obj = _square_retrieve_order(order_id)
    if not order_obj:
        raise SystemExit(f"Square order not found: {order_id}")
    payload = {"data": {"object": {"order": order_obj}}}
    with get_session() as db:
        order = _upsert_order_from_square_payload(db, payload)
        job = _ensure_fulfillment_job(db, order)
        print(
            f"backfilled db_order_id={order.id} square={order.source_order_id} "
            f"fulfillment={order.fulfillment_status} job={job.job_status} items={len(order.items or [])}"
        )


def main() -> None:
    ids = sys.argv[1:] or []
    if not ids:
        print("usage: backfill-square-orders.py <square_order_id> [...]")
        raise SystemExit(1)
    for oid in ids:
        backfill(oid.strip())


if __name__ == "__main__":
    main()
