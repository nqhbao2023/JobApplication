# Cố định IP của máy tính về 192.168.1.35

# CÁCH 1: Dùng PowerShell (Khuyến nghị)
# Chạy PowerShell với quyền Administrator

# 1. Kiểm tra tên adapter (Wi-Fi hoặc Ethernet)
Get-NetAdapter | Where-Object {$_.Status -eq "Up"} | Select-Object Name, InterfaceDescription

# 2. Thay "Wi-Fi" bằng tên adapter của bạn nếu khác
$adapter = "Ethernet"  # Hoặc "Wi-Fi"

# 3. Xóa IP động hiện tại
Remove-NetIPAddress -InterfaceAlias $adapter -Confirm:$false -ErrorAction SilentlyContinue
Remove-NetRoute -InterfaceAlias $adapter -Confirm:$false -ErrorAction SilentlyContinue

# 4. Set IP tĩnh
New-NetIPAddress -InterfaceAlias $adapter `
    -IPAddress "192.168.1.35" `
    -PrefixLength 24 `
    -DefaultGateway "192.168.1.1"

# 5. Set DNS
Set-DnsClientServerAddress -InterfaceAlias $adapter `
    -ServerAddresses ("8.8.8.8", "8.8.4.4")

Write-Host "✅ IP đã được cố định: 192.168.1.35" -ForegroundColor Green
Write-Host "🔄 Restart network adapter..." -ForegroundColor Cyan
Disable-NetAdapter -Name $adapter -Confirm:$false
Start-Sleep -Seconds 2
Enable-NetAdapter -Name $adapter -Confirm:$false

Write-Host "✅ Hoàn tất! Kiểm tra IP:" -ForegroundColor Green
ipconfig | Select-String "IPv4"

# ========================================
# CÁCH 2: Dùng GUI (Dễ hơn cho người mới)
# ========================================

# 1. Nhấn Windows + R
# 2. Gõ: ncpa.cpl → Enter
# 3. Click phải vào adapter đang dùng → Properties
# 4. Double-click "Internet Protocol Version 4 (TCP/IPv4)"
# 5. Chọn "Use the following IP address:"
#    - IP address: 192.168.1.35
#    - Subnet mask: 255.255.255.0
#    - Default gateway: 192.168.1.1
# 6. Chọn "Use the following DNS server addresses:"
#    - Preferred DNS: 8.8.8.8
#    - Alternate DNS: 8.8.4.4
# 7. Click OK → OK
# 8. Restart adapter hoặc PC

# ========================================
# Khôi phục về IP động (DHCP)
# ========================================

# Nếu muốn quay lại dùng IP động:
Set-NetIPInterface -InterfaceAlias $adapter -Dhcp Enabled
Set-DnsClientServerAddress -InterfaceAlias $adapter -ResetServerAddresses
