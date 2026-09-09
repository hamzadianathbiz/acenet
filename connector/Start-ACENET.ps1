param([string]$Code, [ValidateSet('chatgpt','claude')][string]$Provider = 'chatgpt')
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
Write-Host "`nACENET · Preparing your connection`n"
$AcenetUv = Join-Path $env:USERPROFILE '.local\bin\uv.exe'
if (-not (Test-Path $AcenetUv)) {
  $ExistingUv = Get-Command uv -ErrorAction SilentlyContinue
  if ($ExistingUv) { $AcenetUv = $ExistingUv.Source }
  else { Invoke-RestMethod https://astral.sh/uv/install.ps1 | Invoke-Expression }
}
& $AcenetUv python install 3.12
if ($LASTEXITCODE -ne 0) { throw 'Python installation failed' }
$AcenetPython = & $AcenetUv python find 3.12
$SetupArgs = @()
if ($Code) { $SetupArgs += @('--code', $Code, '--provider', $Provider) }
& $AcenetPython setup.py @SetupArgs
if ($LASTEXITCODE -ne 0) { throw 'Account connection stopped. Reopen the helper to try again.' }
