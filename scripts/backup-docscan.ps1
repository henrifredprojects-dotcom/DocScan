param(
  [string]$SourceDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$BackupRoot = "$env:USERPROFILE\Documents\DocScanBackups"
)

$ErrorActionPreference = "Stop"

if (!(Test-Path $SourceDir)) {
  throw "Source directory not found: $SourceDir"
}

if (!(Test-Path $BackupRoot)) {
  New-Item -ItemType Directory -Path $BackupRoot | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$stagingDir = Join-Path $env:TEMP "docscan_backup_$timestamp"
$zipPath = Join-Path $BackupRoot "docscan_backup_$timestamp.zip"

if (Test-Path $stagingDir) {
  Remove-Item -Path $stagingDir -Recurse -Force
}
New-Item -ItemType Directory -Path $stagingDir | Out-Null

# Copy project to temporary staging, excluding heavy/generated/sensitive files.
$null = robocopy $SourceDir $stagingDir /MIR /XD node_modules .next .vercel /XF .env.local npm-debug.log yarn-error.log

if ($LASTEXITCODE -ge 8) {
  throw "robocopy failed with exit code $LASTEXITCODE"
}

Compress-Archive -Path (Join-Path $stagingDir "*") -DestinationPath $zipPath -Force
Remove-Item -Path $stagingDir -Recurse -Force

Write-Host "Backup created: $zipPath"
