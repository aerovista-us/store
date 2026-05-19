#!/usr/bin/env python3
"""
Profit floor validator: ensure no retail ladder price dips below cost + fees + shipping buffer.
Reads storefront_overlay.json (rules.priceLadders, rules.costByLadder, rules.fees, rules.shipBufferCents)
and a catalog JSON (products with variants). Reports any variant whose profit would be < 0.

Usage:
  python validate_profit_floor.py [overlay.json] [catalog.json]
  Default overlay: repo_root/storefront_overlay.json
  Default catalog: repo_root/square_products_latest.json
"""
import json
import os
import sys


def category_to_ladder_key(cat: str, name: str) -> str:
    """Mirror of index.html categoryToLadderKey; fallback to name when category missing."""
    s = (cat or "").lower() + " " + (name or "").lower()
    if "hoodie" in s and "zip" in s:
        return "hoodie_zip"
    if "hoodie" in s:
        return "hoodie_pullover"
    if "tee" in s or "shirt" in s:
        return "tee"
    if "hat" in s or "cap" in s:
        return "trucker_hat"
    if "crew" in s:
        return "crewneck"
    return ""


def main() -> None:
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
    overlay_path = os.path.join(repo_root, "storefront_overlay.json")
    catalog_path = os.path.join(repo_root, "square_products_latest.json")
    if len(sys.argv) >= 2:
        overlay_path = os.path.abspath(sys.argv[1])
    if len(sys.argv) >= 3:
        catalog_path = os.path.abspath(sys.argv[2])

    if not os.path.isfile(overlay_path):
        print("Overlay not found:", overlay_path, file=sys.stderr)
        sys.exit(1)
    if not os.path.isfile(catalog_path):
        print("Catalog not found:", catalog_path, file=sys.stderr)
        sys.exit(1)

    with open(overlay_path, "r", encoding="utf-8") as f:
        overlay = json.load(f)
    with open(catalog_path, "r", encoding="utf-8") as f:
        catalog = json.load(f)

    rules = overlay.get("rules") or {}
    overrides = overlay.get("overrides") or {}
    price_ladders = rules.get("priceLadders") or {}
    cost_by_ladder = rules.get("costByLadder") or {}
    fees = rules.get("fees") or {}
    processor_pct = float(fees.get("processorPct", 0.03))
    processor_fixed = int(fees.get("processorFixedCents", 30))
    ship_buffer = int(rules.get("shipBufferCents", 400))

    products = catalog.get("products") or []
    violations = []
    checked = 0

    for p in products:
        name = (p.get("name") or "").strip()
        pid = (p.get("id") or "").strip()
        category = (p.get("category") or "").strip()
        ov = overrides.get("sq_" + pid) if pid else None
        if not ov:
            ov = overrides.get(pid) or {}
        ladder_key = (ov.get("ladderKey") or "").strip() or category_to_ladder_key(category, name)
        if not ladder_key:
            continue
        ladder = price_ladders.get(ladder_key)
        cost_ladder = cost_by_ladder.get(ladder_key)
        if not ladder or not cost_ladder:
            continue

        for v in p.get("variants") or []:
            size = (v.get("size") or "").strip() or "One Size"
            retail_d = ladder.get(size) if isinstance(ladder.get(size), (int, float)) else ladder.get("base")
            if retail_d is None:
                retail_d = ladder.get("base")
            if retail_d is None:
                continue
            retail_cents = int(round(float(retail_d) * 100))
            cost_cents = cost_ladder.get(size) if isinstance(cost_ladder.get(size), (int, float)) else cost_ladder.get("base")
            if cost_cents is None:
                cost_cents = cost_ladder.get("base", 0)
            cost_cents = int(cost_cents)
            fee_cents = int(round(retail_cents * processor_pct)) + processor_fixed
            profit = retail_cents - cost_cents - ship_buffer - fee_cents
            checked += 1
            if profit < 0:
                violations.append({
                    "product": name,
                    "id": pid,
                    "size": size,
                    "ladderKey": ladder_key,
                    "retailCents": retail_cents,
                    "costCents": cost_cents,
                    "feeCents": fee_cents,
                    "shipBufferCents": ship_buffer,
                    "profitCents": profit,
                })

    if violations:
        print("PROFIT FLOOR VIOLATIONS (retail - cost - shipBuffer - fees < 0):", file=sys.stderr)
        for v in violations:
            print(
                f"  {v['product']} ({v['size']}) ladder={v['ladderKey']} "
                f"retail={v['retailCents']}c cost={v['costCents']}c fee={v['feeCents']}c buffer={ship_buffer}c -> profit={v['profitCents']}c",
                file=sys.stderr,
            )
        sys.exit(1)
    print(f"OK: {checked} variant(s) checked; no profit floor violations.")


if __name__ == "__main__":
    main()
