param(
  [Parameter(Mandatory = $true)]
  [string]$Host,
  [string]$User = "ubuntu",
  [string]$Target = "/var/www/sm-frontend",
  [string]$KeyFile = ""
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path "dist")) {
  throw "dist folder not found. Run build first."
}

$sshArgs = @()
if ($KeyFile -and (Test-Path $KeyFile)) {
  $sshArgs += @("-i", $KeyFile)
  Write-Host "Using key: $KeyFile"
}

Write-Host "Uploading dist/ to ${User}@${Host}:${Target}"
& scp @sshArgs -r ./dist/* "${User}@${Host}:${Target}/"
if ($LASTEXITCODE -ne 0) { throw "scp failed with exit code $LASTEXITCODE" }
Write-Host "Upload done."
