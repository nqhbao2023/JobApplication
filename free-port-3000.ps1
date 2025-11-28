# ...existing code...
if ($processInfo) {
    $pid = ($processInfo -split '\s+')[-1]
    if ($pid -and ($pid -match '^\d+$')) {
        Write-Host "Đã tìm thấy tiến trình chiếm cổng $port với PID: $pid. Đang dừng tiến trình..."
        try {
            Stop-Process -Id $pid -Force
            Write-Host "Đã dừng tiến trình chiếm cổng $port thành công."
        } catch {
            Write-Host "Không thể dừng tiến trình với PID $pid. Có thể bạn cần chạy với quyền Administrator."
        }
    } else {
        Write-Host "Không lấy được PID hợp lệ."
    }
} else {
    Write-Host "Không tìm thấy tiến trình nào chiếm cổng $port."
}
# ...existing code...