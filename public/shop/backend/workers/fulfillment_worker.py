#!/usr/bin/env python3
"""
Fulfillment worker: pulls pending jobs from Postgres, resolves Square→Printful
variant mapping, and submits orders to the Printful API.
"""

from __future__ import annotations

import os
import time
from datetime import datetime, timedelta

import requests
from sqlalchemy import text, select
from sqlalchemy.orm import Session

from db import get_session, FulfillmentJob, Order, OrderItem, ProductVariantMap, ProviderOrder  # type: ignore

PRINTFUL_ORDERS_URL = "https://api.printful.com/orders"

# Reset failed jobs to pending when next_attempt_at is due so they can be retried
RESET_RETRY_SQL = text(
  """
  UPDATE fulfillment_jobs
  SET job_status = 'pending', error_text = NULL
  WHERE job_status = 'failed'
    AND next_attempt_at IS NOT NULL
    AND next_attempt_at <= NOW()
  """
)

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

# US state name -> 2-letter code for Printful recipient.state_code (avoids truncating "Texas" -> "TE")
US_STATE_TO_CODE = {
  "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR", "california": "CA",
  "colorado": "CO", "connecticut": "CT", "delaware": "DE", "florida": "FL", "georgia": "GA",
  "hawaii": "HI", "idaho": "ID", "illinois": "IL", "indiana": "IN", "iowa": "IA",
  "kansas": "KS", "kentucky": "KY", "louisiana": "LA", "maine": "ME", "maryland": "MD",
  "massachusetts": "MA", "michigan": "MI", "minnesota": "MN", "mississippi": "MS",
  "missouri": "MO", "montana": "MT", "nebraska": "NE", "nevada": "NV", "new hampshire": "NH",
  "new jersey": "NJ", "new mexico": "NM", "new york": "NY", "north carolina": "NC",
  "north dakota": "ND", "ohio": "OH", "oklahoma": "OK", "oregon": "OR", "pennsylvania": "PA",
  "rhode island": "RI", "south carolina": "SC", "south dakota": "SD", "tennessee": "TN",
  "texas": "TX", "utah": "UT", "vermont": "VT", "virginia": "VA", "washington": "WA",
  "west virginia": "WV", "wisconsin": "WI", "wyoming": "WY", "district of columbia": "DC",
}


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

  # Build payload for our records (submitted_payload_json)
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

  # Call Printful API if configured
  token = (os.environ.get("PRINTFUL_API_TOKEN") or os.environ.get("PRINTFUL_TOKEN") or "").strip()
  provider_order_id = None
  provider_status = "pending"
  response_json = None

  if token and job.provider == "printful":
    store_id = (
      os.environ.get("PRINTFUL_ORDER_STORE_ID")
      or os.environ.get("PRINTFUL_STORE_ID")
      or ""
    ).strip()
    recipient = {
      "name": (order.ship_name or "").strip() or "Customer",
      "address1": (order.ship_addr1 or "").strip(),
      "city": (order.ship_city or "").strip(),
      "country_code": (order.ship_country or "US").strip()[:2].upper(),
      "zip": (order.ship_postal_code or "").strip(),
    }
    if (order.ship_state or "").strip():
      raw = (order.ship_state or "").strip()
      country = (order.ship_country or "US").strip()[:2].upper()
      if country == "US" and len(raw) > 2:
        recipient["state_code"] = US_STATE_TO_CODE.get(raw.lower(), raw[:2].upper())
      else:
        recipient["state_code"] = raw[:2].upper() if len(raw) >= 2 else raw.upper()
    if (order.ship_addr2 or "").strip():
      recipient["address2"] = (order.ship_addr2 or "").strip()
    if (order.customer_phone or "").strip():
      recipient["phone"] = (order.customer_phone or "").strip()

    pf_items = []
    for line in lines:
      try:
        vid = int(line["provider_variant_id"])
      except (TypeError, ValueError):
        vid = line["provider_variant_id"]
      pf_items.append({"sync_variant_id": vid, "quantity": line["qty"]})

    pf_body = {
      "external_id": order.source_order_id,
      "shipping": "STANDARD",
      "recipient": recipient,
      "items": pf_items,
    }
    try:
      r = requests.post(
        PRINTFUL_ORDERS_URL,
        headers={
          "Authorization": f"Bearer {token}",
          "Content-Type": "application/json",
          **({"X-PF-Store-Id": store_id} if store_id else {}),
        },
        json=pf_body,
        timeout=30,
      )
      response_json = r.json() if r.text else {}
      if r.ok:
        result = response_json.get("result") or {}
        provider_order_id = str(result.get("id", "")) if result.get("id") is not None else None
        provider_status = (result.get("status") or "draft") if isinstance(result.get("status"), str) else "draft"
      else:
        err_msg = (response_json.get("error") or {}).get("message") or r.text or f"HTTP {r.status_code}"
        job.job_status = "failed"
        job.error_text = err_msg[:500]
        job.next_attempt_at = datetime.utcnow() + timedelta(minutes=5)
        po = ProviderOrder(
          fulfillment_job_id=job.id,
          provider=job.provider,
          provider_order_id=None,
          provider_status="failed",
          submitted_payload_json=payload,
          response_json=response_json,
        )
        db.add(po)
        order.fulfillment_status = "pending"
        return
    except Exception as e:
      job.job_status = "failed"
      job.error_text = str(e)[:500]
      job.next_attempt_at = datetime.utcnow() + timedelta(minutes=5)
      po = ProviderOrder(
        fulfillment_job_id=job.id,
        provider=job.provider,
        provider_order_id=None,
        provider_status="error",
        submitted_payload_json=payload,
        response_json={"error": str(e)},
      )
      db.add(po)
      order.fulfillment_status = "pending"
      return

  provider_order = ProviderOrder(
    fulfillment_job_id=job.id,
    provider=job.provider,
    provider_order_id=provider_order_id,
    provider_status=provider_status,
    submitted_payload_json=payload,
    response_json=response_json,
  )
  db.add(provider_order)
  job.job_status = "submitted"
  order.fulfillment_status = "pending"


def worker_loop(sleep_seconds: int = 5) -> None:
  while True:
    with get_session() as db:
      db.execute(RESET_RETRY_SQL)
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

