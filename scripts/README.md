# Catalog Conversion Scripts

## Converting Excel Catalog to JSON

To convert the Square catalog Excel file (`1149XBNG8C8ZE_catalog-2026-02-11-0606.xlsx`) to JSON format:

### Option 1: Using pandas (Recommended)

```bash
python scripts/catalog_xlsx_to_json_pandas.py
```

This will:
- Read the Excel file
- Convert it to `square_products_2026-02-11.json`
- Copy the JSON to `public/` and `public/public/` directories

### Option 2: Using openpyxl

```bash
python scripts/catalog_xlsx_to_json.py 1149XBNG8C8ZE_catalog-2026-02-11-0606.xlsx square_products_2026-02-11.json
```

### Requirements

Install required packages:
```bash
pip install pandas openpyxl
```

Or:
```bash
pip install openpyxl
```

### Expected Output Format

The JSON file should match the structure of `square_products_2026-02-10.json`:
- Top-level: `generated_from`, `count`, `products[]`
- Each product: `id`, `name`, `color`, `category`, `price`, `visibility`, `shipping_enabled`, `description_text`, `description_html`, `variants[]` with `size`, `sku`, `price`

### Troubleshooting

If the script doesn't produce output:
1. Check that the Excel file exists in the project root
2. Verify Python can import `openpyxl` or `pandas`
3. Check the Excel file structure matches expected columns (id, name, color, category, price, variants with size/sku)
