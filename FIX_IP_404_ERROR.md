# ✅ ĐÃ SỬA LỖI 404 - IP THAY ĐỔI

## VẤN ĐỀ
- APK build bị lỗi "Request failed with status code 404"
- IP máy tính thay đổi từ `192.168.1.15` → `192.168.1.19`
- eas.json có IP cũ hard-coded

## ĐÃ SỬA XONG
✅ Update `eas.json` với IP hiện tại: `192.168.1.19:3000`
✅ Thêm production URL cho preview/production profiles
✅ Tạo các scripts tự động

---

## CÁC SCRIPTS ĐÃ TẠO

### 1. `test-connection.ps1` - Kiểm tra kết nối
```powershell
.\test-connection.ps1
```
**Chức năng:**
- ✅ Detect IP hiện tại
- ✅ Check server có đang chạy
- ✅ Test HTTP connection
- ✅ Check firewall
- ✅ So sánh IP trong eas.json
- ✅ Hiển thị hướng dẫn test từ điện thoại

### 2. `build-with-current-ip.ps1` - Build tự động
```powershell
# Build trên EAS cloud
.\build-with-current-ip.ps1

# Build local
.\build-with-current-ip.ps1 -Local
```
**Chức năng:**
- ✅ Tự động detect IP
- ✅ Update eas.json
- ✅ Backup eas.json
- ✅ Build APK
- ✅ Restore eas.json (nếu muốn)

### 3. `fix-static-ip.ps1` - Cố định IP
```powershell
# Chạy PowerShell as Administrator
.\fix-static-ip.ps1
```
**Chức năng:**
- Hướng dẫn cố định IP bằng PowerShell hoặc GUI

---

## HƯỚNG DẪN SỬ DỤNG

### TH1: Build APK mới với IP hiện tại (192.168.1.19)

#### Bước 1: Start server
```powershell
cd server
npm run dev
```

#### Bước 2: Test kết nối
```powershell
.\test-connection.ps1
```

#### Bước 3: Build APK
```bash
# Option 1: EAS cloud build (khuyến nghị)
eas build --platform android --profile development

# Option 2: Dùng script tự động
.\build-with-current-ip.ps1

# Option 3: Local build (chậm hơn nhưng free)
.\build-with-current-ip.ps1 -Local
```

#### Bước 4: Cài APK
- Download APK từ EAS
- Cài trên điện thoại
- **QUAN TRỌNG**: Điện thoại phải cùng Wi-Fi với máy tính!

#### Bước 5: Test
Mở browser trên điện thoại: `http://192.168.1.19:3000/health`

---

### TH2: Cố định IP để không bị thay đổi nữa

#### Cách 1: GUI (Dễ nhất)
1. Windows + R → `ncpa.cpl`
2. Click phải Wi-Fi → Properties
3. Double-click "Internet Protocol Version 4"
4. Chọn "Use the following IP address"
5. Nhập:
   - IP: `192.168.1.15` (hoặc IP bạn muốn)
   - Subnet: `255.255.255.0`
   - Gateway: `192.168.1.1`
   - DNS: `8.8.8.8` và `8.8.4.4`
6. OK → OK

#### Cách 2: PowerShell (Nhanh hơn)
Xem hướng dẫn trong `fix-static-ip.ps1`

#### Sau khi cố định IP:
```powershell
# Update eas.json với IP mới
.\build-with-current-ip.ps1

# Build lại APK
eas build --platform android --profile development
```

---

### TH3: Build để chia sẻ (không cần server local)

```bash
# Build với production server trên Render
eas build --platform android --profile preview
```

**Ưu điểm:**
- Không phụ thuộc IP local
- Chia sẻ cho bất kỳ ai
- Không cần chạy server local

---

## CẤU HÌNH eas.json HIỆN TẠI

```json
{
  "build": {
    "development": {
      "env": {
        "EXPO_PUBLIC_API_URL": "http://192.168.1.19:3000"  // ← Local server
      }
    },
    "preview": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://job4s-server.onrender.com"  // ← Production
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://job4s-server.onrender.com"  // ← Production
      }
    }
  }
}
```

---

## TROUBLESHOOTING

### Vẫn bị 404?

1. **Check server đang chạy:**
   ```powershell
   cd server
   npm run dev
   ```

2. **Check IP có đúng:**
   ```powershell
   .\test-connection.ps1
   ```

3. **Check điện thoại cùng Wi-Fi:**
   - Settings → Wi-Fi trên điện thoại
   - Phải cùng tên Wi-Fi với máy tính

4. **Test từ điện thoại:**
   - Mở browser
   - Vào: `http://192.168.1.19:3000/health`
   - Phải thấy JSON response

5. **Check firewall:**
   ```powershell
   # Mở port 3000
   New-NetFirewallRule -DisplayName "Node Server" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
   ```

### IP lại thay đổi?

→ Cố định IP theo hướng dẫn TH2 ở trên

### Build bị lỗi?

1. Check EAS CLI: `eas --version` (cần >= 16.28.0)
2. Login: `eas login`
3. Xem logs để tìm lỗi cụ thể

---

## TÓM TẮT LỆNH NHANH

```powershell
# Kiểm tra kết nối
.\test-connection.ps1

# Build với IP tự động
.\build-with-current-ip.ps1

# Build với profile development
eas build --platform android --profile development

# Build với production server
eas build --platform android --profile preview

# Start server
cd server; npm run dev

# Check IP
ipconfig | Select-String "IPv4"
```

---

## FILES LIÊN QUAN

- `QUICK_BUILD_GUIDE.md` - Hướng dẫn chi tiết
- `FIX_404_BUILD_APK.md` - Giải thích vấn đề và giải pháp
- `test-connection.ps1` - Script test kết nối
- `build-with-current-ip.ps1` - Script build tự động
- `fix-static-ip.ps1` - Script cố định IP
- `eas.json` - Config build

---

## NEXT STEPS

1. ✅ **Ngay bây giờ:** Build APK với IP hiện tại (192.168.1.19)
2. ⭐ **Khuyến nghị:** Cố định IP máy tính để không bị thay đổi nữa
3. 🚀 **Tương lai:** Dùng production server cho testing/QA
