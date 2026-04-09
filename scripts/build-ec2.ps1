param(
  [Parameter(Mandatory = $true)]
  [string]$Domain
)

$ErrorActionPreference = "Stop"

$apiBase = "https://$Domain".TrimEnd("/")
$env:VITE_API_BASE_URL = $apiBase

Write-Host "Building frontend for API base: $apiBase"
npm run build

Write-Host "Build complete. Upload dist/ to /var/www/sm-frontend on EC2."
