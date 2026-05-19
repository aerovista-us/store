"""
Convert a Square export CSV into:
1) square_products_latest.json (storefront catalog)
2) backend/sku_map.generated.json and backend/sku_map.generated.env (Color__Size keys)

Usage (run from repo root):
  python tools/convert_square_csv_to_json.py \\
    --csv 1149XBNG8C8ZE_catalog-2026-04-02-1705.csv \\
    --catalog-out square_products_latest.json

Notes:
- Groups rows by Customer-facing Name (fallback: Item Name).
- Normalizes categories (hat/hats, hoodie/hoodies, tee/tees, crewneck/crewnecks, sticker/stickers).
- Variation id = Token; SKU = SKU; size from Option Value 1 or Variation Name; color from any "Color" option name.
- Catalog shape matches storefront expectations: top-level {generated_from, generated_at, count, products: [...] }.
- SKU map uses Color__Size keys to match storefront cart `sku` values.
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import html
import json
import re
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Tuple


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.strip().lower()).strip("-")


def pick(*vals: str) -> str:
    for v in vals:
        if v is None:
            continue
        t = str(v).strip()
        if t:
            return t
    return ""


def normalize_category(raw: str) -> str:
    cat = (raw or "").strip().lower()
    cat_map = {
        "hat": "hats",
        "hats": "hats",
        "apparel": "apparel",
        "hoodie": "hoodies",
        "hoodies": "hoodies",
        "tee": "tees",
        "t-shirt": "tees",
        "tees": "tees",
        "crewneck": "crewnecks",
        "crewnecks": "crewnecks",
        "sweatshirt": "crewnecks",
        "sticker": "stickers",
        "stickers": "stickers",
    }
    return cat_map.get(cat, cat or "apparel")


def load_rows(path: Path) -> List[Dict]:
    with path.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def group_products(rows: List[Dict]) -> Tuple[List[Dict], Dict[str, Dict]]:
    grouped = defaultdict(list)
    for row in rows:
        name = pick(row.get("Customer-facing Name"), row.get("Item Name"))
        grouped[name].append(row)

    products = []
    sku_map: Dict[str, Dict] = {}

    for item_name, group in grouped.items():
        any_row = group[0]
        desc = pick(any_row.get("Description"))
        category = normalize_category(
            pick(any_row.get("Categories"), any_row.get("Reporting Category"))
        )
        visibility = pick(any_row.get("Square Online Item Visibility")) or "visible"
        shipping_enabled = pick(any_row.get("Shipping Enabled"))

        variants = []
        for row in group:
            size = pick(row.get("Option Value 1"), row.get("Variation Name"), row.get("Option Value 2")) or "One Size"
            color = ""
            if (row.get("Option Name 1") or "").strip().lower() == "color":
                color = pick(row.get("Option Value 1"))
            elif (row.get("Option Name 2") or "").strip().lower() == "color":
                color = pick(row.get("Option Value 2"))

            sku = pick(row.get("SKU"))
            var_id = pick(row.get("Token"))
            try:
                price = float(pick(row.get("Price")) or "0")
            except ValueError:
                price = 0.0

            variants.append(
                {
                    "size": size,
                    "color": color,
                    "sku": sku,
                    "price": price,
                    "variation_id": var_id,
                }
            )

            # SKU map entry (Color__Size)
            cart_key = f"{color or 'Default'}__{size}"

            sku_map[cart_key] = {
                "name": f\"{item_name} ({color or 'Default'}, {size})\",
                "cents": int(round(price * 100)),
            }
            if var_id:
                sku_map[cart_key]["variationId"] = var_id

        base_price = variants[0]["price"] if variants else 0
        products.append(
            {
                "id": slugify(item_name),
                "name": item_name,
                "color": "",
                "category": category,
                "price": base_price,
                "visibility": visibility,
                "shipping_enabled": shipping_enabled,
                "description_text": desc,
                "description_html": f"<p>{html.escape(desc)}</p>" if desc else "",
                "variants": variants,
                "sort_order": 0,
                "image": "",
            }
        )

    return products, sku_map


def write_catalog(products: List[Dict], src: Path, out: Path) -> None:
    payload = {
        "generated_from": src.name,
        "generated_at": dt.datetime.utcnow().isoformat() + "Z",
        "count": len(products),
        "products": products,
    }
    out.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"[catalog] wrote {out} with {len(products)} products")


def write_sku_map(sku_map: Dict[str, Dict], json_out: Path, env_out: Path) -> None:
    json_out.write_text(json.dumps(sku_map, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    env_out.write_text("SQUARE_SKU_MAP_JSON=" + json.dumps(sku_map, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"[sku] wrote {json_out} and {env_out} with {len(sku_map)} entries (Color__Size)")


def main() -> int:
    parser = argparse.ArgumentParser(description="Convert Square CSV → storefront catalog JSON + SKU map")
    parser.add_argument("--csv", required=True, help="Path to Square export CSV")
    parser.add_argument("--catalog-out", default="square_products_latest.json", help="Output catalog JSON path")
    parser.add_argument("--sku-json-out", default="backend/sku_map.generated.json", help="Output SKU map JSON path")
    parser.add_argument("--sku-env-out", default="backend/sku_map.generated.env", help="Output .env helper path")
    args = parser.parse_args()

    csv_path = Path(args.csv).resolve()
    products, sku_map = group_products(load_rows(csv_path))

    write_catalog(products, csv_path, Path(args.catalog_out))
    write_sku_map(sku_map, Path(args.sku_json_out), Path(args.sku_env_out))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
