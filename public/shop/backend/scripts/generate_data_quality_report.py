#!/usr/bin/env python3
"""
Data quality report for Square-shaped catalogs.

Square stays the catalog and pricing source of truth. This script
is a Square-first counterpart to the dropship.store
`generate_data_quality_report.py`, but it is intentionally simpler
and does NOT depend on Printful.

It inspects a Square export CSV or a Square-shaped catalog JSON for:
- missing descriptions
- missing images
- missing prices

You can run it before Catalog Console (on Square exports) or after
Catalog Console (on `square_products_latest.json` /
`square_products_edited.json`).

Examples (from repo root):

  # JSON catalog (live)
  python backend/scripts/generate_data_quality_report.py \\
    --input square_products_latest.json

  # Edited JSON catalog from Console
  python backend/scripts/generate_data_quality_report.py \\
    --input square_products_edited.json

  # Square Items CSV export
  python backend/scripts/generate_data_quality_report.py \\
    --input square_items_export.csv --kind csv \\
    --name-field "Item Name" --description-field "Description" \\
    --image-field "Image URL" --price-field "Price"

Outputs:
  - Human-readable summary to stdout.
  - `data_quality_reports/data_quality_issues.csv` at the repo root
    with one row per product and boolean flags for:
      missing_description, missing_image, missing_price.
"""

import argparse
import csv
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUTPUT_DIR = REPO_ROOT / "data_quality_reports"


@dataclass
class ProductIssue:
    product_id: str
    name: str
    missing_description: bool
    missing_image: bool
    missing_price: bool


def _normalize_header(h: str) -> str:
    return (h or "").strip().lower()


def _find_column(headers: Iterable[str], desired: str) -> Optional[str]:
    """
    Find a header matching `desired` (case-insensitive), first by exact
    match, then by substring. Returns the ORIGINAL header string, or None.
    """
    desired_norm = _normalize_header(desired)
    header_list = list(headers)
    lookup: Dict[str, str] = {_normalize_header(h): h for h in header_list}

    if desired_norm in lookup:
        return lookup[desired_norm]

    for norm, original in lookup.items():
        if desired_norm and desired_norm in norm:
            return original
    return None


def load_json_products(path: Path) -> List[Dict]:
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    if isinstance(data, dict):
        products = data.get("products") or data.get("items") or []
    elif isinstance(data, list):
        products = data
    else:
        products = []
    return [p for p in products if isinstance(p, dict)]


def analyze_json_catalog(path: Path) -> List[ProductIssue]:
    products = load_json_products(path)
    issues: List[ProductIssue] = []

    for p in products:
        pid = str(p.get("id") or p.get("item_id") or "").strip()
        name = (p.get("name") or p.get("title") or "").strip()

        # Description heuristics.
        desc = (
            (p.get("description") or "")
            or (p.get("description_text") or "")
            or (p.get("description_html") or "")
            or (p.get("descriptionShort") or "")
            or (p.get("summary") or "")
            or (p.get("blurb") or "")
        )
        desc = str(desc).strip()

        # Image heuristics.
        image = (
            (p.get("image") or "")
            or (p.get("imageUrl") or "")
            or (p.get("image_url") or "")
            or (p.get("img") or "")
            or (p.get("thumbnail") or "")
            or (p.get("thumb") or "")
            or (p.get("localImage") or "")
        )
        if not image:
            images = p.get("images") or p.get("media") or []
            if isinstance(images, list) and images:
                first = images[0]
                if isinstance(first, str):
                    image = first
                elif isinstance(first, dict):
                    image = (
                        first.get("url")
                        or first.get("imageUrl")
                        or first.get("src")
                        or ""
                    )
        image = str(image).strip()

        # Price heuristics: any product- or variant-level price.
        price_present = False
        raw_price = p.get("price") or p.get("price_money") or p.get("priceCents")
        if raw_price not in (None, "", 0):
            price_present = True
        for v in p.get("variants") or []:
            if not isinstance(v, dict):
                continue
            vp = v.get("price") or v.get("price_money") or v.get("priceCents")
            if vp not in (None, "", 0):
                price_present = True
                break

        issues.append(
            ProductIssue(
                product_id=pid,
                name=name,
                missing_description=not bool(desc),
                missing_image=not bool(image),
                missing_price=not price_present,
            )
        )

    return issues


def analyze_csv_catalog(
    path: Path,
    name_field: str,
    description_field: str,
    image_field: str,
    price_field: str,
    id_field: Optional[str] = None,
) -> List[ProductIssue]:
    issues: List[ProductIssue] = []
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames or []

        name_col = _find_column(headers, name_field) or name_field
        desc_col = _find_column(headers, description_field) or description_field
        img_col = _find_column(headers, image_field) or image_field
        price_col = _find_column(headers, price_field) or price_field
        id_col = _find_column(headers, id_field) if id_field else None

        for row in reader:
            pid = str(row.get(id_col, "") if id_col else "").strip()
            name = str(row.get(name_col, "")).strip()
            desc = str(row.get(desc_col, "")).strip()
            image = str(row.get(img_col, "")).strip()
            price_raw = str(row.get(price_col, "")).strip()

            has_price = False
            if price_raw:
                try:
                    has_price = float(price_raw) > 0
                except ValueError:
                    has_price = True  # treat non-numeric as present

            issues.append(
                ProductIssue(
                    product_id=pid,
                    name=name,
                    missing_description=not bool(desc),
                    missing_image=not bool(image),
                    missing_price=not has_price,
                )
            )

    return issues


def write_csv_report(issues: List[ProductIssue], output_dir: Path) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    out_path = output_dir / "data_quality_issues.csv"
    with out_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "product_id",
                "name",
                "missing_description",
                "missing_image",
                "missing_price",
            ],
        )
        writer.writeheader()
        for issue in issues:
            writer.writerow(
                {
                    "product_id": issue.product_id,
                    "name": issue.name,
                    "missing_description": "Yes" if issue.missing_description else "No",
                    "missing_image": "Yes" if issue.missing_image else "No",
                    "missing_price": "Yes" if issue.missing_price else "No",
                }
            )
    return out_path


def summarize(issues: List[ProductIssue]) -> None:
    total = len(issues)
    missing_desc = sum(1 for i in issues if i.missing_description)
    missing_img = sum(1 for i in issues if i.missing_image)
    missing_price = sum(1 for i in issues if i.missing_price)

    print("=" * 72)
    print("DATA QUALITY REPORT (Square catalog)")
    print("=" * 72)
    print(f"Total products: {total}")
    if total:
        print(
            f"Missing descriptions: {missing_desc} ({missing_desc / total * 100:.1f}%)"
        )
        print(f"Missing images:      {missing_img} ({missing_img / total * 100:.1f}%)")
        print(
            f"Missing prices:      {missing_price} ({missing_price / total * 100:.1f}%)"
        )
    print()

    def _preview(label: str, pred) -> None:
        subset = [i for i in issues if pred(i)]
        if not subset:
            return
        print(f"{label} ({len(subset)}):")
        for i in subset[:20]:
            name = i.name or "(no name)"
            print(f"  {name} (id={i.product_id})")
        if len(subset) > 20:
            print(f"  ... and {len(subset) - 20} more")
        print()

    _preview("Products missing description", lambda i: i.missing_description)
    _preview("Products missing image", lambda i: i.missing_image)
    _preview("Products missing price", lambda i: i.missing_price)


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate a data quality report for a Square catalog CSV or JSON."
    )
    parser.add_argument(
        "--input",
        "-i",
        required=True,
        help="Path to Square export CSV or catalog JSON.",
    )
    parser.add_argument(
        "--kind",
        choices=["auto", "csv", "json"],
        default="auto",
        help="Input kind (auto-detected by extension by default).",
    )
    parser.add_argument(
        "--output-dir",
        default=str(DEFAULT_OUTPUT_DIR),
        help=f"Directory for CSV report (default: {DEFAULT_OUTPUT_DIR})",
    )
    parser.add_argument(
        "--name-field",
        default="name",
        help="CSV column for product name (default: name).",
    )
    parser.add_argument(
        "--description-field",
        default="description",
        help="CSV column for description (default: description).",
    )
    parser.add_argument(
        "--image-field",
        default="image_url",
        help="CSV column for image URL (default: image_url).",
    )
    parser.add_argument(
        "--price-field",
        default="price",
        help="CSV column for price (default: price).",
    )
    parser.add_argument(
        "--id-field",
        default=None,
        help="Optional CSV column for product id (default: none).",
    )
    return parser.parse_args(argv)


def main(argv: Optional[List[str]] = None) -> None:
    args = parse_args(argv)
    in_path = Path(args.input)
    if not in_path.is_file():
        raise SystemExit(f"Input file not found: {in_path}")

    kind = args.kind
    if kind == "auto":
        ext = in_path.suffix.lower()
        if ext == ".json":
            kind = "json"
        elif ext == ".csv":
            kind = "csv"
        else:
            raise SystemExit(
                f"Could not auto-detect input kind from extension {ext!r}; "
                "use --kind csv|json explicitly."
            )

    if kind == "json":
        issues = analyze_json_catalog(in_path)
    else:
        issues = analyze_csv_catalog(
            in_path,
            name_field=args.name_field,
            description_field=args.description_field,
            image_field=args.image_field,
            price_field=args.price_field,
            id_field=args.id_field,
        )

    summarize(issues)
    out_dir = Path(args.output_dir)
    out_path = write_csv_report(issues, out_dir)
    print(f"CSV report written to: {out_path}")


if __name__ == "__main__":
    main()

