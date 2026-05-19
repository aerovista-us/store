#!/usr/bin/env python3
"""
Reconciliation worker: scans recent orders and ensures fulfillable ones
have a fulfillment job.
"""

from __future__ import annotations

import os
import time
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from db import get_session, Order, FulfillmentJob  # type: ignore


def reconcile_once(db: Session, lookback_minutes: int = 60) -> int:
  since = datetime.utcnow() - timedelta(minutes=lookback_minutes)
  orders = db.execute(
    select(Order).where(Order.created_at >= since)
  ).scalars().all()

  created = 0
  for order in orders:
    has_job = db.execute(
      select(FulfillmentJob).where(
        FulfillmentJob.order_id == order.id,
        FulfillmentJob.provider == "printful",
      )
    ).scalar_one_or_none()
    if not has_job:
      job = FulfillmentJob(order_id=order.id, provider="printful", job_status="pending")
      db.add(job)
      created += 1
  return created


def loop() -> None:
  interval = int(os.getenv("RECONCILE_WORKER_SLEEP_SECONDS", "300") or "300")
  lookback = int(os.getenv("RECONCILE_WORKER_LOOKBACK_MINUTES", "60") or "60")
  while True:
    with get_session() as db:
      created = reconcile_once(db, lookback_minutes=lookback)
      print(f"[reconcile] ensured jobs for recent orders; created={created}")
    time.sleep(interval)


if __name__ == "__main__":
  loop()

