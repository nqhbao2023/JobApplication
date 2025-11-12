# 🚀 Quick Commands - Job4S Development

## 📦 Seed Data Scripts

### Job Types (với ID cố định)
```bash
cd server
npm run seed:job-types
```

### Job Categories (script cũ - client SDK)
```bash
node src/scripts/admin/seedCategories.js
```

---

## 🔥 Firebase Console Links

- **Firestore Database**: https://console.firebase.google.com/project/job4s-app/firestore
- **Authentication**: https://console.firebase.google.com/project/job4s-app/authentication
- **Storage**: https://console.firebase.google.com/project/job4s-app/storage

---

## 🧪 Development Commands

### Frontend (Expo)
```bash
# Clear cache và start
npx expo start -c

# Run on Android
npx expo start --android

# Run on iOS  
npx expo start --ios

# Build development
eas build --profile development --platform android
```

### Backend (Express API)
```bash
cd server

# Development mode (hot reload)
npm run dev

# Build TypeScript
npm run build

# Production
npm start

# Lint
npm run lint
```

---

## 🗂️ Cấu Trúc Data Mới

### Job Types Collection
```
job_types/
  ├── full-time/
  │   ├── type_name: "Toàn thời gian"
  │   ├── slug: "toan-thoi-gian"
  │   ├── icon: "💼"
  │   ├── color: "#3b82f6"
  │   ├── isSystem: true
  │   └── created_at: timestamp
  ├── part-time/
  ├── internship/
  ├── contract/
  ├── freelance/
  ├── remote/
  └── hybrid/
```

---

## 🔧 Debug Common Issues

### Issue: "app/default hasn't been initialized"
```bash
# Kiểm tra file service account
ls server/serviceAccountKey.json

# Nếu không có, download từ Firebase Console
# Project Settings → Service Accounts → Generate New Key
```

### Issue: TypeScript errors trong server
```bash
cd server
npm install
npx tsc --noEmit  # Check types only
```

### Issue: Expo cache issues
```bash
# Clear all caches
npx expo start -c
rm -rf node_modules
npm install
```

---

## 📊 Verify Seed Results

### Check Firestore
```bash
# In Firebase Console, run this query:
SELECT * FROM job_types WHERE isSystem = true
# Should return 7 documents
```

### Check trong code
```javascript
import { collection, getDocs } from 'firebase/firestore';

const snapshot = await getDocs(collection(db, 'job_types'));
console.log('Total job types:', snapshot.size);
snapshot.forEach(doc => {
  console.log(doc.id, '→', doc.data().type_name, '(system:', doc.data().isSystem + ')');
});
```

---

## 🎯 Test Workflows

### Test Admin Protection
1. Login admin
2. Vào Admin → Job Types  
3. Thử xóa "Toàn thời gian" → Should show alert
4. Thử xóa custom type → Should work

### Test Create Job với Type mới
1. Login employer
2. Add Job → Chọn job type
3. Submit → Check backend validator accepts it
4. Verify job document có field `type: "full-time"`

---

## 📝 Git Workflow

### Commit Changes
```bash
git add .
git commit -m "feat: implement fixed ID taxonomy + admin protection

- Add server/data/job-types.vi.json with fixed IDs
- Create seed-job-types.ts script with Firebase Admin
- Update validator to accept any job type ID
- Add isSystem protection in admin UI
- Add visual badge for system types

Resolves: Vấn đề 2 & 4 from MUCTIEU.md"

git push origin main
```

### Create Feature Branch
```bash
git checkout -b feature/algolia-search
# Work on Vấn đề 5...
git commit -m "feat: setup Algolia search engine"
git push origin feature/algolia-search
```

---

## 🔐 Environment Setup

### Required .env variables (server/)
```env
PORT=3000
NODE_ENV=development

# Firebase Admin (cho scripts)
# Hoặc dùng serviceAccountKey.json

# Algolia (sẽ cần cho Vấn đề 5)
ALGOLIA_APP_ID=your_app_id
ALGOLIA_API_KEY=your_admin_key
```

### Required .env variables (root/)
```env
EXPO_PUBLIC_FIREBASE_API_KEY=xxx
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=xxx
EXPO_PUBLIC_FIREBASE_PROJECT_ID=job4s-app
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=xxx
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=xxx
EXPO_PUBLIC_FIREBASE_APP_ID=xxx
```

---

## 📚 Next Steps Checklist

- [ ] Chạy `npm run seed:job-types` để cập nhật Firestore
- [ ] Test admin UI xem badge "Hệ thống" hiển thị đúng
- [ ] Test không thể xóa system types
- [ ] Commit code lên Git
- [ ] Chuyển sang Vấn đề 5: Setup Algolia
- [ ] Sau đó Vấn đề 6: Simple crawler

---

**Last Updated:** November 12, 2025
