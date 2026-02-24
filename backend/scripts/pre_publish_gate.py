#!/usr/bin/env python3
"""
Pre-publish gate for the AeroVista storefront.

Runs the Square-first checks in a single command and returns a
machine- and human-readable summary:

Gate order:
  1) Data quality (missing description/image/price)
  2) Console Validate (manual reminder only)
  3) Profit floor (no negative-profit SKUs)
  4) Optional: Printful mapping coverage (Square variation → Printful variant)

Exit code:
  - 0 when all *automated* gates pass.
  - 1 when any automated gate fails (data quality, profit floor, or,
    when requested, Printful mapping coverage).

Example (from repo root, edited catalog):

  python backend/scripts/pre_publish_gate.py \
    --catalog square_products_edited.json \
    --overlay storefront_overlay.json

With Printful mapping coverage enforced:

  python backend/scripts/pre_publish_gate.py \
    --catalog square_products_edited.json \
    --overlay storefront_overlay.json \
    --printful-map backend/data/printful_variant_map.json \
    --require-printful-map
"""

import argparse
import csv
import json
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple


REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPTS_DIR = REPO_ROOT / "backend" / "scripts"


def run_data_quality(catalog: Path, output_dir: Path) -> Tuple[str, str, Optional[Path]]:
    """
    Run generate_data_quality_report.py and interpret the CSV.

    Returns (status, detail, csv_path_or_None) where status is
    one of: PASS, FAIL, ERROR.
    """
    script = SCRIPTS_DIR / "generate_data_quality_report.py"
    if not script.is_file():
        return ("ERROR", f"Script not found: {script}", None)

    output_dir.mkdir(parents=True, exist_ok=True)
    cmd = [
        sys.executable,
        str(script),
        "--input",
        str(catalog),
        "--output-dir",
        str(output_dir),
    ]
    res = subprocess.run(cmd, cwd=REPO_ROOT)
    if res.returncode != 0:
        return ("ERROR", f"generate_data_quality_report.py exited {res.returncode}", None)

    csv_path = output_dir / "data_quality_issues.csv"
    if not csv_path.is_file():
        return ("ERROR", f"Data quality CSV not found at {csv_path}", None)

    total_rows = 0
    issue_rows = 0
    with csv_path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            total_rows += 1
            if (
                row.get("missing_description") == "Yes"
                or row.get("missing_image") == "Yes"
                or row.get("missing_price") == "Yes"
            ):
                issue_rows += 1

    if issue_rows > 0:
        status = "FAIL"
    else:
        status = "PASS"

    detail = f"{issue_rows} product(s) with missing desc/img/price out of {total_rows} in catalog"
    return (status, detail, csv_path)


def run_profit_floor(overlay: Path, catalog: Path) -> Tuple[str, str]:
    """
    Run validate_profit_floor.py as a subprocess.

    Returns (status, detail) where status is PASS or FAIL.
    """
    script = SCRIPTS_DIR / "validate_profit_floor.py"
    if not script.is_file():
        return ("ERROR", f"Script not found: {script}")

    cmd = [
        sys.executable,
        str(script),
        str(overlay),
        str(catalog),
    ]
    res = subprocess.run(cmd, cwd=REPO_ROOT)
    if res.returncode == 0:
        return ("PASS", "No profit floor violations reported")
    else:
        return ("FAIL", f"validate_profit_floor.py exited {res.returncode} (see output above)")


def collect_square_variation_ids(catalog: Path) -> List[str]:
    """Extract Square variation ids from a Square-shaped catalog JSON."""
    with catalog.open("r", encoding="utf-8") as f:
        data = json.load(f)
    products = data.get("products") or []
    out: List[str] = []
    for p in products:
        if not isinstance(p, dict):
            continue
        variants = p.get("variants") or []
        for v in variants:
            if not isinstance(v, dict):
                continue
            vid = (v.get("variationId") or v.get("variation_id") or "").strip()
            if vid:
                out.append(vid)
    return sorted(set(out))


def analyze_printful_map(
    catalog: Path,
    map_path: Path,
    require: bool,
) -> Tuple[str, str]:
    """
    Compare Square variation ids present in the catalog to keys in the
    Printful variant map (external_id → variant_id).

    Returns (status, detail) where status is PASS / FAIL / SKIP.
    """
    if not map_path.is_file():
        if require:
            return ("FAIL", f"Printful map required but not found at {map_path}")
        return ("SKIP", f"No Printful map found at {map_path}")

    square_vids = collect_square_variation_ids(catalog)
    if not square_vids:
        return ("SKIP", "No Square variation ids found in catalog; nothing to map")

    with map_path.open("r", encoding="utf-8") as f:
        mapping: Dict[str, str] = json.load(f)

    square_set = set(square_vids)
    mapped = {vid for vid in square_set if vid in mapping}
    unmapped = sorted(square_set - mapped)

    # Detect collisions: multiple Square ids mapping to the same Printful variant id.
    inverse: Dict[str, List[str]] = {}
    for external_id, pf_variant in mapping.items():
        inverse.setdefault(str(pf_variant), []).append(str(external_id))

    collisions = {pf_id: ids for pf_id, ids in inverse.items() if len(ids) > 1}

    coverage_pct = (len(mapped) / len(square_set)) * 100.0 if square_set else 0.0
    detail_parts = [
        f"{len(mapped)}/{len(square_set)} Square variation ids mapped ({coverage_pct:.1f}%)",
    ]
    if unmapped:
        detail_parts.append(f"{len(unmapped)} unmapped")
    if collisions:
        detail_parts.append(f"{len(collisions)} Printful variant id(s) used by multiple Square ids")

    status: str
    if require:
        if unmapped or collisions:
            status = "FAIL"
        else:
            status = "PASS"
    else:
        status = "PASS" if not collisions else "FAIL"

    # When not required, we still treat collisions as hard failures, but allow
    # partial coverage as a soft warning (status PASS, detail notes unmapped).
    if not require and unmapped:
        detail_parts.append("note: unmapped variations allowed because --require-printful-map was not set")

    return (status, "; ".join(detail_parts))


def print_summary(
    catalog: Path,
    overlay: Path,
    dq_status: str,
    dq_detail: str,
    dq_csv: Optional[Path],
    pf_status: str,
    pf_detail: str,
    pm_status: str,
    pm_detail: str,
    printful_map: Optional[Path],
) -> None:
    print()
    print("=" * 80)
    print("PRE-PUBLISH GATE SUMMARY")
    print("=" * 80)
    print(f"Catalog: {catalog}")
    print(f"Overlay: {overlay}")
    if printful_map:
        print(f"Printful map: {printful_map}")
    else:
        print("Printful map: (none)")
    print()

    headers = ("Gate", "Status", "Details")
    rows = [
        ("Data quality (desc/img/price)", dq_status, dq_detail),
        ("Console Validate (v1.1)", "MANUAL", "Run Validate tab in Catalog Console v1.1 before or after this script"),
        ("Profit floor (no negatives)", pf_status, pf_detail),
        ("Printful map coverage", pm_status, pm_detail),
    ]

    print(f"{headers[0]:<32}  {headers[1]:<8}  {headers[2]}")
    print(f"{'-'*32}  {'-'*8}  {'-'*40}")
    for gate, status, detail in rows:
        print(f"{gate:<32}  {status:<8}  {detail}")

    print()
    if dq_csv:
        print(f"Data quality CSV: {dq_csv}")
    else:
        print("Data quality CSV: (none)")
    print("Profit floor: see output from validate_profit_floor.py above.")
    print("Printful mapping: coverage details shown in table (map JSON is not modified).")
    print("=" * 80)


def main(argv: Optional[List[str]] = None) -> None:
    parser = argparse.ArgumentParser(
        description="Run pre-publish checks (data quality, profit floor, optional Printful map coverage)."
    )
    parser.add_argument(
        "--catalog",
        default=None,
        help="Catalog JSON to validate (default: square_products_edited.json if present, else square_products_latest.json).",
    )
    parser.add_argument(
        "--overlay",
        default=str(REPO_ROOT / "storefront_overlay.json"),
        help="Overlay JSON for profit floor validation (default: storefront_overlay.json).",
    )
    parser.add_argument(
        "--printful-map",
        default=None,
        help="Optional path to Printful variant map JSON (external_id → variant_id).",
    )
    parser.add_argument(
        "--require-printful-map",
        action="store_true",
        help="Treat unmapped variations or missing map as a hard failure.",
    )
    args = parser.parse_args(argv)

    # Resolve catalog path with sensible defaults.
    if args.catalog:
        catalog = Path(args.catalog)
    else:
        edited = REPO_ROOT / "square_products_edited.json"
        live = REPO_ROOT / "square_products_latest.json"
        catalog = edited if edited.is_file() else live
    if not catalog.is_file():
        raise SystemExit(f"Catalog not found: {catalog}")

    overlay = Path(args.overlay)
    if not overlay.is_file():
        raise SystemExit(f"Overlay not found: {overlay}")

    printful_map: Optional[Path]
    if args.printful_map:
        printful_map = Path(args.printful_map)
    else:
        default_map = REPO_ROOT / "backend" / "data" / "printful_variant_map.json"
        printful_map = default_map if default_map.is_file() else None

    # 1) Data quality
    dq_output_dir = REPO_ROOT / "data_quality_reports"
    dq_status, dq_detail, dq_csv = run_data_quality(catalog, dq_output_dir)

    # 2) Profit floor
    pf_status, pf_detail = run_profit_floor(overlay, catalog)

    # 3) Printful mapping coverage (optional)
    if printful_map:
        pm_status, pm_detail = analyze_printful_map(catalog, printful_map, args.require_printful_map)
    else:
        pm_status, pm_detail = ("SKIP", "No map path provided and default map not found")

    print_summary(
        catalog=catalog,
        overlay=overlay,
        dq_status=dq_status,
        dq_detail=dq_detail,
        dq_csv=dq_csv,
        pf_status=pf_status,
        pf_detail=pf_detail,
        pm_status=pm_status,
        pm_detail=pm_detail,
        printful_map=printful_map,
    )

    failed = []
    if dq_status in ("FAIL", "ERROR"):
        failed.append("data_quality")
    if pf_status in ("FAIL", "ERROR"):
        failed.append("profit_floor")
    if pm_status == "FAIL":
        failed.append("printful_map")

    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()

