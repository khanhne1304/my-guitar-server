# ChordMini qua Docker — không cần Build Tools / Python trên Windows
# Yêu cầu: Docker Desktop đang chạy

$ErrorActionPreference = "Stop"

function Test-DockerEngineReady {
  param([int]$MaxAttempts = 12, [int]$DelaySeconds = 5)
  $prev = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  for ($i = 1; $i -le $MaxAttempts; $i++) {
    docker ps -q 1>$null 2>$null
    if ($LASTEXITCODE -eq 0) {
      $ErrorActionPreference = $prev
      return $true
    }
    if ($i -lt $MaxAttempts) {
      Write-Host "Doi Docker Engine... ($i/$MaxAttempts)" -ForegroundColor Yellow
      Start-Sleep -Seconds $DelaySeconds
    }
  }
  $ErrorActionPreference = $prev
  return $false
}

function Show-DockerEngineHelp {
  Write-Host "`nDocker Engine chua san sang (loi 500 / pipe dockerDesktopLinuxEngine)." -ForegroundColor Red
  Write-Host "Thu lan luot:" -ForegroundColor Yellow
  Write-Host "  1. Mo Docker Desktop, doi den khi hien 'Engine running' (xanh)" -ForegroundColor White
  Write-Host "  2. Docker Desktop -> Troubleshoot -> Restart Docker Desktop" -ForegroundColor White
  Write-Host "  3. Kiem tra: docker ps   (phai khong loi)" -ForegroundColor White
  Write-Host "  4. Chay lai script nay`n" -ForegroundColor White
}

$ServerRoot = Split-Path $PSScriptRoot -Parent
$ChordMiniDir = if ($env:CHORDMINI_HOME) { $env:CHORDMINI_HOME } else { Join-Path $env:USERPROFILE "ChordMiniApp" }
$BackendDir = Join-Path $ChordMiniDir "python_backend"
$ComposeFile = Join-Path $ServerRoot "docker-compose.chordmini.yml"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Host "Chua co Docker. Cai Docker Desktop: https://www.docker.com/products/docker-desktop/" -ForegroundColor Red
  exit 1
}

if (-not (Test-DockerEngineReady)) {
  Show-DockerEngineHelp
  exit 1
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Host "Can Git de clone ChordMiniApp." -ForegroundColor Red
  exit 1
}

if (-not (Test-Path $BackendDir)) {
  Write-Host "Dang clone ChordMiniApp vao $ChordMiniDir ..." -ForegroundColor Cyan
  # Bo qua file LFS lon (model SongFormer) — chi can python_backend cho Docker
  $env:GIT_LFS_SKIP_SMUDGE = "1"
  git clone --depth 1 https://github.com/ptnghia-j/ChordMiniApp.git $ChordMiniDir
  if ($LASTEXITCODE -ne 0) { exit 1 }
}

if (-not (Test-Path (Join-Path $BackendDir "Dockerfile"))) {
  Write-Host "Khong tim thay Dockerfile tai $BackendDir" -ForegroundColor Red
  exit 1
}

function Ensure-ChordMiniModelRepos {
  $modelsDir = Join-Path $BackendDir "models"
  $bt = Join-Path $modelsDir "Beat-Transformer"
  $cc = Join-Path $modelsDir "Chord-CNN-LSTM"
  $btCode = Join-Path $bt "code\DilatedTransformer.py"

  if (-not (Test-Path $btCode)) {
    Write-Host "Thieu Beat-Transformer  — dang clone..." -ForegroundColor Yellow
    if (Test-Path $bt) { Remove-Item $bt -Recurse -Force -ErrorAction SilentlyContinue }
    git clone --depth 1 https://github.com/ptnghia-j/beat-transformer-model.git $bt
    if ($LASTEXITCODE -ne 0) { exit 1 }
  }

  $ccMarker = Join-Path $cc "chord_recognition.py"
  if (-not (Test-Path $ccMarker)) {
    Write-Host "Thieu Chord-CNN-LSTM — dang clone..." -ForegroundColor Yellow
    if (Test-Path $cc) { Remove-Item $cc -Recurse -Force -ErrorAction SilentlyContinue }
    git clone --depth 1 https://github.com/ptnghia-j/chord-cnn-lstm-model.git $cc
    if ($LASTEXITCODE -ne 0) { exit 1 }
  }
}

Ensure-ChordMiniModelRepos

$env:CHORDMINI_HOME = $ChordMiniDir

Write-Host "`n=== ChordMini (Docker) ===" -ForegroundColor Cyan
Write-Host "Build lan dau: 15-30 phut, tai ~2-4 GB" -ForegroundColor Yellow
Write-Host "API: http://localhost:5001`n" -ForegroundColor Green

Set-Location $ServerRoot

# Docker thuong in WARNING ra stderr — tam tat Stop cho lenh native
$prevEap = $ErrorActionPreference
$ErrorActionPreference = "Continue"

$useComposeV2 = $false
docker compose version *> $null
if ($LASTEXITCODE -eq 0) { $useComposeV2 = $true }

if ($useComposeV2) {
  docker compose -f $ComposeFile up --build
} else {
  docker-compose -f $ComposeFile up --build
}

$exitCode = $LASTEXITCODE
$ErrorActionPreference = $prevEap
if ($exitCode -ne 0) { exit $exitCode }
