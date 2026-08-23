#!/usr/bin/env python3
"""Pull and sanitize the known Horizon Printful Sync Products.

Read-only: this script performs GET requests only. It never writes credentials,
signed file URLs, or full provider responses to disk.
"""
from __future__ import annotations

import argparse
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests


HORIZON_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = HORIZON_ROOT.parent
DEFAULT_AUDIT = HORIZON_ROOT / "commerce" / "printful-sync-audit-2026-07-27.json"
DEFAULT_ENV = REPO_ROOT / "store" / "backend" / ".env"
API_ROOT = "https://api.printful.com"


def load_dotenv_value(path: Path, names: tuple[str, ...]) -> str:
    if not path.is_file():
        return ""
    wanted = set(names)
    for raw_line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        if key.strip() in wanted:
            return value.strip().strip("\"'")
    return ""


def token_from_environment(env_path: Path) -> str:
    names = ("PRINTFUL_API_TOKEN", "PRINTFUL_TOKEN")
    for name in names:
        value = (os.environ.get(name) or "").strip()
        if value:
            return value
    return load_dotenv_value(env_path, names)


def compact_options(options: Any) -> list[dict[str, Any]]:
    if not isinstance(options, list):
        return []
    return [
        {"id": item.get("id"), "value": item.get("value")}
        for item in options
        if isinstance(item, dict) and (item.get("id") is not None or item.get("value") is not None)
    ]


def sanitize_file(file_data: Any) -> dict[str, Any] | None:
    if not isinstance(file_data, dict):
        return None
    return {
        "id": file_data.get("id"),
        "type": file_data.get("type"),
        "filename": file_data.get("filename"),
        "hash": file_data.get("hash"),
        "mimeType": file_data.get("mime_type"),
        "sizeBytes": file_data.get("size"),
        "width": file_data.get("width"),
        "height": file_data.get("height"),
        "dpi": file_data.get("dpi"),
        "status": file_data.get("status"),
        "created": file_data.get("created"),
        "urlPresent": bool(file_data.get("url")),
        "thumbnailUrlPresent": bool(file_data.get("thumbnail_url")),
        "previewUrlPresent": bool(file_data.get("preview_url")),
        "visible": file_data.get("visible"),
        "temporary": file_data.get("is_temporary"),
        "options": compact_options(file_data.get("options")),
    }


def sanitize_variant(variant: dict[str, Any]) -> dict[str, Any]:
    product = variant.get("product") if isinstance(variant.get("product"), dict) else {}
    files = [
        sanitized
        for sanitized in (sanitize_file(item) for item in variant.get("files") or [])
        if sanitized is not None
    ]
    name = str(variant.get("name") or "")
    size_match = re.search(r"(\d+(?:\.\d+)?)\s*[×xX]\s*(\d+(?:\.\d+)?)", name)
    inferred_size = f"{size_match.group(1)} × {size_match.group(2)} in" if size_match else None
    return {
        "id": str(variant.get("id") or ""),
        "externalId": str(variant.get("external_id") or ""),
        "name": name,
        "sku": variant.get("sku"),
        "enabled": not bool(variant.get("is_ignored")),
        "availabilityStatus": variant.get("availability_status"),
        "retailPrice": variant.get("retail_price"),
        "currency": variant.get("currency"),
        "catalogVariantId": variant.get("variant_id") or product.get("variant_id"),
        "catalogProductId": product.get("product_id") or product.get("id"),
        "catalogProductName": product.get("name"),
        "catalogSize": product.get("size"),
        "catalogColor": product.get("color"),
        "inferredSizeFromName": inferred_size,
        "files": files,
        "options": compact_options(variant.get("options")),
    }


def fetch_product(session: requests.Session, product_id: str) -> dict[str, Any]:
    response = session.get(f"{API_ROOT}/sync/products/{product_id}", timeout=30)
    try:
        payload = response.json()
    except ValueError as exc:
        raise RuntimeError(f"Printful returned non-JSON for Sync Product {product_id}") from exc
    if not response.ok:
        message = payload.get("error") or payload.get("result") or response.reason
        raise RuntimeError(f"Printful Sync Product {product_id} failed ({response.status_code}): {message}")
    result = payload.get("result") or {}
    if not isinstance(result, dict):
        raise RuntimeError(f"Printful Sync Product {product_id} returned an invalid result")
    sync_product = result.get("sync_product") if isinstance(result.get("sync_product"), dict) else {}
    variants = [
        sanitize_variant(item)
        for item in result.get("sync_variants") or []
        if isinstance(item, dict)
    ]
    return {
        "id": str(sync_product.get("id") or product_id),
        "externalId": str(sync_product.get("external_id") or ""),
        "name": sync_product.get("name"),
        "thumbnailPresent": bool(sync_product.get("thumbnail_url")),
        "variants": variants,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--audit", type=Path, default=DEFAULT_AUDIT)
    parser.add_argument("--env-file", type=Path, default=DEFAULT_ENV)
    parser.add_argument("--store-id", default=os.environ.get("PRINTFUL_STORE_ID") or "17064001")
    parser.add_argument(
        "--output",
        type=Path,
        default=HORIZON_ROOT / "commerce" / f"printful-product-snapshot-{datetime.now().date().isoformat()}.json",
    )
    args = parser.parse_args()

    token = token_from_environment(args.env_file)
    if not token:
        raise SystemExit("Printful token not found in the environment or configured backend .env file.")

    audit = json.loads(args.audit.read_text(encoding="utf-8"))
    mappings = audit.get("mappings") or []
    session = requests.Session()
    session.headers.update(
        {
            "Authorization": f"Bearer {token}",
            "X-PF-Store-Id": str(args.store_id),
            "Accept": "application/json",
            "User-Agent": "AeroVista-Horizon-ReadOnly-Audit/1.0",
        }
    )

    products: list[dict[str, Any]] = []
    for mapping in mappings:
        product_id = str(mapping.get("printfulSyncProductId") or "").strip()
        expected_variant_id = str(mapping.get("printfulSyncVariantId") or "").strip()
        if not product_id or not expected_variant_id:
            continue
        product = fetch_product(session, product_id)
        matching_variants = [
            variant for variant in product["variants"] if variant["id"] == expected_variant_id
        ]
        products.append(
            {
                "productId": mapping.get("productId"),
                "product": mapping.get("product"),
                "squareVariationId": mapping.get("squareVariationId"),
                "catalogSku": mapping.get("catalogSku"),
                "expectedPrintfulSyncProductId": product_id,
                "expectedPrintfulSyncVariantId": expected_variant_id,
                "expectedVariantFound": bool(matching_variants),
                "syncProduct": product,
                "matchedVariants": matching_variants,
            }
        )

    snapshot = {
        "schemaVersion": 1,
        "pulledAt": datetime.now(timezone.utc).isoformat(),
        "mode": "read-only sanitized Printful Ecommerce Platform Sync API",
        "storeId": str(args.store_id),
        "endpoint": "GET /sync/products/{id}",
        "credentialsPersisted": False,
        "providerUrlsPersisted": False,
        "productsRequested": len(mappings),
        "productsReturned": len(products),
        "allExpectedVariantsFound": all(item["expectedVariantFound"] for item in products),
        "products": products,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(snapshot, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(
        f"Wrote sanitized Printful snapshot: {args.output} "
        f"({len(products)} products; expected variants found: {snapshot['allExpectedVariantsFound']})"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
