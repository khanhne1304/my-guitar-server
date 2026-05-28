# Dừng container ChordMini
$ServerRoot = Split-Path $PSScriptRoot -Parent
$ComposeFile = Join-Path $ServerRoot "docker-compose.chordmini.yml"
$env:CHORDMINI_HOME = if ($env:CHORDMINI_HOME) { $env:CHORDMINI_HOME } else { Join-Path $env:USERPROFILE "ChordMiniApp" }

Set-Location $ServerRoot
if (docker compose version 2>$null) {
  docker compose -f $ComposeFile down
} else {
  docker-compose -f $ComposeFile down
}
Write-Host "Da dung ChordMini container." -ForegroundColor Green
