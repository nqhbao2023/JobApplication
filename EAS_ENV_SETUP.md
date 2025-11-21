# 🔧 Hướng dẫn khắc phục lỗi App Crash khi Build EAS

## 🔴 Vấn đề
App bị crash ngay khi mở vì thiếu biến môi trường trên EAS Build.

## ✅ Giải pháp: Thêm Environment Variables lên EAS

### Cách 1: Dùng Command Line (Khuyên dùng - Nhanh nhất)

Chạy lần lượt các lệnh sau trong PowerShell:

```powershell
# 1. Firebase API Key
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value process.env.EXPO_PUBLIC_FIREBASE_API_KEY --type string

# 2. Firebase Auth Domain
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN --value job4s-app.firebaseapp.com --type string

# 3. Firebase Project ID
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_PROJECT_ID --value job4s-app --type string

# 4. Firebase Messaging Sender ID
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID --value 519470633273 --type string

# 5. Firebase App ID
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_APP_ID --value 1:519470633273:android:ba73e62a82896f3e6598e8 --type string

# 6. API URL (Backend Server - Render)
eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value https://job4s-server.onrender.com --type string
```

### Cách 2: Thông qua Web Dashboard

1. Truy cập: https://expo.dev/accounts/hoangbao123/projects/JobApplication/secrets
2. Click "Create Secret"
3. Thêm từng biến sau:

| Name | Value | Type |
|------|-------|------|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | `process.env.EXPO_PUBLIC_FIREBASE_API_KEY` | string |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | `job4s-app.firebaseapp.com` | string |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | `job4s-app` | string |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `519470633273` | string |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | `1:519470633273:android:ba73e62a82896f3e6598e8` | string |
| `EXPO_PUBLIC_API_URL` | `https://job4s-server.onrender.com` | string |

## 🚀 Sau khi thêm xong

1. **Xác nhận đã thêm đủ biến:**
   ```powershell
   eas secret:list
   ```

2. **Build lại app:**
   ```powershell
   eas build --platform android --profile preview
   ```

3. **Kiểm tra log build:**
   - Không còn thông báo "No environment variables found"
   - App sẽ không crash khi mở

## 📝 Lưu ý

- ⚠️ **Không commit file `.env` lên Git** - đã được ignore
- ✅ **EAS tự động inject các biến `EXPO_PUBLIC_*`** vào build process
- 🔒 Secrets trên EAS được mã hóa và bảo mật
- 📱 Profile `preview` sẽ tự động sử dụng các secrets này

## 🔍 Kiểm tra thêm

Nếu sau khi thêm biến vẫn crash, chạy:
```powershell
# Xem log chi tiết
adb logcat | Select-String "com.hoangbao.job4s"
```
