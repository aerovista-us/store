"""Canonical SKU map generator for av_storefront.

This module owns the storefront/backend cart key format: ``Color__Size``.
Other helpers should import from here rather than re-implementing key logic.
"""

import argparse
import json
import sys
from pathlib import Path


DEFAULT_INPUT_PATH = "square_products_latest.json"
DEFAULT_OUTPUT_PATH = "backend/sku_map.generated.json"
DEFAULT_ENV_OUTPUT_PATH = "backend/sku_map.generated.env"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate cartKey-based SKU map from Square-style catalog JSON.")
    parser.add_argument(
        "--input",
        default=DEFAULT_INPUT_PATH,
        help=f"Path to source catalog JSON (default: {DEFAULT_INPUT_PATH}).",
    )
    parser.add_argument(
        "--output",
        default=DEFAULT_OUTPUT_PATH,
        help=f"Path to write generated SKU map JSON (default: {DEFAULT_OUTPUT_PATH}).",
    )
    parser.add_argument(
        "--env-output",
        default=DEFAULT_ENV_OUTPUT_PATH,
        help=f"Path to write paste-ready .env line (default: {DEFAULT_ENV_OUTPUT_PATH}).",
    )
    return parser.parse_args()


def load_products(path: Path) -> list[dict]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(payload, dict) and isinstance(payload.get("products"), list):
        return payload["products"]
    if isinstance(payload, list):
        return payload
    return []


def to_cents(value) -> int | None:
    if value is None:
        return None
    try:
        n = float(value)
    except Exception:
        return None
    return int(round(n * 100))


def build_entry_name(item_name: str, color: str, size: str) -> str:
    color_label = color or "Default"
    size_label = size or "One Size"
    return f"{item_name} ({color_label}, {size_label})"


def build_cart_key(color: str, size: str) -> str:
    color_label = (color or "").strip() or "Default"
    size_label = (size or "").strip() or "One Size"
    return f"{color_label}__{size_label}"


def clone_entry(entry: dict) -> dict:
    cloned = {
        "name": entry.get("name"),
        "cents": entry.get("cents"),
    }
    variation_id = str(entry.get("variationId") or "").strip()
    if variation_id:
        cloned["variationId"] = variation_id
    return cloned


def safe_print(message: str) -> None:
    encoding = sys.stdout.encoding or "utf-8"
    text = str(message)
    try:
        print(text)
    except UnicodeEncodeError:
        print(text.encode(encoding, errors="backslashreplace").decode(encoding, errors="ignore"))


def build_map(products: list[dict]) -> tuple[dict, list[str]]:
    out: dict[str, dict] = {}
    warnings: list[str] = []
    for p in products:
        item_name = str(p.get("name") or p.get("title") or p.get("id") or "Item").strip()
        fallback_color = str(p.get("color") or "").strip() or "Default"
        fallback_price_cents = to_cents(p.get("price"))
        variants = p.get("variants")
        if not isinstance(variants, list):
            continue
        for v in variants:
            if not isinstance(v, dict):
                continue
            size = str(v.get("size") or "").strip() or "One Size"
            color = str(v.get("color") or "").strip() or fallback_color
            cents = to_cents(v.get("price"))
            if cents is None:
                cents = fallback_price_cents
            variation_id = str(v.get("variation_id") or v.get("variationId") or "").strip()
            sku = str(v.get("sku") or "").strip()

            if cents is None:
                key = variation_id or sku or build_cart_key(color, size)
                warnings.append(f"skip {item_name} ({key}): no price")
                continue

            entry = {
                "name": build_entry_name(item_name, color, size),
                "cents": cents,
            }
            if variation_id:
                entry["variationId"] = variation_id

            # Primary key: variationId (unique per variant, matches what the storefront
            # sends as cart sku). Falls back to raw sku, then Color__Size.
            key = variation_id or sku or build_cart_key(color, size)

            existing = out.get(key)
            if existing and existing != entry:
                warnings.append(
                    f"collision {key}: keeping '{existing.get('name')}' ({existing.get('cents')}), "
                    f"skipping '{entry.get('name')}' ({entry.get('cents')})"
                )
                continue
            out[key] = entry
    return out, warnings


def main() -> int:
    args = parse_args()
    input_path = Path(args.input).resolve()
    output_path = Path(args.output).resolve()
    env_output_path = Path(args.env_output).resolve()

    products = load_products(input_path)
    sku_map, warnings = build_map(products)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(sku_map, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    env_output_path.parent.mkdir(parents=True, exist_ok=True)
    env_output_path.write_text("SQUARE_SKU_MAP_JSON=" + json.dumps(sku_map, separators=(",", ":")) + "\n", encoding="utf-8")

    safe_print(f"generated entries: {len(sku_map)}")
    safe_print(f"json output: {output_path}")
    safe_print(f"env output:  {env_output_path}")
    if warnings:
        safe_print("warnings:")
        for w in warnings[:50]:
            safe_print(f"- {w}")
        if len(warnings) > 50:
            safe_print(f"- ... {len(warnings) - 50} more")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
