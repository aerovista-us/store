"""Convert canonical product gallery images to WebP and update manifests/catalogs."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image


REPO_ROOT = Path(__file__).resolve().parents[1]
PRODUCT_ROOT = REPO_ROOT / "store" / "products"
CATALOG_PATHS = (
    REPO_ROOT / "store" / "square_products_latest.json",
    REPO_ROOT / "public" / "store" / "square_products_latest.json",
)
SOURCE_EXTENSIONS = {".png", ".jpg", ".jpeg"}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def webp_url(url: str) -> str:
    path = Path(url)
    return str(path.with_suffix(".webp")).replace("\\", "/")


converted = 0
for product_dir in sorted(path for path in PRODUCT_ROOT.iterdir() if path.is_dir()):
    manifest_path = product_dir / "manifest.json"
    if not manifest_path.exists():
        continue

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    for image in manifest.get("images", []):
        source = product_dir / image["file"]
        if source.suffix.lower() not in SOURCE_EXTENSIONS:
            continue
        target = source.with_suffix(".webp")
        if source.exists():
            with Image.open(source) as opened:
                rendered = opened.convert("RGBA") if "A" in opened.getbands() else opened.convert("RGB")
                rendered.save(target, "WEBP", quality=88, method=3, exact=True)
            source.unlink()
        elif not target.exists():
            raise FileNotFoundError(f"Missing source and output: {source}")
        image["sourceSha256"] = image.pop("sha256", image.get("sourceSha256", ""))
        image["outputSha256"] = sha256(target)
        image["file"] = target.name
        converted += 1

    manifest["hero"] = webp_url(manifest["hero"])
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

catalog = json.loads(CATALOG_PATHS[0].read_text(encoding="utf-8"))
for product in catalog.get("products", []):
    if not product.get("image_manifest"):
        continue
    product["image"] = webp_url(product["image"])
    product["images"] = [webp_url(url) for url in product.get("images", [])]

serialized = json.dumps(catalog, indent=2, ensure_ascii=False) + "\n"
for path in CATALOG_PATHS:
    path.write_text(serialized, encoding="utf-8")

print(f"Converted {converted} canonical product images to WebP.")
