param(
  [string]$EnvFile = ".env.supabase.local",
  [switch]$WithSeed
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $EnvFile)) {
  Write-Error "Env file '$EnvFile' not found. Copy .env.supabase.local.example to .env.supabase.local first."
}

Get-Content $EnvFile |
  Where-Object { $_ -and -not $_.StartsWith('#') } |
  ForEach-Object {
    $parts = $_ -split '=', 2
    if ($parts.Count -eq 2) {
      $name = $parts[0].Trim()
      $value = $parts[1].Trim().Trim('"')
      [System.Environment]::SetEnvironmentVariable($name, $value, 'Process')
    }
  }

if (-not $env:DATABASE_URL -or -not $env:DIRECT_URL) {
  Write-Error 'DATABASE_URL and DIRECT_URL must be set in env file.'
}

Write-Host 'Running Prisma migrate deploy against Supabase...'
corepack pnpm db:migrate:deploy
if ($LASTEXITCODE -ne 0) {
  throw 'db:migrate:deploy failed.'
}

Write-Host 'Checking migration status...'
corepack pnpm db:migrate:status
if ($LASTEXITCODE -ne 0) {
  throw 'db:migrate:status failed.'
}

if ($WithSeed) {
  Write-Host 'Running seed...'
  corepack pnpm db:seed
  if ($LASTEXITCODE -ne 0) {
    throw 'db:seed failed.'
  }
}

Write-Host 'Done.'
