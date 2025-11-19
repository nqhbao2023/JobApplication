# Scripts Documentation

## Seed Scripts

### 1. `seedFirestore.js` - Seed dữ liệu ban đầu

Tạo dữ liệu mẫu cho database bao gồm:
- Test employer account
- Công ty mẫu (FPT, VNG, Tiki)
- Loại công việc (Full-time, Part-time, etc.)
- Danh mục công việc (IT, Marketing, Sales, etc.)
- Công việc mẫu với employerId hợp lệ

**Cách chạy:**
```bash
cd scripts
node seedFirestore.js
```

**Kết quả:**
- ✅ Tạo employer test account: `employer@test.com` / `test123456`
- ✅ Tạo 3 công ty mẫu
- ✅ Tạo 4 loại công việc
- ✅ Tạo 7 danh mục
- ✅ Tạo 3 công việc mẫu (với employerId)

---

### 2. `fix-missing-employerId.js` - Fix jobs thiếu employerId

Fix các job trong database đang thiếu hoặc có employerId rỗng.

**Khi nào cần dùng:**
- Khi gặp lỗi "Missing employerId" khi apply job
- Sau khi import jobs từ nguồn external
- Khi có jobs từ seed cũ không có employerId

**Cách chạy:**
```bash
cd scripts
node fix-missing-employerId.js
```

**Script sẽ:**
1. Tìm/tạo test employer account
2. Scan tất cả jobs trong database
3. Update employerId cho jobs thiếu
4. Báo cáo số lượng jobs đã fix

---

## Employer Account

### Test Employer Account
- **Email:** `employer@test.com`
- **Password:** `test123456`
- **Role:** employer

### Chức năng Employer trong app:

1. **Đăng việc làm**
   - Tạo tin tuyển dụng mới
   - Quản lý thông tin công việc
   - Đặt trạng thái (active/closed/draft)

2. **Quản lý ứng viên**
   - Xem danh sách CV đã nộp
   - Duyệt/từ chối ứng viên
   - Liên hệ với ứng viên

3. **Dashboard**
   - Thống kê số lượng apply
   - Xem việc làm đang đăng
   - Quản lý hồ sơ công ty

---

## Lỗi thường gặp

### ❌ "Missing employerId in jobData"

**Nguyên nhân:**
- Job được tạo từ seed cũ không có employerId
- Job import từ crawler/external source
- Dữ liệu test không đầy đủ

**Giải pháp:**
```bash
# Chạy script fix
node scripts/fix-missing-employerId.js

# Hoặc seed lại dữ liệu mới
node scripts/seedFirestore.js
```

### ❌ "Service account key not found"

**Nguyên nhân:**
- Thiếu file `serviceAccountKey.json`

**Giải pháp:**
1. Vào Firebase Console
2. Project Settings → Service Accounts
3. Generate new private key
4. Lưu file vào `scripts/serviceAccountKey.json`

---

## Best Practices

### Khi tạo jobs mới:
```javascript
{
  title: "Job Title",
  company: "company-id",
  employerId: "user-uid", // ⚠️ BẮT BUỘC
  description: "...",
  requirements: "...",
  location: "...",
  salary: { min: 10000000, max: 20000000, currency: 'VND' },
  type: "Toàn thời gian",
  status: "active",
  source: "internal", // internal | crawled | quick-post
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}
```

### Quan trọng:
- **LUÔN** có `employerId` cho jobs kiểu "internal" và "featured"
- Jobs từ crawler có thể không cần employerId (sẽ redirect về trang nguồn)
- Quick-post jobs dùng contactInfo thay vì employerId

---

## Tham khảo

- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Firestore Data Model](../docs/DATABASE.md)
- [Job Application Flow](../docs/APPLICATION_FLOW.md)
