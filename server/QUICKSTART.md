# ⚡ Quick Start - Job4S Backend

## 🎯 Bước 1: Cài đặt (5 phút)

```bash
cd server
npm install
```

## 🔑 Bước 2: Cấu hình Firebase (10 phút)

### Lấy Service Account Key

1. https://console.firebase.google.com
2. Project Settings → Service accounts
3. Generate new private key → Download JSON

### Tạo file .env

```bash
NODE_ENV=development
PORT=3000

FIREBASE_PROJECT_ID=job4s-xxxxx
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@job4s-xxxxx.iam.gserviceaccount.com

ALLOWED_ORIGINS=http://localhost:19000,exp://localhost:19000

AI_API_KEY=
AI_API_URL=https://api.openai.com/v1

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Copy từ file JSON đã download:**
- `project_id` → `FIREBASE_PROJECT_ID`
- `private_key` → `FIREBASE_PRIVATE_KEY` (giữ nguyên `\n`)
- `client_email` → `FIREBASE_CLIENT_EMAIL`

## 🚀 Bước 3: Chạy Server (1 phút)

```bash
npm run dev
```

Server chạy tại: http://localhost:3000

## ✅ Bước 4: Test (2 phút)

```bash
# Health check
curl http://localhost:3000/health

# Get jobs
curl http://localhost:3000/api/jobs
```

## 📱 Bước 5: Kết nối Client App

File `src/config/api.ts` đã được tạo sẵn.

Test từ client:

```typescript
import { jobApiService } from '@/services';

const jobs = await jobApiService.getAllJobs();
console.log(jobs);
```

## 🌐 Bước 6: Deploy (30 phút)

### Option A: Render.com (Free, Khuyến nghị)

1. Push code lên GitHub
2. https://render.com → New Web Service
3. Connect repo → Root: `server`
4. Build: `npm install && npm run build`
5. Start: `npm start`
6. Add environment variables từ `.env`
7. Deploy

### Option B: Railway.app (Free)

```bash
npm i -g @railway/cli
railway login
cd server
railway init
railway up
railway variables set NODE_ENV=production
railway variables set FIREBASE_PROJECT_ID=...
railway open
```

## 📋 Checklist

- [ ] `npm install` thành công
- [ ] File `.env` đã tạo với Firebase credentials
- [ ] `npm run dev` chạy không lỗi
- [ ] `curl http://localhost:3000/health` trả về `{"status":"ok"}`
- [ ] Client app connect được backend
- [ ] Deploy thành công lên Render/Railway
- [ ] Update `API_BASE_URL` trong client app

## 🐛 Troubleshooting

### "Missing Firebase credentials"
→ Kiểm tra `.env` có đầy đủ 3 biến Firebase

### "Port 3000 already in use"
→ `lsof -ti:3000 | xargs kill` hoặc đổi PORT trong `.env`

### "CORS error"
→ Thêm URL client vào `ALLOWED_ORIGINS`

### Module not found
→ `rm -rf node_modules && npm install`

## 📚 Tài liệu chi tiết

- [README.md](./README.md) - Overview
- [SETUP_LOCAL.md](./SETUP_LOCAL.md) - Chi tiết setup local
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Hướng dẫn deploy
- [POSTMAN_COLLECTION.json](./POSTMAN_COLLECTION.json) - Test API

## 🎉 Xong!

Backend đã sẵn sàng. Giờ tích hợp vào client app:

```typescript
// Example: Lấy jobs từ API thay vì Firestore trực tiếp
import { jobApiService } from '@/services';

const MyComponent = () => {
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    const fetchJobs = async () => {
      const data = await jobApiService.getAllJobs();
      setJobs(data.jobs);
    };
    fetchJobs();
  }, []);

  return <JobList jobs={jobs} />;
};
```

