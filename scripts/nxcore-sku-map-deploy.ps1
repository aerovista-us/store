#!/usr/bin/env pwsh
# Build catalog SKU map and deploy to nxcore av-backend.
# Usage: npm run nxcore:sku-map

$ErrorActionPreference = "Stop"
$Repo = $PSScriptRoot | Split-Path -Parent
$Host = "glyph@100.115.9.61"
$Backend = "/srv/Collab/mini.shops/AV-PNW.com/av_storefront/backend"

Set-Location $Repo
Write-Host "[nxcore:sku-map] build from catalog..."
node scripts/build-cart-sku-map.mjs

Write-Host "[nxcore:sku-map] upload + patch .env..."
scp "$Repo\store\backend\sku_map.generated.json" "${Host}:/tmp/sku_map.generated.json"
scp "$Repo\scripts\deploy-sku-map-nxcore.py" "${Host}:/tmp/deploy-sku-map-nxcore.py"
ssh $Host "python3 /tmp/deploy-sku-map-nxcore.py /tmp/sku_map.generated.json && cd $Backend && docker compose up -d av-store-api"

Write-Host "[nxcore:sku-map] audit checkout keys..."
npm run audit:checkout-keys
Write-Host "[nxcore:sku-map] done."
