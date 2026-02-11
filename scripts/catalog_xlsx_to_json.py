#!/usr/bin/env python3
"""
Convert Square catalog Excel file to JSON format compatible with storefront.
Usage: python scripts/catalog_xlsx_to_json.py [input.xlsx] [output.json]
"""

import json
import sys
import os
from pathlib import Path

try:
    import openpyxl
except ImportError:
    print("Error: openpyxl not installed. Install with: pip install openpyxl")
    sys.exit(1)

def convert_xlsx_to_json(input_path, output_path):
    """Convert Square catalog xlsx to JSON format."""
    
    print(f"Reading {input_path}...")
    wb = openpyxl.load_workbook(input_path, data_only=True)
    sheet = wb.active
    
    # Read header row
    headers = [cell.value for cell in sheet[1]]
    print(f"Found columns: {headers}")
    
    # Find column indices (case-insensitive matching)
    col_map = {}
    for idx, header in enumerate(headers):
        if header:
            header_lower = str(header).lower()
            if 'id' in header_lower or 'product id' in header_lower:
                col_map['id'] = idx
            elif 'name' in header_lower and 'product' in header_lower:
                col_map['name'] = idx
            elif 'color' in header_lower:
                col_map['color'] = idx
            elif 'category' in header_lower:
                col_map['category'] = idx
            elif 'price' in header_lower and 'variation' not in header_lower:
                col_map['price'] = idx
            elif 'visibility' in header_lower:
                col_map['visibility'] = idx
            elif 'shipping' in header_lower:
                col_map['shipping_enabled'] = idx
            elif 'description' in header_lower and 'text' in header_lower:
                col_map['description_text'] = idx
            elif 'description' in header_lower and 'html' in header_lower:
                col_map['description_html'] = idx
            elif 'size' in header_lower:
                col_map['size'] = idx
            elif 'sku' in header_lower:
                col_map['sku'] = idx
            elif 'variation' in header_lower and 'price' in header_lower:
                col_map['variation_price'] = idx
    
    # Required columns
    required = ['id', 'name']
    missing = [r for r in required if r not in col_map]
    if missing:
        print(f"Warning: Missing required columns: {missing}")
        print(f"Available columns: {headers}")
    
    # Group rows by product ID (variants share same product)
    products_dict = {}
    
    for row_idx, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
        if not row or not row[col_map.get('id', 0)]:
            continue
        
        product_id = str(row[col_map.get('id', 0)]).strip()
        if not product_id:
            continue
        
        # Get or create product
        if product_id not in products_dict:
            products_dict[product_id] = {
                'id': product_id,
                'name': str(row[col_map.get('name', 1)] or '').strip(),
                'color': str(row[col_map.get('color', 2)] or '').strip(),
                'category': str(row[col_map.get('category', 3)] or '').strip(),
                'price': float(row[col_map.get('price', 4)] or 0) if col_map.get('price') else 0,
                'visibility': str(row[col_map.get('visibility', 5)] or 'visible').strip(),
                'shipping_enabled': str(row[col_map.get('shipping_enabled', 6)] or 'Y').strip(),
                'description_text': str(row[col_map.get('description_text', 7)] or '').strip(),
                'description_html': str(row[col_map.get('description_html', 8)] or '').strip(),
                'variants': []
            }
        
        # Add variant if size/SKU info exists
        size_val = str(row[col_map.get('size', -1)] or '').strip() if col_map.get('size') else ''
        sku_val = str(row[col_map.get('sku', -1)] or '').strip() if col_map.get('sku') else ''
        var_price = float(row[col_map.get('variation_price', col_map.get('price', 4))] or products_dict[product_id]['price']) if col_map.get('variation_price') or col_map.get('price') else products_dict[product_id]['price']
        
        if size_val or sku_val:
            products_dict[product_id]['variants'].append({
                'size': size_val,
                'sku': sku_val,
                'price': var_price
            })
        elif not products_dict[product_id]['variants']:
            # If no variants found, create a default one
            products_dict[product_id]['variants'].append({
                'size': '',
                'sku': '',
                'price': products_dict[product_id]['price']
            })
    
    # Convert to list
    products = list(products_dict.values())
    
    # Create output structure
    output = {
        'generated_from': f'Square catalog export Excel ({os.path.basename(input_path)})',
        'count': len(products),
        'products': products
    }
    
    # Write JSON
    print(f"Writing {len(products)} products to {output_path}...")
    os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else '.', exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print(f"✓ Successfully converted {len(products)} products")
    return output_path

if __name__ == '__main__':
    try:
        if len(sys.argv) < 2:
            input_file = '1149XBNG8C8ZE_catalog-2026-02-11-0606.xlsx'
            output_file = 'square_products_2026-02-11.json'
        else:
            input_file = sys.argv[1]
            output_file = sys.argv[2] if len(sys.argv) > 2 else 'square_products_2026-02-11.json'
        
        if not os.path.exists(input_file):
            print(f"Error: Input file not found: {input_file}", file=sys.stderr)
            print(f"Current directory: {os.getcwd()}", file=sys.stderr)
            sys.exit(1)
        
        result = convert_xlsx_to_json(input_file, output_file)
        
        # Also copy to public directories
        import shutil
        public_dirs = ['public', 'public/public']
        for pub_dir in public_dirs:
            if os.path.exists(pub_dir):
                pub_output = os.path.join(pub_dir, os.path.basename(output_file))
                print(f"Copying to {pub_output}...")
                shutil.copy2(output_file, pub_output)
                print(f"✓ Copied to {pub_output}")
        
        print(f"✓ Conversion complete: {output_file}")
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
