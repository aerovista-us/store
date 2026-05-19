"""Generate a single cleanup-target report for the active storefront catalog."""

from __future__ import annotations

import argparse
import json
import re
import urllib.request
from collections import defaultdict
from pathlib import Path

from generate_sku_map import DEFAULT_INPUT_PATH, build_cart_key, load_products


DEFAULT_OUTPUT_PATH = "data_quality_reports/cleanup_target_report.md"
DEFAULT_LIVE_URL = "https://aerovista-us.github.io/store/square_products_latest.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate cleanup targets for images and SKU collisions.")
    parser.add_argument("--input", default=DEFAULT_INPUT_PATH, help=f"Catalog JSON path (default: {DEFAULT_INPUT_PATH}).")
    parser.add_argument("--output", default=DEFAULT_OUTPUT_PATH, help=f"Markdown output path (default: {DEFAULT_OUTPUT_PATH}).")
    parser.add_argument("--live-url", default=DEFAULT_LIVE_URL, help=f"Live catalog URL to compare against (default: {DEFAULT_LIVE_URL}).")
    parser.add_argument("--top-collisions", type=int, default=8, help="Number of collision groups to include in detail.")
    return parser.parse_args()


def has_image(product: dict) -> bool:
    for key in ("image", "imageUrl", "image_url", "img"):
        value = product.get(key)
        if isinstance(value, str) and value.strip():
            return True
    images = product.get("images")
    if isinstance(images, list):
        for entry in images:
            if isinstance(entry, str) and entry.strip():
                return True
            if isinstance(entry, dict):
                for key in ("url", "imageUrl", "src"):
                    value = entry.get(key)
                    if isinstance(value, str) and value.strip():
                        return True
    return False


def load_live_ids(live_url: str) -> tuple[set[str] | None, str]:
    try:
        with urllib.request.urlopen(live_url, timeout=30) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except Exception as exc:
        return None, f"Live catalog comparison failed: {exc}"
    products = payload["products"] if isinstance(payload, dict) and isinstance(payload.get("products"), list) else []
    return {str(product.get("id") or "").strip() for product in products if isinstance(product, dict)}, f"Live catalog compared: {live_url}"


def collect_missing_images(products: list[dict]) -> list[dict]:
    missing = []
    for product in products:
        if not isinstance(product, dict) or has_image(product):
            continue
        missing.append({
            "name": str(product.get("name") or product.get("title") or product.get("id") or "Unnamed").strip(),
            "id": str(product.get("id") or "").strip(),
        })
    return sorted(missing, key=lambda row: (row["name"].lower(), row["id"]))


def collect_shared_images(products: list[dict]) -> list[tuple[str, list[dict]]]:
    by_image: dict[str, list[dict]] = defaultdict(list)
    for product in products:
        if not isinstance(product, dict):
            continue
        image_name = str(product.get("image") or "").strip()
        if image_name:
            by_image[image_name.lower()].append({
                "image": image_name,
                "name": str(product.get("name") or product.get("title") or product.get("id") or "Unnamed").strip(),
                "id": str(product.get("id") or "").strip(),
            })
    shared = [(image_key, rows) for image_key, rows in by_image.items() if len(rows) > 1]
    return sorted(shared, key=lambda item: (-len(item[1]), item[0]))


def collect_collisions(products: list[dict]) -> list[tuple[str, list[dict]]]:
    by_cart_key: dict[str, list[dict]] = defaultdict(list)
    for product in products:
        if not isinstance(product, dict):
            continue
        product_color = str(product.get("color") or "").strip()
        variants = product.get("variants")
        if not isinstance(variants, list):
            continue
        for variant in variants:
            if not isinstance(variant, dict):
                continue
            variant_color = str(variant.get("color") or "").strip()
            size = str(variant.get("size") or "").strip() or "One Size"
            color = variant_color or product_color
            cart_key = build_cart_key(color, size)
            by_cart_key[cart_key].append({
                "name": str(product.get("name") or product.get("title") or product.get("id") or "Unnamed").strip(),
                "id": str(product.get("id") or "").strip(),
                "category": str(product.get("category") or "").strip(),
                "product_color": product_color,
                "variant_color": variant_color,
                "size": size,
                "variation_id": str(variant.get("variation_id") or variant.get("variationId") or "").strip(),
            })
    collisions = [(key, rows) for key, rows in by_cart_key.items() if len(rows) > 1]
    return sorted(collisions, key=lambda item: (-len(item[1]), item[0].lower()))


def collect_like_product_candidates(shared_images: list[tuple[str, list[dict]]]) -> list[dict]:
    candidates = []
    for _, rows in shared_images:
        if len(rows) < 2:
            continue
        candidates.append({
            "image": rows[0]["image"],
            "products": rows,
            "recommendation": "Review these in Square as a same-design family. Keep intentional variants, but remove or rename rows that are duplicate uploads with only title/copy changes.",
        })
    return candidates


GENERIC_COPY_PATTERNS = [
    ("generic hoodie copy", re.compile(r"Who knew that the softest hoodie you'll ever own", re.I)),
    ("generic tee copy", re.compile(r"This t-shirt is everything you've dreamed of and more", re.I)),
    ("generic neck gaiter copy", re.compile(r"This neck gaiter is a versatile accessory", re.I)),
    ("generic trucker cap copy", re.compile(r"This six-panel trucker cap with a mesh back", re.I)),
    ("generic stickers copy", re.compile(r"Add some sparkle to your life with these holographic stickers", re.I)),
]


def collect_unfinished_products(products: list[dict], missing_images: list[dict]) -> list[dict]:
    missing_image_ids = {row["id"] for row in missing_images}
    flagged = []
    for product in products:
        if not isinstance(product, dict):
            continue
        name = str(product.get("name") or product.get("title") or product.get("id") or "Unnamed").strip()
        product_id = str(product.get("id") or "").strip()
        description = str(product.get("description_text") or "").strip()
        reasons: list[str] = []

        if product_id in missing_image_ids:
            reasons.append("missing image")
        if not description:
            reasons.append("blank description")
        if len(name.split()) <= 2 and not any(token in name.lower() for token in ("aerovista", "bonsaid", "echoverse", "powder", "neck gaiter")):
            reasons.append("generic or placeholder-style title")
        if name in {"Rental", "Unisex Hoodie", "echoverse", "hy.go"}:
            reasons.append("name looks unfinished or too generic for storefront use")

        for label, pattern in GENERIC_COPY_PATTERNS:
            if pattern.search(description):
                reasons.append(label)

        if reasons:
            flagged.append({
                "name": name,
                "id": product_id,
                "reasons": reasons,
                "recommendation": "Edit in Square before launch; remove entirely if this row is internal-only, a placeholder, or not part of the starter set.",
            })

    flagged.sort(key=lambda row: (-len(row["reasons"]), row["name"].lower(), row["id"]))
    return flagged


def collision_recommendation(cart_key: str, rows: list[dict]) -> str:
    blank_product_color = sum(1 for row in rows if not row["product_color"])
    blank_variant_color = sum(1 for row in rows if not row["variant_color"])
    size_embeds_color = sum(1 for row in rows if "," in row["size"])

    if size_embeds_color == len(rows):
        return "Split color out of the Square size option. Move values like `Black` / `White` into a real color option and keep size as `S`, `M`, `L`, etc."
    if blank_product_color == len(rows) and blank_variant_color == len(rows):
        return "Populate Square color option values for every variation in this group. These rows currently collapse into the same cart key because color is blank everywhere."
    if size_embeds_color > 0:
        return "Normalize this group in Square by filling color consistently and removing color text from the size field where it appears."
    if cart_key.startswith("Default__"):
        return "Stop using blank/default color for this family. Give each variation a real color label in Square so `Color__Size` becomes unique."
    return "Normalize option labels upstream in Square so each variation has a stable color field and an uncluttered size field."


def build_report(
    catalog_path: Path,
    live_note: str,
    live_match: bool | None,
    products: list[dict],
    missing_images: list[dict],
    shared_images: list[tuple[str, list[dict]]],
    collisions: list[tuple[str, list[dict]]],
    like_products: list[dict],
    unfinished_products: list[dict],
    top_collision_count: int,
) -> str:
    total_variants = sum(len(product.get("variants") or []) for product in products if isinstance(product, dict))
    blank_top_level_color = sum(1 for product in products if not str(product.get("color") or "").strip())
    blank_variant_color = 0
    size_embeds_color = 0
    for product in products:
        if not isinstance(product, dict):
            continue
        for variant in product.get("variants") or []:
            if not isinstance(variant, dict):
                continue
            if not str(variant.get("color") or "").strip():
                blank_variant_color += 1
            if "," in str(variant.get("size") or ""):
                size_embeds_color += 1

    lines = [
        "# Cleanup Target Report",
        "",
        f"- Catalog file: `{catalog_path}`",
        f"- Products: **{len(products)}**",
        f"- Variants: **{total_variants}**",
        f"- Live comparison: **{'matches live GitHub Pages catalog' if live_match else 'not verified against live'}**",
        f"- Note: {live_note}",
        "",
        "## Summary",
        "",
        f"- Products missing images: **{len(missing_images)}**",
        f"- Shared/reused image files: **{len(shared_images)}**",
        f"- Collision groups (`Color__Size`): **{len(collisions)}**",
        f"- Likely same-design / duplicate-upload families: **{len(like_products)}**",
        f"- Unfinished / generic product rows: **{len(unfinished_products)}**",
        f"- Products with blank top-level color: **{blank_top_level_color}/{len(products)}**",
        f"- Variants with blank variant color: **{blank_variant_color}/{total_variants}**",
        f"- Variants with color embedded in size field: **{size_embeds_color}/{total_variants}**",
        "",
        "## Products Missing Images",
        "",
    ]

    if missing_images:
        for row in missing_images:
            lines.append(f"- `{row['id']}` | {row['name']}")
    else:
        lines.append("- None")

    lines.extend([
        "",
        "## Shared / Reused Image Files",
        "",
    ])

    if shared_images:
        for image_key, rows in shared_images:
            lines.append(f"### `{rows[0]['image']}` ({len(rows)} products)")
            for row in rows:
                lines.append(f"- `{row['id']}` | {row['name']}")
            lines.append("")
    else:
        lines.append("- None")
        lines.append("")

    lines.extend([
        "## Top Collision Groups",
        "",
        "These are the highest-frequency `Color__Size` collisions in the active catalog.",
        "",
    ])

    for cart_key, rows in collisions[:top_collision_count]:
        categories = ", ".join(sorted({row["category"] or "uncategorized" for row in rows}))
        lines.append(f"### `{cart_key}` ({len(rows)} variations)")
        lines.append(f"- Categories: {categories}")
        lines.append(f"- Recommended Square fix: {collision_recommendation(cart_key, rows)}")
        lines.append("- Source product IDs / variation IDs:")
        for row in rows:
            lines.append(f"  - `{row['id']}` | `{row['variation_id']}` | {row['name']}")
        lines.append("")

    lines.extend([
        "## Likely Same-Design / Duplicate-Upload Families",
        "",
        "These groups share the same image file and are the strongest candidates for Square review when you want a clean starter set.",
        "",
    ])

    if like_products:
        for group in like_products:
            lines.append(f"### `{group['image']}` ({len(group['products'])} products)")
            lines.append(f"- Review action: {group['recommendation']}")
            for row in group["products"]:
                lines.append(f"- `{row['id']}` | {row['name']}")
            lines.append("")
    else:
        lines.append("- None")
        lines.append("")

    lines.extend([
        "## Unfinished / Generic Product Rows",
        "",
        "These are the strongest edit-or-remove candidates in Square before you lock a clean starter set.",
        "",
    ])

    if unfinished_products:
        for row in unfinished_products:
            reason_text = ", ".join(row["reasons"])
            lines.append(f"- `{row['id']}` | {row['name']} | reasons: {reason_text}")
    else:
        lines.append("- None")

    image_fix_line = (
        f"4. Fill missing image assignments for the {len(missing_images)} products listed above before the next publish."
        if missing_images
        else "4. Missing image assignments are currently clear in the local starter catalog; keep checking after each Square export."
    )

    lines.extend([
        "## Recommended Upstream Square Fixes",
        "",
        "1. Populate a real color option/value for every variation that currently falls back to `Default`.",
        "2. Move color text out of the size field wherever values look like `Black, M` or `White, 2XL`.",
        "3. Keep one canonical product record per design and one image assignment per product unless image reuse is intentional.",
        image_fix_line,
        "5. Re-run `python tools/report_sku_collisions.py` and this report after each Square export or catalog polish pass.",
        "",
    ])
    return "\n".join(lines)


def main() -> int:
    args = parse_args()
    catalog_path = Path(args.input).resolve()
    output_path = Path(args.output).resolve()
    products = load_products(catalog_path)

    local_ids = {str(product.get("id") or "").strip() for product in products if isinstance(product, dict)}
    live_ids, live_note = load_live_ids(args.live_url)
    live_match = live_ids == local_ids if live_ids is not None else None

    missing_images = collect_missing_images(products)
    shared_images = collect_shared_images(products)
    collisions = collect_collisions(products)
    like_products = collect_like_product_candidates(shared_images)
    unfinished_products = collect_unfinished_products(products, missing_images)

    report = build_report(
        catalog_path=catalog_path,
        live_note=live_note,
        live_match=bool(live_match),
        products=products,
        missing_images=missing_images,
        shared_images=shared_images,
        collisions=collisions,
        like_products=like_products,
        unfinished_products=unfinished_products,
        top_collision_count=args.top_collisions,
    )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(report + "\n", encoding="utf-8")

    print(f"report: {output_path}")
    print(f"missing_images: {len(missing_images)}")
    print(f"shared_images: {len(shared_images)}")
    print(f"collision_groups: {len(collisions)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
