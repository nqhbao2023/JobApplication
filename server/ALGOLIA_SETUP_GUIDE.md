# 🔍 Algolia Setup Guide - Job4S

## 📋 Tổng Quan

Algolia là search engine cho phép tìm kiếm nhanh và chính xác. Theo yêu cầu đề tài:
> *"Tích hợp search engine nội bộ để tìm kiếm nhanh và chính xác"*

## ⚡ Quick Start (5 phút)

### Bước 1: Tạo Tài Khoản Algolia (FREE)

1. Truy cập https://www.algolia.com/users/sign_up
2. Đăng ký free plan (10,000 searches/tháng)
3. Tạo application mới: "job4s"

### Bước 2: Lấy API Keys

1. Vào **Settings → API Keys**
2. Copy:
   - **Application ID**: `3JGCR12NR5`
   - **Admin API Key**: `d8e34f818e6a139b73220857f9c3c5b7`
  bonus: Search API Key: 6011dda6f3a88ab936e3ae448da2efca

⚠️ **QUAN TRỌNG**: Admin API Key rất nhạy cảm, KHÔNG commit lên Git!

### Bước 3: Cấu Hình Backend

```bash
cd server
nano .env  # hoặc notepad .env
```

Thêm vào `.env`:
```env
ALGOLIA_APP_ID=your_app_id_here
ALGOLIA_API_KEY=your_admin_api_key_here
```

### Bước 4: Seed Job Types + Sync Algolia

```bash
# Seed job types vào Firestore VÀ Algolia
npm run seed:job-types
```

**Output mong đợi:**
```
🌱 Starting job types seed with fixed IDs...

📋 Found 7 job types to seed

📤 Step 1: Seeding to Firestore...
  ✓ full-time -> Toàn thời gian
  ✓ part-time -> Bán thời gian
  ...
✅ Firestore seed completed!

🔍 Step 2: Syncing to Algolia...
✅ Synced 7 job types to Algolia

✅ Job types seeded successfully!
📊 Summary:
   - Total: 7 types
   - System types: 7
   - Firestore: ✅ Done
   - Algolia: ✅ Synced
```

### Bước 5: Sync Jobs to Algolia

```bash
npm run sync:algolia:jobs
```

**Output mong đợi:**
```
🔄 Starting jobs sync to Algolia...

📥 Fetching jobs from Firestore...
📋 Found X jobs to sync

📤 Uploading to Algolia...
✅ Successfully synced X jobs to Algolia!

⚙️  Configuring index settings...
✅ Index settings configured
```

---

## 🧪 Kiểm Tra Kết Quả

### 1. Kiểm tra Algolia Dashboard

1. Vào https://www.algolia.com/apps/3JGCR12NR5/explorer
2. Chọn index `jobs` hoặc `job_types`
3. Xem data đã được sync

### 2. Test Search

Trong Algolia Dashboard:
```
Search query: "thực tập"
→ Kết quả: Jobs có type "internship"

Search query: "developer"
→ Kết quả: Jobs có title chứa "developer"
```

---

## 📝 Scripts Available

| Script | Mô tả | Khi nào dùng |
|--------|-------|--------------|
| `npm run seed:job-types` | Seed job types → Firestore + Algolia | Lần đầu setup |
| `npm run sync:algolia:jobs` | Sync jobs → Algolia | Sau khi có jobs trong Firestore |
| `npm run sync:algolia:all` | Chạy cả 2 scripts trên | Full sync |

---

## 🏗️ Kiến Trúc

```
Frontend (Expo)
    ↓ (Algolia Search API)
Algolia Search Engine
    ↑ (Sync)
Backend Scripts
    ↑ (Read)
Firestore (Source of Truth)
```

**Luồng data:**
1. **Admin/Employer** tạo job → Firestore
2. **Backend script** sync → Algolia
3. **User search** → Query Algolia (nhanh)
4. **User click job** → Fetch chi tiết từ Firestore

---

## 🔧 Cấu Hình Indices

### Index: `jobs`

**Searchable attributes** (tìm kiếm theo):
- `title` - Tên công việc
- `company` - Tên công ty
- `description` - Mô tả
- `location` - Địa điểm
- `skills` - Kỹ năng yêu cầu

**Facets** (filter theo):
- `jobType` - Loại công việc (full-time, part-time...)
- `jobCategory` - Ngành nghề
- `jobLocation` - Địa điểm
- `status` - Trạng thái (active, closed...)

**Ranking:**
- Sắp xếp theo thời gian tạo (mới nhất trước)

### Index: `job_types`

**Searchable attributes:**
- `type_name` - Tên loại công việc

**Tags:**
- `job-type` - Tag chung
- `system` hoặc `custom` - Phân loại

---

## 🎯 Tích Hợp Frontend (Tương Lai)

### Install Algolia client (Frontend)
```bash
npm install algoliasearch
```

### Search Component
```typescript
import { algoliasearch } from 'algoliasearch';

const client = algoliasearch(
  'YOUR_APP_ID',
  'YOUR_SEARCH_ONLY_API_KEY' // ← Dùng Search-Only key, KHÔNG dùng Admin key
);

// Search jobs
const results = await client.search({
  requests: [
    {
      indexName: 'jobs',
      query: 'developer',
      filters: 'jobType:full-time AND status:active',
    },
  ],
});
```

---

## 📊 Free Tier Limits

| Metric | Free Tier | Đủ cho Đồ Án? |
|--------|-----------|----------------|
| **Searches/month** | 10,000 | ✅ Đủ |
| **Records** | 10,000 | ✅ Đủ |
| **Operations/month** | 100,000 | ✅ Đủ |
| **Cost** | $0 | ✅ Miễn phí |

---

## 🐛 Troubleshooting

### Lỗi: "Algolia not configured"

**Nguyên nhân:** Thiếu credentials trong `.env`

**Giải pháp:**
```bash
# Kiểm tra .env
cat server/.env | grep ALGOLIA

# Phải có 2 dòng:
ALGOLIA_APP_ID=...
ALGOLIA_API_KEY=...
```

### Lỗi: "Invalid API key"

**Nguyên nhân:** Dùng sai loại key

**Giải pháp:**
- Backend scripts: Dùng **Admin API Key**
- Frontend search: Dùng **Search-Only API Key**

### Lỗi: "Index not found"

**Nguyên nhân:** Chưa sync data

**Giải pháp:**
```bash
# Sync lại
npm run sync:algolia:jobs
```

---

## 🎓 Demo cho Giáo Viên

### Script Demo (5 phút)

1. **Show Algolia Dashboard:**
   - Login vào Algolia
   - Show indices: `jobs`, `job_types`
   - Show số lượng records

2. **Demo Search:**
   - Search "thực tập" → Kết quả internship jobs
   - Search "developer" → Kết quả developer jobs
   - Filter by location, type

3. **Show Backend Integration:**
   ```bash
   # Seed với Algolia sync
   npm run seed:job-types
   
   # Show output: Firestore ✅, Algolia ✅
   ```

4. **Explain Benefits:**
   - Tìm kiếm nhanh (<10ms vs Firestore ~100ms)
   - Typo-tolerant (tìm "devoloper" vẫn ra "developer")
   - Faceted search (filter đa điều kiện)
   - Highlight kết quả

---

## 📚 Next Steps

### Immediate (Đã làm):
- [x] Setup Algolia account
- [x] Config backend
- [x] Seed job types to Algolia
- [x] Sync jobs to Algolia

### This Week:
- [ ] Implement frontend search UI
- [ ] Add filters (location, type, salary)
- [ ] Add autocomplete suggestions

### Advanced (Optional):
- [ ] Real-time sync với Firestore triggers
- [ ] Analytics tracking
- [ ] Personalized search (based on user profile)

---

## 💡 Tips

### Optimize Algolia Usage

**1. Batch Operations**
```typescript
// ✅ Good: Batch save
client.saveObjects({ indexName, objects: [...] });

// ❌ Bad: Loop save
for (const obj of objects) {
  client.saveObject({ indexName, object: obj });
}
```

**2. Use Search-Only Key Frontend**
```typescript
// Frontend: KHÔNG dùng Admin key
const searchClient = algoliasearch(appId, searchOnlyKey);
```

**3. Configure Replicas (nếu cần sort khác nhau)**
```typescript
// jobs_latest: Sort by created_at desc
// jobs_salary: Sort by salary desc
```

---

## 📖 Tài Liệu Tham Khảo

- [Algolia Documentation](https://www.algolia.com/doc/)
- [Algolia Free Tier](https://www.algolia.com/pricing/)
- [Algolia Node.js Client](https://www.algolia.com/doc/api-client/getting-started/install/javascript/)

---

**Created by:** GitHub Copilot  
**Date:** November 12, 2025  
**Status:** ✅ Production Ready  
**Difficulty:** ⭐⭐ Medium
