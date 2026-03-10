#!/usr/bin/env python3
"""
Fulfillment worker: pulls pending jobs from Postgres and prepares payloads
for Printful submission.

This v1 worker does not call Printful yet (that is wired in a later step);
it focuses on safe job claiming, mapping resolution, and status transitions.
"""

from __future__ import annotations

import os
import time
from datetime import datetime, timedelta

from sqlalchemy import text, select
from sqlalchemy.orm import Session

from db import get_session, FulfillmentJob, Order, OrderItem, ProductVariantMap, ProviderOrder  # type: ignore


CLAIM_SQL = text(
  """
WITH picked AS (
  SELECT id
  FROM fulfillment_jobs
  WHERE job_status = 'pending'
    AND (next_attempt_at IS NULL OR next_attempt_at <= NOW())
  ORDER BY created_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1
)
UPDATE fulfillment_jobs fj
SET job_status = 'processing',
    locked_at = NOW(),
    lock_token = gen_random_uuid(),
    attempt_count = attempt_count + 1,
    last_attempt_at = NOW()
FROM picked
WHERE fj.id = picked.id
RETURNING fj.id, fj.lock_token;
"""
)


def claim_job(db: Session) -> FulfillmentJob | None:
  row = db.execute(CLAIM_SQL).mappings().first()
  if not row:
    return None
  job_id = row["id"]
  job = db.get(FulfillmentJob, job_id)
  return job


def process_job(db: Session, job: FulfillmentJob) -> None:
  order = db.get(Order, job.order_id)
  if not order:
    job.job_status = "failed"
    job.error_text = "Order not found"
    return

  items = db.execute(
    select(OrderItem).where(OrderItem.order_id == order.id)
  ).scalars().all()
  if not items:
    job.job_status = "failed"
    job.error_text = "Order has no items"
    return

  lines = []
  mapping_missing = False

  for item in items:
    if item.square_variation_id:
      m = db.execute(
        select(ProductVariantMap).where(
          ProductVariantMap.provider == "printful",
          ProductVariantMap.square_variation_id == item.square_variation_id,
        )
      ).scalar_one_or_none()
    else:
      m = None
    if not m:
      mapping_missing = True
      continue
    lines.append(
      {
        "square_variation_id": item.square_variation_id,
        "provider_variant_id": m.provider_variant_id,
        "qty": item.quantity,
        "title": item.title,
      }
    )

  if mapping_missing and not lines:
    job.job_status = "needs_review"
    job.error_text = "No mapped variants for any items"
    return

  payload = {
    "order_id": order.source_order_id,
    "provider": job.provider,
    "items": lines,
    "shipping": {
      "name": order.ship_name,
      "address": {
        "line1": order.ship_addr1,
        "line2": order.ship_addr2,
        "city": order.ship_city,
        "state": order.ship_state,
        "postal_code": order.ship_postal_code,
        "country": order.ship_country,
      },
    },
  }

  provider_order = ProviderOrder(
    fulfillment_job_id=job.id,
    provider=job.provider,
    provider_order_id=None,
    provider_status="pending",
    submitted_payload_json=payload,
    response_json=None,
  )
  db.add(provider_order)
  job.job_status = "submitted"
  order.fulfillment_status = "pending"


def worker_loop(sleep_seconds: int = 5) -> None:
  while True:
    with next(get_session()) as db:  # type: ignore
      job = claim_job(db)
      if not job:
        time.sleep(sleep_seconds)
        continue
      try:
        process_job(db, job)
      except Exception as e:
        job.job_status = "failed"
        job.error_text = str(e)
        job.next_attempt_at = datetime.utcnow() + timedelta(minutes=5)
    # loop continues; each iteration owns its own transaction


if __name__ == "__main__":
  interval = int(os.getenv("FULFILLMENT_WORKER_SLEEP_SECONDS", "5") or "5")
  worker_loop(interval)

