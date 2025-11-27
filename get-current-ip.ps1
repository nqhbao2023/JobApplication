# Script hien thi IP hien tai va huong dan ket noi
# Chay: .\get-current-ip.ps1

Write-Host ""
Write-Host "IP hien tai cua may ban:" -ForegroundColor Cyan

$currentIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254.*" } | Select-Object -First 1).IPAddress

if ($currentIP) {
    Write-Host "   $currentIP" -ForegroundColor Green
    Write-Host ""
    Write-Host "De ket noi tu may ao/dien thoai:" -ForegroundColor Yellow
    Write-Host "   - Server API: http://${currentIP}:3000" -ForegroundColor White
    Write-Host "   - Expo Metro: http://${currentIP}:8081" -ForegroundColor White
    
    Write-Host ""
    Write-Host "Goi y:" -ForegroundColor Magenta
    Write-Host "   1. Chay 'cd server; npm run dev' de start server"
    Write-Host "   2. Chay 'npx expo start' de start Expo"
    Write-Host "   3. Expo se tu dong detect IP moi va gui cho app"
    Write-Host "   4. Server da duoc config de chap nhan moi local IP"
    
    Write-Host ""
    Write-Host "Ban KHONG can thay doi code khi IP thay doi!" -ForegroundColor Green
} else {
    Write-Host "   Khong tim thay IP. Kiem tra ket noi mang!" -ForegroundColor Red
}

Write-Host ""
