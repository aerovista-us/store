#!/usr/bin/env python3
from __future__ import annotations
import argparse
import io
import json
from pathlib import Path
from typing import Dict, Any, List

from PIL import Image, ImageFilter
from rembg import remove
from tqdm import tqdm

IMG_EXTS = {".png", ".jpg", ".jpeg", ".webp"}

def iter_images(in_dir: Path) -> List[Path]:
    return sorted([p for p in in_dir.iterdir() if p.is_file() and p.suffix.lower() in IMG_EXTS])

def trim_transparent(img: Image.Image) -> Image.Image:
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    alpha = img.split()[-1]
    bbox = alpha.getbbox()
    return img if not bbox else img.crop(bbox)

def pad_to_square(img: Image.Image, bg=(0, 0, 0, 0)) -> Image.Image:
    w, h = img.size
    side = max(w, h)
    out = Image.new("RGBA", (side, side), bg)
    out.paste(img, ((side - w) // 2, (side - h) // 2), img)
    return out

def matte_expand_alpha(img: Image.Image, px: int) -> Image.Image:
    if px <= 0:
        return img
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    r, g, b, a = img.split()
    a2 = a.filter(ImageFilter.MaxFilter(size=px * 2 + 1))
    return Image.merge("RGBA", (r, g, b, a2))

def remove_bg_bytes(data: bytes) -> Image.Image:
    out = remove(data)  # bytes for PNG with alpha
    return Image.open(io.BytesIO(out)).convert("RGBA")

def main():
    ap = argparse.ArgumentParser(description="Bulk remove image backgrounds using rembg and write transparent PNGs.")
    ap.add_argument("--in", dest="in_dir", default="in")
    ap.add_argument("--out", dest="out_dir", default="out")
    ap.add_argument("--square", action="store_true")
    ap.add_argument("--size", type=int, default=0)
    ap.add_argument("--trim", action="store_true")
    ap.add_argument("--matte", type=int, default=0)
    ap.add_argument("--overwrite", action="store_true")
    args = ap.parse_args()

    in_dir = Path(args.in_dir).resolve()
    out_dir = Path(args.out_dir).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    files = iter_images(in_dir)
    if not files:
        raise SystemExit(f"No images found in {in_dir} (supported: {', '.join(sorted(IMG_EXTS))})")

    report: Dict[str, Any] = {
        "in_dir": str(in_dir),
        "out_dir": str(out_dir),
        "count": len(files),
        "options": vars(args),
        "items": []
    }

    for p in tqdm(files, desc="Removing background"):
        out_path = out_dir / (p.stem + ".png")
        if out_path.exists() and not args.overwrite:
            report["items"].append({"input": str(p), "output": str(out_path), "status": "skipped_exists"})
            continue
        try:
            img = remove_bg_bytes(p.read_bytes())
            if args.matte > 0:
                img = matte_expand_alpha(img, args.matte)
            if args.trim:
                img = trim_transparent(img)
            if args.square:
                img = pad_to_square(img)
            if args.size and args.size > 0:
                img = img.resize((args.size, args.size), resample=Image.LANCZOS)
            img.save(out_path, format="PNG", optimize=True)
            report["items"].append({"input": str(p), "output": str(out_path), "status": "ok", "out_size": img.size})
        except Exception as e:
            report["items"].append({"input": str(p), "output": str(out_path), "status": "error", "error": repr(e)})

    (out_dir / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"✅ Done. Outputs in: {out_dir}")
    print(f"🧾 Report: {out_dir / 'report.json'}")

if __name__ == "__main__":
    main()
