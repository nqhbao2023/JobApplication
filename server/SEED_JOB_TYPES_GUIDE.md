# Hướng Dẫn Seed Job Types với ID Cố Định

## 📋 Tóm Tắt

Script này giải quyết **Vấn đề 2** và **Vấn đề 4** từ MUCTIEU.md:
- ✅ Tạo job types với **ID cố định** (full-time, part-time, etc.) thay vì ID ngẫu nhiên
- ✅ Đồng bộ giữa **Frontend**, **Backend validator**, và **Firestore**
- ✅ Bảo vệ **system types** khỏi bị xóa nhầm trong Admin UI
- ✅ Cho phép admin tạo **custom types** riêng

## 🚀 Cách Sử Dụng

### Bước 1: Chuẩn bị Firebase Admin SDK

**Tùy chọn A: Sử dụng Service Account (Khuyến nghị cho local)**

1. Tải Service Account Key từ Firebase Console:
   - Vào [Firebase Console](https://console.firebase.google.com)
   - Project Settings → Service Accounts
   - Generate New Private Key
   
2. Lưu file JSON vào `server/serviceAccountKey.json`

3. **QUAN TRỌNG**: Thêm vào `.gitignore`:
   ```
   server/serviceAccountKey.json
   ```

**Tùy chọn B: Sử dụng biến môi trường (Production)**

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccountKey.json"
```

### Bước 2: Chạy Script Seed

```bash
cd server
npm run seed:job-types
```

**Kết quả mong đợi:**
```
🌱 Starting job types seed with fixed IDs...

📋 Found 7 job types to seed
  ✓ full-time -> Toàn thời gian
  ✓ part-time -> Bán thời gian
  ✓ internship -> Thực tập
  ✓ contract -> Hợp đồng
  ✓ freelance -> Freelance
  ✓ remote -> Remote
  ✓ hybrid -> Hybrid

✅ Job types seeded successfully!
📊 Summary:
   - Total: 7 types
   - System types: 7

💡 Tip: Các type này có ID cố định và đồng bộ với backend validator
```

## 🔍 Kiểm Tra Kết Quả

### 1. Kiểm tra trong Firestore Console

Vào Firestore và xem collection `job_types`:

```
job_types/
  ├── full-time/          ← ID cố định (không phải random)
  │   ├── type_name: "Toàn thời gian"
  │   ├── isSystem: true
  │   └── ...
  ├── part-time/
  ├── internship/
  └── ...
```

### 2. Kiểm tra trong Admin UI (Expo App)

1. Chạy app: `npx expo start`
2. Login với tài khoản admin
3. Vào màn hình **Admin → Job Types**
4. Xem các job types có:
   - ✅ Badge **"Hệ thống"** màu xanh
   - ✅ Icon shield ở bên cạnh tên
   - ✅ Nút **Xóa bị ẩn** cho system types
   - ✅ Nút **Sửa vẫn hoạt động** (có thể sửa tên, icon, mô tả)

### 3. Thử xóa System Type

Nếu bạn cố gắng xóa một system type:
```
Alert: "Không thể xóa"
Message: "Đây là loại công việc hệ thống và không thể xóa..."
```

## 📝 Thay Đổi Code

### 1. Backend Validator (`server/src/validators/job.validator.ts`)

**TRƯỚC:**
```typescript
type: Joi.string().required().valid('full-time', 'part-time', 'contract', 'internship'),
```

**SAU:**
```typescript
type: Joi.string().required().min(1), // Chấp nhận bất kỳ ID nào từ Firestore
jobTypeId: Joi.string().optional(),    // Alias
```

### 2. Admin UI (`app/(admin)/job-types.tsx`)

**Thêm:**
- ✅ Kiểm tra `isSystem` flag
- ✅ Alert khi cố xóa system type
- ✅ Tự động set `isSystem: false` cho custom types

### 3. Component Card (`src/components/admin/CategoryTypeCard.tsx`)

**Thêm:**
- ✅ Badge "Hệ thống" với icon shield
- ✅ Ẩn nút Xóa cho system types
- ✅ Vẫn cho phép Edit (sửa tên hiển thị, icon, màu)

## 🎨 Tùy Chỉnh Data

Để thay đổi hoặc thêm job types, sửa file:
```
server/data/job-types.vi.json
```

**Lưu ý:**
- `id`: Phải unique và không thay đổi sau khi đã seed
- `isSystem: true`: Để bảo vệ khỏi bị xóa
- `slug`: Dùng cho URL-friendly paths

## 🔄 Chạy Lại Script

Script hỗ trợ **idempotent** (chạy nhiều lần an toàn):
```bash
npm run seed:job-types  # Chạy lại sẽ cập nhật, không tạo duplicate
```

Nhờ sử dụng `batch.set()` với `merge: true`, dữ liệu sẽ được cập nhật thay vì tạo mới.

## 🐛 Debug

### Lỗi: "app/default hasn't been initialized"

**Nguyên nhân:** Thiếu Service Account hoặc biến môi trường

**Giải pháp:**
1. Kiểm tra file `server/serviceAccountKey.json` tồn tại
2. Hoặc set biến môi trường `GOOGLE_APPLICATION_CREDENTIALS`

### Lỗi: Permission Denied

**Nguyên nhân:** Service Account không có quyền ghi Firestore

**Giải pháp:**
1. Vào Firebase Console → Firestore → Rules
2. Tạm thời cho phép write (chỉ trong development):
```javascript
allow read, write: if true; // CHỈ CHO DEV!
```

### Lỗi: "Cannot find module 'firebase-admin'"

**Giải pháp:**
```bash
cd server
npm install
```

## 📚 Tài Liệu Liên Quan

- [MUCTIEU.md](../MUCTIEU.md) - Vấn đề 2 & 4
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Firestore Batch Writes](https://firebase.google.com/docs/firestore/manage-data/transactions#batched-writes)

## ✅ Checklist Hoàn Thành

- [x] Tạo `server/data/job-types.vi.json` với ID cố định
- [x] Tạo `server/src/scripts/seed-job-types.ts`
- [x] Cập nhật Backend validator
- [x] Thêm protection logic vào Admin UI
- [x] Thêm visual indicator (badge) cho system types
- [x] Test script seed thành công
- [x] Test UI không cho xóa system types

## 🎯 Bước Tiếp Theo

1. ✅ Chạy script seed: `npm run seed:job-types`
2. ✅ Test trong admin UI
3. 🔄 **Tiếp theo**: Giải quyết Vấn đề 5 (Algolia Search)
4. 🔄 **Sau đó**: Giải quyết Vấn đề 6 (Simple Crawler)
