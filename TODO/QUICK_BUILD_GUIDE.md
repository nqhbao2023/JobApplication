# 🚀 HƯỚNG DẪN BUILD APK NHANH

## ✅ ĐÃ SỬA XONG

### IP hiện tại của bạn: **192.168.1.19**

Tôi đã update:
- ✅ `eas.json` → development profile → IP: `192.168.1.19:3000`
- ✅ `eas.json` → preview/production profile → URL: `https://job4s-server.onrender.com`
- ✅ Tạo script tự động: `build-with-current-ip.ps1`

---

## 📋 CÁC CÁCH BUILD

### **Cách 1: Build với Server Local (Test thay đổi code ngay)**

#### Bước 1: Chạy server
```powershell
cd server
npm run dev
```

#### Bước 2: Build APK (chọn 1 trong 2)

**Option A: Dùng script tự động (Khuyến nghị)**
```powershell
# Script sẽ tự detect IP và build
.\build-with-current-ip.ps1

# Hoặc build local (không cần EAS cloud)
.\build-with-current-ip.ps1 -Local
```

**Option B: Build thủ công**
```bash
eas build --platform android --profile development
```

#### Bước 3: Cài APK
- Download APK về điện thoại
- Cài đặt
- **QUAN TRỌNG**: Điện thoại và máy tính phải cùng Wi-Fi!

#### Bước 4: Test
Mở browser trên điện thoại, vào: `http://192.168.1.19:3000/health`

---

### **Cách 2: Build với Production Server (Chia sẻ cho người khác)**

```bash
# Build với server trên Render
eas build --platform android --profile preview
```

**Ưu điểm:**
- ✅ Không phụ thuộc IP local
- ✅ Chia sẻ APK cho bất kỳ ai
- ✅ Không cần chạy server local

**Nhược điểm:**
- ❌ Cần deploy server lên Render trước
- ❌ Server free có thể sleep (30s đầu chậm)

---

## 🔧 FIX LỖI IP THAY ĐỔI

### **Giải pháp A: Cố định IP máy tính**

#### Cách 1: Dùng GUI (Dễ nhất)
1. Nhấn `Windows + R` → gõ `ncpa.cpl` → Enter
2. Click phải vào **Wi-Fi** hoặc **Ethernet** → **Properties**
3. Double-click **Internet Protocol Version 4 (TCP/IPv4)**
4. Chọn **Use the following IP address:**
   - IP address: `192.168.1.15` (hoặc IP bạn thích)
   - Subnet mask: `255.255.255.0`
   - Default gateway: `192.168.1.1`
5. Chọn **Use the following DNS server addresses:**
   - Preferred DNS: `8.8.8.8`
   - Alternate DNS: `8.8.4.4`
6. Click **OK** → **OK**
7. Restart network adapter

#### Cách 2: Dùng PowerShell (Nhanh hơn)
```powershell
# Chạy PowerShell as Administrator
# Xem hướng dẫn trong file fix-static-ip.ps1
.\fix-static-ip.ps1
```

#### Sau khi cố định IP:
1. Update `eas.json` với IP mới (nếu cần)
2. Build lại APK
3. Từ giờ IP sẽ không thay đổi nữa!

---

### **Giải pháp B: Dùng script tự động**

Mỗi lần IP thay đổi, chỉ cần chạy:
```powershell
.\build-with-current-ip.ps1
```

Script sẽ:
1. ✅ Tự động detect IP hiện tại
2. ✅ Update `eas.json`
3. ✅ Build APK với IP đúng
4. ✅ Backup & restore `eas.json`

---

## ⚡ WORKFLOW KHUYẾN NGHỊ

### Cho Development (test code hàng ngày):
```powershell
# 1. Cố định IP máy tính 1 lần (xem hướng dẫn trên)
# 2. Mỗi lần code:
cd server
npm run dev

# 3. Chạy app bằng Expo (không cần build)
npx expo start

# 4. Chỉ build APK khi cần test trên máy thật
eas build --platform android --profile development
```

### Cho Testing/QA (chia sẻ với người khác):
```bash
# Build 1 lần với production server
eas build --platform android --profile preview

# Chia sẻ APK cho testers
# Họ có thể test ở bất kỳ đâu (không cần cùng Wi-Fi)
```

---

## 🔍 TROUBLESHOOTING

### Vẫn bị lỗi 404 sau khi build?

#### Check 1: Server có đang chạy không?
```powershell
cd server
npm run dev
```
→ Phải thấy: `Server running on port 3000`

#### Check 2: IP trong eas.json đúng chưa?
```powershell
ipconfig | Select-String "IPv4"
```
→ So sánh với IP trong `eas.json`

#### Check 3: Điện thoại và máy tính cùng Wi-Fi?
- Mở Settings → Wi-Fi trên điện thoại
- Phải cùng tên Wi-Fi với máy tính

#### Check 4: Firewall có block không?
```powershell
# Mở port 3000 trong Windows Firewall
New-NetFirewallRule -DisplayName "Node Server" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
```

#### Check 5: Test kết nối
Từ điện thoại, mở browser vào: `http://192.168.1.19:3000/health`

- ✅ Thấy JSON response → Server OK
- ❌ Timeout/404 → Check firewall hoặc Wi-Fi

---

## 📱 SAU KHI BUILD

### Download APK:
1. Vào https://expo.dev/accounts/hoangbao1234/projects/JobApplication/builds
2. Download APK vừa build
3. Chuyển sang điện thoại (AirDrop, USB, hoặc link)

### Cài đặt:
1. Bật "Unknown sources" nếu chưa bật
2. Mở file APK → Install
3. Mở app

### Nếu app bị crash hoặc không kết nối:
1. Check server đang chạy
2. Check cùng Wi-Fi
3. Check IP trong app = IP máy tính
4. Xem logs: `adb logcat *:E` (nếu có ADB)

---

## 🎯 TÓM TẮT

| Tình huống | Giải pháp | Lệnh |
|-----------|----------|------|
| IP thay đổi liên tục | Cố định IP máy tính | Xem hướng dẫn trên |
| Cần test code ngay | Dùng Expo Dev | `npx expo start` |
| Build APK test local | Build development | `eas build -p android --profile development` |
| Build APK chia sẻ | Build preview/production | `eas build -p android --profile preview` |
| IP vừa thay đổi | Dùng script tự động | `.\build-with-current-ip.ps1` |

---

## 📞 LIÊN HỆ

Nếu vẫn gặp lỗi, cung cấp thông tin:
1. Output của `ipconfig`
2. Log từ server (`npm run dev`)
3. Screenshot lỗi trên app
4. Profile đã dùng build (development/preview/production)
