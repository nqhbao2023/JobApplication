# 🛠️ Setup Backend Local Development

## Bước 1: Cài đặt Dependencies

```bash
cd server
npm install
```

## Bước 2: Cấu hình Firebase Admin SDK

### Lấy Service Account Key

1. Truy cập [Firebase Console](https://console.firebase.google.com)
2. Chọn project **Job4S**
3. Settings ⚙️ → Service accounts
4. Click **Generate new private key**
5. Download file JSON (ví dụ: `job4s-firebase-adminsdk.json`)

### Option 1: Dùng file JSON trực tiếp

Đặt file vào `server/serviceAccountKey.json` (đã ignore trong .gitignore)

Sửa `server/src/config/firebase.ts`:

```typescript
import * as serviceAccount from '../serviceAccountKey.json';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as any),
});
```

### Option 2: Dùng Environment Variables (khuyến nghị)

Tạo file `.env` trong thư mục `server/`:

```bash
NODE_ENV=development
PORT=3000

# Copy từ file JSON
FIREBASE_PROJECT_ID=job4s-abc123
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xyz@job4s-abc123.iam.gserviceaccount.com

# CORS - cho phép Expo dev server
ALLOWED_ORIGINS=http://localhost:19000,exp://localhost:19000,exp://192.168.1.100:19000

# AI (Optional - có thể để trống)
AI_API_KEY=
AI_API_URL=https://api.openai.com/v1

# Rate Limit
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Lưu ý về `FIREBASE_PRIVATE_KEY`:**
- Copy toàn bộ private key từ file JSON
- Giữ nguyên `\n` (không replace thành newline thật)
- Bọc trong dấu `"..."`

## Bước 3: Chạy Development Server

```bash
npm run dev
```

Server chạy tại: `http://localhost:3000`

## Bước 4: Test API

### Health Check

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-11-08T10:30:00.000Z"
}
```

### Test Jobs API

```bash
# Get all jobs
curl http://localhost:3000/api/jobs

# Get job by ID
curl http://localhost:3000/api/jobs/JOB_ID
```

### Test với Authentication

Lấy Firebase token từ app client, sau đó:

```bash
curl -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  http://localhost:3000/api/auth/verify
```

## Bước 5: Test với Postman

### Import Collection

Tạo file `Job4S_API.postman_collection.json`:

```json
{
  "info": {
    "name": "Job4S API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/health"
      }
    },
    {
      "name": "Get All Jobs",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/api/jobs"
      }
    },
    {
      "name": "Create Job",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/api/jobs",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"title\": \"Frontend Developer\",\n  \"company\": \"Tech Corp\",\n  \"companyId\": \"company123\",\n  \"description\": \"We are looking for a talented frontend developer...\",\n  \"requirements\": [\"React\", \"TypeScript\", \"3+ years exp\"],\n  \"skills\": [\"React\", \"TypeScript\", \"CSS\"],\n  \"salary\": {\n    \"min\": 20000000,\n    \"max\": 30000000,\n    \"currency\": \"VND\"\n  },\n  \"location\": \"Ho Chi Minh City\",\n  \"type\": \"full-time\",\n  \"category\": \"IT\"\n}",
          "options": {
            "raw": {
              "language": "json"
            }
          }
        }
      }
    },
    {
      "name": "AI Recommend Jobs",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/api/ai/recommend?limit=5",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ]
      }
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000"
    },
    {
      "key": "token",
      "value": "YOUR_FIREBASE_TOKEN"
    }
  ]
}
```

Import vào Postman và test.

## Bước 6: Kết nối với Client App

### Cập nhật API URL trong Client

Tạo file `src/config/api.ts`:

```typescript
export const API_BASE_URL = __DEV__
  ? 'http://localhost:3000'
  : 'https://job4s-api.onrender.com';

export const API_ENDPOINTS = {
  jobs: `${API_BASE_URL}/api/jobs`,
  ai: `${API_BASE_URL}/api/ai`,
  news: `${API_BASE_URL}/api/news`,
  applications: `${API_BASE_URL}/api/applications`,
  auth: `${API_BASE_URL}/api/auth`,
};
```

### Tạo API Client Service

Tạo file `src/services/apiClient.ts`:

```typescript
import axios from 'axios';
import { auth } from '@/config/firebase';
import { API_BASE_URL } from '@/config/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default apiClient;
```

### Ví dụ sử dụng

```typescript
import apiClient from '@/services/apiClient';

// Get jobs
const { data } = await apiClient.get('/api/jobs');

// Create job
const newJob = await apiClient.post('/api/jobs', jobData);

// AI recommend
const { data: recommendations } = await apiClient.get('/api/ai/recommend');
```

## Bước 7: Test End-to-End

### Scenario 1: Employer tạo job

1. Login với tài khoản employer trong app
2. Mở screen Add Job
3. Fill form → Submit
4. Kiểm tra log backend: `POST /api/jobs`
5. Verify job được tạo trong Firestore

### Scenario 2: Candidate xem AI recommendations

1. Login với tài khoản candidate có skills
2. Fetch recommendations từ API
3. Kiểm tra backend trả về jobs phù hợp

## Troubleshooting

### Port 3000 đã sử dụng

```bash
# Kill process
lsof -ti:3000 | xargs kill

# Hoặc đổi port trong .env
PORT=3001
```

### Firebase Admin SDK error

```bash
Error: Could not load the default credentials
```

**Fix:** Kiểm tra `.env` có đầy đủ 3 biến:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_CLIENT_EMAIL`

### CORS error khi call từ client

**Fix:** Thêm IP/URL của client vào `ALLOWED_ORIGINS`:

```bash
# .env
ALLOWED_ORIGINS=http://localhost:19000,exp://192.168.1.100:19000
```

### Module not found

```bash
npm install
npm run build
npm run dev
```

## Hot Reload

Nodemon đã được cấu hình để tự động restart khi code thay đổi.

File cấu hình: `nodemon.json`

## Debug với VS Code

Tạo `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Server",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "skipFiles": ["<node_internals>/**"],
      "envFile": "${workspaceFolder}/server/.env"
    }
  ]
}
```

Bấm F5 để debug.

## Next Steps

- [ ] Setup hoàn tất
- [ ] Test tất cả endpoints
- [ ] Kết nối client app với backend
- [ ] Implement service layer trong client
- [ ] Deploy lên staging environment

