import argparse
import json
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate cartKey-based SKU map from Square-style catalog JSON.")
    parser.add_argument(
        "--input",
        default="square_products_latest.json",
        help="Path to source catalog JSON (default: square_products_latest.json).",
    )
    parser.add_argument(
        "--output",
        default="backend/sku_map.generated.json",
        help="Path to write generated SKU map JSON (default: backend/sku_map.generated.json).",
    )
    parser.add_argument(
        "--env-output",
        default="backend/sku_map.generated.env",
        help="Path to write paste-ready .env line (default: backend/sku_map.generated.env).",
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
            cart_key = f"{color}__{size}"
            cents = to_cents(v.get("price"))
            if cents is None:
                cents = fallback_price_cents
            if cents is None:
                warnings.append(f"skip {item_name} {cart_key}: no price")
                continue
            variation_id = str(v.get("variation_id") or "").strip()
            entry = {
                "name": build_entry_name(item_name, color, size),
                "cents": cents,
            }
            if variation_id:
                entry["variationId"] = variation_id

            existing = out.get(cart_key)
            if existing and existing != entry:
                warnings.append(
                    f"collision {cart_key}: keeping first '{existing.get('name')}' ({existing.get('cents')}), "
                    f"skipping '{entry.get('name')}' ({entry.get('cents')})"
                )
                continue
            out[cart_key] = entry
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

    print(f"generated entries: {len(sku_map)}")
    print(f"json output: {output_path}")
    print(f"env output:  {env_output_path}")
    if warnings:
        print("warnings:")
        for w in warnings[:50]:
            print(f"- {w}")
        if len(warnings) > 50:
            print(f"- ... {len(warnings) - 50} more")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
