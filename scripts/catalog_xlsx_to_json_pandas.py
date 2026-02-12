#!/usr/bin/env python3
"""
Convert Square catalog Excel file to JSON format using pandas.
"""

import json
import sys
import os
import shutil

try:
    import pandas as pd
except ImportError:
    print("Installing pandas and openpyxl...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pandas", "openpyxl", "--quiet"])
    import pandas as pd

def convert_xlsx_to_json(input_path, output_path):
    """Convert Square catalog xlsx to JSON format."""
    
    import sys
    log_file = open('conversion_debug.log', 'w', encoding='utf-8')
    
    def log(msg):
        print(msg)
        log_file.write(str(msg) + '\n')
        log_file.flush()
    
    try:
        log(f"Reading {input_path}...")
        df = pd.read_excel(input_path, engine='openpyxl')
        
        log(f"Found {len(df)} rows, columns: {list(df.columns)}")
    
    # Normalize column names (case-insensitive)
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
    
        log(f"Mapped columns: {col_map}")
    
    # Group by product ID
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
        
        # Add variant
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
        'generated_from': f'Square catalog export Excel ({os.path.basename(input_path)})',
        'count': len(products),
        'products': products
    }
    
        log(f"Writing {len(products)} products to {output_path}...")
        os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else '.', exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(output, f, indent=2, ensure_ascii=False)
        
        log(f"✓ Successfully converted {len(products)} products")
        log_file.close()
        return output_path
    except Exception as e:
        log(f"ERROR: {e}")
        import traceback
        log(traceback.format_exc())
        log_file.close()
        raise

if __name__ == '__main__':
    input_file = '1149XBNG8C8ZE_catalog-2026-02-11-0606.xlsx'
    output_file = 'square_products_2026-02-11.json'
    
    if not os.path.exists(input_file):
        print(f"Error: Input file not found: {input_file}")
        sys.exit(1)
    
    try:
        convert_xlsx_to_json(input_file, output_file)
        
        # Copy to public directories
        public_dirs = ['public', 'public/public']
        for pub_dir in public_dirs:
            if os.path.exists(pub_dir):
                pub_output = os.path.join(pub_dir, os.path.basename(output_file))
        print(f"Copying to {pub_output}...")
        shutil.copy2(output_file, pub_output)
        print(f"✓ Copied to {pub_output}")
        
        print(f"\n✓ Conversion complete: {output_file}")
        print("See conversion_debug.log for details")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
