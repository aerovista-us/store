from app import build_line_items_from_cart

tests = [
    ("shadow-pants", "Default__M", "AADW36VFWTN37URWPN6EHEXT"),
    ("ghost-shorts", "Default__M", "ACBTP7B44ED7KFPFEETJSMBK"),
    ("glitch-hoodie", "Default__M", "T2MH2Z6XNCZC4LPVSXZ7WX4B"),
]
for label, sku, vid in tests:
    li = build_line_items_from_cart([{"sku": sku, "variationId": vid, "qty": 1}], "USD")
    row = li[0]
    ok = row.get("catalog_object_id") == vid
    print(label, "OK" if ok else "FAIL", row.get("name", "")[:50], row.get("catalog_object_id"))
