# Job4S Backend API

Node.js + Express + Firebase + AI backend cho ứng dụng Job4S.

## 🚀 Cài đặt

```bash
npm install
```

## 🔧 Cấu hình

Tạo file `.env` từ `.env.example`:

```bash
cp .env.example .env
```

Cập nhật các biến môi trường:
- `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`: Firebase Admin SDK credentials
- `AI_API_KEY`: OpenAI API key (optional, cho tính năng AI)
- `ALLOWED_ORIGINS`: Danh sách origins được phép (CORS)

## 📦 Firebase Admin SDK

1. Vào [Firebase Console](https://console.firebase.google.com)
2. Chọn project → Settings → Service accounts
3. Generate new private key → Download JSON
4. Copy thông tin vào `.env` hoặc đặt file `serviceAccountKey.json` trong thư mục `server/`

## 🏃 Chạy Development

```bash
npm run dev
```

Server chạy tại `http://localhost:3000`

## 🏗️ Build Production

```bash
npm run build
npm start
```

## 📡 API Endpoints

### Jobs
- `GET /api/jobs` - Lấy danh sách jobs
- `GET /api/jobs/:id` - Lấy chi tiết job
- `POST /api/jobs` - Tạo job mới (employer only)
- `PUT /api/jobs/:id` - Cập nhật job (employer only)
- `DELETE /api/jobs/:id` - Xóa job (employer only)
- `GET /api/jobs/my-jobs` - Lấy jobs của employer

### AI
- `GET /api/ai/recommend` - Gợi ý jobs cho candidate
- `POST /api/ai/enhance-description` - Cải thiện mô tả job
- `POST /api/ai/extract-skills` - Trích xuất skills từ text

### News
- `GET /api/news` - Lấy danh sách news
- `POST /api/news/refresh` - Cập nhật news mới (admin only)
- `POST /api/news/scrape` - Scrape news thủ công (admin only)

### Applications
- `POST /api/applications` - Apply job
- `GET /api/applications/my-applications` - Lấy applications của candidate
- `GET /api/applications/employer-applications` - Lấy applications của employer
- `GET /api/applications/job/:jobId` - Lấy applications theo job
- `PATCH /api/applications/:id/status` - Cập nhật status
- `DELETE /api/applications/:id` - Withdraw application

### Auth
- `GET /api/auth/verify` - Xác thực token

## 🔐 Authentication

Sử dụng Firebase Authentication. Gửi token trong header:

```
Authorization: Bearer <firebase_id_token>
```

## 🌐 Deploy

### Render.com

1. Push code lên GitHub
2. Tạo Web Service mới trên Render
3. Connect repository
4. Build command: `cd server && npm install && npm run build`
5. Start command: `npm start`
6. Thêm environment variables từ `.env`

### Railway.app

1. Install Railway CLI: `npm i -g @railway/cli`
2. Login: `railway login`
3. Init project: `railway init`
4. Deploy: `railway up`
5. Set environment variables: `railway variables set KEY=value`

## 📁 Cấu trúc thư mục

```
server/
├── src/
│   ├── config/           # Firebase config
│   ├── controllers/      # Request handlers
│   ├── middleware/       # Auth, error handling
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   ├── types/            # TypeScript types
│   ├── validators/       # Request validation
│   └── index.ts          # Entry point
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## 🧪 Testing

```bash
npm test
```

## 📝 License

ISC

