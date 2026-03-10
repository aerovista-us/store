# Remove from git tracking files not needed for the site (they stay on disk).
# Run from repo root: .\scripts\remove-unneeded-from-git.ps1
if ($PSScriptRoot) { Set-Location (Split-Path $PSScriptRoot -Parent) }

$items = @(
    "public",
    "index.temp.save.html",
    "backend/ - Copy.env",
    "AeroVista_Catalog_Console - Copy.zip",
    "square_products_merge_report.csv",
    "square_products_merged_flat.csv",
    "data_quality_reports",
    "backend/sku_map.generated.json",
    "backend/square_products_2026-02-10.json",
    "backend/square_products_2026-02-11.json",
    "AeroVista_Catalog_Console/v1.1/1149XBNG8C8ZE_catalog-2026-02-22-0922.csv",
    "AeroVista_Catalog_Console/v1.1/1149XBNG8C8ZE_catalog-2026-02-22-0922.json",
    "AeroVista_Catalog_Console/ava_catalog-2026-02-22-0922.csv",
    "AeroVista_Catalog_Console/v1.1/archive",
    "AeroVista_Catalog_Console/v1.1/square_products_latest.json",
    "AeroVista_Catalog_Console/square_products_latest.json",
    "trigger helper.sql",
    "backend/api.txt",
    "MASTER_FIX_PLAN.md",
    "1149XBNG8C8ZE_catalog-2026-02-24-0235.csv"
)

$untracked = 0
foreach ($path in $items) {
    $tracked = git ls-files --error-unmatch $path 2>$null
    if (-not $tracked) { continue }
    if (Test-Path $path -PathType Container) {
        git rm -r --cached $path 2>$null
    } else {
        git rm --cached $path 2>$null
    }
    if ($LASTEXITCODE -eq 0) { Write-Host "Untracked: $path"; $untracked++ }
}
if ($untracked -eq 0) {
    Write-Host "No listed paths were tracked (or not a git repo). .gitignore will still prevent adding them in future."
}
Write-Host "Done. To commit: git add .gitignore docs/FILES_REQUIRED_FOR_SITE.md docs/README.md scripts/remove-unneeded-from-git.ps1; git commit -m 'chore: stop tracking files not needed for site'"
