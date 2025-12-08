# ============================================
# Script chay crawler viecoi.vn tu may local
# ============================================
# Su dung: .\crawl-local.ps1
# Hoac voi so luong job: .\crawl-local.ps1 -Limit 100
# ============================================

param(
    [int]$Limit = 50
)

Write-Host "[START] Starting Viecoi.vn Crawler (Local)" -ForegroundColor Cyan
Write-Host "[INFO] Limit: $Limit jobs" -ForegroundColor Yellow
Write-Host ""

# Luu thu muc hien tai
$originalPath = Get-Location

# Di chuyen vao thu muc server
Set-Location -Path "$PSScriptRoot\server"

# Kiem tra da cai dependencies chua
if (-not (Test-Path "node_modules")) {
    Write-Host "[WARN] node_modules not found. Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] npm install failed!" -ForegroundColor Red
        Set-Location -Path $originalPath
        exit 1
    }
}

# Chay Full Pipeline (Crawl -> Normalize -> Upsert -> Algolia)
Write-Host "[RUNNING] Full Pipeline: Crawl -> Normalize -> AI Categorize -> Firestore -> Algolia" -ForegroundColor Green
Write-Host ""
npm run crawl:viecoi-pipeline -- --limit $Limit

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Pipeline failed!" -ForegroundColor Red
    Set-Location -Path $originalPath
    exit 1
}

Write-Host ""
Write-Host "[SUCCESS] Crawler pipeline completed successfully!" -ForegroundColor Green
Write-Host "[INFO] Check your Firestore and Algolia for new jobs" -ForegroundColor Cyan

# Quay lai thu muc ban dau
Set-Location -Path $originalPath
