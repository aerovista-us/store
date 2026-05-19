#!/usr/bin/env python
"""
List products in the storefront catalog JSON that have no image fields.

Checks:
- image
- imageUrl / image_url / img
- images array with at least one non-empty entry

Usage (from repo root):

  python backend/scripts/list_products_without_images.py square_products_latest.json
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Dict, List


def has_image(p: Dict[str, Any]) -> bool:
    for key in ("image", "imageUrl", "image_url", "img"):
        v = p.get(key)
        if isinstance(v, str) and v.strip():
            return True
    images = p.get("images")
    if isinstance(images, list):
        for it in images:
            if isinstance(it, str) and it.strip():
                return True
            if isinstance(it, dict):
                for k in ("url", "imageUrl", "src"):
                    v = it.get(k)
                    if isinstance(v, str) and v.strip():
                        return True
    return False


def main(argv: List[str]) -> None:
    if len(argv) < 2:
        print("Usage: list_products_without_images.py <catalog-json>", file=sys.stderr)
        raise SystemExit(1)

    path = Path(argv[1]).expanduser()
    if not path.is_file():
        print(f"File not found: {path}", file=sys.stderr)
        raise SystemExit(1)

    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    products = data.get("products") or []
    if not isinstance(products, list):
        print("Catalog JSON does not have a 'products' array", file=sys.stderr)
        raise SystemExit(1)

    missing: List[str] = []
    for p in products:
        if not isinstance(p, dict):
            continue
        if not has_image(p):
            name = str(p.get("name") or "").strip() or "(no name)"
            pid = str(p.get("id") or "").strip()
            missing.append(f"{name}  [id={pid}]")

    print(f"Total products: {len(products)}")
    print(f"Products without images: {len(missing)}")
    for line in missing:
        print(f"- {line}")


if __name__ == "__main__":
    main(sys.argv)
