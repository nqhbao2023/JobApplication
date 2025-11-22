# 🚀 DEPLOY SERVER LÊN RENDER (MIỄN PHÍ)

## Tại sao cần deploy?
- ✅ Chia sẻ APK cho bất kỳ ai (giảng viên, bạn bè...)
- ✅ Không cần cùng Wi-Fi
- ✅ Không cần máy tính bật server
- ✅ Hoàn toàn MIỄN PHÍ

---

## BƯỚC 1: Chuẩn bị code server

### 1.1. Check file cần thiết
```powershell
cd server
ls
```

Cần có:
- ✅ `package.json`
- ✅ `src/` folder
- ✅ `Procfile` (cho Render)
- ✅ `render.yaml` (config Render)

### 1.2. Tạo file start script (nếu chưa có)

File `package.json` cần có:
```json
{
  "scripts": {
    "start": "node dist/index.js",
    "build": "tsc",
    "dev": "nodemon"
  }
}
```

---

## BƯỚC 2: Push code lên GitHub

```powershell
# Từ thư mục root (JobApplication)
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

---

## BƯỚC 3: Deploy lên Render

### 3.1. Tạo tài khoản Render
1. Vào: https://render.com
2. Sign up với GitHub
3. Authorize Render truy cập repo

### 3.2. Tạo Web Service
1. Click **"New +"** → **"Web Service"**
2. Chọn repository: `JobApplication`
3. Config:
   - **Name**: `job4s-server`
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`

### 3.3. Thêm Environment Variables
Click **"Advanced"** → **"Add Environment Variable"**

```
NODE_ENV=production
PORT=3000
```

**Nếu cần Firebase/Algolia/Gemini:**
```
GOOGLE_APPLICATION_CREDENTIALS_JSON=<paste nội dung google-services.json>
ALGOLIA_APP_ID=<your-app-id>
ALGOLIA_API_KEY=<your-api-key>
GEMINI_API_KEY=<your-gemini-key>
```

### 3.4. Deploy
1. Click **"Create Web Service"**
2. Đợi 3-5 phút
3. Nhận được URL: `https://job4s-server.onrender.com`

---

## BƯỚC 4: Test server production

```powershell
# Test từ máy tính
curl https://job4s-server.onrender.com/health

# Test API
curl https://job4s-server.onrender.com/api/jobs
```

---

## BƯỚC 5: Build APK với production server

### 5.1. Đã config sẵn trong eas.json
```json
{
  "build": {
    "preview": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://job4s-server.onrender.com"
      }
    }
  }
}
```

### 5.2. Build APK
```bash
# Build với production server
eas build --platform android --profile preview

# Hoặc dùng profile production
eas build --platform android --profile production
```

### 5.3. Download và chia sẻ APK
1. Vào https://expo.dev
2. Download APK
3. Gửi cho giảng viên qua:
   - Google Drive
   - Email
   - Zalo/Telegram

---

## ⚠️ LƯU Ý QUAN TRỌNG

### Render Free Tier
- ✅ MIỄN PHÍ mãi mãi
- ⚠️ Server **sleep** sau 15 phút không dùng
- ⚠️ Lần đầu request sau khi sleep: **30-50 giây** để wake up
- ✅ Sau khi wake up: nhanh bình thường

### Giải pháp cho vấn đề sleep:
1. **Tạo cron job ping server** (khuyến nghị)
2. **Warn giảng viên**: "Lần đầu mở app có thể chậm 30s"
3. **Upgrade lên paid plan**: $7/tháng (không sleep)

---

## CRON JOB PING SERVER (Giữ server luôn chạy)

### Cách 1: Dùng cron-job.org (MIỄN PHÍ)
1. Vào: https://cron-job.org
2. Tạo tài khoản
3. Tạo job:
   - URL: `https://job4s-server.onrender.com/health`
   - Interval: Mỗi 10 phút
4. Save

→ Server sẽ không bao giờ sleep!

### Cách 2: Dùng UptimeRobot (MIỄN PHÍ)
1. Vào: https://uptimerobot.com
2. Tạo monitor:
   - Type: HTTP(s)
   - URL: `https://job4s-server.onrender.com/health`
   - Interval: 5 phút

---

## TROUBLESHOOTING

### Build Render bị lỗi?
1. Check logs trong Render dashboard
2. Đảm bảo `server/package.json` có đủ scripts
3. Check `tsconfig.json` có đúng config

### APK không kết nối được?
1. Check server có running: `curl https://job4s-server.onrender.com/health`
2. Check URL trong `eas.json` đúng chưa
3. Build lại APK với profile `preview`

### Server bị 404/500?
1. Check environment variables trong Render
2. Check Firebase credentials
3. Check logs trong Render

---

## DEMO CHO GIẢNG VIÊN

### Trước khi demo:
```powershell
# Ping server để wake up (nếu đang sleep)
curl https://job4s-server.onrender.com/health

# Đợi 30s nếu thấy chậm
# Ping lại để confirm
curl https://job4s-server.onrender.com/health
```

### Khi demo:
1. Mở app trên điện thoại
2. Nếu lần đầu chậm → Giải thích: "Server free đang wake up"
3. Sau đó sẽ nhanh bình thường

### Tips demo mượt:
- Mở app 5 phút trước khi demo
- Tương tác 1 chút để wake server
- Khi giảng viên test sẽ nhanh ngay

---

## TÓM TẮT WORKFLOW

```
1. Deploy server lên Render (1 lần)
   ↓
2. Setup cron job ping (1 lần)
   ↓
3. Build APK với profile preview
   ↓
4. Download APK
   ↓
5. Gửi cho giảng viên
   ↓
6. Giảng viên cài và test (ở bất kỳ đâu)
```

---

## THỜI GIAN ƯỚC TÍNH

- Deploy lên Render: **5-10 phút**
- Setup cron job: **2 phút**
- Build APK: **10-15 phút**
- **Tổng**: ~30 phút

→ Làm 1 lần, dùng mãi mãi!
