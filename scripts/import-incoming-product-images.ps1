param(
    [string]$ReviewRoot = "C:\Users\timbr\AppData\Local\Temp\aerovista-incoming-review-20260829",
    [string]$PreviousProductRoot = ""
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$catalogPath = Join-Path $repoRoot "store\square_products_latest.json"
$publicCatalogPath = Join-Path $repoRoot "public\store\square_products_latest.json"
$legacyImageRoot = Join-Path $repoRoot "store\img"
$productRoot = Join-Path $repoRoot "store\products"

$imports = @(
    @{ ProductId = "aerovista-apex-relic-playing-cards"; Archives = @(8); DuplicateArchives = @(9); Hero = $null },
    @{ ProductId = "aerovista-av-07-grid-pocket-tee-slate-gray"; Archives = @(10); DuplicateArchives = @(); Hero = $null },
    @{ ProductId = "docklife-drip-osprey-rope-cap"; Archives = @(11); DuplicateArchives = @(); Hero = $null },
    @{ ProductId = "shadow-wear-tactical-bomber-jacket-summit-edition"; Archives = @(12); DuplicateArchives = @(); Hero = $null },
    @{ ProductId = "shadow-wear"; Archives = @(7, 13); DuplicateArchives = @(14); Hero = $null },
    @{ ProductId = "aerovista-glyph-field-long-sleeve-tee-archive-grid"; Archives = @(15); DuplicateArchives = @(); Hero = "unisex-long-sleeve-tee-heather-navy-front-6a90a1156e530.png" },
    @{ ProductId = "can-cooler"; Archives = @(16); DuplicateArchives = @(); Hero = $null },
    @{ ProductId = "shadow-pants"; Archives = @(17); DuplicateArchives = @(); Hero = $null },
    @{ ProductId = "aerovista-shadow-pattern-hoodie"; Archives = @(18); DuplicateArchives = @(19); Hero = $null },
    @{ ProductId = "burst-lens-lumina-pullover-hoodie"; Archives = @(20); DuplicateArchives = @(); Hero = "unisex-premium-mid-weight-hoodie-black-front-6a90aadc83190.png" },
    @{ ProductId = "aerovista-apex-signal-sweatshirt"; Archives = @(21); DuplicateArchives = @(); Hero = $null },
    @{ ProductId = "men-s-ghost-shorts"; Archives = @(22); DuplicateArchives = @(); Hero = $null },
    @{ ProductId = "shadow-wear-ghost-ridge"; Archives = @(23, 26); DuplicateArchives = @(); Hero = $null },
    @{ ProductId = "aerovista-core-hoodie"; Archives = @(24); DuplicateArchives = @(); Hero = $null },
    @{ ProductId = "aerovista-core-tee"; Archives = @(25); DuplicateArchives = @(); Hero = $null },
    @{ ProductId = "neon-billygoat-pullover-hoodie"; Archives = @(27, 56); DuplicateArchives = @(28); Hero = $null },
    @{ ProductId = "aerovista-apex-pattern-print-swimsuit-one-piece"; Archives = @(29); DuplicateArchives = @(); Hero = $null },
    @{ ProductId = "aerovista-division-hoodie"; Archives = @(30); DuplicateArchives = @(); Hero = $null },
    @{ ProductId = "aerovista-the-blue-witness-urban-hoodie-black"; Archives = @(31); DuplicateArchives = @(45); Hero = $null },
    @{ ProductId = "aerovista-retro-trucker-hat-orbit-a-gray"; Archives = @(32); DuplicateArchives = @(); Hero = $null },
    @{ ProductId = "powder-peaks-v2-premium-pullover-hoodie-black"; Archives = @(33); DuplicateArchives = @(); Hero = $null },
    @{ ProductId = "aerovista-apex-glitch-tee-black"; Archives = @(34, 46); DuplicateArchives = @(); Hero = $null },
    @{ ProductId = "aerovista-apex-camo-flexfit-hat"; Archives = @(35); DuplicateArchives = @(); Hero = $null },
    @{ ProductId = "aerovista-apex-mark-draft-series-s01-sticker"; Archives = @(36); DuplicateArchives = @(); Hero = $null },
    @{ ProductId = "vespra-moonscript-hoodie"; Archives = @(37); DuplicateArchives = @(); Hero = "unisex-premium-pullover-hoodie-black-front-6a9350fcdfae3.png" },
    @{ ProductId = "aerovista-apex-pattern-skater-dress"; Archives = @(38); DuplicateArchives = @(); Hero = $null },
    @{ ProductId = "architect-field-issue-tee-black"; Archives = @(39); DuplicateArchives = @(40); Hero = $null },
    @{ ProductId = "aerovista-apex-glitch-premium-pullover-hoodie-black"; Archives = @(41); DuplicateArchives = @(); Hero = $null },
    @{ ProductId = "aerovista-apex-flexfit-structured-cap-black"; Archives = @(42); DuplicateArchives = @(); Hero = $null },
    @{ ProductId = "aerovista-apex-pattern-hoodie"; Archives = @(43); DuplicateArchives = @(); Hero = $null },
    @{ ProductId = "aerovista-apex-pattern-bomber-jacket"; Archives = @(44); DuplicateArchives = @(); Hero = $null },
    @{ ProductId = "glitch-drone-aerovista-hoodie-black"; Archives = @(47); DuplicateArchives = @(); Hero = $null },
    @{ ProductId = "aerovista-apex-mesh-trucker-cap"; Archives = @(48); DuplicateArchives = @(); Hero = $null; ReviewFolders = @("archive-48"); SourceLabels = @("archive (48).zip") },
    @{ ProductId = "echoverse-signal-dial-chest-emblem-hoodie"; Archives = @(48); DuplicateArchives = @(); Hero = $null; ReviewFolders = @("archive-48-inner-26"); SourceLabels = @("archive (48).zip / archive (26).zip") },
    @{ ProductId = "circuit-bloom-nexus-techworks-pullover-hoodie"; Archives = @(48); DuplicateArchives = @(); Hero = $null; ReviewFolders = @("archive-48-inner-27"); SourceLabels = @("archive (48).zip / archive (27).zip") },
    @{ ProductId = "drafted-a-premium-sweatshirt"; Archives = @(48); DuplicateArchives = @(); Hero = $null; ReviewFolders = @("archive-48-inner-28"); SourceLabels = @("archive (48).zip / archive (28).zip") },
    @{ ProductId = "aerovista-apex-draft-full-zip-hoodie-black"; Archives = @(48); DuplicateArchives = @(); Hero = $null; ReviewFolders = @("archive-48-inner-29"); SourceLabels = @("archive (48).zip / archive (29).zip") },
    @{ ProductId = "aerovista-apex-draft-pullover-hoodie-black"; Archives = @(48); DuplicateArchives = @(52); Hero = $null; ReviewFolders = @("archive-48-inner-30"); SourceLabels = @("archive (48).zip / archive (30).zip") },
    @{ ProductId = "founders-mark-full-zip-hoodie"; Archives = @(49, 51); DuplicateArchives = @(); Hero = $null },
    @{ ProductId = "night-ranger-bear-pullover-hoodie"; Archives = @(50); DuplicateArchives = @(); Hero = $null },
    @{ ProductId = "echoverse-frost-circuit-pullover-hoodie"; Archives = @(53); DuplicateArchives = @(); Hero = $null },
    @{ ProductId = "holographic-stickers"; Archives = @(54); DuplicateArchives = @(); Hero = $null },
    @{ ProductId = "billygoat-sticker"; Archives = @(55); DuplicateArchives = @(); Hero = $null },
    @{ ProductId = "aerovista-wave-mark-full-zip-hoodie-white"; Archives = @(57); DuplicateArchives = @(); Hero = $null }
)

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

$catalog = Get-Content -LiteralPath $catalogPath -Raw | ConvertFrom-Json
$importedProducts = @()

foreach ($import in $imports) {
    $product = $catalog.products | Where-Object { $_.id -eq $import.ProductId } | Select-Object -First 1
    if (-not $product) { throw "Catalog product not found: $($import.ProductId)" }

    $destination = Join-Path $productRoot $import.ProductId
    $existingManifestPath = Join-Path $destination "manifest.json"
    if (Test-Path -LiteralPath $existingManifestPath) {
        $existingManifest = Get-Content -LiteralPath $existingManifestPath -Raw | ConvertFrom-Json
        $requestedArchives = @($import.Archives | ForEach-Object { "archive ($($_)).zip" })
        $missingArchives = @($requestedArchives | Where-Object { $_ -notin @($existingManifest.sourceArchives) })
        if (-not $missingArchives.Count) {
            $importedProducts += [pscustomobject]@{
                ProductId = $import.ProductId
                Images = @($existingManifest.images).Count
                Archives = ($import.Archives -join ",")
                Duplicates = ($import.DuplicateArchives -join ",")
                Status = "already imported"
            }
            continue
        }
        throw "Existing manifest for $($import.ProductId) does not contain requested archive(s): $($missingArchives -join ', ')"
    }
    New-Item -ItemType Directory -Path $destination -Force | Out-Null

    $gallery = @()
    $manifestImages = @()
    $usedHashes = @{}

    $legacyImage = [string]$product.image
    if ($legacyImage) {
        if ($legacyImage.StartsWith("/store/products/") -and $PreviousProductRoot) {
            $legacyFile = Split-Path -Leaf $legacyImage
            $legacyPath = Join-Path (Join-Path $PreviousProductRoot $import.ProductId) $legacyFile
        } else {
            $legacyPath = Join-Path $legacyImageRoot ($legacyImage -replace "^/", "" -replace "/", "\")
        }
        if (-not (Test-Path -LiteralPath $legacyPath)) { throw "Legacy catalog image missing: $legacyPath" }
        $extension = [IO.Path]::GetExtension($legacyPath).ToLowerInvariant()
        $heroName = "01-hero$extension"
        $heroPath = Join-Path $destination $heroName
        Copy-Item -LiteralPath $legacyPath -Destination $heroPath -Force
        $heroUrl = "/store/products/$($import.ProductId)/$heroName"
        $gallery += $heroUrl
        $manifestImages += [ordered]@{
            file = $heroName
            view = "hero"
            source = "legacy-catalog-image"
            original = $legacyImage
            sha256 = (Get-FileHash -LiteralPath $heroPath -Algorithm SHA256).Hash.ToLowerInvariant()
        }
        $usedHashes[$manifestImages[-1].sha256] = $true
    }

    $candidates = @()
    $reviewSources = @()
    if ($import.ReviewFolders) {
        for ($sourceIndex = 0; $sourceIndex -lt $import.ReviewFolders.Count; $sourceIndex += 1) {
            $reviewSources += [pscustomobject]@{
                Folder = [string]$import.ReviewFolders[$sourceIndex]
                Label = [string]$import.SourceLabels[$sourceIndex]
            }
        }
    } else {
        foreach ($archiveNumber in $import.Archives) {
            $reviewSources += [pscustomobject]@{
                Folder = "archive-$archiveNumber"
                Label = "archive ($archiveNumber).zip"
            }
        }
    }
    foreach ($reviewSource in $reviewSources) {
        $archiveFolder = Join-Path $ReviewRoot $reviewSource.Folder
        if (-not (Test-Path -LiteralPath $archiveFolder)) { throw "Extracted archive folder missing: $archiveFolder" }
        foreach ($file in Get-ChildItem -LiteralPath $archiveFolder -File | Where-Object { $_.Extension.ToLowerInvariant() -in @(".png", ".jpg", ".jpeg", ".webp") } | Sort-Object Name) {
            $hash = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
            if ($usedHashes.ContainsKey($hash)) { continue }
            $usedHashes[$hash] = $true
            $view = Get-ImageView $file.Name
            $candidates += [pscustomobject]@{
                Archive = $reviewSource.Label
                File = $file
                Hash = $hash
                View = $view.Name
                Base = $view.Base
            }
        }
    }

    if (-not $gallery.Count -and $import.Hero) {
        $heroCandidate = $candidates | Where-Object { $_.File.Name -eq $import.Hero } | Select-Object -First 1
        if (-not $heroCandidate) { throw "Configured hero not found for $($import.ProductId): $($import.Hero)" }
        $extension = $heroCandidate.File.Extension.ToLowerInvariant()
        $heroName = "01-hero$extension"
        Copy-Item -LiteralPath $heroCandidate.File.FullName -Destination (Join-Path $destination $heroName) -Force
        $heroUrl = "/store/products/$($import.ProductId)/$heroName"
        $gallery += $heroUrl
        $manifestImages += [ordered]@{
            file = $heroName
            view = "hero"
            source = $heroCandidate.Archive
            original = $heroCandidate.File.Name
            sha256 = $heroCandidate.Hash
        }
        $candidates = @($candidates | Where-Object { $_.Hash -ne $heroCandidate.Hash })
    }

    $viewCounters = @{}
    foreach ($candidate in $candidates | Sort-Object Base, @{ Expression = { $_.File.Name } }) {
        if (-not $viewCounters.ContainsKey($candidate.View)) { $viewCounters[$candidate.View] = 0 }
        $viewCounters[$candidate.View] += 1
        $sequence = $candidate.Base
        $extension = $candidate.File.Extension.ToLowerInvariant()
        $targetName = "{0:D2}-{1}-{2:D2}{3}" -f $sequence, $candidate.View, $viewCounters[$candidate.View], $extension
        Copy-Item -LiteralPath $candidate.File.FullName -Destination (Join-Path $destination $targetName) -Force
        $url = "/store/products/$($import.ProductId)/$targetName"
        $gallery += $url
        $manifestImages += [ordered]@{
            file = $targetName
            view = $candidate.View
            source = $candidate.Archive
            original = $candidate.File.Name
            sha256 = $candidate.Hash
        }
    }

    if (-not $gallery.Count) { throw "No images produced for $($import.ProductId)" }

    $manifest = [ordered]@{
        schemaVersion = 1
        productId = $import.ProductId
        productName = $product.name
        hero = $gallery[0]
        images = $manifestImages
        sourceArchives = @($import.Archives | ForEach-Object { "archive ($($_)).zip" })
        duplicateArchives = @($import.DuplicateArchives | ForEach-Object { "archive ($($_)).zip" })
        originalArchivesPreservedAt = "/store/products/_incoming/"
    }
    $manifest | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $destination "manifest.json") -Encoding utf8

    $product.image = $gallery[0]
    if ($product.PSObject.Properties.Name -contains "images") {
        $product.images = $gallery
    } else {
        $product | Add-Member -NotePropertyName images -NotePropertyValue $gallery
    }
    if ($product.PSObject.Properties.Name -contains "image_manifest") {
        $product.image_manifest = "/store/products/$($import.ProductId)/manifest.json"
    } else {
        $product | Add-Member -NotePropertyName image_manifest -NotePropertyValue "/store/products/$($import.ProductId)/manifest.json"
    }

    $importedProducts += [pscustomobject]@{
        ProductId = $import.ProductId
        Images = $gallery.Count
        Archives = ($import.Archives -join ",")
        Duplicates = ($import.DuplicateArchives -join ",")
        Status = "imported"
    }
}

$json = $catalog | ConvertTo-Json -Depth 100
$json + "`n" | Set-Content -LiteralPath $catalogPath -Encoding utf8
$json + "`n" | Set-Content -LiteralPath $publicCatalogPath -Encoding utf8

$importedProducts | Format-Table -AutoSize
