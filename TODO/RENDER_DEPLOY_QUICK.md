# 🚀 DEPLOY LÊN RENDER - HƯỚNG DẪN NHANH

## ✅ ĐÃ KIỂM TRA

Server code của bạn đã sẵn sàng:
- ✅ `render.yaml` - Config deploy
- ✅ `Procfile` - Start command
- ✅ `package.json` - Scripts build/start
- ✅ `src/` - Source code
- ✅ `tsconfig.json` - TypeScript config

---

## 🚀 DEPLOY NGAY (5 BƯỚC)

### BƯỚC 1: Push code lên GitHub (nếu chưa)

```powershell
# Check git status
git status

# Nếu có thay đổi
git add .
git commit -m "Ready for Render deployment"
git push origin main
```

---

### BƯỚC 2: Tạo tài khoản Render

1. Vào: **https://render.com**
2. Click **"Get Started for Free"**
3. Chọn **"Sign up with GitHub"**
4. Authorize Render truy cập GitHub

---

### BƯỚC 3: Tạo Web Service

1. Trong Render Dashboard, click **"New +"** → **"Web Service"**

2. **Connect Repository:**
   - Chọn `JobApplication` repo
   - Click **"Connect"**

3. **Configure Service:**
   ```
   Name: job4s-server
   Region: Singapore (hoặc gần Việt Nam nhất)
   Branch: main
   Root Directory: server
   Runtime: Node
   Build Command: npm install && npm run build
   Start Command: npm start
   Instance Type: Free
   ```

---

### BƯỚC 4: Thêm Environment Variables

Click **"Advanced"** → **"Add Environment Variable"**

#### 4.1. Biến bắt buộc:
```
NODE_ENV = production
PORT = 3000
```

#### 4.2. Firebase (BẮT BUỘC nếu dùng Firebase):

**Cách 1: Dùng Service Account JSON**
```powershell
# Từ thư mục root
cd server
cat google-services.json
```

Copy toàn bộ nội dung, paste vào:
```
GOOGLE_APPLICATION_CREDENTIALS_JSON = {...paste JSON...}
```

**Cách 2: Dùng từng key riêng**
```
FIREBASE_PROJECT_ID = job4s-xxxxx
FIREBASE_PRIVATE_KEY = -----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
FIREBASE_CLIENT_EMAIL = firebase-adminsdk-xxxxx@job4s-xxxxx.iam.gserviceaccount.com
```

#### 4.3. Algolia (nếu dùng search):
```
ALGOLIA_APP_ID = your-app-id
ALGOLIA_API_KEY = your-api-key
ALGOLIA_INDEX_NAME = jobs
```

#### 4.4. AI/Gemini (nếu dùng AI features):
```
GEMINI_API_KEY = your-gemini-api-key
AI_API_KEY = your-gemini-api-key
```

#### 4.5. CORS:
```
ALLOWED_ORIGINS = *
```

---

### BƯỚC 5: Deploy

1. Click **"Create Web Service"**
2. Đợi 3-5 phút (xem logs realtime)
3. Khi thấy **"Your service is live"** → XONG!

**URL của bạn:** `https://job4s-server.onrender.com`

---

## ✅ TEST SERVER

```powershell
# Test health check
curl https://job4s-server.onrender.com/health

# Test API
curl https://job4s-server.onrender.com/api/jobs

# Test từ browser
# Mở: https://job4s-server.onrender.com
```

**Nếu lần đầu chậm (30s):** Đó là bình thường! Server đang wake up từ sleep mode.

---

## 🔄 GIỮ SERVER KHÔNG SLEEP (KHUYẾN NGHỊ)

### Cách 1: Dùng cron-job.org (FREE)

1. Vào: **https://cron-job.org/en/signup.php**
2. Tạo tài khoản free
3. Tạo cron job:
   - **Title:** Keep Job4S Server Awake
   - **URL:** `https://job4s-server.onrender.com/health`
   - **Schedule:** Every 10 minutes
   - **Method:** GET
4. Save → Enable

### Cách 2: Dùng UptimeRobot (FREE)

1. Vào: **https://uptimerobot.com/signUp**
2. Tạo tài khoản free
3. Click **"Add New Monitor"**:
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** Job4S Server
   - **URL:** `https://job4s-server.onrender.com/health`
   - **Monitoring Interval:** 5 minutes
4. Create Monitor

→ Server sẽ **KHÔNG BAO GIỜ SLEEP** nữa!

---

## 📱 BUILD APK VỚI PRODUCTION SERVER

### Update eas.json (đã làm sẵn):
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

### Build APK:
```bash
# Build với production server
eas build --platform android --profile preview

# Hoặc
eas build --platform android --profile production
```

### Download APK:
1. Đợi build xong (10-15 phút)
2. Vào: https://expo.dev/accounts/hoangbao1234/projects/JobApplication/builds
3. Download APK
4. Gửi cho giảng viên!

---

## 🔧 UPDATE CODE SAU KHI DEPLOY

Mỗi khi thay đổi code server:

```powershell
# 1. Commit và push
git add .
git commit -m "Update server code"
git push origin main

# 2. Render sẽ TỰ ĐỘNG deploy lại!
# Xem logs trong Render Dashboard
```

---

## 📊 MONITOR SERVER

### Render Dashboard:
- **Logs:** Xem realtime logs
- **Metrics:** CPU, Memory usage
- **Events:** Deploy history
- **Shell:** SSH vào server (paid plan)

### Check server status:
```powershell
# Health check
curl https://job4s-server.onrender.com/health

# Nếu trả về JSON → Server OK
# Nếu timeout/error → Server có vấn đề
```

---

## 🆘 TROUBLESHOOTING

### Deploy bị lỗi "Build failed"?

**Check logs trong Render:**
1. Vào Render Dashboard → Your Service
2. Xem tab **"Logs"**
3. Tìm dòng màu đỏ

**Lỗi thường gặp:**

#### 1. "Cannot find module 'typescript'"
```powershell
# Fix: Thêm typescript vào dependencies
cd server
npm install --save-dev typescript @types/node
git add package.json package-lock.json
git commit -m "Add typescript to dependencies"
git push
```

#### 2. "tsc: command not found"
```yaml
# Fix: Update render.yaml
buildCommand: npm install && npx tsc
```

#### 3. Firebase credentials missing
→ Thêm environment variables (xem BƯỚC 4.2)

---

### Server bị 404/500?

```powershell
# Check logs
# Render Dashboard → Logs tab

# Xem có lỗi gì
# Thường là:
# - Missing environment variables
# - Firebase init failed
# - Port binding error
```

---

### Server quá chậm (>30s)?

**Nguyên nhân:** Free tier bị sleep  
**Giải pháp:** Setup cron job (xem phần trên)

---

## 💰 CHI PHÍ

### Render Free Tier:
- ✅ 750 giờ/tháng (đủ cho 1 service chạy 24/7)
- ✅ 100GB bandwidth/tháng
- ⚠️ Sleep sau 15 phút không hoạt động
- ⚠️ Build time: 500 phút/tháng

### Nếu cần upgrade:
- **Starter ($7/tháng):**
  - Không sleep
  - 100GB bandwidth
  - Faster CPU

---

## 📋 CHECKLIST

Deploy thành công khi:
- [ ] Render Dashboard hiển thị "Live"
- [ ] `curl https://job4s-server.onrender.com/health` trả về JSON
- [ ] Setup cron job để giữ server không sleep
- [ ] Build APK với production URL
- [ ] Test APK trên điện thoại
- [ ] APK hoạt động ngon lành (đăng nhập, xem jobs...)

---

## 🎉 XONG!

Server của bạn đã LIVE tại:
**https://job4s-server.onrender.com**

Giờ có thể:
- ✅ Chia sẻ APK cho bất kỳ ai
- ✅ Demo cho giảng viên
- ✅ Nộp báo cáo đồ án
- ✅ Test từ bất kỳ đâu

---

## 📞 HỖ TRỢ

Nếu gặp vấn đề:
1. Check logs trong Render Dashboard
2. Test với curl
3. Xem phần Troubleshooting ở trên
4. Google error message + "Render deploy"

**Good luck! 🚀**
