# 🚀 HƯỚNG DẪN SỬ DỤNG VIECOI CRAWLER - CHI TIẾT

## 📋 TỔNG QUAN

Hệ thống crawler gồm 5 files chính:
1. **sitemap-crawler.ts** - Lấy danh sách URLs từ sitemap.xml
2. **job-crawler.ts** - Crawl chi tiết jobs từ HTML
3. **normalizer.ts** - Chuẩn hóa data về Job4S schema
4. **upsert-jobs.ts** - Lưu jobs vào Firestore
5. **sync-algolia.ts** - Đồng bộ lên Algolia search

---

## 🔧 SETUP BAN ĐẦU (Chỉ làm 1 lần)

### Bước 1: Cài dependencies
```bash
cd server
npm install xml2js @types/xml2js
```

### Bước 2: Kiểm tra Firebase credentials
Đảm bảo file `server/serviceAccountKey.json` tồn tại. Nếu chưa có:
1. Vào Firebase Console → Project Settings → Service Accounts
2. Generate new private key → Download JSON
3. Đổi tên thành `serviceAccountKey.json`
4. Đặt trong folder `server/`

### Bước 3: Kiểm tra Algolia credentials (optional)
Mở file `server/.env`, kiểm tra:
```env
ALGOLIA_APP_ID=your_app_id
ALGOLIA_API_KEY=your_admin_key
```

---

## 📖 HƯỚNG DẪN SỬ DỤNG TỪNG BƯỚC

### 🔍 BƯỚC 1: Crawl Sitemap (Lấy danh sách URLs)

**Mục đích**: Lấy danh sách URLs của jobs và companies từ sitemap.xml

**Command**:
```bash
cd server
npm run crawl:viecoi-sitemap
```

**Options**:
```bash
# Crawl và giới hạn 10 URLs
npm run crawl:viecoi-sitemap -- --limit 10

# Force refresh (bỏ qua cache)
npm run crawl:viecoi-sitemap -- --force

# Giới hạn + force
npm run crawl:viecoi-sitemap -- --force --limit 5
```

**Expected Output**:
```
🚀 Starting sitemap crawler...
🌐 Fetching sitemap: https://viecoi.vn/sitemap.xml
✅ Sitemap fetched successfully (123456 bytes)
💾 Cache saved to server/data/viecoi-sitemap-cache.json

📊 Summary:
   Total URLs: 5432
   Job URLs: 2156
   Company URLs: 543
   Other URLs: 2733

✅ Sitemap crawl completed successfully!
   Jobs: 10
   Companies: 10

Sample job URLs:
   1. https://viecoi.vn/viec-lam/abc-123.html
   2. https://viecoi.vn/viec-lam/def-456.html
   ...
```

**Output File**: `server/data/viecoi-sitemap-cache.json`

**Debug**:
- Nếu lỗi "Failed to fetch sitemap": Check internet connection
- Nếu timeout: Tăng timeout trong `sitemap-crawler.ts` dòng 47
- Cache tồn tại 24h, sau đó sẽ fetch lại

---

### 🕷️ BƯỚC 2: Crawl Job Details (Lấy chi tiết jobs)

**Mục đích**: Crawl thông tin chi tiết (title, company, JD, salary...) từ từng job URL

**⚠️ QUAN TRỌNG: Kiểm tra HTML selectors trước!**

1. Mở 1 URL từ sitemap (ví dụ: `https://viecoi.vn/viec-lam/abc-123.html`)
2. Right-click → Inspect Element
3. Tìm các selectors:
   - Job title: `h1.job-title`, `.title`, `.job-header h1`?
   - Company: `.company-name`, `.employer-name`?
   - Location: `.location`, `.address`?
   - Salary: `.salary`, `.wage`?
   - Description: `.job-description`, `.description`?

4. **Update selectors trong `job-crawler.ts`** (dòng 44-75):
```typescript
// PHẢI SỬA ĐÂY NẾU HTML KHÔNG KHỚP!
const title = $('h1.job-title').first().text().trim(); // ← Update selector
const company = $('.company-name').first().text().trim(); // ← Update
// ...
```

**Command**:
```bash
npm run crawl:viecoi-jobs
```

**Mặc định**: Crawl 10 jobs đầu tiên từ sitemap

**Để thay đổi số lượng**: Sửa file `job-crawler.ts` (dòng 198):
```typescript
const { jobs: jobURLs } = await crawlSitemap({ limit: 20 }); // ← Change 10 to 20
```

**Expected Output**:
```
🚀 Starting sitemap crawler...
✅ Using cached sitemap (less than 24h old)
📊 Summary:
   Total URLs: 5432
   Job URLs: 10
   ...

🚀 Crawling 10 job pages...

[1/10]
🔍 Crawling: https://viecoi.vn/viec-lam/abc-123.html
  ✅ Nhân Viên Marketing at Công Ty ABC

[2/10]
🔍 Crawling: https://viecoi.vn/viec-lam/def-456.html
  ✅ Developer React at Startup XYZ

...

✅ Successfully crawled 10/10 jobs
💾 Saved 10 jobs to server/data/viecoi-jobs-raw.json

✅ Job crawl completed!
```

**Output File**: `server/data/viecoi-jobs-raw.json`

**Debug**:
- Nếu `⚠️ Skipping (missing title or company)`: Selectors sai, phải update!
- Nếu `❌ Failed to crawl`: Check URL có mở được không? Có bị block không?
- Nếu description trống: Update selector `.job-description`
- Delay giữa requests: 1s (dòng 191 trong job-crawler.ts)

---

### 🔧 BƯỚC 3: Normalize & Upsert to Firestore

**Mục đích**: Chuẩn hóa data và lưu vào Firestore với `source="viecoi"`

**Command**:
```bash
npm run upsert:viecoi-jobs
```

**Quá trình**:
1. Đọc file `viecoi-jobs-raw.json`
2. Normalize: salary text → min/max, job type → ID, category mapping
3. Deduplicate: Loại job trùng (title + company + location)
4. Upsert vào Firestore:
   - Nếu `external_url` đã tồn tại → **Update**
   - Nếu chưa có → **Insert**

**Expected Output**:
```
🚀 Starting job upsert process...

✅ Firebase Admin initialized with service account
📋 Loaded 10 raw jobs from file

🔧 Normalizing jobs...
✅ Normalized 10 jobs

🔍 Deduplicating jobs...
📊 Deduplicated: 10 → 9 unique jobs
✅ 9 unique jobs

📤 Upserting 9 jobs to Firestore...

[1/9] Nhân Viên Marketing at Công Ty ABC
  ✅ Inserted
[2/9] Developer React at Startup XYZ
  ✅ Inserted
[3/9] Designer UI/UX at Tech Corp
  🔄 Updated (already exists)
...

📊 Upsert Summary:
   Total processed: 9
   ✅ Inserted: 7
   🔄 Updated: 2
   ⏭️  Skipped: 0
   ❌ Errors: 0

✅ Upsert completed!
```

**Kết quả**: Jobs xuất hiện trong Firestore collection `jobs` với:
- `source: "viecoi"`
- `external_url: "https://viecoi.vn/..."`
- `status: "draft"` (chờ admin duyệt)
- `is_verified: false`

**Debug**:
- Nếu `❌ serviceAccountKey.json not found`: Đặt file trong `server/`
- Nếu `❌ Raw jobs file not found`: Chạy `npm run crawl:viecoi-jobs` trước
- Nếu salary parse sai: Check logic trong `normalizer.ts` dòng 60-100

---

### 🔍 BƯỚC 4: Sync to Algolia (Optional)

**Mục đích**: Đồng bộ jobs lên Algolia để search nhanh

**Command**:
```bash
npm run sync:viecoi-algolia
```

**Expected Output**:
```
🚀 Starting Algolia sync for viecoi jobs...

✅ Firebase Admin initialized
📥 Fetching viecoi jobs from Firestore...
✅ Fetched 9 viecoi jobs

🔍 Syncing to Algolia...
✅ Synced 9 jobs to Algolia

✅ Algolia sync completed!
```

**Debug**:
- Nếu `⚠️ Algolia not configured`: Check `.env` có `ALGOLIA_APP_ID` và `ALGOLIA_API_KEY`
- Nếu `⚠️ No viecoi jobs found`: Chạy `npm run upsert:viecoi-jobs` trước

---

### ⚡ FULL PIPELINE (Chạy 1 lần)

**Command tổng hợp** (crawl + upsert + sync):
```bash
npm run crawl:viecoi-full
```

Tương đương với:
```bash
npm run crawl:viecoi-jobs && 
npm run upsert:viecoi-jobs && 
npm run sync:viecoi-algolia
```

---

## 🐛 DEBUGGING GUIDE

### Problem 1: Selectors không match HTML

**Triệu chứng**:
```
[1/10]
🔍 Crawling: https://viecoi.vn/viec-lam/abc-123.html
  ⚠️ Skipping (missing title or company)
```

**Giải pháp**:
1. Mở URL đó trong browser
2. Inspect HTML elements
3. Tìm class/id đúng cho title, company, location...
4. Update selectors trong `job-crawler.ts` dòng 44-75

**Ví dụ fix**:
```typescript
// Cũ (sai):
const title = $('h1.job-title').first().text().trim();

// Mới (đúng):
const title = $('div.job-header h2.title').first().text().trim();
```

---

### Problem 2: Crawl bị 403 Forbidden

**Triệu chứng**:
```
❌ Failed to crawl: Request failed with status code 403
```

**Giải pháp**:
1. Check robots.txt: `https://viecoi.vn/robots.txt`
2. Tăng delay giữa requests trong `job-crawler.ts`:
```typescript
await crawlMultipleJobs(urls, { delay: 2000 }); // 1s → 2s
```
3. Change User-Agent nếu cần (dòng 43):
```typescript
'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)...'
```

---

### Problem 3: Data không đúng format

**Triệu chứng**: Salary = "undefined", skills = []

**Giải pháp**:
1. Check raw data: `cat server/data/viecoi-jobs-raw.json | jq '.[0]'`
2. Verify selectors trong `job-crawler.ts`
3. Check normalize logic trong `normalizer.ts`

**Test normalizer riêng**:
```typescript
// Thêm vào cuối normalizer.ts
if (require.main === module) {
  const testJob = {
    url: 'https://test.com',
    title: 'Test Job',
    company: 'Test Co',
    salary: '10-15 triệu',
    location: 'Hà Nội',
    jobType: 'Full-time',
    category: 'IT',
    // ...
  };
  console.log(normalizeJob(testJob));
}
```

---

### Problem 4: Firestore permission denied

**Triệu chứng**:
```
❌ Error upserting job: Missing or insufficient permissions
```

**Giải pháp**:
1. Check Firebase Rules cho collection `jobs`
2. Verify `serviceAccountKey.json` có quyền write
3. Test bằng Firebase Console manual create

---

## 📊 MONITORING & LOGS

### Check data đã crawl
```bash
# Count jobs crawled
cat server/data/viecoi-jobs-raw.json | jq 'length'

# View first job
cat server/data/viecoi-jobs-raw.json | jq '.[0]'

# View all titles
cat server/data/viecoi-jobs-raw.json | jq '.[].title'
```

### Check Firestore
```bash
# Trong Firebase Console
# Firestore Database → jobs collection
# Filter: source == "viecoi"
```

### Check Algolia
```bash
# Trong Algolia Dashboard
# Indices → jobs → Browse
# Filter: source:viecoi
```

---

## 🎯 WORKFLOW THỰC TẾ

### Lần đầu setup (Test với 5 jobs)
```bash
cd server

# 1. Crawl sitemap (test 5 URLs)
npm run crawl:viecoi-sitemap -- --limit 5

# 2. Kiểm tra HTML selectors của 1 URL
# Mở browser, inspect HTML, update selectors nếu cần

# 3. Crawl 5 jobs
# (Sửa job-crawler.ts dòng 198: limit: 5)
npm run crawl:viecoi-jobs

# 4. Check raw data
cat data/viecoi-jobs-raw.json | jq 'length'
cat data/viecoi-jobs-raw.json | jq '.[0]' # Xem job đầu tiên

# 5. Upsert to Firestore
npm run upsert:viecoi-jobs

# 6. Check Firestore Console
# Vào Firebase Console, xem collection jobs

# 7. Sync to Algolia
npm run sync:viecoi-algolia

# 8. Test search trong app
```

### Production (Crawl 100 jobs)
```bash
# Sau khi test OK với 5 jobs
# Sửa job-crawler.ts dòng 198: limit: 100

npm run crawl:viecoi-full
```

---

## 📝 CHECKLIST TRƯỚC KHI CHẠY

- [ ] `server/serviceAccountKey.json` tồn tại
- [ ] `server/.env` có ALGOLIA credentials (optional)
- [ ] Đã test với 1 URL thủ công, verify selectors
- [ ] Đã test với 5 jobs, check raw data output
- [ ] Firebase Rules cho phép write collection `jobs`

---

## 🚨 LƯU Ý QUAN TRỌNG

### Rate Limiting
- Mặc định delay 1s giữa requests
- Không crawl quá 100 jobs cùng lúc (tránh bị ban IP)
- Nếu bị 429/403 → Tăng delay lên 2-3s

### Data Quality
- Luôn check raw data trước khi upsert
- Verify ít nhất 3 jobs có đầy đủ: title, company, description, salary
- Nếu thiếu field → Fix selectors

### Firestore Cost
- Mỗi lần upsert = 1 read + 1 write
- 100 jobs = ~200 operations
- Free tier: 50K reads/day, 20K writes/day → OK

### Legal
- Tuân thủ robots.txt: chỉ crawl `/viec-lam/*.html`
- User-Agent: "Job4S-Crawler/1.0 (Educational Purpose)"
- Delay: ≥1s giữa requests
- Purpose: Educational/non-commercial

---

## 📞 NEXT STEPS

Sau khi crawl thành công 20-50 jobs:
1. ✅ Test search trong app
2. ✅ Implement external jobs UI (Badge "Từ Viecoi.vn")
3. ✅ Setup GitHub Actions cho auto-crawl
4. ✅ Admin screen để duyệt jobs (is_verified)

→ **Bạn đã sẵn sàng test crawler rồi! 🚀**
