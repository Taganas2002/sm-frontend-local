param(
  [Parameter(Mandatory = $true)]
  [string]$Host,
  [string]$User = "ubuntu",
  [string]$Target = "/var/www/sm-frontend"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path "dist")) {
  throw "dist folder not found. Run build first."
}

Write-Host "Uploading dist/ to ${User}@${Host}:${Target}"
scp -r ./dist/* "${User}@${Host}:${Target}/"
Write-Host "Upload done."
