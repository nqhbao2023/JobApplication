# Test kết nối từ điện thoại đến server local

Write-Host "Testing Local Server Connection" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# 1. Get current IP
$ip = (Get-NetIPAddress -AddressFamily IPv4 | 
       Where-Object {$_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*"} | 
       Select-Object -First 1).IPAddress

if (-not $ip) {
    Write-Error "Cannot detect local IP!"
    exit 1
}

Write-Host "[OK] Your IP: $ip" -ForegroundColor Green
Write-Host "[OK] Server URL: http://${ip}:3000`n" -ForegroundColor Green

# 2. Check if server is running locally
Write-Host "Checking if server is running on port 3000..." -ForegroundColor Cyan
$serverRunning = Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet -WarningAction SilentlyContinue

if ($serverRunning) {
    Write-Host "[OK] Server is running on port 3000" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Server is NOT running on port 3000" -ForegroundColor Red
    Write-Host "`n[TIP] Start server with: cd server && npm run dev" -ForegroundColor Yellow
    exit 1
}

# 3. Test HTTP connection
Write-Host "`nTesting HTTP connection..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -TimeoutSec 5 -UseBasicParsing
    Write-Host "[OK] Server responded with status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "[RESPONSE] $($response.Content)" -ForegroundColor White
} catch {
    Write-Host "[ERROR] Cannot connect to server!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 4. Check Windows Firewall
Write-Host "`nChecking Windows Firewall..." -ForegroundColor Cyan
$firewallRule = Get-NetFirewallRule -DisplayName "*3000*" -ErrorAction SilentlyContinue

if ($firewallRule) {
    Write-Host "[OK] Firewall rule exists for port 3000" -ForegroundColor Green
} else {
    Write-Host "[WARN] No firewall rule found for port 3000" -ForegroundColor Yellow
    Write-Host "[TIP] Create rule with:" -ForegroundColor Yellow
    Write-Host "   New-NetFirewallRule -DisplayName 'Node Server' -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow" -ForegroundColor White
}

# 5. Generate QR code URL for phone testing
Write-Host "`nTest from your phone:" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host "1. Make sure phone is on same Wi-Fi" -ForegroundColor White
Write-Host "2. Open browser on phone" -ForegroundColor White
Write-Host "3. Go to: http://${ip}:3000/health" -ForegroundColor Yellow
Write-Host "4. You should see JSON response" -ForegroundColor White

# 6. Show current eas.json config
Write-Host "`nCurrent eas.json config:" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
$easConfig = Get-Content "eas.json" | ConvertFrom-Json
$devUrl = $easConfig.build.development.env.EXPO_PUBLIC_API_URL

if ($devUrl -eq "http://${ip}:3000") {
    Write-Host "[OK] eas.json IP matches current IP!" -ForegroundColor Green
    Write-Host "   EXPO_PUBLIC_API_URL: $devUrl" -ForegroundColor White
} else {
    Write-Host "[WARN] IP MISMATCH!" -ForegroundColor Red
    Write-Host "   Current IP: http://${ip}:3000" -ForegroundColor Yellow
    Write-Host "   eas.json IP: $devUrl" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Update eas.json with:" -ForegroundColor Yellow
    Write-Host "   .\build-with-current-ip.ps1" -ForegroundColor White
}

# 7. Show Wi-Fi network
Write-Host "`nCurrent Wi-Fi network:" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
$wifi = netsh wlan show interfaces | Select-String "SSID" | Select-Object -First 1
if ($wifi) {
    Write-Host "$wifi" -ForegroundColor White
    Write-Host "`n[WARN] Phone must connect to same Wi-Fi!" -ForegroundColor Yellow
} else {
    Write-Host "[WARN] Not connected via Wi-Fi (using Ethernet?)" -ForegroundColor Yellow
}

# 8. Summary
Write-Host "`n" 
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "           SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Local IP:    " -NoNewline; Write-Host "$ip" -ForegroundColor Yellow
Write-Host "Server URL:  " -NoNewline; Write-Host "http://${ip}:3000" -ForegroundColor Yellow
Write-Host "Status:      " -NoNewline
if ($serverRunning) {
    Write-Host "[OK] READY" -ForegroundColor Green
} else {
    Write-Host "[ERROR] NOT READY" -ForegroundColor Red
}
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Test URL on phone: http://${ip}:3000/health" -ForegroundColor White
Write-Host "2. If eas.json IP different, run: .\build-with-current-ip.ps1" -ForegroundColor White
Write-Host "3. Build APK: eas build --platform android --profile development" -ForegroundColor White
