# ============================================
# Script chạy crawler viecoi.vn từ máy local
# ============================================
# Sử dụng: .\crawl-local.ps1
# Hoặc với số lượng job: .\crawl-local.ps1 -Limit 100
# ============================================

param(
    [int]$Limit = 50
)

Write-Host "🚀 Starting Viecoi.vn Crawler (Local)" -ForegroundColor Cyan
Write-Host "📊 Limit: $Limit jobs" -ForegroundColor Yellow
Write-Host ""

# Di chuyển vào thư mục server
Set-Location -Path "$PSScriptRoot\server"

# Step 1: Crawl jobs
Write-Host "📥 Step 1/4: Crawling job pages..." -ForegroundColor Green
npm run crawl:viecoi-jobs -- --limit $Limit

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Crawl failed!" -ForegroundColor Red
    exit 1
}

# Step 2: Normalize data
Write-Host ""
Write-Host "🔧 Step 2/4: Normalizing data..." -ForegroundColor Green
npm run normalize:viecoi

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Normalize failed!" -ForegroundColor Red
    exit 1
}

# Step 3: Upsert to Firestore
Write-Host ""
Write-Host "📤 Step 3/4: Upserting to Firestore..." -ForegroundColor Green
npm run upsert:viecoi-jobs

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Upsert failed!" -ForegroundColor Red
    exit 1
}

# Step 4: Sync to Algolia
Write-Host ""
Write-Host "🔍 Step 4/4: Syncing to Algolia..." -ForegroundColor Green
npm run sync:viecoi-algolia

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ Algolia sync failed (non-critical)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Crawler completed successfully!" -ForegroundColor Green
Write-Host "📊 Check your Firestore and Algolia for new jobs" -ForegroundColor Cyan
