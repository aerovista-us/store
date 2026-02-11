#!/usr/bin/env python3
"""Direct conversion script for catalog."""

import json
import sys
import os

try:
    import pandas as pd
except ImportError:
    print("Installing pandas and openpyxl...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pandas", "openpyxl", "--quiet"])
    import pandas as pd

input_file = '1149XBNG8C8ZE_catalog-2026-02-11-0606.xlsx'
output_file = 'square_products_2026-02-11.json'

# Write status to file
status_file = open('conversion_status.txt', 'w', encoding='utf-8')

def status(msg):
    print(msg, file=sys.stderr)
    status_file.write(str(msg) + '\n')
    status_file.flush()

status(f"Starting conversion...")
status(f"Input file: {input_file}")
status(f"Output file: {output_file}")

if not os.path.exists(input_file):
    status(f"ERROR: Input file not found: {input_file}")
    status_file.close()
    sys.exit(1)

status(f"Reading {input_file}...")
try:
    df = pd.read_excel(input_file, engine='openpyxl')
    status(f"Successfully read Excel file")
except Exception as e:
    status(f"ERROR reading Excel: {e}")
    import traceback
    status(traceback.format_exc())
    status_file.close()
    sys.exit(1)
print(f"Found {len(df)} rows, {len(df.columns)} columns", file=sys.stderr)
print(f"Columns: {list(df.columns)}", file=sys.stderr)
sys.stderr.flush()

# Normalize column names
df.columns = df.columns.str.strip()
col_map = {}
for col in df.columns:
    col_lower = str(col).lower()
    if 'id' in col_lower and 'product' in col_lower:
        col_map['id'] = col
    elif 'name' in col_lower and 'product' in col_lower:
        col_map['name'] = col
    elif 'color' in col_lower:
        col_map['color'] = col
    elif 'category' in col_lower:
        col_map['category'] = col
    elif 'price' in col_lower and 'variation' not in col_lower:
        col_map['price'] = col
    elif 'visibility' in col_lower:
        col_map['visibility'] = col
    elif 'shipping' in col_lower:
        col_map['shipping_enabled'] = col
    elif 'description' in col_lower and 'text' in col_lower:
        col_map['description_text'] = col
    elif 'description' in col_lower and 'html' in col_lower:
        col_map['description_html'] = col
    elif 'size' in col_lower:
        col_map['size'] = col
    elif 'sku' in col_lower:
        col_map['sku'] = col

print(f"Mapped: {col_map}", file=sys.stderr)
sys.stderr.flush()

products_dict = {}

for idx, row in df.iterrows():
    product_id = str(row.get(col_map.get('id', ''), '')).strip()
    if not product_id or product_id == 'nan':
        continue
    
    if product_id not in products_dict:
        products_dict[product_id] = {
            'id': product_id,
            'name': str(row.get(col_map.get('name', ''), '')).strip(),
            'color': str(row.get(col_map.get('color', ''), '')).strip(),
            'category': str(row.get(col_map.get('category', ''), '')).strip(),
            'price': float(row.get(col_map.get('price', 0), 0) or 0),
            'visibility': str(row.get(col_map.get('visibility', 'visible'), 'visible')).strip(),
            'shipping_enabled': str(row.get(col_map.get('shipping_enabled', 'Y'), 'Y')).strip(),
            'description_text': str(row.get(col_map.get('description_text', ''), '')).strip(),
            'description_html': str(row.get(col_map.get('description_html', ''), '')).strip(),
            'variants': []
        }
    
    size_val = str(row.get(col_map.get('size', ''), '')).strip() if col_map.get('size') else ''
    sku_val = str(row.get(col_map.get('sku', ''), '')).strip() if col_map.get('sku') else ''
    var_price = float(row.get(col_map.get('price', 0), 0) or products_dict[product_id]['price'])
    
    if size_val and size_val != 'nan':
        products_dict[product_id]['variants'].append({
            'size': size_val,
            'sku': sku_val if sku_val != 'nan' else '',
            'price': var_price
        })
    elif not products_dict[product_id]['variants']:
        products_dict[product_id]['variants'].append({
            'size': '',
            'sku': '',
            'price': products_dict[product_id]['price']
        })

products = list(products_dict.values())

output = {
    'generated_from': f'Square catalog export Excel ({os.path.basename(input_file)})',
    'count': len(products),
    'products': products
}

print(f"Writing {len(products)} products to {output_file}...", file=sys.stderr)
sys.stderr.flush()

with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(output, f, indent=2, ensure_ascii=False)

status(f"✓ Successfully converted {len(products)} products")

# Copy to public directories
import shutil
for pub_dir in ['public', 'public/public']:
    if os.path.exists(pub_dir):
        pub_output = os.path.join(pub_dir, os.path.basename(output_file))
        try:
            shutil.copy2(output_file, pub_output)
            status(f"✓ Copied to {pub_output}")
        except Exception as e:
            status(f"ERROR copying to {pub_output}: {e}")

status("DONE")
status_file.close()
