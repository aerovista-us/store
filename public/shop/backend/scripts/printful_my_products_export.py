#!/usr/bin/env python3
"""
Printful My Products Exporter (Sync API v1 + Catalog API v2)

Exports synced store products from one or more Printful stores with:
- retail prices
- catalog costs
- mockups / print files metadata

This script is copied from the dropship.store treasure trove and is
intended to be run manually or from a backend job route. It writes
two CSV files into the current working directory:

  - printful_my_products.csv
  - printful_my_variants.csv

These CSVs are then used ONLY for:
- fulfillment mapping (Square -> Printful variant id)
- cost reference for profit checks

Square remains the source of truth for catalog and retail pricing.

Required environment:
  PRINTFUL_TOKEN
  PRINTFUL_STORE_ID (single store) OR PRINTFUL_STORE_IDS (comma-separated, e.g. "123,456")

Optional environment:
  PRINTFUL_SELLING_REGION (default: usa)
  PRINTFUL_CURRENCY (default: USD)
  PRINTFUL_SUBSCRIPTION_DISCOUNT_PCT (e.g. 20 for 20% off)
"""

import csv
import json
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import requests


BASE = "https://api.printful.com"  # v1 API
BASE_V2 = "https://api.printful.com/v2"  # v2 API for catalog costs
TOKEN = os.environ.get("PRINTFUL_TOKEN", "").strip()
STORE_ID = os.environ.get("PRINTFUL_STORE_ID", "").strip()
STORE_IDS = os.environ.get("PRINTFUL_STORE_IDS", "").strip()  # Comma-separated
SELLING_REGION = os.environ.get("PRINTFUL_SELLING_REGION", "usa")
CURRENCY = os.environ.get("PRINTFUL_CURRENCY", "USD")


def _parse_subscription_discount() -> float:
    raw = os.environ.get("PRINTFUL_SUBSCRIPTION_DISCOUNT_PCT", "").strip()
    if not raw:
        return 0.0
    try:
        v = float(raw)
        if v < 0:
            return 0.0
        return v / 100.0
    except ValueError:
        return 0.0


SUBSCRIPTION_DISC = _parse_subscription_discount()

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Accept": "application/json",
}


def require_token_and_store() -> None:
    if not TOKEN:
        print("[ERROR] Missing PRINTFUL_TOKEN.", file=sys.stderr)
        sys.exit(2)
    if not STORE_ID and not STORE_IDS:
        print("[ERROR] Missing PRINTFUL_STORE_ID or PRINTFUL_STORE_IDS.", file=sys.stderr)
        sys.exit(2)


def get_store_list() -> List[Tuple[str, str]]:
    """Return a list of (store_id, store_name) tuples to process."""
    if STORE_IDS:
        store_ids = [s.strip() for s in STORE_IDS.split(",") if s.strip()]
        print(f"[DEBUG] Processing {len(store_ids)} store ID(s): {store_ids}")
        store_list: List[Tuple[str, str]] = []
        try:
            headers = HEADERS.copy()
            r = requests.get(f"{BASE}/stores", headers=headers, timeout=30)
            r.raise_for_status()
            stores_data = r.json().get("result", [])
            print(f"[DEBUG] Found {len(stores_data)} stores in API response")

            store_map: Dict[str, str] = {}
            for s in stores_data:
                sid = str(s.get("id", ""))
                store_name = s.get("name", "Unknown")
                store_type = s.get("type", "unknown")
                store_map[sid] = f"{store_name} ({store_type})"
                print(f"[DEBUG] Store in API: {store_name} (ID: {sid}, type: {store_type})")

            for sid in store_ids:
                if sid in store_map:
                    store_list.append((sid, store_map[sid]))
                    print(f"[DEBUG] Added store: {store_map[sid]} (ID: {sid})")
                else:
                    store_list.append((sid, f"Store {sid}"))
                    print(f"[WARNING] Store ID {sid} not found in API response, but will attempt to fetch")

            if len(store_list) != len(store_ids):
                print(f"[WARNING] Only found {len(store_list)}/{len(store_ids)} stores in API response")
        except Exception as e:  # pragma: no cover - defensive
            print(f"[WARNING] Could not fetch store names: {e}")
            for sid in store_ids:
                store_list.append((sid, f"Store {sid}"))
        return store_list
    elif STORE_ID:
        print(f"[DEBUG] Processing single store ID: {STORE_ID}")
        try:
            headers = HEADERS.copy()
            r = requests.get(f"{BASE}/stores", headers=headers, timeout=30)
            r.raise_for_status()
            stores_data = r.json().get("result", [])
            for s in stores_data:
                if str(s.get("id", "")) == STORE_ID:
                    store_name = s.get("name", "Unknown Store")
                    print(f"[DEBUG] Found store: {store_name} (ID: {STORE_ID})")
                    return [(STORE_ID, store_name)]
            print(f"[WARNING] Store ID {STORE_ID} not found in API response")
        except Exception as e:  # pragma: no cover - defensive
            print(f"[WARNING] Could not fetch store name: {e}")
        return [(STORE_ID, "Unknown Store")]
    else:
        print("[ERROR] No store ID(s) provided", file=sys.stderr)
        return []


def get_json(
    path: str,
    params: Optional[Dict[str, Any]] = None,
    retries: int = 3,
    store_id: Optional[str] = None,
) -> Dict[str, Any]:
    """GET helper with basic retry / rate limit handling."""
    url = f"{BASE}{path}"

    headers = HEADERS.copy()
    if "/sync/" in path or "/store/" in path:
        if store_id:
            headers["X-PF-Store-Id"] = store_id
        elif STORE_ID:
            headers["X-PF-Store-Id"] = STORE_ID

    for attempt in range(retries):
        try:
            r = requests.get(url, headers=headers, params=params, timeout=60)
            if r.status_code == 429:
                wait_time = 60.0
                if attempt < retries - 1:
                    print(
                        f"[RATE LIMIT] 429 from Printful, waiting {wait_time:.1f}s "
                        f"before retry ({attempt + 1}/{retries})..."
                    )
                    time.sleep(wait_time)
                    continue
                else:
                    raise requests.exceptions.HTTPError("429 Rate limit exceeded", response=r)

            r.raise_for_status()
            return r.json()
        except requests.exceptions.RequestException as e:
            if attempt == retries - 1:
                print(f"[ERROR] API request failed after {retries} attempts: {e}")
                raise
            wait_time = (attempt + 1) * 2.0
            print(f"[RETRY] Waiting {wait_time:.1f}s before retry ({attempt + 1}/{retries})...")
            time.sleep(wait_time)

    raise requests.exceptions.RequestException("Failed after all retries")


def paginate_sync_products(
    limit: int = 100,
    status: Optional[str] = None,
    store_id: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Paginate through /sync/products."""
    out: List[Dict[str, Any]] = []
    offset = 0

    while True:
        params = {"limit": limit, "offset": offset}
        if status:
            params["status"] = status

        data = get_json("/sync/products", params=params, store_id=store_id)
        result = data.get("result", [])
        if not isinstance(result, list):
            break
        if not result:
            break

        out.extend(result)
        paging = data.get("paging", {})
        total = paging.get("total")
        if isinstance(total, int) and len(out) >= total:
            break
        if len(result) < limit:
            break

        offset += len(result)
        time.sleep(0.5)

    return out


def get_catalog_variant_cost(variant_id: str) -> Tuple[Optional[float], Optional[float], Optional[str]]:
    """Fetch catalog variant cost from v2 API. Returns (price, discounted_price, technique_key)."""
    if not variant_id or not variant_id.strip():
        return (None, None, None)

    headers_v2 = {
        "Authorization": f"Bearer {TOKEN}",
        "Accept": "application/json",
    }
    url = f"{BASE_V2}/catalog-variants/{variant_id}/prices"
    params = {"selling_region_name": SELLING_REGION, "currency": CURRENCY}

    try:
        r = requests.get(url, headers=headers_v2, params=params, timeout=30)
        if r.status_code == 429:
            # For this script we keep it simple and do not retry v2 too aggressively.
            return (None, None, None)
        r.raise_for_status()
        data = r.json()
    except requests.exceptions.RequestException:
        return (None, None, None)

    techniques = None
    if isinstance(data, dict):
        techniques = data.get("data", {}).get("techniques") or data.get("techniques")
    elif isinstance(data, list):
        techniques = data

    if not techniques:
        return (None, None, None)
    if not isinstance(techniques, list):
        techniques = [techniques]

    technique_priority = ["dtg", "embroidery", "digital", "dtf", "sublimation"]
    for preferred in technique_priority:
        for tech in techniques:
            tech_key = (tech.get("technique_key") or "").lower()
            if tech_key == preferred:
                price = tech.get("price")
                discounted = tech.get("discounted_price")
                if price is not None:
                    return (
                        float(price),
                        float(discounted) if discounted is not None else None,
                        preferred,
                    )

    for tech in techniques:
        price = tech.get("price")
        if price is not None:
            discounted = tech.get("discounted_price")
            tech_key = tech.get("technique_key", "")
            return (
                float(price),
                float(discounted) if discounted is not None else None,
                tech_key,
            )

    return (None, None, None)


def get_sync_product_details(sync_product_id: int, store_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    try:
        data = get_json(f"/sync/products/{sync_product_id}", store_id=store_id)
        return data.get("result")
    except Exception as e:  # pragma: no cover - defensive
        print(f"[WARNING] Could not fetch details for sync product {sync_product_id}: {e}")
        return None


def fetch_store_products(store_id: str, store_name: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """Fetch products + variants for a specific store."""
    print(f"\n[INFO] Fetching products from store: {store_name} (ID: {store_id})")
    sync_products = paginate_sync_products(store_id=store_id)
    print(f"[OK] Found {len(sync_products)} products from {store_name}")

    all_variants: List[Dict[str, Any]] = []
    enriched_products: List[Dict[str, Any]] = []

    for sp in sync_products:
        sync_product_id = sp.get("id")
        if not sync_product_id:
            continue

        product_name = sp.get("name", "Unknown")
        print(f"[INFO] Processing product: {product_name[:60]}")

        details = get_sync_product_details(sync_product_id, store_id=store_id)
        if not details:
            continue

        enriched_product = sp.copy()
        enriched_product["description"] = details.get("description", sp.get("description", ""))
        enriched_product["thumbnail_url"] = details.get("thumbnail_url", sp.get("thumbnail_url", ""))
        enriched_product["image_url"] = details.get(
            "image_url", details.get("thumbnail_url", sp.get("thumbnail_url", ""))
        )
        enriched_products.append(enriched_product)

        sync_variants = details.get("sync_variants", [])
        if not isinstance(sync_variants, list):
            sync_variants = []

        for sv in sync_variants:
            files = sv.get("files", [])
            mockups = sv.get("mockups", [])
            variant_id = str(sv.get("variant_id", ""))  # catalog variant ID

            cost, cost_discounted, technique = get_catalog_variant_cost(variant_id)

            retail_price = sv.get("retail_price")
            retail_sub = None
            cost_sub = None
            cost_discounted_sub = None

            if retail_price and SUBSCRIPTION_DISC > 0:
                try:
                    retail_sub = float(retail_price) * (1.0 - SUBSCRIPTION_DISC)
                except (ValueError, TypeError):
                    pass
            if cost and SUBSCRIPTION_DISC > 0:
                cost_sub = cost * (1.0 - SUBSCRIPTION_DISC)
            if cost_discounted and SUBSCRIPTION_DISC > 0:
                cost_discounted_sub = cost_discounted * (1.0 - SUBSCRIPTION_DISC)

            all_variants.append(
                {
                    "store_id": store_id,
                    "store_name": store_name,
                    "sync_product_id": sync_product_id,
                    "sync_variant_id": sv.get("id", ""),
                    "external_id": sv.get("external_id", ""),
                    "variant_id": variant_id,
                    "retail_price": retail_price,
                    "retail_price_subscription": f"{retail_sub:.2f}" if retail_sub is not None else "",
                    "cost": f"{cost:.2f}" if cost is not None else "",
                    "cost_discounted": f"{cost_discounted:.2f}" if cost_discounted is not None else "",
                    "cost_subscription": f"{cost_sub:.2f}" if cost_sub is not None else "",
                    "cost_discounted_subscription": f"{cost_discounted_sub:.2f}" if cost_discounted_sub is not None else "",
                    "technique_key": technique or "",
                    "sku": sv.get("sku", ""),
                    "files_json": json.dumps(files) if files else "",
                    "mockups_json": json.dumps(mockups) if mockups else "",
                    "is_enabled": "true" if sv.get("is_enabled", False) else "false",
                }
            )

            time.sleep(0.5)  # v2 cost lookups

        time.sleep(0.5)

    return enriched_products, all_variants


def main() -> None:
    require_token_and_store()

    print("Starting Printful My Products export...")
    print(f"Region: {SELLING_REGION} | Currency: {CURRENCY}")
    if SUBSCRIPTION_DISC > 0:
        print(f"Subscription discount: {SUBSCRIPTION_DISC * 100:.0f}%")
    print()

    store_list = get_store_list()
    if not store_list:
        print("[ERROR] No store IDs to process.", file=sys.stderr)
        sys.exit(2)

    all_products: List[Dict[str, Any]] = []
    all_variants: List[Dict[str, Any]] = []

    for store_id, store_name in store_list:
        try:
            products, variants = fetch_store_products(store_id, store_name)
            for p in products:
                p["_store_id"] = store_id
                p["_store_name"] = store_name
            all_products.extend(products)
            all_variants.extend(variants)
        except Exception as e:  # pragma: no cover - defensive
            print(f"[ERROR] Failed to fetch from store {store_name} ({store_id}): {e}")
            continue

    products_file = Path("printful_my_products.csv")
    variants_file = Path("printful_my_variants.csv")

    with products_file.open("w", newline="", encoding="utf-8") as f:
        fieldnames = [
            "store_id",
            "store_name",
            "sync_product_id",
            "external_id",
            "title",
            "description",
            "thumbnail_url",
            "image_url",
            "status",
            "created_at",
            "updated_at",
        ]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for sp in all_products:
            description = sp.get("description", "")
            writer.writerow(
                {
                    "store_id": sp.get("_store_id", ""),
                    "store_name": sp.get("_store_name", ""),
                    "sync_product_id": sp.get("id", ""),
                    "external_id": sp.get("external_id", ""),
                    "title": sp.get("name", ""),
                    "description": (description or "").replace("\n", " ").strip(),
                    "thumbnail_url": sp.get("thumbnail_url", ""),
                    "image_url": sp.get("image_url", sp.get("thumbnail_url", "")),
                    "status": sp.get("status", ""),
                    "created_at": sp.get("created", ""),
                    "updated_at": sp.get("modified", ""),
                }
            )

    with variants_file.open("w", newline="", encoding="utf-8") as f:
        fieldnames = [
            "store_id",
            "store_name",
            "sync_product_id",
            "sync_variant_id",
            "external_id",
            "variant_id",
            "retail_price",
            "retail_price_subscription",
            "cost",
            "cost_discounted",
            "cost_subscription",
            "cost_discounted_subscription",
            "technique_key",
            "sku",
            "files_json",
            "mockups_json",
            "is_enabled",
        ]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_variants)

    print(f"[SAVED] {products_file} ({len(all_products)} products)")
    print(f"[SAVED] {variants_file} ({len(all_variants)} variants)")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n[WARNING] Export interrupted by user.")
        sys.exit(1)
    except Exception as e:  # pragma: no cover - defensive
        print(f"\n[ERROR] Export failed: {e}")
        sys.exit(1)

