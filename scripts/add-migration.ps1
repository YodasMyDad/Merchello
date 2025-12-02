# Add EF Core Migration Script
# Creates migrations for both SQLite and SQL Server providers

# Navigate to repo root (parent of scripts folder)
$repoRoot = Split-Path -Parent $PSScriptRoot
Push-Location $repoRoot

$migrationName = Read-Host "Enter migration name"

if ([string]::IsNullOrWhiteSpace($migrationName)) {
    Write-Host "Migration name cannot be empty" -ForegroundColor Red
    Pop-Location
    exit 1
}

Write-Host "`nCreating SQLite migration..." -ForegroundColor Cyan
dotnet ef migrations add $migrationName --project src/Merchello.Core.Sqlite --startup-project src/Merchello.Core.Sqlite

Write-Host "`nCreating SQL Server migration..." -ForegroundColor Cyan
dotnet ef migrations add $migrationName --project src/Merchello.Core.SqlServer --startup-project src/Merchello.Core.SqlServer

Write-Host "`nDone!" -ForegroundColor Green
Pop-Location
