#!/usr/bin/env python3
"""Deploy sku_map.generated.json to nxcore and optionally patch .env to use file."""
import json
import re
import sys
from pathlib import Path

ENV_PATH = Path("/srv/Collab/mini.shops/AV-PNW.com/av_storefront/backend/.env")
BACKEND = Path("/srv/Collab/mini.shops/AV-PNW.com/av_storefront/backend")
MAP_PATH = BACKEND / "sku_map.generated.json"


def main() -> int:
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    if not src or not src.is_file():
        print("Usage: deploy_sku_map.py /path/to/sku_map.generated.json", file=sys.stderr)
        return 1

    data = json.loads(src.read_text(encoding="utf-8"))
    if isinstance(data, dict) and "map" in data:
        data = data["map"]

    MAP_PATH.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {MAP_PATH} ({len(data)} keys)")

    if not ENV_PATH.is_file():
        print("No .env to patch")
        return 0

    text = ENV_PATH.read_text(encoding="utf-8")
    # Prefer file-based map (avoids 33k char inline JSON + stale collisions)
    if re.search(r"^SQUARE_SKU_MAP_FILE=", text, re.M):
        text = re.sub(r"^SQUARE_SKU_MAP_FILE=.*$", "SQUARE_SKU_MAP_FILE=sku_map.generated.json", text, flags=re.M)
    else:
        text += "\nSQUARE_SKU_MAP_FILE=sku_map.generated.json\n"

    # Comment out inline JSON if present (load order prefers env JSON over file)
    text = re.sub(
        r'^SQUARE_SKU_MAP_JSON=.*$',
        '# SQUARE_SKU_MAP_JSON cleared — use SQUARE_SKU_MAP_FILE=sku_map.generated.json',
        text,
        count=1,
        flags=re.M,
    )

    ENV_PATH.write_text(text, encoding="utf-8")
    print("Patched .env: SQUARE_SKU_MAP_FILE=sku_map.generated.json, inline JSON disabled")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
