# 🚀 Hướng Dẫn Fix Lỗi Build APK trên EAS

## ❌ Vấn Đề Gặp Phải

1. **Lỗi "google-services.json" missing** trên EAS Build
2. **App crash ngay khi mở** (tự tắt rất nhanh)
3. **EXPO_PUBLIC variables không được load** đúng cách

## ✅ Nguyên Nhân & Giải Pháp

### 1. EXPO_PUBLIC Variables Dùng Sai Visibility

**❌ SAI:**
```
EXPO_PUBLIC_FIREBASE_API_KEY = Secret
```

**✅ ĐÚNG:**
```
EXPO_PUBLIC_FIREBASE_API_KEY = Plain Text hoặc Sensitive
```

**Lý do:** Variables có prefix `EXPO_PUBLIC_` sẽ được compile vào app bundle. Chúng **KHÔNG BAO GIỜ** được coi là secret vì sẽ visible trong compiled code. EAS sẽ warning nếu dùng "Secret" visibility.

### 2. google-services.json Không Được Upload

**❌ SAI:**
```json
// app.json
"googleServicesFile": "./google-services.json"
```
→ File bị `.gitignore` nên EAS không có file này

**✅ ĐÚNG:**
```bash
# Upload file lên EAS như File Environment Variable
eas env:create --name GOOGLE_SERVICES_JSON \
  --value "$(cat google-services.json)" \
  --type file \
  --visibility secret \
  --environment preview --environment production
```

### 3. Cấu Hình EAS Build

**File đã được update:**
- ✅ `eas.json` - Xóa GOOGLE_SERVICES_JSON khỏi env (vì nó là file type)
- ✅ `app.json` - Xóa `googleServicesFile` (để EAS tự động xử lý)
- ✅ `scripts/decode-google-services.js` - Handle cả EAS và local dev

## 🔧 Cách Fix (3 Bước)

### Bước 1: Xóa Toàn Bộ Environment Variables Cũ Trên EAS

Vào https://expo.dev → Project → Environment Variables → Xóa hết các biến sau:
- EXPO_PUBLIC_FIREBASE_API_KEY
- EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
- EXPO_PUBLIC_FIREBASE_PROJECT_ID
- EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- EXPO_PUBLIC_FIREBASE_APP_ID
- EXPO_PUBLIC_API_URL
- GOOGLE_SERVICES_JSON

### Bước 2: Tạo Lại Variables Với Visibility Đúng

**Cách 1: Dùng Script PowerShell (Khuyên dùng)**
```powershell
.\setup-eas-complete.ps1
```

**Cách 2: Thủ công trên EAS Web Console**

Vào https://expo.dev → Project → Environment Variables → Create:

**Plain Text Variables (EXPO_PUBLIC_*):**
| Name | Value | Visibility | Environments |
|------|-------|-----------|--------------|
| EXPO_PUBLIC_FIREBASE_API_KEY | AIzaSyDWOpfdH_wDYHzdRgQBW1DEEvUrBQuUkdo | Plain Text | preview, production |
| EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN | job4s-app.firebaseapp.com | Plain Text | preview, production |
| EXPO_PUBLIC_FIREBASE_PROJECT_ID | job4s-app | Plain Text | preview, production |
| EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID | 519470633273 | Plain Text | preview, production |
| EXPO_PUBLIC_FIREBASE_APP_ID | 1:519470633273:android:ba73e62a82896f3e6598e8 | Plain Text | preview, production |
| EXPO_PUBLIC_API_URL | https://job4s-server.onrender.com | Plain Text | preview, production |

**File Variable (google-services.json):**
- Name: `GOOGLE_SERVICES_JSON`
- Type: **File**
- Visibility: **Secret**
- Value: Paste nội dung file `google-services.json`
- Environments: preview, production

### Bước 3: Build Lại App

```powershell
# Clear cache và build
eas build --platform android --profile preview --clear-cache
```

## 🔒 Bảo Mật

### ✅ AN TOÀN - Không Lộ Lên GitHub:
- ✅ `google-services.json` → `.gitignore`
- ✅ `setup-eas-secrets.ps1` → `.gitignore` (nếu có)
- ✅ `setup-eas-complete.ps1` → Chứa config nhưng chỉ dùng local
- ✅ Firebase keys trong EXPO_PUBLIC → Được bảo vệ bởi Firebase Security Rules

### ⚠️ LƯU Ý QUAN TRỌNG:
- **EXPO_PUBLIC variables** sẽ **VISIBLE** trong compiled app → Chỉ dùng cho public config
- **Bảo mật thật sự** phải làm ở Firebase Security Rules, không phải ẩn keys
- **GOOGLE_SERVICES_JSON** được xử lý riêng như File type với Secret visibility

## 🐛 Fix App Crash Khi Mở

Nếu app vẫn crash ngay khi mở:

### 1. Kiểm Tra Firebase Config
```typescript
// src/config/firebase.ts
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  // ...
};

console.log('Firebase Config:', firebaseConfig); // Debug
```

### 2. Kiểm Tra Logs
```bash
# Install APK và xem logs ngay
adb install -r your-app.apk
adb logcat | grep -i "firebase\|crash\|error"
```

### 3. Thêm Error Boundary

```typescript
// app/_layout.tsx
import { ErrorBoundary } from 'expo-router';

export default function RootLayout() {
  return (
    <ErrorBoundary>
      {/* Your app */}
    </ErrorBoundary>
  );
}
```

## 📋 Checklist Cuối Cùng

Trước khi build, đảm bảo:
- [ ] Đã xóa hết environment variables cũ trên EAS
- [ ] Đã tạo lại với visibility đúng (Plain Text cho EXPO_PUBLIC_*)
- [ ] Đã upload GOOGLE_SERVICES_JSON như File type
- [ ] `app.json` không có `googleServicesFile`
- [ ] `eas.json` không có GOOGLE_SERVICES_JSON trong env
- [ ] `.gitignore` có `google-services.json`

## 🎯 Kết Quả Mong Đợi

Khi build thành công, bạn sẽ thấy:
```
✔ Environment variables loaded from the "preview" build profile
✔ File environment variable GOOGLE_SERVICES_JSON loaded
✔ Prebuild successful
✔ Build successful
```

App sẽ:
- ✅ Mở được bình thường
- ✅ Kết nối được Firebase
- ✅ Không crash

## 🆘 Nếu Vẫn Lỗi

1. Kiểm tra lại logs trên EAS: https://expo.dev/accounts/hoangbao1234/projects/JobApplication/builds
2. Chạy local prebuild để test:
   ```bash
   npx expo prebuild --platform android --clean
   ```
3. Kiểm tra Firebase Console xem project có hoạt động không

---

**Cập nhật:** 22/11/2025
