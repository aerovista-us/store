#!/usr/bin/env python3
"""Patch nxcore backend .env for production CORS + doc shipping default."""
import re
from pathlib import Path

ENV = Path("/srv/Collab/mini.shops/AV-PNW.com/av_storefront/backend/.env")
text = ENV.read_text(encoding="utf-8")

required_origins = [
    "https://gear.aerovista.us",
    "https://horizon.aerovista.us",
    "https://aerovista-us.github.io",
    "https://aerovista.us",
    "https://www.aerovista.us",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:8009",
    "http://127.0.0.1:8009",
    "http://100.115.9.61:8080",
]

m = re.search(r"^ALLOWED_ORIGINS=(.*)$", text, re.M)
if not m:
    raise SystemExit("ALLOWED_ORIGINS not found")
current = [x.strip() for x in m.group(1).split(",") if x.strip()]
merged = []
seen = set()
for o in current + required_origins:
    if o not in seen:
        seen.add(o)
        merged.append(o)
new_line = "ALLOWED_ORIGINS=" + ",".join(merged)
text = re.sub(r"^ALLOWED_ORIGINS=.*$", new_line, text, count=1, flags=re.M)
ENV.write_text(text, encoding="utf-8")
print("Updated ALLOWED_ORIGINS:", len(merged), "origins")
print("Includes gear.aerovista.us:", "https://gear.aerovista.us" in merged)
print("Includes horizon.aerovista.us:", "https://horizon.aerovista.us" in merged)
