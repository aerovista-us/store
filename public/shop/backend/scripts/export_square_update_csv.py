#!/usr/bin/env python3
"""
Export a minimal "Square Update CSV" from an edited catalog JSON.

This script does NOT talk to Square directly. It produces a small CSV
you can use as a starting point for updating Square via its catalog
CSV import:

- One row per product variant.
- Columns:
  - Item Name
  - Variation Name
  - Price
  - Description
  - SKU
  - Square Item ID
  - Square Variation ID

Recommended use:

1. Export an edited catalog from Catalog Console v1.1
   (`square_products_edited.json`).
2. Run this script to generate `exports/square_update_from_edited.csv`.
3. Open a fresh Square export CSV and this CSV side by side.
4. Copy the price / name / description columns into the Square CSV,
   preserving Square's own required columns (e.g. Token, location
   flags, tax/stock settings).
5. Import back into Square using its standard CSV importer.

This keeps Square as the retail source of truth and minimizes
duplicate risk by letting Square's own CSV shape drive the import.
"""

import argparse
import csv
import json
from pathlib import Path
from typing import Dict, List, Tuple


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CATALOG = REPO_ROOT / "square_products_edited.json"
DEFAULT_OUTPUT = REPO_ROOT / "exports" / "square_update_from_edited.csv"


def load_catalog(path: Path) -> List[Dict]:
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    if isinstance(data, dict):
        products = data.get("products") or data.get("items") or []
    elif isinstance(data, list):
        products = data
    else:
        products = []
    return [p for p in products if isinstance(p, dict)]


def iter_rows(products: List[Dict]) -> List[Dict[str, str]]:
    rows: List[Dict[str, str]] = []
    for p in products:
        item_id = str(p.get("id") or "").strip()
        item_name = str(p.get("name") or "").strip()
        desc = str(
            (p.get("description") or "")
            or (p.get("descriptionShort") or "")
            or (p.get("blurb") or "")
        ).strip()
        default_sku = str(p.get("sku") or "").strip()
        category = str(p.get("category") or "").strip()

        variants = p.get("variants") or []
        if not variants:
            # Single-row item (no variants array) – treat as one variation.
            price = p.get("price") or 0
            try:
                price_str = f"{float(price):.2f}"
            except (TypeError, ValueError):
                price_str = ""
            rows.append(
                {
                    "Item Name": item_name,
                    "Variation Name": "",
                    "Price": price_str,
                    "Description": desc,
                    "SKU": default_sku,
                    "Category": category,
                    "Square Item ID": item_id,
                    "Square Variation ID": "",
                }
            )
            continue

        for v in variants:
            if not isinstance(v, dict):
                continue
            size = str(v.get("size") or "").strip()
            color = str(v.get("color") or "").strip()
            variation_name_parts = [part for part in (color, size) if part]
            variation_name = " / ".join(variation_name_parts)

            price = v.get("price") or p.get("price") or 0
            try:
                price_str = f"{float(price):.2f}"
            except (TypeError, ValueError):
                price_str = ""

            sku = str(v.get("sku") or default_sku or "").strip()
            variation_id = str(v.get("variationId") or v.get("variation_id") or "").strip()

            rows.append(
                {
                    "Item Name": item_name,
                    "Variation Name": variation_name,
                    "Price": price_str,
                    "Description": desc,
                    "SKU": sku,
                    "Category": category,
                    "Square Item ID": item_id,
                    "Square Variation ID": variation_id,
                }
            )
    return rows


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Export a minimal Square Update CSV from an edited catalog JSON."
    )
    parser.add_argument(
        "--catalog",
        default=str(DEFAULT_CATALOG),
        help=f"Edited catalog JSON (default: {DEFAULT_CATALOG})",
    )
    parser.add_argument(
        "--output",
        default=str(DEFAULT_OUTPUT),
        help=f"Output CSV path (default: {DEFAULT_OUTPUT})",
    )
    args = parser.parse_args()

    catalog_path = Path(args.catalog)
    if not catalog_path.is_file():
        raise SystemExit(f"Catalog not found: {catalog_path}")

    products = load_catalog(catalog_path)
    rows = iter_rows(products)

    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    fieldnames = [
        "Item Name",
        "Variation Name",
        "Price",
        "Description",
        "SKU",
        "Category",
        "Square Item ID",
        "Square Variation ID",
    ]
    with out_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)

    print(f"Wrote {len(rows)} row(s) to {out_path}")


if __name__ == "__main__":
    main()

