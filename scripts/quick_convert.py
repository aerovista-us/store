import openpyxl
import json
import sys

wb = openpyxl.load_workbook('1149XBNG8C8ZE_catalog-2026-02-11-0606.xlsx', data_only=True)
sheet = wb.active

# Get headers
headers = [str(c.value or '') for c in sheet[1]]
print(f"Found {len(headers)} columns")

# Write headers to file for inspection
with open('xlsx_headers.txt', 'w') as f:
    f.write('\n'.join(headers))

print("Headers written to xlsx_headers.txt")
