$required = @(
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
  "GOOGLE_SERVICE_ACCOUNT_EMAIL",
  "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
  "NEXT_PUBLIC_APP_URL"
)

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$envPath = Join-Path $projectRoot ".env.local"

if (!(Test-Path $envPath)) {
  Write-Host ".env.local not found at: $envPath" -ForegroundColor Red
  exit 1
}

$lines = Get-Content $envPath
$values = @{}
foreach ($line in $lines) {
  if ($line -match '^\s*#' -or $line -match '^\s*$') { continue }
  $parts = $line -split "=", 2
  if ($parts.Length -eq 2) {
    $values[$parts[0].Trim()] = $parts[1]
  }
}

$missing = @()
foreach ($key in $required) {
  if (!($values.ContainsKey($key)) -or [string]::IsNullOrWhiteSpace($values[$key])) {
    $missing += $key
  }
}

if ($missing.Count -gt 0) {
  Write-Host "Missing env vars:" -ForegroundColor Yellow
  $missing | ForEach-Object { Write-Host " - $_" -ForegroundColor Yellow }
  exit 1
}

Write-Host "All required env vars are present." -ForegroundColor Green
