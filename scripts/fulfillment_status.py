#!/usr/bin/env python3
"""Map Printful provider_status → orders.fulfillment_status for ops dashboard display."""

from __future__ import annotations

FULFILLED_STATUSES = frozenset({"fulfilled", "shipped", "delivered"})
CANCELLED_STATUSES = frozenset({"canceled", "cancelled"})
FAILED_STATUSES = frozenset({"failed", "error"})
REVIEW_STATUSES = frozenset({"needs_review", "onhold", "on_hold"})


def fulfillment_status_from_provider(
    provider_status: str | None,
    *,
    has_provider_order: bool = False,
) -> str:
    """Derive orders.fulfillment_status from Printful (or provider) status."""
    ps = (provider_status or "").strip().lower()
    if ps in FULFILLED_STATUSES:
        return "fulfilled"
    if ps in CANCELLED_STATUSES:
        return "cancelled"
    if ps in FAILED_STATUSES:
        return "failed"
    if ps in REVIEW_STATUSES:
        return "needs_review"
    if has_provider_order:
        return "submitted"
    return "pending"


def job_status_from_fulfillment(fulfillment_status: str) -> str:
    """Align fulfillment_jobs.job_status with order for ops audits."""
    if fulfillment_status in ("fulfilled", "cancelled", "failed", "needs_review"):
        return fulfillment_status
    if fulfillment_status == "submitted":
        return "submitted"
    return "pending"


# Fixture used by verify-ops-fulfillment-display and unit tests.
TEST_FULFILLED_ORDER = {
    "source_order_id": "TEST-FULFILLED-OPS-DISPLAY",
    "fulfillment_status": "fulfilled",
    "job_status": "fulfilled",
    "provider_status": "fulfilled",
}


def _run_tests() -> None:
    cases = [
        ("fulfilled", True, "fulfilled"),
        ("FULFILLED", True, "fulfilled"),
        ("shipped", True, "fulfilled"),
        ("inprocess", True, "submitted"),
        ("pending", True, "submitted"),
        ("failed", True, "failed"),
        ("canceled", True, "cancelled"),
        (None, False, "pending"),
        ("", False, "pending"),
    ]
    for provider_status, has_po, want in cases:
        got = fulfillment_status_from_provider(provider_status, has_provider_order=has_po)
        assert got == want, f"{provider_status!r} has_po={has_po}: got {got!r}, want {want!r}"

    assert job_status_from_fulfillment("fulfilled") == "fulfilled"
    assert job_status_from_fulfillment("submitted") == "submitted"
    assert TEST_FULFILLED_ORDER["fulfillment_status"] == "fulfilled"
    print(f"[ok] {len(cases)} fulfillment_status mapping cases passed")
    print(f"[ok] test fixture order: {TEST_FULFILLED_ORDER['source_order_id']}")


if __name__ == "__main__":
    _run_tests()
