# Script: free-port-3000.ps1
# Tự động giải phóng cổng 3000 trên Windows

$port = 3000
$processInfo = netstat -ano | Select-String ":$port" | Select-Object -First 1

if ($processInfo) {
    $pid = ($processInfo -split '\s+')[-1]
    Write-Host "Đã tìm thấy tiến trình chiếm cổng $port với PID: $pid. Đang dừng tiến trình..."
    Stop-Process -Id $pid -Force
    Write-Host "Đã dừng tiến trình chiếm cổng $port thành công."
} else {
    Write-Host "Không tìm thấy tiến trình nào chiếm cổng $port."
}
