$ErrorActionPreference = "Stop"

if (-not (Get-Command wsl -ErrorAction SilentlyContinue)) {
  throw "WSL is not installed. Install WSL first, then rerun: npm run build:linux:wsl"
}

$distro = $env:NCC_WSL_DISTRO
if ([string]::IsNullOrWhiteSpace($distro)) {
  $distros = wsl -l -q | ForEach-Object { $_ -replace "\x00", "" } | ForEach-Object { $_.Trim() } | Where-Object { $_ }
  $distro = $distros | Where-Object { $_ -notlike "docker-*" } | Select-Object -First 1
}

if ([string]::IsNullOrWhiteSpace($distro)) {
  throw "No Linux WSL distro found. Install Ubuntu first (for example: wsl --install -d Ubuntu), then rerun: npm run build:linux:wsl"
}

$projectPath = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$drive = $projectPath.Substring(0, 1).ToLowerInvariant()
$rest = $projectPath.Substring(2).Replace("\", "/")
$wslPath = "/mnt/$drive$rest"
$hasYarnLock = Test-Path (Join-Path $projectPath "yarn.lock")
$hasNpmLock = Test-Path (Join-Path $projectPath "package-lock.json")
$hasPnpmLock = Test-Path (Join-Path $projectPath "pnpm-lock.yaml")

if ($hasYarnLock) {
  $installCommand = @"
if ! command -v yarn >/dev/null 2>&1; then
  echo 'yarn is not installed inside WSL.'
  exit 1
fi

yarn install --frozen-lockfile
yarn build:linux
"@
} elseif ($hasNpmLock) {
  $installCommand = @"
npm ci
npm run build:linux
"@
} elseif ($hasPnpmLock) {
  $installCommand = @"
if ! command -v pnpm >/dev/null 2>&1; then
  echo 'pnpm is not installed inside WSL.'
  exit 1
fi

pnpm install --frozen-lockfile
pnpm run build:linux
"@
} else {
  throw "No supported lockfile found. Expected yarn.lock, package-lock.json, or pnpm-lock.yaml."
}

$bashScript = @"
set -e
cd '$wslPath'
if ! command -v node >/dev/null 2>&1; then
  echo 'Node.js is not installed inside WSL.'
  exit 1
fi

$installCommand
"@

wsl -d $distro bash -lc $bashScript
