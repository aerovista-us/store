import json
import sys

try:
    import pandas as pd
    print("Pandas imported", file=sys.stderr)
except ImportError as e:
    print(f"Pandas import failed: {e}", file=sys.stderr)
    sys.exit(1)

try:
    df = pd.read_excel('1149XBNG8C8ZE_catalog-2026-02-11-0606.xlsx', engine='openpyxl')
    result = {
        'success': True,
        'rows': len(df),
        'columns': list(df.columns),
        'sample_row': df.iloc[0].to_dict() if len(df) > 0 else {}
    }
except Exception as e:
    result = {
        'success': False,
        'error': str(e)
    }

with open('test_excel_result.json', 'w') as f:
    json.dump(result, f, indent=2, default=str)

print("Test complete - see test_excel_result.json")
