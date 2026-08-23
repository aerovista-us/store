#!/usr/bin/env python3
"""Pull a sanitized Square Catalog inventory snapshot (read-only).

Square is the source of truth for sellable items, variation IDs, and prices.
Printful snapshots remain fulfillment/provider evidence — not shop inventory SOT.

Usage:
  python scripts/pull-square-catalog.py
  python scripts/pull-square-catalog.py --env-file store/backend/.env --output store/commerce/square-catalog-inventory.json
"""
from __future__ import annotations

import argparse
import json
import os
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ENV = REPO_ROOT / "store" / "backend" / ".env"
DEFAULT_OUT = (
    REPO_ROOT
    / "store"
    / "commerce"
    / f"square-catalog-inventory-{datetime.now().date().isoformat()}.json"
)


def load_dotenv(path: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    if not path.is_file():
        return out
    for raw in path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        out[key.strip()] = value.strip().strip("\"'")
    return out


def api_post(base: str, path: str, token: str, version: str, body: dict[str, Any]) -> dict[str, Any]:
    req = urllib.request.Request(
        base + path,
        data=json.dumps(body).encode("utf-8"),
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Square-Version": version,
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "AeroVista-Square-Catalog-Pull/1.0",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise SystemExit(f"Square API {exc.code} on {path}: {detail}") from exc


def sanitize_variation(vobj: dict[str, Any]) -> dict[str, Any]:
    vd = vobj.get("item_variation_data") or {}
    money = vd.get("price_money") or {}
    price = None
    if money.get("amount") is not None:
        price = {"amount": money.get("amount"), "currency": money.get("currency")}
    return {
        "id": vobj.get("id"),
        "name": vd.get("name"),
        "sku": vd.get("sku"),
        "ordinal": vd.get("ordinal"),
        "pricingType": vd.get("pricing_type"),
        "price": price,
        "sellable": vd.get("sellable"),
        "stockable": vd.get("stockable"),
        "trackInventory": vd.get("track_inventory"),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--env-file", type=Path, default=DEFAULT_ENV)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args()

    file_env = load_dotenv(args.env_file)
    token = (os.environ.get("SQUARE_ACCESS_TOKEN") or file_env.get("SQUARE_ACCESS_TOKEN") or "").strip()
    square_env = (os.environ.get("SQUARE_ENV") or file_env.get("SQUARE_ENV") or "production").strip().lower()
    version = (os.environ.get("SQUARE_VERSION") or file_env.get("SQUARE_VERSION") or "2024-01-18").strip()
    if not token:
        raise SystemExit("SQUARE_ACCESS_TOKEN not found in environment or --env-file.")

    base = (
        "https://connect.squareup.com"
        if square_env == "production"
        else "https://connect.squareupsandbox.com"
    )

    objects: list[dict[str, Any]] = []
    cursor = None
    page = 0
    while True:
        page += 1
        body: dict[str, Any] = {
            "object_types": ["ITEM", "ITEM_VARIATION", "CATEGORY", "IMAGE"],
            "include_deleted_objects": False,
            "include_related_objects": False,
            "limit": 100,
        }
        if cursor:
            body["cursor"] = cursor
        payload = api_post(base, "/v2/catalog/search", token, version, body)
        batch = payload.get("objects") or []
        objects.extend(batch)
        cursor = payload.get("cursor")
        print(f"page {page}: +{len(batch)} (total {len(objects)})")
        if not cursor:
            break
        time.sleep(0.15)

    items = [o for o in objects if o.get("type") == "ITEM"]
    vars_ = [o for o in objects if o.get("type") == "ITEM_VARIATION"]
    cats = {o["id"]: o for o in objects if o.get("type") == "CATEGORY"}
    imgs = {o["id"]: o for o in objects if o.get("type") == "IMAGE"}
    vars_by_item: dict[str, list[dict[str, Any]]] = {}
    for vobj in vars_:
        item_id = str((vobj.get("item_variation_data") or {}).get("item_id") or "")
        if item_id:
            vars_by_item.setdefault(item_id, []).append(vobj)

    products: list[dict[str, Any]] = []
    for item in items:
        data = item.get("item_data") or {}
        category_names: list[str] = []
        category_ids: list[str] = []
        for c in data.get("categories") or []:
            cid = c.get("id") if isinstance(c, dict) else c
            if not cid:
                continue
            category_ids.append(str(cid))
            cat = cats.get(cid)
            if cat:
                name = (cat.get("category_data") or {}).get("name")
                if name:
                    category_names.append(str(name))
        if data.get("category_id"):
            cid = str(data["category_id"])
            category_ids.append(cid)
            cat = cats.get(cid)
            if cat:
                name = (cat.get("category_data") or {}).get("name")
                if name and name not in category_names:
                    category_names.append(str(name))

        image_ids = list(data.get("image_ids") or [])
        if data.get("image_id"):
            image_ids.insert(0, data["image_id"])
        images = []
        for iid in image_ids:
            idata = (imgs.get(iid) or {}).get("image_data") or {}
            images.append(
                {
                    "id": iid,
                    "name": idata.get("name"),
                    "caption": idata.get("caption"),
                    "urlPresent": bool(idata.get("url")),
                }
            )

        variations: list[dict[str, Any]] = []
        seen: set[str] = set()
        for embedded in data.get("variations") or []:
            if isinstance(embedded, dict) and embedded.get("type") == "ITEM_VARIATION":
                vid = str(embedded.get("id") or "")
                if vid and vid not in seen:
                    variations.append(sanitize_variation(embedded))
                    seen.add(vid)
        for vobj in vars_by_item.get(str(item.get("id") or ""), []):
            vid = str(vobj.get("id") or "")
            if vid and vid not in seen:
                variations.append(sanitize_variation(vobj))
                seen.add(vid)

        products.append(
            {
                "id": item.get("id"),
                "name": data.get("name"),
                "description": data.get("description") or data.get("description_plaintext"),
                "productType": data.get("product_type"),
                "isArchived": bool(data.get("is_archived")),
                "categories": category_names,
                "categoryIds": category_ids,
                "images": images,
                "variations": variations,
                "variationCount": len(variations),
                "updatedAt": item.get("updated_at"),
            }
        )

    products.sort(key=lambda p: (p.get("name") or "").lower())
    active = [p for p in products if not p.get("isArchived")]
    snapshot = {
        "schemaVersion": 1,
        "pulledAt": datetime.now(timezone.utc).isoformat(),
        "mode": "read-only Square Catalog API search (sanitized)",
        "squareEnv": square_env,
        "endpoint": "POST /v2/catalog/search",
        "credentialsPersisted": False,
        "providerUrlsPersisted": False,
        "objectCounts": {
            "ITEM": len(items),
            "ITEM_VARIATION": len(vars_),
            "CATEGORY": len(cats),
            "IMAGE": len(imgs),
            "totalObjects": len(objects),
        },
        "productCount": len(products),
        "activeProductCount": len(active),
        "variationCount": sum(p["variationCount"] for p in products),
        "activeVariationCount": sum(p["variationCount"] for p in active),
        "products": products,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(snapshot, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(
        f"Wrote {args.output} "
        f"(active {snapshot['activeProductCount']} products / "
        f"{snapshot['activeVariationCount']} variations)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
