# Script de start server va Expo cho development
# Chay: .\start-dev.ps1

Write-Host "`nStarting Job4S Development Environment..." -ForegroundColor Cyan

# Kiem tra IP hien tai
$currentIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254.*" } | Select-Object -First 1).IPAddress
Write-Host "Current IP: $currentIP" -ForegroundColor Green

# Start Server trong terminal moi
Write-Host "`n1. Starting Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'c:\Users\Admin\Documents\GitHub\JobApplication\server'; npm run dev"

# Doi 5 giay de server khoi dong
Write-Host "Waiting 5 seconds for server to start..." -ForegroundColor Yellow
Start-Sleep 5

# Test server
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3000/health" -TimeoutSec 5
    Write-Host "✅ Server is running: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Server may not be ready yet. Check the server terminal." -ForegroundColor Yellow
}

# Start Expo trong terminal moi
Write-Host "`n2. Starting Expo..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'c:\Users\Admin\Documents\GitHub\JobApplication'; npx expo start"

Write-Host "`n✅ Both terminals opened!" -ForegroundColor Green
Write-Host "Server: http://$currentIP:3000" -ForegroundColor Cyan
Write-Host "Expo: http://$currentIP:8081" -ForegroundColor Cyan
