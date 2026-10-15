param(
  [string]$KeystorePath = '',
  [string]$KeyAlias
)

$ErrorActionPreference = 'Stop'
$initialLocation = Get-Location

$root = Split-Path -Parent $PSScriptRoot

function Convert-SecureString([Security.SecureString]$value) {
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($value)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

try {
  if ($KeystorePath) {
    if (-not (Test-Path -LiteralPath $KeystorePath -PathType Leaf)) {
      throw "找不到签名文件：$KeystorePath"
    }
    if (-not $KeyAlias) {
      $KeyAlias = Read-Host '签名别名'
    }
    $storePassword = Read-Host '签名文件密码' -AsSecureString
    $keyPassword = Read-Host '签名密钥密码（若与签名文件相同，仍输入一次）' -AsSecureString
    $env:VELVET_STORE_FILE = (Resolve-Path -LiteralPath $KeystorePath).Path
    $env:VELVET_STORE_PASSWORD = Convert-SecureString $storePassword
    $env:VELVET_KEY_ALIAS = $KeyAlias
    $env:VELVET_KEY_PASSWORD = Convert-SecureString $keyPassword
  } else {
    Write-Host '未提供正式私钥：沿用线上 2.8.2 的 Android Debug 证书，以支持覆盖升级。'
  }

  Set-Location $root
  npm run build
  if ($LASTEXITCODE -ne 0) { throw '前端构建失败' }
  npm run cap:sync
  if ($LASTEXITCODE -ne 0) { throw 'Capacitor 同步失败' }

  Set-Location (Join-Path $root 'android')
  .\gradlew.bat assembleRelease bundleRelease
  if ($LASTEXITCODE -ne 0) { throw 'Android 正式包构建失败' }

  $outputDir = Join-Path $root 'outputs'
  New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
  Copy-Item (Join-Path $root 'android\app\build\outputs\apk\release\app-release.apk') (Join-Path $outputDir 'maskaria-2.8.3-release.apk') -Force
  Copy-Item (Join-Path $root 'android\app\build\outputs\bundle\release\app-release.aab') (Join-Path $outputDir 'maskaria-2.8.3-release.aab') -Force
  Write-Host "正式 APK：$outputDir\maskaria-2.8.3-release.apk"
  Write-Host "商店包 AAB：$outputDir\maskaria-2.8.3-release.aab"
}
finally {
  Remove-Item Env:VELVET_STORE_FILE -ErrorAction SilentlyContinue
  Remove-Item Env:VELVET_STORE_PASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:VELVET_KEY_ALIAS -ErrorAction SilentlyContinue
  Remove-Item Env:VELVET_KEY_PASSWORD -ErrorAction SilentlyContinue
  Set-Location $initialLocation
}
