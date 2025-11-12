# 🎯 HƯỚNG DẪN CHẠY THỬ - Taxonomy Fix

## ⚡ Quick Start (5 phút)

### Bước 1: Chuẩn bị Firebase Admin SDK

**Tùy chọn 1: Download Service Account (Khuyến nghị)**
1. Vào https://console.firebase.google.com/project/job4s-app/settings/serviceaccounts
2. Click "Generate new private key"
3. Lưu file vào `server/serviceAccountKey.json`
4. Đảm bảo file này đã có trong `.gitignore`

**Tùy chọn 2: Dùng biến môi trường**
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccountKey.json"
```

### Bước 2: Install dependencies (nếu chưa)
```bash
cd server
npm install
```

### Bước 3: Chạy script seed
```bash
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
```

### Bước 4: Verify trong Firebase Console
1. Mở https://console.firebase.google.com/project/job4s-app/firestore
2. Xem collection `job_types`
3. Kiểm tra:
   - ✅ Có 7 documents
   - ✅ IDs là: full-time, part-time, internship, contract, freelance, remote, hybrid
   - ✅ Mỗi doc có field `isSystem: true`

### Bước 5: Test Admin UI
```bash
# Ở root folder
npx expo start
```

1. Login với tài khoản admin
2. Vào **Admin → Job Types**
3. Kiểm tra:
   - ✅ Thấy badge "Hệ thống" màu xanh
   - ✅ Icon shield bên cạnh badge
   - ✅ Nút Xóa BỊ ẨN cho system types
   - ✅ Nút Sửa vẫn hiển thị

### Bước 6: Test Protection Logic
1. Thử click vào một system type (ví dụ "Toàn thời gian")
2. Bấm nút Sửa → Có thể đổi tên hiển thị, icon, màu
3. Không thấy nút Xóa → ✅ PASS

4. Tạo custom type:
   - Bấm "Thêm Job Type"
   - Nhập tên: "Test Type"
   - Save
   - ✅ Custom type CÓ nút Xóa
   - ✅ Không có badge "Hệ thống"

---

## 🐛 Troubleshooting

### Lỗi: "app/default hasn't been initialized"
**Nguyên nhân:** Thiếu service account

**Giải pháp:**
```bash
# Kiểm tra file tồn tại
ls server/serviceAccountKey.json

# Nếu không có, download từ Firebase Console
```

### Lỗi: "Cannot find module 'firebase-admin'"
**Giải pháp:**
```bash
cd server
npm install
```

### Lỗi: "Permission denied" khi seed
**Nguyên nhân:** Firestore Rules chặn

**Giải pháp tạm thời (chỉ dev):**
```javascript
// Firebase Console → Firestore → Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // ⚠️ CHỈ CHO DEV
    }
  }
}
```

### Script chạy nhưng không thấy data
**Kiểm tra:**
```bash
# Xem log chi tiết
npm run seed:job-types 2>&1 | tee seed.log
cat seed.log
```

---

## ✅ Verification Checklist

### Backend
- [ ] File `server/data/job-types.vi.json` tồn tại
- [ ] File `server/src/scripts/seed-job-types.ts` tồn tại
- [ ] Script chạy thành công: `npm run seed:job-types`
- [ ] Firestore có 7 documents trong `job_types`
- [ ] Mỗi doc có ID cố định (full-time, etc.)
- [ ] Field `isSystem: true` có trong mỗi doc

### Frontend
- [ ] Admin UI hiển thị job types
- [ ] Badge "Hệ thống" hiển thị cho 7 types
- [ ] Nút Delete bị ẩn cho system types
- [ ] Nút Edit vẫn hoạt động
- [ ] Tạo custom type thành công
- [ ] Custom type có nút Delete

### Integration
- [ ] Validator backend chấp nhận ID từ Firestore
- [ ] Không có TypeScript errors
- [ ] Console không có warning

---

## 📸 Screenshots Expected

### 1. Script Output
```
✅ Job types seeded successfully!
📊 Summary:
   - Total: 7 types
   - System types: 7
```

### 2. Firestore Console
```
job_types/
  ├── full-time/
  │   ├── type_name: "Toàn thời gian"
  │   ├── isSystem: true
  │   └── ...
```

### 3. Admin UI
- List của 7 job types
- Mỗi item có badge "Hệ thống" màu xanh
- Không có nút Delete cho system types

---

## 🎓 Demo cho Giáo Viên

### Script Demo (3 phút)

1. **Show problem (trước fix):**
   - "Script cũ tạo ID ngẫu nhiên"
   - "Backend validator hardcode enum"
   - "Admin có thể xóa nhầm system data"

2. **Show solution (sau fix):**
   ```bash
   # Chạy script mới
   npm run seed:job-types
   ```
   - "ID cố định: full-time, part-time"
   - "Đồng bộ frontend-backend 100%"

3. **Show admin protection:**
   - Vào Admin UI
   - Thử xóa system type → Alert
   - Tạo custom type → Xóa được

4. **Explain benefits:**
   - "Chuẩn bị cho crawler: normalize nhiều nguồn"
   - "Chuẩn bị cho Algolia: faceted search"
   - "Data integrity: không mất system data"

---

## 📚 Files Changed Summary

```
Created:
✨ server/data/job-types.vi.json
✨ server/src/scripts/seed-job-types.ts
✨ server/SEED_JOB_TYPES_GUIDE.md
✨ TODO/COMPLETED_TAXONOMY_FIX.md
✨ TODO/SUMMARY_VAN_DE_2_4.md
✨ QUICK_COMMANDS.md

Modified:
🔧 server/package.json
🔧 server/src/validators/job.validator.ts
🔧 app/(admin)/job-types.tsx
🔧 src/components/admin/CategoryTypeCard.tsx
```

---

## 🚀 Next Steps

### Immediate
1. ✅ Chạy script seed
2. ✅ Verify kết quả
3. ✅ Test admin UI
4. ✅ Commit code

### This Week
5. 🔄 Setup Algolia (Vấn đề 5)
6. 🔄 Seed companies data (Vấn đề 3)

### Next Week  
7. 🔄 Build simple crawler (Vấn đề 6)

---

## 💡 Tips

### Chạy script nhiều lần
- Script hỗ trợ idempotent → Chạy nhiều lần OK
- Dùng để update data sau khi sửa JSON

### Customize data
```bash
# 1. Edit JSON
nano server/data/job-types.vi.json

# 2. Re-run script
npm run seed:job-types

# 3. Refresh admin UI
```

### Backup before seed
```bash
# Export Firestore collection (optional)
firebase firestore:export gs://job4s-app.appspot.com/backups
```

---

**Prepared by:** GitHub Copilot  
**Date:** November 12, 2025  
**Estimated time:** 5-10 minutes  
**Difficulty:** ⭐ Easy
