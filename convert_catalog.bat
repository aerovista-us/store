@echo off
echo Converting catalog...
python convert_catalog.py
echo.
echo Checking result...
python -c "import json; d=json.load(open('square_products_latest.json','r',encoding='utf-8')); print('Products:', d.get('count',0))"
pause
