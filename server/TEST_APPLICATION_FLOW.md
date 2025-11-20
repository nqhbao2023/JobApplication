# 🧪 Hướng Dẫn Test Luồng Apply Job

## Tổng Quan
Tài liệu này hướng dẫn test luồng ứng tuyển công việc từ đầu đến cuối.

## Luồng Hoàn Chỉnh

```
User (Candidate) → Apply Job → Backend API → Save to Firestore
                                           ↓
                                     Send Email to Employer
                                           ↓
                                   Status = "Pending"
```

## ✅ Đã Thực Hiện

### 1. Email Service ✅
- **File**: `server/src/services/email.service.ts`
- **Tính năng**:
  - Gửi email thông báo cho employer khi có ứng viên mới
  - Gửi email xác nhận cho quick-post creator
  - Gửi email thông báo cho quick-post poster khi có ứng viên

### 2. Application Service ✅
- **File**: `server/src/services/application.service.ts`
- **Tính năng**:
  - Tạo application mới
  - Tự động gửi email thông báo cho employer
  - Cập nhật số lượng ứng viên cho job
  - Status mặc định: `pending`

### 3. Auto-sync Algolia ✅
- **File**: `server/src/crawlers/viecoi/upsert-jobs.ts`
- **Tính năng**:
  - Tự động sync jobs lên Algolia sau khi upsert vào Firestore
  - Chỉ sync khi có jobs mới hoặc updated

## 📋 Checklist Test

### Pre-requisites
- [ ] Backend server đang chạy (`npm run dev` trong folder `server`)
- [ ] Frontend app đang chạy (`npx expo start`)
- [ ] Firebase đã được cấu hình đúng
- [ ] SMTP credentials đã được set trong `.env`

### Test Cases

#### 1. Test Email Service
```bash
# Trong terminal, chạy:
cd server
npm run dev

# Kiểm tra log:
# ✅ Email service initialized
```

**Kiểm tra `.env`:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=Job4S <noreply@job4s.com>
```

#### 2. Test Apply Job Flow (Manual)

**Step 1: Đăng nhập như Candidate**
- Mở app
- Đăng nhập với tài khoản role `candidate`

**Step 2: Tìm job và Apply**
- Vào danh sách jobs
- Chọn 1 job bất kỳ
- Bấm "Ứng tuyển"
- Upload CV (nếu cần)
- Gửi đơn

**Step 3: Kiểm tra Backend Log**
```
POST /api/applications
✅ Application created
📧 Email notification sent to employer: employer@example.com
```

**Step 4: Kiểm tra Email**
- Mở email của employer
- Xác nhận nhận được email với:
  - Tiêu đề job
  - Thông tin candidate
  - Link CV (nếu có)

**Step 5: Kiểm tra Database**
- Vào Firestore Console
- Collection: `applications`
- Kiểm tra document mới:
  - `status: "pending"`
  - `candidateId: "..."`
  - `employerId: "..."`
  - `appliedAt: timestamp`

**Step 6: Kiểm tra Job Counter**
- Vào Firestore Console
- Collection: `jobs`
- Kiểm tra job đã apply:
  - `applicantCount` đã tăng lên 1

#### 3. Test Employer View Applications

**Step 1: Đăng nhập như Employer**
- Đăng xuất candidate
- Đăng nhập với tài khoản employer

**Step 2: Xem danh sách ứng viên**
- Vào "Quản lý tuyển dụng" hoặc "Ứng viên"
- Kiểm tra danh sách applications
- Xem chi tiết application

**Step 3: Update Status**
- Chọn 1 application
- Đổi status: `pending` → `accepted` hoặc `rejected`
- Kiểm tra Firestore đã update

#### 4. Test Auto-sync Algolia (Crawler Jobs)

**Step 1: Chạy Crawler**
```bash
cd server

# Bước 1: Crawl jobs từ viecoi
npm run crawl:viecoi

# Bước 2: Normalize data
npm run normalize:viecoi

# Bước 3: Upsert to Firestore (auto-sync Algolia)
npm run upsert:viecoi
```

**Step 2: Kiểm tra Log**
```
✅ Upsert completed!
🔄 Auto-syncing to Algolia...
✅ Synced 50 jobs to Algolia
✅ Algolia sync completed!
```

**Step 3: Kiểm tra Algolia Dashboard**
- Vào Algolia Console
- Index: `jobs`
- Xác nhận có jobs mới với `source: "viecoi"`

## 🐛 Troubleshooting

### Email không gửi được

**Nguyên nhân**: SMTP credentials sai hoặc chưa set

**Giải pháp**:
1. Kiểm tra `.env`:
   ```env
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   ```

2. Với Gmail, cần tạo App Password:
   - Vào Google Account Settings
   - Security → 2-Step Verification
   - App Passwords → Generate new password
   - Copy password vào `SMTP_PASS`

3. Restart server sau khi update `.env`

### Application không tạo được

**Nguyên nhân**: Missing `employerId` hoặc `jobId`

**Giải pháp**:
1. Kiểm tra request body:
   ```json
   {
     "jobId": "valid-job-id",
     "employerId": "valid-employer-id",
     "cvUrl": "https://...",
     "coverLetter": "..."
   }
   ```

2. Kiểm tra job có tồn tại trong Firestore
3. Kiểm tra employer có tồn tại trong Firestore

### Algolia sync fail

**Nguyên nhân**: Missing Algolia credentials

**Giải pháp**:
1. Kiểm tra `.env`:
   ```env
   ALGOLIA_APP_ID=your_app_id
   ALGOLIA_API_KEY=your_admin_api_key
   ```

2. Verify credentials tại Algolia Dashboard
3. Restart upsert process

## 📊 Expected Results

### 1. Successful Apply
- ✅ Application created in Firestore
- ✅ Email sent to employer
- ✅ Job `applicantCount` increased
- ✅ Status = `pending`

### 2. Successful Crawler Sync
- ✅ Jobs saved to Firestore
- ✅ Jobs indexed in Algolia
- ✅ Searchable in app

### 3. Successful Email
- ✅ Employer receives email
- ✅ Email contains job title
- ✅ Email contains candidate info
- ✅ Email contains CV link (if provided)

## 🎯 Next Steps

1. **Test với dữ liệu thật**
2. **Monitor email delivery rate**
3. **Setup email templates cho các trường hợp khác**:
   - Application accepted
   - Application rejected
   - Interview invitation
4. **Add notification in-app** (ngoài email)
5. **Add analytics tracking** cho apply rate

## 📝 Notes

- Email là tính năng **không bắt buộc** - nếu fail, application vẫn được tạo
- Algolia sync là tính năng **không bắt buộc** - có thể sync manual sau
- Application status có thể update bởi employer bất cứ lúc nào
