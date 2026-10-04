"""Project the October 4 Square xlsx into store/square_products_latest.json.

The apparel browser never reads this workbook. Square item rows are the
authority. Existing storefront ids, galleries, and copy stay when a row
matches a variation token or a normalized item name.
"""
from __future__ import annotations

import json
import re
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

XLSX = Path(r"F:\1149XBNG8C8ZE_catalog-2026-10-04-1828.xlsx")
STORE = Path(r"F:\aerovista-store\store\square_products_latest.json")
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
MAIN = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"

CANONICAL_IDS = [
    (("blue", "divide", "sticker"), "aerovista-blue-divide-sticker"),
    (("blue", "divide",), "aerovista-blue-divide-tee"),
    (("ridgeline",), "aerovista-ridgeline-tee"),
    (("idaho", "after", "dark"), "aerovista-idaho-after-dark-tee"),
    (("source", "code"), "aerovista-source-code-tee"),
    (("moonline", "hat"), "aerovista-moonline-hat"),
    (("moon", "line", "hat"), "aerovista-moonline-hat"),
    (("moonline",), "aerovista-moonline-tee"),
    (("moon", "line"), "aerovista-moonline-tee"),
    (("powderline",), "aerovista-powderline-tee"),
    (("powder", "line"), "aerovista-powderline-tee"),
    (("behind", "scene", "hat"), "aerovista-built-behind-the-scenes-hat"),
    (("behind", "scene", "blk"), "aerovista-built-behind-the-scenes-tee-black"),
    (("behind", "scene", "black"), "aerovista-built-behind-the-scenes-tee-black"),
    (("behind", "scene"), "aerovista-built-behind-the-scenes-tee"),
]


def col_letters(ref: str) -> str:
    return "".join(ch for ch in ref if ch.isalpha())


def cell_value(cell) -> str:
    inline = cell.find(f"{MAIN}is")
    if inline is not None:
        return "".join((node.text or "") for node in inline.iter(f"{MAIN}t")).strip()
    value = cell.find(f"{MAIN}v")
    return (value.text or "").strip() if value is not None else ""


def load_rows(path: Path):
    with zipfile.ZipFile(path) as book:
        sheet = ET.fromstring(book.read("xl/worksheets/sheet1.xml"))
    rows = []
    for row in sheet.findall("m:sheetData/m:row", NS):
        values = {}
        for cell in row.findall("m:c", NS):
            values[col_letters(cell.attrib.get("r", ""))] = cell_value(cell)
        if any(values.values()):
            rows.append(values)
    return rows


def norm(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", (value or "").lower()).strip()


def slug(name: str) -> str:
    text = re.sub(r"[^a-z0-9]+", "-", (name or "").lower()).strip("-")
    return (text[:80] or "product")


def canonical_id(name: str) -> str:
    tokens = set(norm(name).split())
    for needles, product_id in CANONICAL_IDS:
        if all(needle in tokens or needle in norm(name) for needle in needles):
            # Hat matches must not claim the tee, and sticker matches must not claim the tee.
            if product_id.endswith("-hat") and "hat" not in tokens and "cap" not in tokens:
                continue
            if product_id.endswith("-sticker") and "sticker" not in tokens:
                continue
            if product_id.endswith("-tee") and ("hat" in tokens or "cap" in tokens or "sticker" in tokens):
                continue
            return product_id
    return ""


def header_map(header: dict) -> dict:
    lookup = {norm(value): key for key, value in header.items() if value}
    def pick(*names):
        for name in names:
            if name in lookup:
                return lookup[name]
        for name in names:
            for label, key in lookup.items():
                if name in label:
                    return key
        return ""
    return {
        "name": pick("item name", "name"),
        "token": pick("token", "variation token"),
        "variation": pick("variation name", "variation"),
        "sku": pick("sku"),
        "description": pick("description"),
        "categories": pick("categories", "category", "reporting category"),
        "visibility": pick("visibility", "online visibility", "website visibility"),
        "price": pick("price", "price money amount"),
        "archived": pick("archived"),
        "size": pick("size"),
        "size_alt": pick("variation size"),
    }


def truthy(value: str) -> bool:
    return norm(value) in {"yes", "true", "1", "y", "archived"}


def visibility_of(value: str):
    text = norm(value)
    if not text:
        return ""
    if text in {"hidden", "private", "unavailable", "no"}:
        return "hidden"
    if "hidden" in text:
        return "hidden"
    if text in {"visible", "public", "available", "yes"} or "visible" in text:
        return "visible"
    return ""


def money(value: str) -> float:
    cleaned = re.sub(r"[^0-9.]", "", value or "")
    if not cleaned:
        return 0
    amount = float(cleaned)
    return round(amount / 100, 2) if amount >= 1000 and "." not in (value or "") else round(amount, 2)


def category_for(name: str, categories: str) -> str:
    blob = f"{name} {categories}".lower()
    if "hoodie" in blob:
        return "hoodies"
    if "sweatshirt" in blob or "crewneck" in blob:
        return "crewnecks"
    if "hat" in blob or "cap" in blob:
        return "hats"
    if "sticker" in blob:
        return "stickers"
    if "tee" in blob or "t-shirt" in blob:
        return "tees"
    if "canvas" in blob or "art print" in blob:
        return "art"
    if "case" in blob or "mug" in blob:
        return "accessories"
    return "apparel"


def main():
    rows = load_rows(XLSX)
    header = header_map(rows[1] if len(rows) > 1 else rows[0])
    data = rows[2:] if norm(rows[0].get("A", "")) in {"", "catalog"} or "name" in norm(" ".join(rows[1].values())) else rows[1:]
    # Row 2 is the header in this Square export. Row 1 is a type row.
    if "item name" in {norm(value) for value in rows[1].values()}:
        data = rows[2:]
    elif "item name" in {norm(value) for value in rows[0].values()}:
        header = header_map(rows[0])
        data = rows[1:]

    grouped = {}
    for row in data:
        name = row.get(header["name"], "").strip()
        if not name:
            continue
        item = grouped.setdefault(name, {"name": name, "rows": []})
        item["rows"].append(row)

    prior = json.loads(STORE.read_text(encoding="utf-8"))
    prior_products = prior.get("products") or []
    by_token = {}
    by_name = {}
    for product in prior_products:
        by_name.setdefault(norm(product.get("name", "")), product)
        for variant in product.get("variants") or []:
            token = str(variant.get("variation_id") or "").strip()
            if token:
                by_token[token] = product

    matched_ids = set()
    added = 0
    updated = 0
    held = 0
    for name, item in grouped.items():
        rows_for_item = item["rows"]
        tokens = [row.get(header["token"], "").strip() for row in rows_for_item]
        curated = next((by_token[token] for token in tokens if token in by_token), None)
        if curated is None:
            curated = by_name.get(norm(name))
        archived = any(truthy(row.get(header["archived"], "")) for row in rows_for_item)
        visibilities = [visibility_of(row.get(header["visibility"], "")) for row in rows_for_item]
        explicit = next((value for value in visibilities if value), "")
        if archived:
            held += 1
            if curated:
                curated["visibility"] = "hidden"
                matched_ids.add(curated["id"])
            continue
        if not explicit and curated is None:
            held += 1
            continue
        variants = []
        for row in rows_for_item:
            size = row.get(header["variation"], "") or row.get(header["size"], "") or row.get(header["size_alt"], "") or "One Size"
            variants.append({
                "size": size.strip() or "One Size",
                "color": "",
                "sku": row.get(header["sku"], "").strip(),
                "price": money(row.get(header["price"], "")),
                "variation_id": row.get(header["token"], "").strip(),
            })
        price = next((variant["price"] for variant in variants if variant["price"] > 0), 0)
        description = next((row.get(header["description"], "").strip() for row in rows_for_item if row.get(header["description"], "").strip()), "")
        categories = next((row.get(header["categories"], "").strip() for row in rows_for_item if row.get(header["categories"], "").strip()), "")
        if curated:
            curated["name"] = name
            curated["variants"] = variants
            curated["price"] = price or curated.get("price") or 0
            if explicit:
                curated["visibility"] = explicit
            if description and not curated.get("description_text"):
                curated["description_text"] = description
                curated["description_html"] = f"<p>{description.replace('<', '&lt;')}</p>"
            matched_ids.add(curated["id"])
            updated += 1
            continue
        product_id = canonical_id(name) or slug(name)
        image = f"/store/products/{product_id}/01-hero.webp" if canonical_id(name) and not product_id.endswith("-black") else ""
        prior_products.append({
            "id": product_id,
            "name": name,
            "color": "",
            "category": category_for(name, categories),
            "collection": "Place" if canonical_id(name) else "",
            "visibility": explicit or "hidden",
            "price": price,
            "image": image,
            "description_text": description,
            "description_html": f"<p>{description.replace('<', '&lt;')}</p>" if description else "",
            "seo_title": name,
            "seo_description": description[:160],
            "tags": [],
            "square_item_id": "",
            "variants": variants,
            "images": [image] if image else [],
            "image_manifest": "",
        })
        matched_ids.add(product_id)
        added += 1

    retained = [product["id"] for product in prior_products if product.get("id") not in matched_ids]
    visible = [product for product in prior_products if product.get("visibility") == "visible"]
    prior["products"] = prior_products
    meta = prior.get("meta") or {}
    meta["projectedFrom"] = XLSX.name
    meta["projectedAt"] = datetime.now(timezone.utc).isoformat()
    meta["authority"] = "Square catalog export. Apparel does not parse this workbook."
    prior["meta"] = meta
    STORE.write_text(json.dumps(prior, indent=2), encoding="utf-8")
    print(f"items {len(grouped)} updated {updated} added {added} held {held} retained {len(retained)} visible {len(visible)} total {len(prior_products)}")


if __name__ == "__main__":
    main()
