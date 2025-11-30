# 📧 Hướng Dẫn Cấu Hình Email OTP cho Job4S

## Tổng Quan

Hệ thống OTP (One-Time Password) của Job4S sử dụng email để gửi mã xác thực cho:
1. **Xác thực email khi đăng ký** - Đảm bảo email hợp lệ trước khi tạo tài khoản
2. **Quên mật khẩu** - Gửi mã OTP để đặt lại mật khẩu

## 🔧 Cấu Hình SMTP (Bắt buộc)

### Bước 1: Chọn Email Provider

#### Option A: Gmail (Khuyến nghị cho phát triển)

1. **Tạo App Password cho Gmail:**
   - Vào [Google Account Security](https://myaccount.google.com/security)
   - Bật **2-Step Verification** (xác thực 2 bước) nếu chưa bật
   - Tìm **App passwords** > Generate
   - Chọn "Mail" và "Other (Custom name)"
   - Đặt tên: `Job4S Server`
   - Copy mật khẩu 16 ký tự được tạo ra

2. **Cấu hình .env trong server:**
   ```env
   # Email Configuration (Gmail)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=xxxx xxxx xxxx xxxx   # App Password (16 ký tự)
   EMAIL_FROM="Job4S" <your-email@gmail.com>
   ```

#### Option B: Outlook/Hotmail

```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
EMAIL_FROM="Job4S" <your-email@outlook.com>
```

#### Option C: SendGrid (Khuyến nghị cho Production)

1. Đăng ký tài khoản tại [SendGrid](https://sendgrid.com/)
2. Tạo API Key tại Dashboard > Settings > API Keys
3. Cấu hình:
   ```env
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USER=apikey
   SMTP_PASS=SG.xxxxxxxxxxxxxxxxxxxxxxxx
   EMAIL_FROM="Job4S" <noreply@yourdomain.com>
   ```

#### Option D: Amazon SES (Production)

```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=YOUR_AWS_ACCESS_KEY
SMTP_PASS=YOUR_AWS_SECRET_KEY
EMAIL_FROM="Job4S" <noreply@yourdomain.com>
```

### Bước 2: Thêm vào file .env của server

Tạo hoặc chỉnh sửa file `server/.env`:

```env
# Existing configs...
PORT=3000
FIREBASE_PROJECT_ID=your-project-id
# ... other configs

# ===== EMAIL CONFIGURATION =====
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM="Job4S" <your-email@gmail.com>
```

### Bước 3: Kiểm tra cấu hình

1. Khởi động server:
   ```bash
   cd server
   npm run dev
   ```

2. Kiểm tra log console. Nếu thấy:
   ```
   ✅ Email service initialized
   ```
   → Email đã được cấu hình thành công!

3. Nếu thấy:
   ```
   ⚠️ Email service not configured. Set SMTP_USER and SMTP_PASS in .env
   ```
   → Kiểm tra lại các biến môi trường

## 📱 Luồng Hoạt Động

### 1. Đăng Ký Tài Khoản (Email Verification)

```
User nhập thông tin đăng ký
        ↓
Bấm "Tạo tài khoản"
        ↓
Frontend gọi API: POST /api/auth/send-otp
{
  email: "user@example.com",
  purpose: "email_verification"
}
        ↓
Server kiểm tra email chưa được đăng ký
        ↓
Tạo OTP 6 số, lưu vào memory (expire 10 phút)
        ↓
Gửi email với mã OTP
        ↓
User nhập mã OTP → Verify → Tạo tài khoản
```

### 2. Quên Mật Khẩu (Password Reset)

```
User bấm "Quên mật khẩu"
        ↓
Nhập email
        ↓
Frontend gọi API: POST /api/auth/send-otp
{
  email: "user@example.com",
  purpose: "password_reset"
}
        ↓
Server kiểm tra email đã đăng ký
        ↓
Tạo OTP 6 số
        ↓
Gửi email
        ↓
User xác thực OTP
        ↓
User nhập mật khẩu mới → Reset thành công
```

## 🔐 Bảo Mật OTP

- **Độ dài mã**: 6 chữ số
- **Thời gian hết hạn**: 10 phút
- **Số lần thử tối đa**: 5 lần (sau đó phải gửi lại mã mới)
- **Cooldown gửi lại**: 60 giây

## 🚀 API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/auth/send-otp` | Gửi mã OTP |
| POST | `/api/auth/verify-otp` | Xác thực mã OTP |
| POST | `/api/auth/reset-password` | Đặt lại mật khẩu |
| POST | `/api/auth/check-otp-status` | Kiểm tra trạng thái OTP |
| POST | `/api/auth/consume-otp` | Xóa OTP sau khi sử dụng |

### Request/Response Examples

#### Gửi OTP
```bash
POST /api/auth/send-otp
Content-Type: application/json

{
  "email": "user@example.com",
  "purpose": "password_reset"
}

# Response Success
{
  "success": true,
  "message": "Mã OTP đã được gửi đến user@example.com"
}

# Response Cooldown
{
  "success": false,
  "error": "Vui lòng chờ 45 giây trước khi gửi lại mã",
  "cooldownRemaining": 45
}
```

#### Xác thực OTP
```bash
POST /api/auth/verify-otp
Content-Type: application/json

{
  "email": "user@example.com",
  "code": "123456",
  "purpose": "password_reset"
}

# Response Success
{
  "success": true,
  "message": "Xác thực thành công!",
  "verified": true
}

# Response Error
{
  "success": false,
  "error": "Mã OTP không chính xác. Còn 4 lần thử."
}
```

#### Đặt lại mật khẩu
```bash
POST /api/auth/reset-password
Content-Type: application/json

{
  "email": "user@example.com",
  "newPassword": "newSecurePassword123"
}

# Response Success
{
  "success": true,
  "message": "Đặt lại mật khẩu thành công!"
}
```

## ⚠️ Troubleshooting

### Email không gửi được

1. **Gmail: "Less secure app access" error**
   - Sử dụng App Password thay vì mật khẩu thông thường
   - Bật 2-Step Verification

2. **Connection timeout**
   - Kiểm tra firewall không chặn port 587
   - Thử đổi sang port 465 với `secure: true`

3. **Authentication failed**
   - Kiểm tra lại SMTP_USER và SMTP_PASS
   - Với Gmail, đảm bảo dùng App Password

### Mã OTP không được gửi

1. Kiểm tra log server
2. Đảm bảo email hợp lệ
3. Kiểm tra rate limit (1 email / 60 giây)

## 📂 File Structure

```
server/src/
├── services/
│   ├── email.service.ts    # Email sending service
│   └── otp.service.ts      # OTP generation & verification
├── controllers/
│   └── auth.controller.ts  # OTP endpoints handlers
└── routes/
    └── auth.routes.ts      # OTP routes

app/(auth)/
├── forgot-password.tsx     # Quên mật khẩu screen
├── verify-otp.tsx          # Nhập mã OTP screen
├── reset-password.tsx      # Đặt mật khẩu mới screen
├── register-complete.tsx   # Hoàn tất đăng ký screen
└── _layout.tsx             # Auth navigation
```

## 🎯 Next Steps (Optional)

1. **Production**: Chuyển từ in-memory OTP storage sang Redis
2. **Analytics**: Log OTP sending/verification metrics
3. **Rate Limiting**: Thêm IP-based rate limiting
4. **Templates**: Tạo email templates đẹp hơn với MJML

---

📧 **Hỗ trợ**: Nếu gặp vấn đề, hãy kiểm tra server logs hoặc tạo issue trên GitHub.
