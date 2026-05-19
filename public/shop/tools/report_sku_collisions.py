"""Report cart-key collisions for the active storefront catalog.

This keeps ``tools/generate_sku_map.py`` as the canonical key builder while
making catalog hygiene visible before collisions become a runtime surprise.
"""

import argparse
import json
from collections import defaultdict
from pathlib import Path

from generate_sku_map import DEFAULT_INPUT_PATH, build_cart_key, load_products, to_cents


DEFAULT_OUTPUT_PATH = "data_quality_reports/sku_collision_report.md"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate a sorted Color__Size collision report.")
    parser.add_argument(
        "--input",
        default=DEFAULT_INPUT_PATH,
        help=f"Path to source catalog JSON (default: {DEFAULT_INPUT_PATH}).",
    )
    parser.add_argument(
        "--output",
        default=DEFAULT_OUTPUT_PATH,
        help=f"Path to write markdown collision report (default: {DEFAULT_OUTPUT_PATH}).",
    )
    return parser.parse_args()


def collect_collisions(products: list[dict]) -> dict[str, list[dict]]:
    grouped: dict[str, list[dict]] = defaultdict(list)
    for product in products:
        item_name = str(product.get("name") or product.get("title") or product.get("id") or "Item").strip()
        fallback_color = str(product.get("color") or "").strip() or "Default"
        fallback_price = to_cents(product.get("price"))
        variants = product.get("variants")
        if not isinstance(variants, list):
            continue
        for variant in variants:
            if not isinstance(variant, dict):
                continue
            size = str(variant.get("size") or "").strip() or "One Size"
            color = str(variant.get("color") or "").strip() or fallback_color
            cart_key = build_cart_key(color, size)
            grouped[cart_key].append(
                {
                    "product": item_name,
                    "color": color,
                    "size": size,
                    "price_cents": to_cents(variant.get("price")) or fallback_price,
                    "variation_id": str(variant.get("variation_id") or variant.get("variationId") or "").strip(),
                }
            )
    return {key: entries for key, entries in grouped.items() if len(entries) > 1}


def build_report(collisions: dict[str, list[dict]]) -> str:
    sorted_items = sorted(collisions.items(), key=lambda item: (-len(item[1]), item[0].lower()))
    lines = [
        "# SKU collision report",
        "",
        "Canonical cart key format: `Color__Size`.",
        "",
        f"Total colliding cart keys: {len(sorted_items)}",
        f"Total extra colliding variants: {sum(len(entries) - 1 for _, entries in sorted_items)}",
        "",
    ]
    if not sorted_items:
        lines.append("No collisions found.")
        return "\n".join(lines) + "\n"

    for cart_key, entries in sorted_items:
        lines.append(f"## `{cart_key}` ({len(entries)} variants)")
        lines.append("")
        for entry in sorted(entries, key=lambda row: (row['product'].lower(), row['variation_id'])):
            price = "unknown" if entry["price_cents"] is None else f"${entry['price_cents'] / 100:.2f}"
            variation = entry["variation_id"] or "missing variation id"
            lines.append(f"- `{variation}` | {entry['product']} | {price}")
        lines.append("")
    return "\n".join(lines)


def main() -> int:
    args = parse_args()
    input_path = Path(args.input).resolve()
    output_path = Path(args.output).resolve()

    collisions = collect_collisions(load_products(input_path))
    report = build_report(collisions)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(report, encoding="utf-8")

    print(f"collision keys: {len(collisions)}")
    print(f"report: {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
