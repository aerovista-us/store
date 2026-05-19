#!/usr/bin/env python3
"""
Import Printful variant map JSON into the Postgres product_variant_map table.

This is a bridge between the existing JSON-based mapping
(`backend/data/printful_variant_map.json`) and the new DB-backed
`product_variant_map` table used by the fulfillment bridge.

Usage (from repo root):

  DATABASE_URL=postgresql+psycopg://user:pass@host:5432/db \\
  python backend/scripts/import_printful_variant_map.py

The script is idempotent-ish: it upserts rows per (provider, square_variation_id).
"""

from __future__ import annotations

import json
import os
from pathlib import Path

from sqlalchemy import select

from db import ProductVariantMap, get_session  # type: ignore


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_MAP = REPO_ROOT / "backend" / "data" / "printful_variant_map.json"


def main() -> None:
  path = Path(os.getenv("PRINTFUL_MAP_JSON") or DEFAULT_MAP)
  if not path.is_file():
    raise SystemExit(f"Mapping JSON not found: {path}")

  with path.open("r", encoding="utf-8") as f:
    raw = json.load(f)

  if not isinstance(raw, dict):
    raise SystemExit(f"Expected object mapping in {path}, got {type(raw)}")

  count = 0
  with get_session() as db:
    for square_variation_id, provider_variant_id in raw.items():
      square_variation_id = str(square_variation_id).strip()
      provider_variant_id = str(provider_variant_id).strip()
      if not square_variation_id or not provider_variant_id:
        continue
      stmt = select(ProductVariantMap).where(
        ProductVariantMap.provider == "printful",
        ProductVariantMap.square_variation_id == square_variation_id,
      )
      existing = db.execute(stmt).scalar_one_or_none()
      if existing:
        existing.provider_variant_id = provider_variant_id
      else:
        row = ProductVariantMap(
          store_id=None,
          square_variation_id=square_variation_id,
          sku=None,
          provider="printful",
          provider_variant_id=provider_variant_id,
          provider_external_id=None,
          is_active=True,
        )
        db.add(row)
      count += 1

  print(f"Imported/updated {count} mapping rows from {path}")


if __name__ == "__main__":
  main()

