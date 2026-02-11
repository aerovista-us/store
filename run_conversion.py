import subprocess
import sys
import os

# Run the conversion and capture output
result = subprocess.run(
    [sys.executable, 'convert_catalog.py'],
    capture_output=True,
    text=True,
    encoding='utf-8'
)

# Write all output to a file
with open('conversion_result.txt', 'w', encoding='utf-8') as f:
    f.write("STDOUT:\n")
    f.write(result.stdout)
    f.write("\n\nSTDERR:\n")
    f.write(result.stderr)
    f.write(f"\n\nReturn code: {result.returncode}\n")

# Also check if JSON was created/updated
if os.path.exists('square_products_2026-02-11.json'):
    import json
    with open('square_products_2026-02-11.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    with open('conversion_result.txt', 'a', encoding='utf-8') as f:
        f.write(f"\nJSON file status:\n")
        f.write(f"  Count: {data.get('count', 0)}\n")
        f.write(f"  Products: {len(data.get('products', []))}\n")
        f.write(f"  Generated from: {data.get('generated_from', 'unknown')}\n")

print("Conversion result written to conversion_result.txt")
