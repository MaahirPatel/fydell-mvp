<#
  Builds the Microsoft Store package (MSIX) of the Fydell desktop app.

  The Store signs the package when it is published, so this script does not
  sign anything. IdentityName, Publisher and PublisherDisplayName must be the
  exact values Partner Center shows under Product identity once the app name
  is reserved; the defaults only produce a local test package.

    powershell -File desktop/store/package-msix.ps1 `
      -IdentityName "12345Fydell.Fydell" `
      -Publisher "CN=00000000-0000-0000-0000-000000000000" `
      -PublisherDisplayName "Fydell"
#>
param(
  [string]$IdentityName = "Fydell.Desktop.LocalTest",
  [string]$Publisher = "CN=Fydell Local Test",
  [string]$PublisherDisplayName = "Fydell",
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$desktop = Split-Path -Parent $PSScriptRoot
$tauriDir = Join-Path $desktop "src-tauri"

$makeappx = Get-ChildItem "${env:ProgramFiles(x86)}\Windows Kits\10\bin" -Recurse -Filter makeappx.exe -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -match "\\x64\\" } |
  Sort-Object FullName |
  Select-Object -Last 1
if (-not $makeappx) { throw "makeappx.exe not found. Install the Windows 10/11 SDK." }

if (-not $SkipBuild) {
  Push-Location $desktop
  try {
    npx tauri build --no-bundle --features store --config src-tauri/tauri.store.conf.json
    if ($LASTEXITCODE -ne 0) { throw "tauri build failed" }
  } finally {
    Pop-Location
  }
}

$cargo = Get-Content (Join-Path $tauriDir "Cargo.toml") -Raw
if ($cargo -notmatch '(?m)^name\s*=\s*"([^"]+)"') { throw "Cargo package name not found" }
$executable = "$($Matches[1]).exe"
$exe = Join-Path $tauriDir "target\release\$executable"
if (-not (Test-Path $exe)) { throw "Built app not found at $exe" }

$config = Get-Content (Join-Path $tauriDir "tauri.conf.json") -Raw | ConvertFrom-Json
if ($config.version -notmatch '^\d+\.\d+\.\d+$') { throw "tauri.conf.json version must be x.y.z" }
$version = "$($config.version).0"

$out = Join-Path $tauriDir "target\msix"
$layout = Join-Path $out "layout"
if (Test-Path $layout) { Remove-Item -Recurse -Force $layout }
New-Item -ItemType Directory -Force (Join-Path $layout "Assets") | Out-Null

Copy-Item $exe (Join-Path $layout $executable)
foreach ($icon in "StoreLogo", "Square44x44Logo", "Square71x71Logo", "Square150x150Logo") {
  Copy-Item (Join-Path $tauriDir "icons\$icon.png") (Join-Path $layout "Assets\$icon.png")
}

function Escape-Xml([string]$value) { [System.Security.SecurityElement]::Escape($value) }
$manifest = (Get-Content (Join-Path $PSScriptRoot "AppxManifest.xml") -Raw).
  Replace("{{IDENTITY_NAME}}", (Escape-Xml $IdentityName)).
  Replace("{{PUBLISHER}}", (Escape-Xml $Publisher)).
  Replace("{{PUBLISHER_DISPLAY_NAME}}", (Escape-Xml $PublisherDisplayName)).
  Replace("{{VERSION}}", $version).
  Replace("{{EXECUTABLE}}", $executable)
[System.IO.File]::WriteAllText((Join-Path $layout "AppxManifest.xml"), $manifest, [System.Text.UTF8Encoding]::new($false))

$package = Join-Path $out "Fydell_${version}_x64.msix"
& $makeappx.FullName pack /d $layout /p $package /o /h SHA256
if ($LASTEXITCODE -ne 0) { throw "makeappx pack failed" }
Write-Output "Store package: $package"
