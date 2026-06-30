#!/usr/bin/env python3
"""Upsert a fulfilled test order for ops dashboard verification (run inside api container)."""

from __future__ import annotations

import json
from datetime import datetime, timezone

from sqlalchemy import select, text

from db import FulfillmentJob, Order, ProviderOrder, get_session  # type: ignore

FIXTURE_SOURCE_ID = "TEST-FULFILLED-OPS-DISPLAY"
FULFILLMENT_STATUS = "fulfilled"
JOB_STATUS = "fulfilled"
PROVIDER_STATUS = "fulfilled"


def main() -> None:
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    raw = {
        "id": FIXTURE_SOURCE_ID,
        "state": "COMPLETED",
        "total_money": {"amount": 100, "currency": "USD"},
        "line_items": [{"name": "Ops display test item", "quantity": "1"}],
        "fixture": True,
        "note": "TEST order for fulfilled fulfillment_status display",
    }

    with get_session() as db:
        existing = db.execute(
            select(Order).where(
                Order.source_provider == "square",
                Order.source_order_id == FIXTURE_SOURCE_ID,
            )
        ).scalar_one_or_none()

        if existing:
            order = existing
            order.fulfillment_status = FULFILLMENT_STATUS
            order.updated_at = now
        else:
            order = Order(
                source_provider="square",
                source_order_id=FIXTURE_SOURCE_ID,
                currency="USD",
                order_total=100,
                order_status="received",
                fulfillment_status=FULFILLMENT_STATUS,
                customer_name="Ops Test (fulfilled)",
                customer_email="ops-test@example.invalid",
                raw_order_json=raw,
            )
            db.add(order)
            db.flush()

        job = db.execute(
            select(FulfillmentJob).where(
                FulfillmentJob.order_id == order.id,
                FulfillmentJob.provider == "printful",
            )
        ).scalar_one_or_none()
        if not job:
            job = FulfillmentJob(
                order_id=order.id,
                provider="printful",
                job_status=JOB_STATUS,
            )
            db.add(job)
            db.flush()
        else:
            job.job_status = JOB_STATUS

        po = db.execute(
            select(ProviderOrder).where(ProviderOrder.fulfillment_job_id == job.id)
        ).scalar_one_or_none()
        if not po:
            po = ProviderOrder(
                fulfillment_job_id=job.id,
                provider="printful",
                provider_order_id="TEST-PF-FULFILLED",
                provider_status=PROVIDER_STATUS,
                submitted_payload_json={"fixture": True},
                response_json={"result": {"status": "fulfilled", "id": "TEST-PF-FULFILLED"}},
            )
            db.add(po)
        else:
            po.provider_status = PROVIDER_STATUS

    print(
        json.dumps(
            {
                "ok": True,
                "order_id": order.id,
                "source_order_id": FIXTURE_SOURCE_ID,
                "fulfillment_status": FULFILLMENT_STATUS,
            }
        )
    )


if __name__ == "__main__":
    main()
