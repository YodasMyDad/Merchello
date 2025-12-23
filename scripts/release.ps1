# PowerShell script to release new NuGet packages for Merchello

param(
    [string]$NewVersion
)

# Function to get current version from a .csproj file
function Get-CurrentVersion {
    param([string]$CsprojPath)

    if (!(Test-Path $CsprojPath)) {
        Write-Error "Project file not found: $CsprojPath"
        exit 1
    }

    $xml = [xml](Get-Content $CsprojPath)
    $versionNode = $xml.Project.PropertyGroup.Version | Where-Object { $_ -ne $null } | Select-Object -First 1
    if ($versionNode) {
        return $versionNode
    } else {
        Write-Error "Version not found in $CsprojPath"
        exit 1
    }
}

# Function to update version in a .csproj file
function Update-VersionInCsproj {
    param([string]$CsprojPath, [string]$NewVersion)

    Write-Host "Updating version in $CsprojPath to $NewVersion..."

    $content = Get-Content $CsprojPath -Raw

    # Update the Version tag
    $content = $content -replace '<Version>.*?</Version>', "<Version>$NewVersion</Version>"

    Set-Content -Path $CsprojPath -Value $content -Encoding UTF8
}

# Function to run dotnet build
function Invoke-ReleaseBuild {
    Write-Host "Running dotnet build src/Merchello.sln -c Release..."
    Push-Location "src"
    try {
        dotnet build Merchello.sln -c Release

        if ($LASTEXITCODE -ne 0) {
            Write-Error "Build failed with exit code $LASTEXITCODE"
            exit 1
        }

        Write-Host "Build completed successfully!"
    }
    finally {
        Pop-Location
    }
}

# Function to ensure NugetSource folder exists
function Ensure-NugetSourceFolder {
    $nugetSourcePath = "NugetSource"

    if (!(Test-Path $nugetSourcePath)) {
        Write-Host "Creating NugetSource folder..."
        New-Item -Path $nugetSourcePath -ItemType Directory | Out-Null
    }
}

# Main script logic
try {
    # Get the repository root (parent of the scripts folder where this script lives)
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $repoRoot = Split-Path -Parent $scriptDir

    # Change to repo root
    Push-Location $repoRoot

    # Verify we're in the right place
    if (!(Test-Path "src/Merchello.sln")) {
        Pop-Location
        Write-Error "Could not find src/Merchello.sln from repository root: $repoRoot"
        exit 1
    }

    Write-Host "Working from: $repoRoot"

    # List of projects to update
    $projectsToUpdate = @(
        "src/Merchello.Core/Merchello.Core.csproj",
        "src/Merchello.Core.SqlServer/Merchello.Core.SqlServer.csproj",
        "src/Merchello.Core.Sqlite/Merchello.Core.Sqlite.csproj",
        "src/Merchello/Merchello.csproj"
    )

    # Get current version from Merchello.Core.csproj
    $currentVersion = Get-CurrentVersion -CsprojPath "src/Merchello.Core/Merchello.Core.csproj"
    Write-Host "Current version: $currentVersion"

    # Prompt for new version if not provided
    if (-not $NewVersion) {
        $NewVersion = Read-Host "Enter new version (e.g., 1.0.0-alpha2)"
    }

    if ([string]::IsNullOrWhiteSpace($NewVersion)) {
        Write-Error "Version cannot be empty."
        exit 1
    }

    # Validate version format (basic check)
    if ($NewVersion -notmatch '^\d+\.\d+\.\d+(-.*)?$') {
        Write-Warning "Version '$NewVersion' doesn't match expected format (x.y.z or x.y.z-suffix). Proceeding anyway..."
    }

    # Confirm version change
    $confirmation = Read-Host "Update version from '$currentVersion' to '$NewVersion'? (y/N)"
    if ($confirmation -ne 'y' -and $confirmation -ne 'Y') {
        Write-Host "Release cancelled."
        exit 0
    }

    # Ensure NugetSource folder exists
    Ensure-NugetSourceFolder

    # Update versions in all projects
    foreach ($project in $projectsToUpdate) {
        Update-VersionInCsproj -CsprojPath $project -NewVersion $NewVersion
    }

    Write-Host "All project versions updated to $NewVersion"

    # Run the release build
    Invoke-ReleaseBuild

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Release completed successfully!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "NuGet packages generated in NugetSource folder:" -ForegroundColor Cyan
    Get-ChildItem -Path "NugetSource" -Filter "*.nupkg" | ForEach-Object {
        Write-Host "  - $($_.Name)" -ForegroundColor White
    }
    Write-Host ""
    Write-Host "To publish to NuGet.org:" -ForegroundColor Yellow
    Write-Host "  dotnet nuget push NugetSource/*.nupkg --api-key YOUR_API_KEY --source https://api.nuget.org/v3/index.json" -ForegroundColor White

    Pop-Location
}
catch {
    Pop-Location
    Write-Error "An error occurred: $_"
    exit 1
}
