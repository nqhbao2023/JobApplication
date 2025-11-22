# 📱 HƯỚNG DẪN CHIA SẺ APK CHO GIẢNG VIÊN

## ❓ VẤN ĐỀ

Bạn cần gửi APK cho giảng viên test ở xa (không cùng Wi-Fi).

**Không thể dùng:** Build với local IP (`192.168.1.19:3000`)  
**Vì sao?** Chỉ hoạt động khi cùng Wi-Fi

---

## ✅ 3 GIẢI PHÁP

### **Solution 1: Deploy lên Render** ⭐ KHUYẾN NGHỊ

**Ưu điểm:**
- ✅ MIỄN PHÍ mãi mãi
- ✅ URL cố định: `https://job4s-server.onrender.com`
- ✅ Không cần máy tính bật
- ✅ Chia sẻ cho bất kỳ ai
- ✅ Dùng lâu dài (bảo vệ đồ án, nộp báo cáo...)

**Nhược điểm:**
- ⏱️ Setup lần đầu: 10-15 phút
- ⚠️ Server sleep sau 15 phút không dùng (lần đầu chậm 30s)

**Khi nào dùng:**
- 🎓 Bảo vệ đồ án
- 📤 Nộp báo cáo cho giảng viên
- 🧪 Test lâu dài

**Hướng dẫn:** [`DEPLOY_SERVER_RENDER.md`](./DEPLOY_SERVER_RENDER.md)

---

### **Solution 2: Dùng ngrok** ⚡ NHANH NHẤT

**Ưu điểm:**
- ✅ Setup siêu nhanh: 5 phút
- ✅ Không cần deploy
- ✅ Test ngay lập tức

**Nhược điểm:**
- ❌ Máy tính phải BẬT khi giảng viên test
- ❌ URL thay đổi mỗi lần restart (free tier)
- ❌ Giới hạn 40 requests/phút

**Khi nào dùng:**
- ⚡ Demo NGAY (không đợi deploy)
- 🧪 Test nhanh 1-2 lần
- 💻 Có thể giữ máy bật khi giảng viên test

**Hướng dẫn:** [`USE_NGROK_DEMO.md`](./USE_NGROK_DEMO.md)

---

### **Solution 3: Dùng LocalTunnel** (Tương tự ngrok)

**Ưu điểm:**
- ✅ Không cần đăng ký tài khoản
- ✅ Không giới hạn requests
- ✅ Setup nhanh

**Nhược điểm:**
- ❌ Máy tính phải BẬT
- ❌ Kém ổn định hơn ngrok
- ❌ URL thay đổi

**Setup:**
```powershell
# Cài đặt
npm install -g localtunnel

# Start server
cd server
npm run dev

# Start tunnel (terminal mới)
lt --port 3000

# Nhận URL: https://random.loca.lt
```

---

## 📊 SO SÁNH CHI TIẾT

| Tiêu chí | Render | ngrok | LocalTunnel |
|----------|--------|-------|-------------|
| **Miễn phí** | ✅ Có | ✅ Có | ✅ Có |
| **Setup** | 10-15 phút | 5 phút | 2 phút |
| **Cần máy bật** | ❌ Không | ✅ Có | ✅ Có |
| **URL cố định** | ✅ Có | ❌ Không | ❌ Không |
| **Giới hạn** | Không | 40 req/min | Không |
| **Wake up time** | 30s (lần đầu) | Ngay lập tức | Ngay lập tức |
| **Ổn định** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Dùng lâu dài** | ✅ Có | ❌ Không | ❌ Không |

---

## 🎯 KHUYẾN NGHỊ

### Nếu bạn có thời gian (>1 giờ):
👉 **Dùng Render** - Deploy 1 lần, dùng mãi mãi

### Nếu cần demo NGAY (trong 30 phút):
👉 **Dùng ngrok** - Setup nhanh, demo xong tắt

### Nếu giảng viên test liên tục nhiều ngày:
👉 **PHẢI dùng Render** - Không thể giữ máy bật mãi

---

## 🚀 WORKFLOW KHUYẾN NGHỊ

### BƯỚC 1: Deploy Render (làm 1 lần)

```powershell
# 1. Push code lên GitHub
git add .
git commit -m "Deploy to Render"
git push origin main

# 2. Deploy lên Render (theo hướng dẫn DEPLOY_SERVER_RENDER.md)
# URL: https://job4s-server.onrender.com

# 3. Setup cron job (giữ server không sleep)
# Dùng cron-job.org hoặc uptimerobot.com
```

### BƯỚC 2: Build APK với production URL

```bash
# Profile preview đã config sẵn
eas build --platform android --profile preview

# Hoặc production
eas build --platform android --profile production
```

### BƯỚC 3: Test APK

```powershell
# Download APK
# Cài trên điện thoại
# Test: Mở app, đăng nhập, xem jobs...
```

### BƯỚC 4: Chia sẻ

```
1. Upload APK lên Google Drive
2. Get shareable link
3. Gửi cho giảng viên qua email:

---
Subject: [Đồ án tốt nghiệp] APK Job4S App

Thưa thầy/cô,

Em gửi file APK ứng dụng Job4S để thầy/cô test:

📥 Link download APK: [Google Drive link]

📱 Hướng dẫn cài đặt:
1. Download file APK
2. Bật "Install from unknown sources" trong Settings
3. Mở file APK và cài đặt

🔐 Tài khoản test:
- Email: admin@test.com
- Password: 123456

⚠️ Lưu ý: Lần đầu mở app có thể chậm 30 giây (server đang khởi động)

Em cảm ơn thầy/cô!
---
```

---

## ⚡ DEMO NHANH VỚI NGROK (Nếu cần gấp)

```powershell
# 1. Start server
cd server
npm run dev

# 2. Start ngrok (terminal mới)
cd C:\ngrok
.\ngrok http 3000

# 3. Copy URL ngrok (ví dụ: https://abc123.ngrok-free.app)

# 4. Update eas.json
# Thay EXPO_PUBLIC_API_URL = "https://abc123.ngrok-free.app"

# 5. Build APK
eas build --platform android --profile preview

# 6. GIỮ MÁY BẬT khi giảng viên test!
```

---

## 📋 CHECKLIST TRƯỚC KHI GỬI CHO GIẢNG VIÊN

### Render:
- [ ] Server đã deploy thành công
- [ ] Test URL: `curl https://job4s-server.onrender.com/health`
- [ ] Setup cron job (giữ server không sleep)
- [ ] APK build với profile `preview` hoặc `production`
- [ ] Test APK trên điện thoại của bạn
- [ ] Upload APK lên Google Drive
- [ ] Tạo tài khoản test cho giảng viên

### ngrok:
- [ ] ngrok đang chạy
- [ ] Server đang chạy
- [ ] APK build với ngrok URL
- [ ] Test APK trên điện thoại của bạn
- [ ] Lên lịch giữ máy bật khi giảng viên test
- [ ] Upload APK lên Google Drive

---

## 🆘 TROUBLESHOOTING

### APK không kết nối được server?

#### Check 1: Server có running không?
```powershell
# Render
curl https://job4s-server.onrender.com/health

# ngrok
curl https://your-url.ngrok-free.app/health
```

#### Check 2: URL trong APK đúng chưa?
```powershell
# Xem config trong eas.json
cat eas.json | Select-String "EXPO_PUBLIC_API_URL"
```

#### Check 3: Build lại APK với URL đúng
```bash
eas build --platform android --profile preview
```

---

## 💰 CHI PHÍ (Nếu cần)

### Render (Nếu muốn server không sleep)
- Free: $0/tháng (có sleep 15 phút)
- Paid: $7/tháng (không sleep)

### ngrok (Nếu muốn URL cố định)
- Free: $0/tháng (URL thay đổi)
- Paid: $8/tháng (URL cố định)

### EAS Build
- Free: 30 builds/tháng
- Paid: Unlimited builds ($29/tháng)

**Tổng chi phí khuyến nghị:** $0 (dùng free tier)

---

## 🎓 KẾT LUẬN

**Cho đồ án tốt nghiệp:**
👉 **Deploy lên Render** - Chuyên nghiệp, ổn định, dùng lâu dài

**Cho demo nhanh:**
👉 **Dùng ngrok** - Nhanh, đơn giản, tạm thời

---

Bạn muốn tôi hướng dẫn deploy lên Render ngay bây giờ không?
