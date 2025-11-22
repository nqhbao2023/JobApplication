# Build APK với IP tự động phát hiện
# Script này sẽ:
# 1. Tự động lấy IP hiện tại của máy
# 2. Cập nhật eas.json với IP đó
# 3. Build APK local hoặc trên EAS cloud

param(
    [switch]$Local,  # Build local thay vì dùng EAS cloud
    [switch]$NoBackup  # Không backup eas.json
)

Write-Host "🔍 Detecting current IP address..." -ForegroundColor Cyan

# Lấy IP của Wi-Fi adapter
$ip = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi*" -ErrorAction SilentlyContinue | 
       Where-Object {$_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*"} | 
       Select-Object -First 1).IPAddress

# Nếu không có Wi-Fi, thử Ethernet
if (-not $ip) {
    Write-Host "⚠️  No Wi-Fi found, trying Ethernet..." -ForegroundColor Yellow
    $ip = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Ethernet*" -ErrorAction SilentlyContinue | 
           Where-Object {$_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*"} | 
           Select-Object -First 1).IPAddress
}

# Nếu vẫn không tìm thấy, lấy bất kỳ adapter nào
if (-not $ip) {
    Write-Host "⚠️  No standard adapter found, trying all adapters..." -ForegroundColor Yellow
    $ip = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | 
           Where-Object {$_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*"} | 
           Select-Object -First 1).IPAddress
}

if (-not $ip) {
    Write-Error "❌ Could not detect local IP address!"
    Write-Host "`n💡 Solutions:" -ForegroundColor Yellow
    Write-Host "   1. Make sure you're connected to Wi-Fi or Ethernet"
    Write-Host "   2. Run: ipconfig"
    Write-Host "   3. Manually set IP in eas.json"
    exit 1
}

$apiUrl = "http://${ip}:3000"
Write-Host "✅ Detected IP: $ip" -ForegroundColor Green
Write-Host "🌐 API URL will be: $apiUrl" -ForegroundColor Green

# Backup eas.json nếu chưa có backup
$easJsonPath = "eas.json"
$backupPath = "eas.json.backup"

if (-not $NoBackup -and -not (Test-Path $backupPath)) {
    Write-Host "`n💾 Backing up eas.json..." -ForegroundColor Cyan
    Copy-Item $easJsonPath $backupPath
    Write-Host "✅ Backup created: $backupPath" -ForegroundColor Green
}

# Đọc eas.json
Write-Host "`n📝 Updating eas.json..." -ForegroundColor Cyan
$easConfig = Get-Content $easJsonPath -Raw | ConvertFrom-Json

# Update IP trong development profile
if (-not $easConfig.build.development.env) {
    $easConfig.build.development | Add-Member -MemberType NoteProperty -Name "env" -Value @{}
}
$easConfig.build.development.env.EXPO_PUBLIC_API_URL = $apiUrl

# Save eas.json
$easConfig | ConvertTo-Json -Depth 10 | Set-Content $easJsonPath
Write-Host "✅ Updated EXPO_PUBLIC_API_URL to: $apiUrl" -ForegroundColor Green

# Hiển thị thông tin
Write-Host "`n📋 Build Configuration:" -ForegroundColor Cyan
Write-Host "   Profile: development" -ForegroundColor White
Write-Host "   API URL: $apiUrl" -ForegroundColor White
Write-Host "   Build Type: APK" -ForegroundColor White
if ($Local) {
    Write-Host "   Method: Local Build" -ForegroundColor White
} else {
    Write-Host "   Method: EAS Cloud Build" -ForegroundColor White
}

# Confirm trước khi build
Write-Host "`n⚠️  Important: Make sure your server is running!" -ForegroundColor Yellow
Write-Host "   Run in another terminal: cd server && npm run dev" -ForegroundColor Yellow
Write-Host ""
$confirm = Read-Host "Continue with build? (y/n)"

if ($confirm -ne "y") {
    Write-Host "❌ Build cancelled" -ForegroundColor Red
    exit 0
}

# Build APK
Write-Host "`n🚀 Starting build..." -ForegroundColor Cyan

if ($Local) {
    Write-Host "📦 Building locally (this may take 10-20 minutes)..." -ForegroundColor Yellow
    eas build --platform android --profile development --local
} else {
    Write-Host "☁️  Building on EAS cloud..." -ForegroundColor Yellow
    eas build --platform android --profile development
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Build completed successfully!" -ForegroundColor Green
    Write-Host "`n📱 Installation steps:" -ForegroundColor Cyan
    Write-Host "   1. Download APK to your phone" -ForegroundColor White
    Write-Host "   2. Install the APK" -ForegroundColor White
    Write-Host "   3. Make sure phone is on same Wi-Fi network" -ForegroundColor White
    Write-Host "   4. Make sure server is running: cd server && npm run dev" -ForegroundColor White
    Write-Host "   5. Test connection: http://${ip}:3000/health" -ForegroundColor White
} else {
    Write-Host "`n❌ Build failed!" -ForegroundColor Red
    Write-Host "💡 Check the error messages above" -ForegroundColor Yellow
}

# Hỏi có muốn restore backup không
if (-not $NoBackup -and (Test-Path $backupPath)) {
    Write-Host ""
    $restore = Read-Host "Restore original eas.json? (y/n)"
    if ($restore -eq "y") {
        Copy-Item $backupPath $easJsonPath -Force
        Write-Host "✅ Restored eas.json from backup" -ForegroundColor Green
    }
}
