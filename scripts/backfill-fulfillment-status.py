#!/usr/bin/env python3
"""Sync orders.fulfillment_status from fulfillment_jobs for rows still stuck at pending."""

from __future__ import annotations

from sqlalchemy import text

from db import get_session  # type: ignore


SQL = text(
    """
    UPDATE orders o
    SET fulfillment_status = CASE
          WHEN po.provider_status IN ('fulfilled', 'shipped', 'delivered') THEN 'fulfilled'
          ELSE fj.job_status
        END,
        updated_at = NOW()
    FROM fulfillment_jobs fj
    LEFT JOIN LATERAL (
      SELECT provider_status
      FROM provider_orders
      WHERE fulfillment_job_id = fj.id
      ORDER BY id DESC
      LIMIT 1
    ) po ON true
    WHERE fj.order_id = o.id
      AND o.fulfillment_status = 'pending'
      AND (
        fj.job_status IN ('submitted', 'needs_review', 'failed', 'fulfilled')
        OR po.provider_status IN ('fulfilled', 'shipped', 'delivered')
      )
    RETURNING o.id, o.fulfillment_status, fj.job_status
    """
)


def main() -> None:
    with get_session() as db:
        rows = db.execute(SQL).fetchall()
    print(f"updated {len(rows)} order(s)")
    for row in rows:
        print(row)


if __name__ == "__main__":
    main()
