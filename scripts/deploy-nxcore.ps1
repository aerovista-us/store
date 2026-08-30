#!/usr/bin/env pwsh
# Deploy catalog console + backend to NXCore from aerovista-store working copy.
# Usage: pwsh -File scripts/deploy-nxcore.ps1 [-ConsoleOnly] [-BackendOnly] [-SkipSync]

param(
    [switch]$ConsoleOnly,
    [switch]$BackendOnly,
    [switch]$SkipSync
)

$ErrorActionPreference = "Stop"
$Repo = $PSScriptRoot | Split-Path -Parent
$DeployHost = "glyph@100.115.9.61"
$BackendRemote = "/srv/Collab/mini.shops/AV-PNW.com/av_storefront/backend"
$StoreRemote = "/srv/Collab/mini.shops/AV-PNW.com/av_storefront"
# Production catalog console (container av-catalog-console, host port 3014)
$ConsoleRemote = "/srv/Collab/mini.shops/AV-PNW.com/av_storefront/AeroVista_Catalog_Console"

Set-Location $Repo

if (-not $SkipSync) {
    Write-Host "[deploy] npm run sync:all ..."
    npm run sync:all
}

function Deploy-Backend {
    Write-Host "[deploy] backend -> $BackendRemote"
    $files = @(
        "app.py",
        "README.md",
        "SOT.json",
        "requirements.txt",
        "docker-compose.yml",
        "docker-compose.local.yml",
        "Dockerfile"
    )
    foreach ($f in $files) {
        $local = Join-Path $Repo "store\backend\$f"
        if (Test-Path $local) {
            scp $local "${DeployHost}:${BackendRemote}/$f"
        }
    }
    if (Test-Path "$Repo\store\backend\workers") {
        scp -r "$Repo\store\backend\workers" "${DeployHost}:${BackendRemote}/"
    }
    if (Test-Path "$Repo\store\backend\scripts") {
        scp -r "$Repo\store\backend\scripts" "${DeployHost}:${BackendRemote}/"
    }
    if (Test-Path "$Repo\store\backend\db") {
        scp -r "$Repo\store\backend\db" "${DeployHost}:${BackendRemote}/"
    }
    $catalog = Join-Path $Repo "store\square_products_latest.json"
    if (Test-Path $catalog) {
        scp $catalog "${DeployHost}:${StoreRemote}/square_products_latest.json"
    }
    ssh $DeployHost "cd $BackendRemote && python3 -m py_compile app.py workers/fulfillment_worker.py 2>/dev/null; docker compose up -d --build av-store-api fulfillment-worker reconcile-worker"
    Write-Host "[deploy] backend containers:"
    ssh $DeployHost "docker compose -f $BackendRemote/docker-compose.yml ps --format '{{.Name}} {{.Status}}' 2>/dev/null | head -5"
    Write-Host "[deploy] api health:"
    curl.exe -s -m 15 "https://api.aerovista.us/api/health"
    Write-Host ""
}

function Deploy-Console {
    Write-Host "[deploy] console -> $ConsoleRemote"
    $consoleFiles = @(
        "aerovista_catalog_console_v2.html",
        "server.js",
        "catalog-console-config.js",
        "catalog_baseline.js",
        "overlay_baseline.js",
        "SOT.json",
        "package.json",
        ".dockerignore",
        "Dockerfile",
        "docker-compose.yml"
    )
    ssh $DeployHost "test -s $ConsoleRemote/.env.console || { echo 'ERROR: missing console-scoped .env.console'; exit 2; }; test `$(stat -c '%a' $ConsoleRemote/.env.console) = 600 || { echo 'ERROR: .env.console must have mode 600'; exit 2; }; stamp=`$(date -u +%Y%m%dT%H%M%SZ); mkdir -p $ConsoleRemote/releases/`$stamp $ConsoleRemote/backups $ConsoleRemote/../store $ConsoleRemote/public; find $ConsoleRemote -maxdepth 1 -type f ! -name '.env.console' -exec cp -a {} $ConsoleRemote/releases/`$stamp/ \;"
    foreach ($f in $consoleFiles) {
        $local = Join-Path $Repo "console\$f"
        if (Test-Path $local) {
            scp $local "${DeployHost}:${ConsoleRemote}/$f"
        }
    }
    if (Test-Path "$Repo\console\vendor") {
        ssh $DeployHost "mkdir -p $ConsoleRemote/vendor"
        scp "$Repo\console\vendor\xlsx.full.min.js" "${DeployHost}:${ConsoleRemote}/vendor/xlsx.full.min.js"
    }
    # Application deployment deliberately leaves the live catalog and overlay
    # untouched. Catalog data changes go through the authenticated console's
    # validation/backup/atomic-write path or the dedicated catalog deploy tool.
    $manifest = Join-Path $Repo "public\build-source-manifest.json"
    if (Test-Path $manifest) {
        scp $manifest "${DeployHost}:${ConsoleRemote}/public/build-source-manifest.json"
    }
    ssh $DeployHost "cd $ConsoleRemote && docker compose config --quiet && docker compose up -d --build"
    Write-Host "[deploy] console health (NXCore loopback):"
    ssh $DeployHost "curl -fsS -m 10 http://127.0.0.1:3014/healthz"
    Write-Host ""
    Write-Host "[deploy] public health and authentication boundary:"
    curl.exe -fsS -m 10 "https://store-console.aerocoreos.com/healthz"
    Write-Host ""
    $status = curl.exe -s -o NUL -w "%{http_code}" -m 10 "https://store-console.aerocoreos.com/"
    if ($status -ne "401") {
        throw "Expected unauthenticated console root to return 401, got $status"
    }
    Write-Host "unauthenticated root: HTTP $status (expected)"
    Write-Host ""
}

if ($ConsoleOnly) {
    Deploy-Console
} elseif ($BackendOnly) {
    Deploy-Backend
} else {
    Deploy-Console
    Deploy-Backend
}

Write-Host "[deploy] done."
