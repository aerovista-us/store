param(
    [Parameter(Mandatory = $true)]
    [string]$ProductId,
    [Parameter(Mandatory = $true)]
    [int[]]$ArchiveNumbers,
    [string]$ReviewRoot = "C:\Users\timbr\AppData\Local\Temp\aerovista-incoming-review-20260829"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$catalogPath = Join-Path $repoRoot "store\square_products_latest.json"
$publicCatalogPath = Join-Path $repoRoot "public\store\square_products_latest.json"
$productFolder = Join-Path (Join-Path $repoRoot "store\products") $ProductId
$manifestPath = Join-Path $productFolder "manifest.json"
if (-not (Test-Path -LiteralPath $manifestPath)) { throw "Product manifest not found: $manifestPath" }

function Get-ImageView([string]$name) {
    $lower = $name.ToLowerInvariant()
    if ($lower -match "product-details-2|product-details|zoomed-in") { return @{ Name = "detail"; Base = 50 } }
    if ($lower -match "left-front") { return @{ Name = "left-front"; Base = 35 } }
    if ($lower -match "right-front") { return @{ Name = "right-front"; Base = 45 } }
    if ($lower -match "left-back") { return @{ Name = "left-back"; Base = 47 } }
    if ($lower -match "right-back") { return @{ Name = "right-back"; Base = 48 } }
    if ($lower -match "front-3-|front-2-|front-") { return @{ Name = "front"; Base = 10 } }
    if ($lower -match "back-") { return @{ Name = "back"; Base = 20 } }
    if ($lower -match "left-") { return @{ Name = "left"; Base = 30 } }
    if ($lower -match "right-") { return @{ Name = "right"; Base = 40 } }
    return @{ Name = "alternate"; Base = 60 }
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$catalog = Get-Content -LiteralPath $catalogPath -Raw | ConvertFrom-Json
$product = $catalog.products | Where-Object { $_.id -eq $ProductId } | Select-Object -First 1
if (-not $product) { throw "Catalog product not found: $ProductId" }

$usedHashes = @{}
foreach ($image in @($manifest.images)) {
    if ($image.sourceSha256) { $usedHashes[[string]$image.sourceSha256] = $true }
}

$viewCounters = @{}
foreach ($image in @($manifest.images)) {
    $view = [string]$image.view
    if (-not $view -or $view -eq "hero") { continue }
    if (-not $viewCounters.ContainsKey($view)) { $viewCounters[$view] = 0 }
    $viewCounters[$view] += 1
}

$added = @()
foreach ($archiveNumber in $ArchiveNumbers) {
    $archiveFolder = Join-Path $ReviewRoot "archive-$archiveNumber"
    if (-not (Test-Path -LiteralPath $archiveFolder)) { throw "Extracted archive folder missing: $archiveFolder" }
    foreach ($file in Get-ChildItem -LiteralPath $archiveFolder -File | Sort-Object Name) {
        $hash = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($usedHashes.ContainsKey($hash)) { continue }
        $usedHashes[$hash] = $true
        $viewInfo = Get-ImageView $file.Name
        if (-not $viewCounters.ContainsKey($viewInfo.Name)) { $viewCounters[$viewInfo.Name] = 0 }
        $viewCounters[$viewInfo.Name] += 1
        $targetName = "{0:D2}-{1}-{2:D2}{3}" -f $viewInfo.Base, $viewInfo.Name, $viewCounters[$viewInfo.Name], $file.Extension.ToLowerInvariant()
        $targetPath = Join-Path $productFolder $targetName
        if (Test-Path -LiteralPath $targetPath) { throw "Refusing to overwrite existing gallery image: $targetPath" }
        Copy-Item -LiteralPath $file.FullName -Destination $targetPath
        $added += [pscustomobject]@{
            file = $targetName
            view = $viewInfo.Name
            source = "archive ($archiveNumber).zip"
            original = $file.Name
            sha256 = $hash
        }
    }
}

if (-not $added.Count) { throw "No new unique images found for $ProductId" }
$manifest.images = @(
    @($manifest.images) + $added | Sort-Object @{ Expression = { if ($_.view -eq "hero") { "00" } else { $_.file } } }
)
$manifest.sourceArchives = @(
    @($manifest.sourceArchives) + @($ArchiveNumbers | ForEach-Object { "archive ($($_)).zip" }) |
        Sort-Object -Unique
)
$manifest.originalArchivesPreservedAt = "/store/products/_incoming/"
$manifest | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $manifestPath -Encoding utf8

$gallery = @($manifest.images | ForEach-Object { "/store/products/$ProductId/$($_.file)" })
$product.image = $manifest.hero
$product.images = $gallery
$product.image_manifest = "/store/products/$ProductId/manifest.json"
$json = $catalog | ConvertTo-Json -Depth 100
$json + "`n" | Set-Content -LiteralPath $catalogPath -Encoding utf8
$json + "`n" | Set-Content -LiteralPath $publicCatalogPath -Encoding utf8

[pscustomobject]@{ ProductId = $ProductId; Added = $added.Count; Total = $manifest.images.Count; Archives = ($ArchiveNumbers -join ",") } |
    Format-Table -AutoSize
