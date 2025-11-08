# 🚀 Hướng Dẫn Deploy Backend Job4S

## Chuẩn bị

### 1. Firebase Admin SDK
1. Truy cập [Firebase Console](https://console.firebase.google.com)
2. Chọn project → ⚙️ Settings → Service accounts
3. Click "Generate new private key"
4. Lưu file JSON

### 2. Environment Variables
Cần các biến môi trường sau:

```bash
NODE_ENV=production
PORT=3000
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project-id.iam.gserviceaccount.com
ALLOWED_ORIGINS=https://your-app.com,exp://your-expo-app
AI_API_KEY=your-openai-key
AI_API_URL=https://api.openai.com/v1
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## Option 1: Deploy lên Render.com (Khuyến nghị)

### Bước 1: Push code lên GitHub
```bash
cd server
git add .
git commit -m "feat(backend): add Node.js Express server"
git push origin main
```

### Bước 2: Tạo Web Service trên Render
1. Truy cập https://render.com
2. Click **New** → **Web Service**
3. Connect GitHub repository
4. Cấu hình:
   - **Name**: `job4s-api`
   - **Region**: Singapore
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

### Bước 3: Thêm Environment Variables
1. Vào **Environment** tab
2. Thêm từng biến từ file `env.example`
3. Với `FIREBASE_PRIVATE_KEY`, paste toàn bộ key trong dấu `"..."`

### Bước 4: Deploy
- Click **Create Web Service**
- Đợi 3-5 phút để deploy
- URL sẽ có dạng: `https://job4s-api.onrender.com`

### Bước 5: Test
```bash
curl https://job4s-api.onrender.com/health
```

---

## Option 2: Deploy lên Railway.app

### Bước 1: Cài đặt Railway CLI
```bash
npm i -g @railway/cli
railway login
```

### Bước 2: Deploy
```bash
cd server
railway init
railway up
```

### Bước 3: Set Environment Variables
```bash
railway variables set NODE_ENV=production
railway variables set FIREBASE_PROJECT_ID=your-project-id
railway variables set FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
railway variables set FIREBASE_CLIENT_EMAIL=your-email@project.iam.gserviceaccount.com
railway variables set ALLOWED_ORIGINS=https://your-app.com
railway variables set AI_API_KEY=your-key
```

### Bước 4: Open
```bash
railway open
```

---

## Option 3: Deploy với Docker

### Build image
```bash
cd server
docker build -t job4s-api .
```

### Run container
```bash
docker run -d \
  -p 3000:3000 \
  --env-file .env \
  --name job4s-api \
  job4s-api
```

### Deploy lên Docker Hub
```bash
docker tag job4s-api yourusername/job4s-api
docker push yourusername/job4s-api
```

---

## Option 4: Deploy lên Vercel (Serverless)

### Bước 1: Cài đặt Vercel CLI
```bash
npm i -g vercel
```

### Bước 2: Tạo file `vercel.json`
```json
{
  "version": 2,
  "builds": [
    {
      "src": "dist/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "dist/index.js"
    }
  ]
}
```

### Bước 3: Deploy
```bash
cd server
npm run build
vercel --prod
```

---

## Kiểm tra Backend hoạt động

### 1. Health Check
```bash
curl https://your-api-url.com/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-11-08T..."
}
```

### 2. Test API với Postman
Import collection:
```bash
GET https://your-api-url.com/api/jobs
```

### 3. Test Authentication
```bash
curl -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  https://your-api-url.com/api/auth/verify
```

---

## Cập nhật CORS trong Client App

Sau khi deploy, cập nhật URL trong client:

```typescript
// src/config/api.ts
export const API_BASE_URL = 
  __DEV__ 
    ? 'http://localhost:3000' 
    : 'https://job4s-api.onrender.com';
```

---

## Troubleshooting

### Lỗi: "Missing Firebase credentials"
- Kiểm tra environment variables đã set đúng chưa
- Private key phải có `\n` thực sự, không phải string `\\n`

### Lỗi: "CORS blocked"
- Thêm URL client app vào `ALLOWED_ORIGINS`
- Format: `https://your-app.com,exp://192.168.1.100:19000`

### Lỗi: "Module not found"
- Chạy `npm install` lại
- Kiểm tra `NODE_ENV=production`

### Lỗi: "Port already in use"
- Đổi `PORT` trong `.env`
- Hoặc kill process: `lsof -ti:3000 | xargs kill`

---

## Monitoring & Logs

### Render.com
- Vào Dashboard → Logs tab
- Xem realtime logs

### Railway.app
```bash
railway logs
```

### Docker
```bash
docker logs -f job4s-api
```

---

## Backup & Rollback

### Render
- Mỗi deploy tạo 1 snapshot
- Rollback: Settings → Deploys → Manual Deploy (chọn commit cũ)

### Railway
```bash
railway rollback
```

---

## Security Checklist

- [ ] Environment variables đã set đúng
- [ ] CORS đã cấu hình chỉ allow origins cần thiết
- [ ] Rate limiting đã enable
- [ ] Firebase Rules đã set production mode
- [ ] HTTPS bắt buộc (Render/Railway tự động)
- [ ] API keys không commit lên Git

---

## Next Steps

1. ✅ Deploy backend
2. ✅ Test các endpoints
3. ✅ Cập nhật API URL trong client app
4. ✅ Test end-to-end flow
5. ✅ Monitor logs và fix bugs
6. ✅ Setup CI/CD (optional)

