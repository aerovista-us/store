#!/usr/bin/env python3
"""Set canonical category on each product in square_products_merged.json.
Categories: Hoodies, Crewnecks, Hats, Tees, Stickers, Apparel (fallback).
"""
import json
import re

import os
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SCRIPT_DIR)
PATH = os.path.join(ROOT, "square_products_merged.json")

def normalize_category(product):
    name = (product.get("name") or "").lower()
    pid = (product.get("id") or "").lower()
    hay = name + " " + pid

    if "sticker" in hay:
        return "Stickers"
    if "hoodie" in hay or ("pullover" in hay and "hood" in hay) or "zip" in hay and "hood" in hay:
        return "Hoodies"
    if "pullover" in hay:
        return "Hoodies"
    if "crewneck" in hay or "sweatshirt" in hay or "crew" in hay:
        return "Crewnecks"
    if "cap" in hay or "hat" in hay or "trucker" in hay or "snapback" in hay or "beanie" in hay:
        return "Hats"
    if "tee" in hay or "t-shirt" in hay or "long sleeve" in hay or "long-sleeve" in hay:
        return "Tees"
    if "shirt" in hay and "hood" not in hay:
        return "Tees"
    return "Apparel"

def main():
    with open(PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    for p in data.get("products", []):
        p["category"] = normalize_category(p)
    with open(PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Updated categories in {PATH}")

if __name__ == "__main__":
    main()
