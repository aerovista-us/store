param(
    [string]$IncomingFolder = "",
    [string]$CompletedFolder = ""
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$productRoot = Join-Path $repoRoot "store\products"
$publicProductRoot = Join-Path $repoRoot "public\store\products"
if (-not $IncomingFolder) { $IncomingFolder = Join-Path $publicProductRoot "_incoming" }
if (-not $CompletedFolder) { $CompletedFolder = Join-Path $publicProductRoot "_completed" }

$resolvedPublicRoot = [IO.Path]::GetFullPath($publicProductRoot).TrimEnd('\') + '\'
$resolvedIncoming = [IO.Path]::GetFullPath($IncomingFolder).TrimEnd('\') + '\'
$resolvedCompleted = [IO.Path]::GetFullPath($CompletedFolder).TrimEnd('\') + '\'
if (-not $resolvedIncoming.StartsWith($resolvedPublicRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Incoming folder is outside the public product workspace: $IncomingFolder"
}
if (-not $resolvedCompleted.StartsWith($resolvedPublicRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Completed folder is outside the public product workspace: $CompletedFolder"
}
if (-not (Test-Path -LiteralPath $IncomingFolder)) { throw "Incoming folder not found: $IncomingFolder" }
New-Item -ItemType Directory -Path $CompletedFolder -Force | Out-Null

$manifests = @(Get-ChildItem -LiteralPath $productRoot -Filter manifest.json -Recurse -File)
$archiveNames = @(
    foreach ($manifestPath in $manifests) {
        $manifest = Get-Content -LiteralPath $manifestPath.FullName -Raw | ConvertFrom-Json
        @($manifest.sourceArchives) + @($manifest.duplicateArchives)
    }
) | Where-Object { $_ } | Sort-Object -Unique

$results = @()
foreach ($archiveName in $archiveNames) {
    $source = Join-Path $IncomingFolder $archiveName
    $destination = Join-Path $CompletedFolder $archiveName
    if (Test-Path -LiteralPath $source) {
        if (Test-Path -LiteralPath $destination) {
            throw "Completed archive already exists; refusing to overwrite: $destination"
        }
        Move-Item -LiteralPath $source -Destination $destination
        $results += [pscustomobject]@{ Archive = $archiveName; Status = "moved" }
    } elseif (Test-Path -LiteralPath $destination) {
        $results += [pscustomobject]@{ Archive = $archiveName; Status = "already completed" }
    } else {
        throw "Referenced archive is missing from both staging and completed storage: $archiveName"
    }
}

foreach ($manifestPath in $manifests) {
    $manifest = Get-Content -LiteralPath $manifestPath.FullName -Raw | ConvertFrom-Json
    $manifest.originalArchivesPreservedAt = "/store/products/_completed/"
    $manifest | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $manifestPath.FullName -Encoding utf8
}

$results | Format-Table -AutoSize
Write-Host "Completed archives: $($archiveNames.Count)"
Write-Host "Remaining in staging: $(@(Get-ChildItem -LiteralPath $IncomingFolder -Filter *.zip -File).Count)"
