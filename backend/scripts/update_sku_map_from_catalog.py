#!/usr/bin/env python3
"""Generate SQUARE_SKU_MAP_JSON from square_products_merged.json and update backend .env."""
import json
import os
import sys

def main():
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
    catalog_path = os.path.join(repo_root, "square_products_merged.json")
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env")

    if not os.path.isfile(catalog_path):
        print("Catalog not found:", catalog_path, file=sys.stderr)
        sys.exit(1)

    with open(catalog_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    products = data.get("products", [])
    m = {}
    for p in products:
        name = (p.get("name") or "").strip() or "Item"
        color_base = (p.get("color") or "").strip()
        for v in p.get("variants", []):
            c = (v.get("color") or color_base or "").strip() or "Default"
            sz = (v.get("size") or "").strip() or "One Size"
            key = c + "__" + sz
            price = v.get("price") or p.get("price") or 0
            cents = int(round(float(price) * 100))
            if cents < 0:
                cents = 0
            m[key] = {"name": name + " (" + c + ", " + sz + ")", "cents": cents}

    sku_json = json.dumps(m, separators=(",", ":"))

    if not os.path.isfile(env_path):
        print(".env not found:", env_path, file=sys.stderr)
        sys.exit(1)

    with open(env_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    new_lines = []
    found = False
    for line in lines:
        if line.strip().startswith("SQUARE_SKU_MAP_JSON="):
            # .env: value in double quotes, escape internal "
            escaped = sku_json.replace("\\", "\\\\").replace('"', '\\"')
            new_lines.append('SQUARE_SKU_MAP_JSON="' + escaped + '"\n')
            found = True
        else:
            new_lines.append(line)

    if not found:
        new_lines.append("SQUARE_SKU_MAP_JSON=" + json.dumps(sku_json) + "\n")

    with open(env_path, "w", encoding="utf-8") as f:
        f.writelines(new_lines)

    print("Updated", env_path, "with", len(m), "SKU entries.")

if __name__ == "__main__":
    main()
