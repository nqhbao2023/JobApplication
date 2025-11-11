# Quick Test Commands

## Your Firebase Token (Valid for 1 hour)
```
eyJhbGciOiJSUzI1NiIsImtpZCI6IjU0NTEzMjA5OWFkNmJmNjEzODJiNmI0Y2RlOWEyZGZlZDhjYjMwZjAiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoidHV5ZW4gZHVuZyAyMiIsInBpY3R1cmUiOiJodHRwczovL2ZpcmViYXNlc3RvcmFnZS5nb29nbGVhcGlzLmNvbS92MC9iL2pvYjRzLWFwcC5maXJlYmFzZXN0b3JhZ2UuYXBwL28vYXZhdGFycyUyRllYNVg0UGRnVmNPUUZ2RUlhZ01jdHZBcFVFZzEuanBnP2FsdD1tZWRpYSZ0b2tlbj01MzZiZDdlYy1iZmU2LTRlYjEtOWU3Ni05ZjBiNGI4ZjIyZjgiLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vam9iNHMtYXBwIiwiYXVkIjoiam9iNHMtYXBwIiwiYXV0aF90aW1lIjoxNzYyODM1MDU0LCJ1c2VyX2lkIjoiWVg1WDRQZGdWY09RRnZFSWFnTWN0dkFwVUVnMSIsInN1YiI6IllYNVg0UGRnVmNPUUZ2RUlhZ01jdHZBcFVFZzEiLCJpYXQiOjE3NjI4NDk0MjQsImV4cCI6MTc2Mjg1MzAyNCwiZW1haWwiOiJucWhiYW8yQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjpmYWxzZSwiZmlyZWJhc2UiOnsiaWRlbnRpdGllcyI6eyJlbWFpbCI6WyJucWhiYW8yQGdtYWlsLmNvbSJdfSwic2lnbl9pbl9wcm92aWRlciI6InBhc3N3b3JkIn19.Qqw_9-YKde6mMhIEaS9dWkAN4AMDS52G1STTyA-TUXDSCcJNQkwQo6f6nEsvyNimQEhTiX14gJhdnNptq0ldszbrRJKE3JF75neXVwMeKqzVUQ6rfL5_-qcFB2ZLEhMTntfpWtUcOU8thNVaCh5HWydBS8PGQ7usrslXfplXSttTwN11rq38TzrKsnd4O7i-63-XHfJr99ZP4DkR5dhtyX2fNCaFFK0VM7aOkMr3ZAmZjs1es8e2llKNdFmcZiUpVc2jiVVWKg0deXlfqVckuiwF2rbRq6SHFuFsYhZc3wCLDBcK6M5XM95SJhVfTSBJyIsL3wU4TIJrcBV9zU6rFQ
```

## User Info từ Token
- Email: nqhbao2@gmail.com
- User ID: YX5X4PdgVcOQFvEIagMctvApUEg1
- Name: tuyen dung 22
- Role: employer (từ log)

---

## Test 1: Get Current User Profile

### Option A: Dùng cURL (Copy paste vào PowerShell)

```powershell
curl -X GET "http://localhost:3000/api/users/me" `
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IjU0NTEzMjA5OWFkNmJmNjEzODJiNmI0Y2RlOWEyZGZlZDhjYjMwZjAiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoidHV5ZW4gZHVuZyAyMiIsInBpY3R1cmUiOiJodHRwczovL2ZpcmViYXNlc3RvcmFnZS5nb29nbGVhcGlzLmNvbS92MC9iL2pvYjRzLWFwcC5maXJlYmFzZXN0b3JhZ2UuYXBwL28vYXZhdGFycyUyRllYNVg0UGRnVmNPUUZ2RUlhZ01jdHZBcFVFZzEuanBnP2FsdD1tZWRpYSZ0b2tlbj01MzZiZDdlYy1iZmU2LTRlYjEtOWU3Ni05ZjBiNGI4ZjIyZjgiLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vam9iNHMtYXBwIiwiYXVkIjoiam9iNHMtYXBwIiwiYXV0aF90aW1lIjoxNzYyODM1MDU0LCJ1c2VyX2lkIjoiWVg1WDRQZGdWY09RRnZFSWFnTWN0dkFwVUVnMSIsInN1YiI6IllYNVg0UGRnVmNPUUZ2RUlhZ01jdHZBcFVFZzEiLCJpYXQiOjE3NjI4NDk0MjQsImV4cCI6MTc2Mjg1MzAyNCwiZW1haWwiOiJucWhiYW8yQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjpmYWxzZSwiZmlyZWJhc2UiOnsiaWRlbnRpdGllcyI6eyJlbWFpbCI6WyJucWhiYW8yQGdtYWlsLmNvbSJdfSwic2lnbl9pbl9wcm92aWRlciI6InBhc3N3b3JkIn19.Qqw_9-YKde6mMhIEaS9dWkAN4AMDS52G1STTyA-TUXDSCcJNQkwQo6f6nEsvyNimQEhTiX14gJhdnNptq0ldszbrRJKE3JF75neXVwMeKqzVUQ6rfL5_-qcFB2ZLEhMTntfpWtUcOU8thNVaCh5HWydBS8PGQ7usrslXfplXSttTwN11rq38TzrKsnd4O7i-63-XHfJr99ZP4DkR5dhtyX2fNCaFFK0VM7aOkMr3ZAmZjs1es8e2llKNdFmcZiUpVc2jiVVWKg0deXlfqVckuiwF2rbRq6SHFuFsYhZc3wCLDBcK6M5XM95SJhVfTSBJyIsL3wU4TIJrcBV9zU6rFQ"
```

### Option B: Dùng Thunder Client (VS Code Extension)

1. Click icon Thunder Client ở sidebar (⚡)
2. Click "New Request"
3. Method: **GET**
4. URL: `http://localhost:3000/api/users/me`
5. Headers tab → Add:
   - Key: `Authorization`
   - Value: `Bearer eyJhbGci...` (copy token phía trên)
6. Click "Send"

### Expected Response:
```json
{
  "uid": "YX5X4PdgVcOQFvEIagMctvApUEg1",
  "email": "nqhbao2@gmail.com",
  "displayName": "tuyen dung 22",
  "role": "employer",
  "photoURL": "https://...",
  "createdAt": "...",
  "updatedAt": "..."
}
```

---

## Test 2: Update Profile

### cURL:
```powershell
curl -X PUT "http://localhost:3000/api/users/me" `
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IjU0NTEzMjA5OWFkNmJmNjEzODJiNmI0Y2RlOWEyZGZlZDhjYjMwZjAiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoidHV5ZW4gZHVuZyAyMiIsInBpY3R1cmUiOiJodHRwczovL2ZpcmViYXNlc3RvcmFnZS5nb29nbGVhcGlzLmNvbS92MC9iL2pvYjRzLWFwcC5maXJlYmFzZXN0b3JhZ2UuYXBwL28vYXZhdGFycyUyRllYNVg0UGRnVmNPUUZ2RUlhZ01jdHZBcFVFZzEuanBnP2FsdD1tZWRpYSZ0b2tlbj01MzZiZDdlYy1iZmU2LTRlYjEtOWU3Ni05ZjBiNGI4ZjIyZjgiLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vam9iNHMtYXBwIiwiYXVkIjoiam9iNHMtYXBwIiwiYXV0aF90aW1lIjoxNzYyODM1MDU0LCJ1c2VyX2lkIjoiWVg1WDRQZGdWY09RRnZFSWFnTWN0dkFwVUVnMSIsInN1YiI6IllYNVg0UGRnVmNPUUZ2RUlhZ01jdHZBcFVFZzEiLCJpYXQiOjE3NjI4NDk0MjQsImV4cCI6MTc2Mjg1MzAyNCwiZW1haWwiOiJucWhiYW8yQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjpmYWxzZSwiZmlyZWJhc2UiOnsiaWRlbnRpdGllcyI6eyJlbWFpbCI6WyJucWhiYW8yQGdtYWlsLmNvbSJdfSwic2lnbl9pbl9wcm92aWRlciI6InBhc3N3b3JkIn19.Qqw_9-YKde6mMhIEaS9dWkAN4AMDS52G1STTyA-TUXDSCcJNQkwQo6f6nEsvyNimQEhTiX14gJhdnNptq0ldszbrRJKE3JF75neXVwMeKqzVUQ6rfL5_-qcFB2ZLEhMTntfpWtUcOU8thNVaCh5HWydBS8PGQ7usrslXfplXSttTwN11rq38TzrKsnd4O7i-63-XHfJr99ZP4DkR5dhtyX2fNCaFFK0VM7aOkMr3ZAmZjs1es8e2llKNdFmcZiUpVc2jiVVWKg0deXlfqVckuiwF2rbRq6SHFuFsYhZc3wCLDBcK6M5XM95SJhVfTSBJyIsL3wU4TIJrcBV9zU6rFQ" `
  -H "Content-Type: application/json" `
  -d '{"displayName":"Test Update","phone":"0123456789","bio":"Test Bio"}'
```

### Thunder Client:
- Method: **PUT**
- URL: `http://localhost:3000/api/users/me`
- Headers:
  - `Authorization`: `Bearer <token>`
  - `Content-Type`: `application/json`
- Body (JSON):
```json
{
  "displayName": "Test Update",
  "phone": "0123456789",
  "bio": "Test Bio"
}
```

---

## Test 3: Get User by ID (Public - No Auth Required)

```powershell
curl -X GET "http://localhost:3000/api/users/YX5X4PdgVcOQFvEIagMctvApUEg1"
```

---

## ⚠️ Common Issues

### 1. Server không chạy?
```bash
cd server
npm run dev
```

### 2. Token expired (sau 1 giờ)?
- Reload app trong Expo để lấy token mới
- Copy token mới từ log `=== FIREBASE TOKEN ===`

### 3. CORS errors?
- Server đã config CORS cho `exp://192.168.1.58:8081`
- Nếu IP khác, update trong `server/src/index.ts`

---

## ✅ Success Criteria

Nếu API hoạt động đúng, bạn sẽ thấy:
1. ✅ GET /me trả về thông tin user
2. ✅ PUT /me update được profile
3. ✅ GET /:userId trả về user public info
4. ✅ Server log không có lỗi

➡️ **Tiếp theo:** Migrate client code để dùng API thay vì Firestore

