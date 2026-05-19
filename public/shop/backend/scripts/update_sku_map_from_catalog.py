#!/usr/bin/env python3
"""Write backend/.env from the canonical SKU generator.

This script is only a convenience wrapper around ``tools/generate_sku_map.py``.
The single source of truth for cart key shape remains ``Color__Size`` in that
module. Use this wrapper only when you want to mutate ``backend/.env``.
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

# Repo root = parents[2] from backend/scripts/
_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT / "tools") not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT / "tools"))

from generate_sku_map import build_map, load_products  # noqa: E402


def main() -> int:
    if len(sys.argv) > 1:
        catalog_path = Path(sys.argv[1]).resolve()
    else:
        catalog_path = _REPO_ROOT / "square_products_latest.json"

    if not catalog_path.is_file():
        print("Catalog not found:", catalog_path, file=sys.stderr)
        print(
            "Pass an explicit catalog path if you want a non-default file, or "
            "regenerate square_products_latest.json first.",
            file=sys.stderr,
        )
        sys.exit(1)

    products = load_products(catalog_path)
    m, warnings = build_map(products)
    sku_json = json.dumps(m, separators=(",", ":"))

    env_path = Path(__file__).resolve().parent.parent / ".env"
    if not env_path.is_file():
        print(".env not found:", env_path, file=sys.stderr)
        sys.exit(1)

    with open(env_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    new_lines: list[str] = []
    found = False
    for line in lines:
        if line.strip().startswith("SQUARE_SKU_MAP_JSON="):
            escaped = sku_json.replace("\\", "\\\\").replace('"', '\\"')
            new_lines.append('SQUARE_SKU_MAP_JSON="' + escaped + '"\n')
            found = True
        else:
            new_lines.append(line)

    if not found:
        escaped = sku_json.replace("\\", "\\\\").replace('"', '\\"')
        new_lines.append('SQUARE_SKU_MAP_JSON="' + escaped + '"\n')

    with open(env_path, "w", encoding="utf-8") as f:
        f.writelines(new_lines)

    print("Updated", env_path, "with", len(m), "SKU entries (keys: Color__Size).")
    print("Source catalog:", catalog_path)
    if warnings:
        print("warnings (from generate_sku_map logic):")
        for w in warnings[:30]:
            print("-", w)
        if len(warnings) > 30:
            print(f"- ... {len(warnings) - 30} more")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
