# make-gif.ps1 — converts a screen recording into an optimized README GIF.
# Usage:  pwsh assets/make-gif.ps1 assets/demo-raw.mp4
# Output: assets/demo.gif  (900px wide, 12 fps, optimized palette)
#
# Requires ffmpeg (free):  winget install Gyan.FFmpeg   (then reopen the terminal)

param(
  [Parameter(Mandatory = $true)] [string]$Input,
  [string]$Output = "assets/demo.gif",
  [int]$Width = 900,
  [int]$Fps = 12
)

if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
  Write-Host "ffmpeg not found. Install it with:  winget install Gyan.FFmpeg  (then reopen the terminal)" -ForegroundColor Yellow
  exit 1
}
if (-not (Test-Path $Input)) {
  Write-Host "Input file not found: $Input" -ForegroundColor Red
  exit 1
}

$palette = [System.IO.Path]::GetTempFileName() + ".png"
$filters = "fps=$Fps,scale=$($Width):-1:flags=lanczos"

Write-Host "1/2  building optimized palette..." -ForegroundColor Cyan
ffmpeg -y -i $Input -vf "$filters,palettegen=stats_mode=diff" $palette
if ($LASTEXITCODE -ne 0) { Write-Host "palette step failed" -ForegroundColor Red; exit 1 }

Write-Host "2/2  encoding GIF -> $Output ..." -ForegroundColor Cyan
ffmpeg -y -i $Input -i $palette -lavfi "$filters [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=3" $Output
if ($LASTEXITCODE -ne 0) { Write-Host "encode step failed" -ForegroundColor Red; exit 1 }

Remove-Item $palette -ErrorAction SilentlyContinue
$sizeMB = [math]::Round((Get-Item $Output).Length / 1MB, 2)
Write-Host "Done -> $Output  ($sizeMB MB)" -ForegroundColor Green
if ($sizeMB -gt 10) {
  Write-Host "Tip: GitHub caps inline images ~10MB. If too big, re-run with a lower width:  pwsh assets/make-gif.ps1 $Input assets/demo.gif 720 10" -ForegroundColor Yellow
}
