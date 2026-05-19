#!/usr/bin/env python3
"""
Build a Square → Printful variant map from Printful export CSVs.

This script is part of the Printful fulfillment “Phase 2” in the
Treasure Trove migration plan. It consumes the CSV produced by
`backend/scripts/printful_my_products_export.py` and writes a JSON
mapping file that can later be used by checkout / ops tools.

The mapping is intentionally simple and Square-first:

- Key: a stable external id that you control (usually a Square
  variation id or a cart key), taken from the `external_id` field
  in Printful’s sync variant.
- Value: the Printful `sync_variant_id` used by the order API.

You decide what `external_id` means when you link Printful to Square.
The recommended convention is:

  external_id = Square variation id  (e.g. "SQV123...")

so the map becomes:

  { "SQV123...": "PrintfulSyncVariantID" }

Usage (from repo root, after running printful_my_products_export.py):

  python backend/scripts/build_printful_variant_map.py \\
    --variants printful_my_variants.csv

This writes:

  backend/data/printful_variant_map.json

The backend does not use this file yet; it is safe to wire in later
once you are ready to submit orders to Printful.
"""

import argparse
import csv
import json
import os
from pathlib import Path
from typing import Dict


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_VARIANTS_CSV = REPO_ROOT / "printful_my_variants.csv"
DEFAULT_OUTPUT = REPO_ROOT / "backend" / "data" / "printful_variant_map.json"


def build_map(variants_csv: Path) -> Dict[str, str]:
    mapping: Dict[str, str] = {}
    with variants_csv.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            external_id = (row.get("external_id") or "").strip()
            sync_variant_id = (row.get("sync_variant_id") or "").strip()
            if not external_id or not sync_variant_id:
                continue
            # Last one wins if duplicates; this is fine as long as external_id is stable.
            mapping[external_id] = sync_variant_id
    return mapping


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build a Square → Printful variant map from printful_my_variants.csv."
    )
    parser.add_argument(
        "--variants",
        default=str(DEFAULT_VARIANTS_CSV),
        help=f"Path to printful_my_variants.csv (default: {DEFAULT_VARIANTS_CSV})",
    )
    parser.add_argument(
        "--output",
        default=str(DEFAULT_OUTPUT),
        help=f"Path to write JSON map (default: {DEFAULT_OUTPUT})",
    )
    args = parser.parse_args()

    variants_path = Path(args.variants)
    if not variants_path.is_file():
        raise SystemExit(f"Variants CSV not found: {variants_path}")

    mapping = build_map(variants_path)
    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(mapping, f, indent=2, sort_keys=True)

    print(f"Wrote {len(mapping)} entries to {out_path}")


if __name__ == "__main__":
    main()

