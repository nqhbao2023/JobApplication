# Hướng dẫn cấu hình Google Sign-In

## 1. Lấy Google Client ID

### Bước 1: Vào Firebase Console
1. Truy cập [Firebase Console](https://console.firebase.google.com/)
2. Chọn project của bạn
3. Vào **Authentication** > **Sign-in method**
4. Click vào **Google** (đã enabled)
5. Copy **Web SDK configuration** > **Web client ID**

### Bước 2: Lấy Client IDs cho từng platform

#### Web Client ID (cho Expo Go)
- Sử dụng Web Client ID từ Firebase Console
- Format: `XXXXXXXXXX-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com`

#### Android Client ID (optional, cho production)
1. Vào [Google Cloud Console](https://console.cloud.google.com/)
2. Chọn project (cùng project với Firebase)
3. Vào **APIs & Services** > **Credentials**
4. Tạo **OAuth 2.0 Client ID** cho Android
5. Nhập package name và SHA-1 certificate fingerprint

#### iOS Client ID (optional, cho production)
1. Tạo **OAuth 2.0 Client ID** cho iOS
2. Nhập Bundle ID

## 2. Cập nhật code

### File: `app/(auth)/login.tsx`

Tìm dòng:
```tsx
const [request, response, promptAsync] = Google.useAuthRequest({
  clientId: '805925687821-i8b14hc3jgv5c78rb2vtfqh65nv5cqef.apps.googleusercontent.com',
```

Thay thế bằng **Web Client ID** của bạn từ Firebase Console.

### Thêm client IDs cho các platform (optional)
```tsx
const [request, response, promptAsync] = Google.useAuthRequest({
  clientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com', // Web
  iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com', // iOS
  androidClientId: 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com', // Android
});
```

## 3. Test với Expo Go

### Quan trọng:
- **Expo Go chỉ hỗ trợ Web Client ID**
- Khi build standalone app, mới cần Android/iOS Client IDs
- Đảm bảo đã enable Google Sign-in trong Firebase Console

### Cách test:
1. Chạy app: `npx expo start`
2. Scan QR code bằng Expo Go
3. Vào màn hình Login
4. Click nút "Google"
5. Đăng nhập bằng tài khoản Google

## 4. Lưu ý

### Redirect URI
Expo tự động handle redirect URI. Không cần config thêm khi dùng Expo Go.

### Production build
Khi build standalone app:
- Thêm `googleServicesFile` vào `app.json` (Android)
- Thêm `GoogleService-Info.plist` vào project (iOS)
- Config OAuth 2.0 Client IDs đầy đủ

## 5. Troubleshooting

### Lỗi "Invalid Client ID"
- Kiểm tra lại Web Client ID
- Đảm bảo đã enable Google Sign-in trong Firebase

### Lỗi "Redirect URI mismatch"
- Với Expo Go, không cần config redirect URI
- Với standalone app, add redirect URI vào Google Cloud Console

### Lỗi "DEVELOPER_ERROR"
- Kiểm tra SHA-1 fingerprint (Android)
- Kiểm tra Bundle ID (iOS)

## 6. File liên quan

- `src/contexts/AuthContext.tsx` - Logic đăng nhập Google
- `app/(auth)/login.tsx` - UI nút đăng nhập
- `src/components/auth/SocialLogin.tsx` - Component nút Google/Facebook
