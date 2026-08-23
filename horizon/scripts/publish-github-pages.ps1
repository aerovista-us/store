[CmdletBinding()]
param(
    [string]$Repository = "https://github.com/aerovista-us/horizon-storefront.git",
    [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"

$HorizonRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$RepoRoot = [System.IO.Path]::GetFullPath((Join-Path $HorizonRoot ".."))
$DistRoot = [System.IO.Path]::GetFullPath((Join-Path $HorizonRoot "dist"))
$PublishParent = [System.IO.Path]::GetFullPath((Join-Path $HorizonRoot ".publish-work"))
$PublishRoot = [System.IO.Path]::GetFullPath((Join-Path $PublishParent "horizon-storefront"))

if (-not $DistRoot.StartsWith($HorizonRoot + [System.IO.Path]::DirectorySeparatorChar)) {
    throw "Unsafe Horizon dist path: $DistRoot"
}
if (-not $PublishRoot.StartsWith($PublishParent + [System.IO.Path]::DirectorySeparatorChar)) {
    throw "Unsafe publish path: $PublishRoot"
}

Push-Location $RepoRoot
try {
    npm run build:horizon-pages
    if ($LASTEXITCODE -ne 0) { throw "Horizon public build failed" }
}
finally {
    Pop-Location
}

New-Item -ItemType Directory -Path $PublishParent -Force | Out-Null

if (Test-Path -LiteralPath $PublishRoot) {
    if (-not (Test-Path -LiteralPath (Join-Path $PublishRoot ".git"))) {
        throw "Publish workspace exists but is not a Git repository: $PublishRoot"
    }
    $SafeDirectory = "safe.directory=$PublishRoot"
    git -c $SafeDirectory -C $PublishRoot pull --ff-only origin $Branch
    if ($LASTEXITCODE -ne 0) { throw "Could not update $PublishRoot" }
}
else {
    git clone --branch $Branch $Repository $PublishRoot
    if ($LASTEXITCODE -ne 0) { throw "Could not clone $Repository" }
}

$SiteRoot = [System.IO.Path]::GetFullPath((Join-Path $PublishRoot "site"))
if (-not $SiteRoot.StartsWith($PublishRoot + [System.IO.Path]::DirectorySeparatorChar)) {
    throw "Unsafe site path: $SiteRoot"
}
if (Test-Path -LiteralPath $SiteRoot) {
    Remove-Item -LiteralPath $SiteRoot -Recurse -Force
}
New-Item -ItemType Directory -Path $SiteRoot -Force | Out-Null
Get-ChildItem -LiteralPath $DistRoot -Recurse -Force |
    Where-Object { -not $_.PSIsContainer } |
    ForEach-Object {
        $RelativePath = [System.IO.Path]::GetRelativePath($DistRoot, $_.FullName)
        $Destination = Join-Path $SiteRoot $RelativePath
        $DestinationDirectory = Split-Path -Parent $Destination

        New-Item -ItemType Directory -Path $DestinationDirectory -Force | Out-Null
        Copy-Item -LiteralPath $_.FullName -Destination $Destination -Force
    }

$WorkflowRoot = Join-Path $PublishRoot ".github\workflows"
New-Item -ItemType Directory -Path $WorkflowRoot -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $HorizonRoot "deploy\deploy-pages.yml") `
    -Destination (Join-Path $WorkflowRoot "deploy-pages.yml") -Force
Copy-Item -LiteralPath (Join-Path $HorizonRoot "deploy\PAGES_REPOSITORY_README.md") `
    -Destination (Join-Path $PublishRoot "README.md") -Force

Push-Location $PublishRoot
try {
    $SafeDirectory = "safe.directory=$PublishRoot"
    git -c $SafeDirectory add --all
    if ($LASTEXITCODE -ne 0) { throw "Git add failed" }
    $StatusLines = git -c $SafeDirectory status --porcelain
    if ($LASTEXITCODE -ne 0) { throw "Git status failed" }
    if (-not $StatusLines) {
        Write-Host "Horizon Pages repository is already current."
        exit 0
    }
    git -c $SafeDirectory commit -m "Publish Horizon storefront"
    if ($LASTEXITCODE -ne 0) { throw "Git commit failed" }
    git -c $SafeDirectory push origin $Branch
    if ($LASTEXITCODE -ne 0) { throw "Git push failed" }
}
finally {
    Pop-Location
}
