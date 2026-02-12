import openpyxl
import json

wb = openpyxl.load_workbook('1149XBNG8C8ZE_catalog-2026-02-11-0606.xlsx', data_only=True)
sheet = wb.active

# Get headers
headers = [cell.value for cell in sheet[1]]
print("Headers:", headers)

# Get first few data rows
data_rows = []
for i, row in enumerate(sheet.iter_rows(min_row=2, max_row=5, values_only=True)):
    data_rows.append([cell for cell in row])

with open('xlsx_inspect.json', 'w') as f:
    json.dump({'headers': headers, 'sample_rows': data_rows}, f, indent=2, default=str)

print("Inspection complete - see xlsx_inspect.json")
