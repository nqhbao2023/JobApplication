# Fix Lỗi 404 Khi Cài APK Build

## Vấn đề
- APK build được cài trên máy ngoài bị lỗi "Request failed with status code 404"
- IP của máy tính thay đổi mỗi khi khởi động lại PC
- File `eas.json` đã hard-code IP `192.168.1.15:3000`

## Nguyên nhân
Khi build APK với EAS, biến môi trường `EXPO_PUBLIC_API_URL` được compile vào app. Nếu IP thay đổi, app không thể kết nối tới server.

---

## GIẢI PHÁP

### **Cách 1: Cố định IP của máy tính (Khuyến nghị cho Dev)**

#### Bước 1: Kiểm tra IP hiện tại
```powershell
ipconfig
```
Tìm dòng `IPv4 Address` của adapter đang dùng (Wi-Fi hoặc Ethernet)

#### Bước 2: Cố định IP trong Windows

1. Mở **Settings** → **Network & Internet**
2. Click vào **Wi-Fi** hoặc **Ethernet** (tùy bạn đang dùng)
3. Click vào kết nối đang active
4. Kéo xuống → Click **Edit** ở phần **IP assignment**
5. Chọn **Manual** → Bật **IPv4**
6. Điền thông tin:
   - **IP address**: `192.168.1.15` (hoặc IP bạn muốn cố định)
   - **Subnet mask**: `255.255.255.0`
   - **Gateway**: `192.168.1.1` (IP của router)
   - **Preferred DNS**: `8.8.8.8`
   - **Alternate DNS**: `8.8.4.4`
7. Click **Save**

#### Bước 3: Restart network hoặc PC

#### Bước 4: Update eas.json với IP cố định
```json
{
  "build": {
    "development": {
      "env": {
        "EXPO_PUBLIC_API_URL": "http://192.168.1.15:3000"
      }
    }
  }
}
```

---

### **Cách 2: Dùng Production Server (Khuyến nghị cho Testing)**

Thay vì dùng server local, build APK kết nối tới server production trên Render.

#### Bước 1: Update eas.json
```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://job4s-server.onrender.com"
      }
    }
  }
}
```

#### Bước 2: Build với profile preview
```bash
eas build --platform android --profile preview
```

#### Ưu điểm:
- ✅ Không bị phụ thuộc vào IP local
- ✅ Test được với production environment
- ✅ Chia sẻ APK cho người khác test dễ dàng

#### Nhược điểm:
- ❌ Cần deploy server lên Render trước
- ❌ Không test được thay đổi code local ngay lập tức

---

### **Cách 3: Tự động detect IP khi build (Nâng cao)**

Dùng script để tự động lấy IP hiện tại và set vào build.

#### Bước 1: Tạo script PowerShell
Tạo file `build-local.ps1`:
```powershell
# Lấy IP hiện tại
$ip = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi" | Where-Object {$_.IPAddress -like "192.168.*"}).IPAddress

if (-not $ip) {
    $ip = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Ethernet" | Where-Object {$_.IPAddress -like "192.168.*"}).IPAddress
}

if (-not $ip) {
    Write-Error "Không tìm thấy IP local!"
    exit 1
}

Write-Host "🌐 Detected IP: $ip" -ForegroundColor Green

# Set environment variable và build
$env:EXPO_PUBLIC_API_URL = "http://${ip}:3000"
Write-Host "📦 Building with API_URL: $env:EXPO_PUBLIC_API_URL" -ForegroundColor Cyan

# Build APK
eas build --platform android --profile development --local
```

#### Bước 2: Chạy script để build
```powershell
.\build-local.ps1
```

---

## KHUYẾN NGHỊ

### Cho Development (test code trên máy thật):
👉 **Dùng Cách 1** - Cố định IP để tiện làm việc

### Cho Testing/QA (chia sẻ APK cho người khác):
👉 **Dùng Cách 2** - Build với production server

### Cho CI/CD automation:
👉 **Dùng Cách 3** - Auto-detect IP

---

## Các lệnh cần thiết

### Kiểm tra IP hiện tại
```powershell
ipconfig | Select-String "IPv4"
```

### Build với production server
```bash
eas build --platform android --profile preview
```

### Chạy server local
```bash
cd server
npm run dev
```

### Test kết nối từ điện thoại
Mở browser trên điện thoại, truy cập:
```
http://192.168.1.15:3000/health
```
Nếu thấy response JSON → Server OK!

---

## Troubleshooting

### App vẫn bị 404 sau khi cố định IP?
1. Check server có đang chạy không: `cd server && npm run dev`
2. Check firewall có block port 3000 không
3. Check IP trong eas.json có đúng với IP đã cố định không
4. Build lại APK với IP mới: `eas build --platform android --profile development`

### Không cố định được IP?
- Router có thể đã reserve IP đó cho thiết bị khác
- Thử IP khác trong dải 192.168.1.10 - 192.168.1.254

### Production server bị slow?
- Render free tier có thể sleep sau 15 phút không dùng
- Lần đầu request sẽ mất ~30s để wake up
