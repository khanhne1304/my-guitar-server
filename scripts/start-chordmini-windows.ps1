# Khởi động ChordMini backend (Windows)
$ChordMiniDir = if ($env:CHORDMINI_HOME) { $env:CHORDMINI_HOME } else { Join-Path $env:USERPROFILE "ChordMiniApp" }
$BackendDir = Join-Path $ChordMiniDir "python_backend"
$activate = Join-Path $BackendDir "venv\Scripts\Activate.ps1"

if (-not (Test-Path $activate)) {
  Write-Host "Chua cai ChordMini. Chay truoc:" -ForegroundColor Red
  Write-Host "  powershell -ExecutionPolicy Bypass -File .\scripts\install-chordmini-windows.ps1"
  exit 1
}

Set-Location $BackendDir
. $activate
Write-Host "ChordMini dang chay tai http://localhost:5001" -ForegroundColor Green
python app.py
