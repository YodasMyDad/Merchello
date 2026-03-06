<#
.SYNOPSIS
    Prepares the Merchello Starter Site template content from Merchello.Site.

.DESCRIPTION
    Copies Merchello.Site into the StarterSite.Template content directory,
    renames it to Merchello.Site.Web, replaces the ProjectReference with a
    PackageReference to Umbraco.Community.Merchello, cleans up dev-only
    config, and optionally packs the template NuGet package.

.PARAMETER Version
    The Merchello NuGet package version to reference. Defaults to "0.0.0-local".

.PARAMETER NoPack
    Skip running dotnet pack (useful for inspecting the content only).

.EXAMPLE
    .\prepare-starter-template.ps1 -Version "1.0.0"
#>
param(
    [string]$Version = "0.0.0-local",
    [switch]$NoPack
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path "$PSScriptRoot/..").Path
$siteDir = Join-Path $repoRoot "src/Merchello.Site"
$templateDir = Join-Path $repoRoot "src/Merchello.StarterSite.Template"
$contentDir = Join-Path $templateDir "content"
$projectDir = Join-Path $contentDir "Merchello.Site.Web"

# Clean and recreate content directory
if (Test-Path $contentDir) {
    Remove-Item $contentDir -Recurse -Force
}
New-Item -ItemType Directory -Path $projectDir -Force | Out-Null

# Exclusion list (matches CI workflow)
$excludeDirs = @("bin", "obj", ".vs", ".template.config", "App_Data")
$excludeFiles = @(
    ".gitignore",
    "appsettings.Development.json",
    "appsettings-schema.json",
    "appsettings-schema.Umbraco.Cms.json",
    "appsettings-schema.usync.json",
    "umbraco-package-schema.json"
)

# Copy Merchello.Site into content/Merchello.Site.Web, excluding unwanted items
$allItems = Get-ChildItem -Path $siteDir -Force
foreach ($item in $allItems) {
    if ($item.PSIsContainer) {
        if ($excludeDirs -contains $item.Name) { continue }
        # Exclude specific subdirectories
        if ($item.Name -eq "umbraco") {
            $destUmbraco = Join-Path $projectDir "umbraco"
            New-Item -ItemType Directory -Path $destUmbraco -Force | Out-Null
            # Copy umbraco but exclude Data/TEMP, Data/*.sqlite.db*, Logs
            Get-ChildItem -Path $item.FullName -Force | ForEach-Object {
                if ($_.Name -eq "Logs") { return }
                if ($_.Name -eq "Data") {
                    $destData = Join-Path $destUmbraco "Data"
                    New-Item -ItemType Directory -Path $destData -Force | Out-Null
                    Get-ChildItem -Path $_.FullName -Force | Where-Object {
                        $_.Name -ne "TEMP" -and
                        $_.Name -notlike "*.sqlite.db" -and
                        $_.Name -notlike "*.sqlite.db-shm" -and
                        $_.Name -notlike "*.sqlite.db-wal"
                    } | ForEach-Object {
                        Copy-Item -Path $_.FullName -Destination $destData -Recurse -Force
                    }
                    return
                }
                Copy-Item -Path $_.FullName -Destination $destUmbraco -Recurse -Force
            }
            continue
        }
        if ($item.Name -eq "wwwroot") {
            $destWwwroot = Join-Path $projectDir "wwwroot"
            New-Item -ItemType Directory -Path $destWwwroot -Force | Out-Null
            Get-ChildItem -Path $item.FullName -Force | Where-Object {
                $_.Name -ne "media"
            } | ForEach-Object {
                Copy-Item -Path $_.FullName -Destination $destWwwroot -Recurse -Force
            }
            continue
        }
        Copy-Item -Path $item.FullName -Destination (Join-Path $projectDir $item.Name) -Recurse -Force
    } else {
        if ($excludeFiles -contains $item.Name) { continue }
        Copy-Item -Path $item.FullName -Destination $projectDir -Force
    }
}

# Copy .template.config to content root
Copy-Item -Path (Join-Path $siteDir ".template.config") -Destination $contentDir -Recurse -Force

# Create .slnx at content root
$slnxContent = @"
<Solution>
  <Project Path="Merchello.Site.Web/Merchello.Site.Web.csproj" />
</Solution>
"@
Set-Content -Path (Join-Path $contentDir "Merchello.Site.slnx") -Value $slnxContent -NoNewline

# Rename .csproj
$oldCsproj = Join-Path $projectDir "Merchello.Site.csproj"
$newCsproj = Join-Path $projectDir "Merchello.Site.Web.csproj"
Rename-Item -Path $oldCsproj -NewName "Merchello.Site.Web.csproj"

# Read and transform the .csproj
$csprojContent = Get-Content -Path $newCsproj -Raw

# Replace ProjectReference with PackageReference
$csprojContent = $csprojContent -replace '<ProjectReference Include="\.\.\\Merchello\\Merchello\.csproj"\s*/>', "<PackageReference Include=""Umbraco.Community.Merchello"" Version=""$Version"" />"

# Remove _ContentIncludedByDefault lines
$csprojContent = ($csprojContent -split "`n" | Where-Object { $_ -notmatch '<_ContentIncludedByDefault Remove=' }) -join "`n"

# Remove empty Folder includes
$csprojContent = ($csprojContent -split "`n" | Where-Object { $_ -notmatch '<Folder Include="Home\\"' }) -join "`n"

# Remove empty ItemGroup blocks
$csprojContent = $csprojContent -replace '(?s)\s*<ItemGroup>\s*</ItemGroup>', ''

Set-Content -Path $newCsproj -Value $csprojContent -NoNewline

# Rename launch profile
$launchSettings = Join-Path $projectDir "Properties/launchSettings.json"
if (Test-Path $launchSettings) {
    $lsContent = Get-Content -Path $launchSettings -Raw
    $lsContent = $lsContent -replace '"Umbraco\.Web\.UI"', '"Merchello.Site.Web"'
    Set-Content -Path $launchSettings -Value $lsContent -NoNewline
}

# Rewrite namespaces in .cs and .cshtml files
Get-ChildItem -Path $projectDir -Recurse -Include "*.cs", "*.cshtml" | ForEach-Object {
    $content = Get-Content -Path $_.FullName -Raw
    $updated = $content -replace 'Merchello\.Site\.', 'Merchello.Site.Web.'
    if ($updated -ne $content) {
        Set-Content -Path $_.FullName -Value $updated -NoNewline
    }
}

# Strip Umbraco instance ID and Unattended section from appsettings.json
$appSettingsPath = Join-Path $projectDir "appsettings.json"
if (Test-Path $appSettingsPath) {
    $config = Get-Content -Path $appSettingsPath -Raw | ConvertFrom-Json
    if ($config.Umbraco.CMS.Global.PSObject.Properties.Name -contains "Id") {
        $config.Umbraco.CMS.Global.PSObject.Properties.Remove("Id")
    }
    if ($config.Umbraco.CMS.PSObject.Properties.Name -contains "Unattended") {
        $config.Umbraco.CMS.PSObject.Properties.Remove("Unattended")
    }
    $config | ConvertTo-Json -Depth 20 | Set-Content -Path $appSettingsPath
}

Write-Host "Template content prepared at: $contentDir" -ForegroundColor Green

# Verify the PackageReference was added
$finalCsproj = Get-Content -Path $newCsproj -Raw
if ($finalCsproj -match "Umbraco.Community.Merchello") {
    Write-Host "PackageReference to Umbraco.Community.Merchello Version=$Version confirmed." -ForegroundColor Green
} else {
    Write-Host "ERROR: PackageReference to Umbraco.Community.Merchello was NOT added!" -ForegroundColor Red
    exit 1
}

if ($finalCsproj -match "ProjectReference") {
    Write-Host "ERROR: ProjectReference still present in .csproj!" -ForegroundColor Red
    exit 1
}

# Pack the template
if (-not $NoPack) {
    Write-Host "Packing template..." -ForegroundColor Cyan
    $templateCsproj = Join-Path $templateDir "Merchello.StarterSite.Template.csproj"
    dotnet pack $templateCsproj -c Release /p:Version="$Version" --output (Join-Path $templateDir "bin/Release")
    if ($LASTEXITCODE -ne 0) {
        Write-Host "dotnet pack failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "Template packed successfully." -ForegroundColor Green
}
