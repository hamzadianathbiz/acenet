param(
  [Parameter(Mandatory=$true)][ValidatePattern('^[A-Z0-9-]{8,40}$')][string]$Code,
  [ValidateSet('chatgpt','claude')][string]$Provider = 'chatgpt'
)
$ErrorActionPreference = 'Stop'
$AcenetTemp = Join-Path ([System.IO.Path]::GetTempPath()) ('acenet-setup-' + [guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $AcenetTemp | Out-Null
try {
  Write-Host "`nACENET · Setting up your connection"
  $Archive = Join-Path $AcenetTemp 'helper.zip'
  Invoke-WebRequest -UseBasicParsing -Uri '__ACENET_ORIGIN__/acenet-windows.zip' -OutFile $Archive -UserAgent 'ACENET/1.0'
  if ((Get-FileHash -Path $Archive -Algorithm SHA256).Hash.ToLowerInvariant() -ne '__ACENET_WINDOWS_SHA256__') {
    throw 'The helper was updated. Copy a new setup command and try again.'
  }
  $Helper = Join-Path $AcenetTemp 'helper'
  Expand-Archive -Path $Archive -DestinationPath $Helper
  & (Join-Path $Helper 'Start-ACENET.ps1') -Code $Code -Provider $Provider
} finally {
  Set-Location ([System.IO.Path]::GetTempPath())
  Remove-Item -LiteralPath $AcenetTemp -Recurse -Force
}
