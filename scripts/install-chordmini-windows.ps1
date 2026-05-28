# Cài ChordMini backend trên Windows (PowerShell) — không cần mở Ubuntu
# Chạy: powershell -ExecutionPolicy Bypass -File .\scripts\install-chordmini-windows.ps1

$ErrorActionPreference = "Stop"

$ChordMiniDir = if ($env:CHORDMINI_HOME) { $env:CHORDMINI_HOME } else { Join-Path $env:USERPROFILE "ChordMiniApp" }
$BackendDir = Join-Path $ChordMiniDir "python_backend"
$RepoUrl = "https://github.com/ptnghia-j/ChordMiniApp.git"

Write-Host "=== ChordMini cài trên Windows ===" -ForegroundColor Cyan
Write-Host "Thư mục: $ChordMiniDir`n"

# Python 3.10
$py = Get-Command py -ErrorAction SilentlyContinue
if (-not $py) {
  Write-Host "Chua tim thay 'py'. Cai Python 3.10 tu https://www.python.org/downloads/" -ForegroundColor Red
  Write-Host "Danh dau 'Add Python to PATH' khi cai." -ForegroundColor Yellow
  exit 1
}

$pyVersion = & py -3.10 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>$null
if (-not $pyVersion) {
  Write-Host "Can Python 3.10. Cai Python 3.10.x roi chay lai script." -ForegroundColor Red
  exit 1
}
Write-Host "Python: $pyVersion" -ForegroundColor Green

# FFmpeg
if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
  Write-Host "Chua co ffmpeg. Cai: winget install Gyan.FFmpeg" -ForegroundColor Yellow
  Write-Host "Hoac: https://ffmpeg.org — them vao PATH roi chay lai." -ForegroundColor Yellow
}

# Git
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Host "Can Git: https://git-scm.com/download/win" -ForegroundColor Red
  exit 1
}

# Clone
if (-not (Test-Path $BackendDir)) {
  Write-Host "Dang clone ChordMiniApp (co the mat vai phut)..." -ForegroundColor Cyan
  git clone $RepoUrl $ChordMiniDir
} else {
  Write-Host "Da co repo tai $ChordMiniDir" -ForegroundColor Green
}

Set-Location $BackendDir

# venv
$venv = Join-Path $BackendDir "venv"
if (-not (Test-Path $venv)) {
  & py -3.10 -m venv venv
}
$activate = Join-Path $venv "Scripts\Activate.ps1"
. $activate

Write-Host "`nDang cai dependencies (15-30 phut, tai ~2-4 GB)..." -ForegroundColor Cyan
pip install --upgrade pip setuptools wheel
pip install "Cython>=0.29.0" "numpy==1.26.4"

Write-Host "Cai madmom (can Visual Studio Build Tools C++)..." -ForegroundColor Cyan
pip install git+https://github.com/CPJKU/madmom
if ($LASTEXITCODE -ne 0) {
  Write-Host "`nLOI madmom — tren Windows can compiler C++ HOAC dung Docker (khong can Build Tools):" -ForegroundColor Red
  Write-Host "  Docker: powershell -ExecutionPolicy Bypass -File .\scripts\start-chordmini-docker.ps1" -ForegroundColor Cyan
  Write-Host "  Hoac cai Build Tools: https://visualstudio.microsoft.com/visual-cpp-build-tools/" -ForegroundColor Yellow
  Write-Host "  (workload: Desktop development with C++) roi chay lai script nay." -ForegroundColor Yellow
  exit 1
}

pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) { exit 1 }

if (Test-Path "scipy_patch.py") {
  python scipy_patch.py
}

Write-Host "`n=== CAI XONG ===" -ForegroundColor Green
Write-Host "Chay backend (giu cua so mo):" -ForegroundColor Cyan
Write-Host "  cd `"$BackendDir`"" -ForegroundColor White
Write-Host "  .\venv\Scripts\Activate.ps1" -ForegroundColor White
Write-Host "  python app.py" -ForegroundColor White
Write-Host "`nKiem tra: curl http://localhost:5001/api/model-info" -ForegroundColor Cyan
Write-Host "`nTrong my-guitar-server/.env:" -ForegroundColor Cyan
Write-Host "  CHORDMINI_API_URL=http://localhost:5001" -ForegroundColor White
Write-Host "  CHORDMINI_API_URL=http://localhost:5001" -ForegroundColor White
Write-Host "  CHORDMINI_MODEL=chord-cnn-lstm" -ForegroundColor White
