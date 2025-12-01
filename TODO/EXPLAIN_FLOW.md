# 🔄 Giải Thích Flow Crawl Job từ Viecoi.vn

## 📋 Tổng Quan

Hệ thống tự động crawl (thu thập) tin tuyển dụng từ website **viecoi.vn**, chuẩn hóa dữ liệu, lưu vào **Firebase Firestore**, và đồng bộ lên **Algolia** để tìm kiếm nhanh.

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Viecoi.vn  │ -> │   Crawl     │ -> │  Normalize  │ -> │  Firestore  │ -> │   Algolia   │
│  (Website)  │    │  (Raw Data) │    │  (Clean)    │    │  (Database) │    │  (Search)   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

---

## 🗂️ Cấu Trúc Files

```
server/
├── src/crawlers/viecoi/
│   ├── fetch-job-urls.ts    # Bước 1: Lấy danh sách URLs từ sitemap
│   ├── job-crawler.ts       # Bước 2: Crawl chi tiết từng job
│   ├── normalizer.ts        # Bước 3: Chuẩn hóa dữ liệu
│   ├── normalize-runner.ts  # Script chạy normalize
│   ├── upsert-jobs.ts       # Bước 4: Lưu vào Firestore
│   └── sync-algolia.ts      # Bước 5: Đồng bộ lên Algolia
│
├── data/
│   ├── viecoi-jobs-raw.json        # Output bước 2 (dữ liệu thô)
│   └── viecoi-jobs-normalized.json # Output bước 3 (đã chuẩn hóa)
│
└── package.json             # Định nghĩa các npm scripts

.github/workflows/
└── auto-crawler.yml         # GitHub Actions tự động chạy
```

---

## 📝 Chi Tiết Từng Bước

### **Bước 1: Lấy URLs từ Sitemap**
📄 **File:** `server/src/crawlers/viecoi/fetch-job-urls.ts`

```typescript
// Đọc sitemap.xml của viecoi.vn để lấy danh sách URLs job
const mainSitemapURL = 'https://viecoi.vn/sitemap.xml';
// -> Tìm job.xml
// -> Lấy tất cả URLs dạng /viec-lam/*.html
```

**Chức năng:**
- Truy cập sitemap của viecoi.vn
- Parse XML để lấy danh sách URLs tin tuyển dụng
- Trả về mảng URLs (ví dụ: 11,000+ URLs)

---

### **Bước 2: Crawl Chi Tiết Từng Job**
📄 **File:** `server/src/crawlers/viecoi/job-crawler.ts`

```typescript
// Với mỗi URL, truy cập và extract thông tin
export async function crawlJobPage(url: string): Promise<JobData | null> {
  const response = await axios.get(url);
  const $ = cheerio.load(response.data);
  
  return {
    title: $('h1.title_container').text(),
    company: $('h2.name-cpn-title').text(),
    salary: $('[class*="salary"]').text(),
    location: $('[class*="location"]').text(),
    // ... các trường khác
  };
}
```

**Chức năng:**
- Truy cập từng trang job
- Dùng **Cheerio** (giống jQuery) để parse HTML
- Extract: title, company, salary, location, description, requirements...
- Lưu kết quả vào `data/viecoi-jobs-raw.json`

**Output mẫu (raw):**
```json
{
  "url": "https://viecoi.vn/viec-lam/nhan-vien-ke-toan-119163.html",
  "title": "NHÂN VIÊN KẾ TOÁN",
  "company": "Công ty ABC",
  "salary": "10 - 15 triệu",
  "location": "TPHCM",
  "jobType": "Full-time",
  "category": "Kế toán"
}
```

---

### **Bước 3: Chuẩn Hóa Dữ Liệu**
📄 **File:** `server/src/crawlers/viecoi/normalizer.ts`

```typescript
// Chuyển đổi dữ liệu thô → format chuẩn của app
export function normalizeJob(job: JobData): NormalizedJob {
  return {
    title: job.title,
    company_name: job.company,
    salary_min: parseSalary(job.salary).min,  // "10-15 triệu" → 10000000
    salary_max: parseSalary(job.salary).max,  // "10-15 triệu" → 15000000
    salary_text: job.salary,
    job_type_id: normalizeJobType(job.jobType), // "Full-time" → "full-time"
    jobCategories: normalizeCategory(job.category), // "Kế toán" → "finance"
    source: 'viecoi',
    status: 'pending',
    // ...
  };
}
```

**Chức năng:**
- **Parse salary:** "10-15 triệu" → `{ min: 10000000, max: 15000000 }`
- **Map job type:** "Toàn thời gian" → `"full-time"` (khớp với Firestore)
- **Map category:** "Công nghệ thông tin" → `"it-software"`
- **Deduplicate:** Loại bỏ jobs trùng lặp
- Lưu kết quả vào `data/viecoi-jobs-normalized.json`

**Output mẫu (normalized):**
```json
{
  "title": "NHÂN VIÊN KẾ TOÁN",
  "company_name": "Công ty ABC",
  "salary_min": 10000000,
  "salary_max": 15000000,
  "salary_text": "10 - 15 triệu",
  "job_type_id": "full-time",        // ← ID khớp với collection job_types
  "jobCategories": "finance",         // ← ID khớp với collection job_categories
  "source": "viecoi",
  "status": "pending",
  "external_url": "https://viecoi.vn/..."
}
```

---

### **Bước 4: Lưu Vào Firestore**
📄 **File:** `server/src/crawlers/viecoi/upsert-jobs.ts`

```typescript
// Upsert = Update nếu tồn tại, Insert nếu chưa có
async function upsertJob(job: any) {
  // Kiểm tra job đã tồn tại chưa (theo external_url)
  const existing = await jobsRef
    .where('external_url', '==', job.external_url)
    .get();

  if (!existing.empty) {
    // Đã có → Update
    await jobsRef.doc(existing.docs[0].id).update(job);
  } else {
    // Chưa có → Insert mới
    await jobsRef.add(job);
  }
}
```

**Chức năng:**
- Kết nối Firebase Admin SDK
- Kiểm tra job đã tồn tại chưa (tránh duplicate)
- Tự động tạo Company nếu chưa có
- Insert/Update jobs vào collection `jobs`

---

### **Bước 5: Đồng Bộ Lên Algolia**
📄 **File:** `server/src/crawlers/viecoi/sync-algolia.ts`

```typescript
// Lấy jobs từ Firestore và đẩy lên Algolia
async function syncToAlgolia(jobs: any[]) {
  const algoliaObjects = jobs.map(job => ({
    objectID: job.id,
    title: job.title,
    company_name: job.company_name,
    location: job.location,
    salary_text: job.salary_text,
    // ... các field cần tìm kiếm
  }));

  await client.saveObjects({
    indexName: 'jobs',
    objects: algoliaObjects,
  });
}
```

**Chức năng:**
- Lấy jobs có `source='viecoi'` từ Firestore
- Format lại cho Algolia (cần `objectID`)
- Push lên Algolia index `jobs`
- Cho phép tìm kiếm full-text nhanh trong app

---

## ⚡ GitHub Actions - Tự Động Hóa

📄 **File:** `.github/workflows/auto-crawler.yml`

```yaml
name: Auto Crawler - Viecoi.vn Jobs

on:
  schedule:
    - cron: '0 */6 * * *'  # Chạy mỗi 6 giờ
  workflow_dispatch:        # Cho phép chạy thủ công

jobs:
  crawl-jobs:
    steps:
      # 1. Setup môi trường
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      # 2. Cài dependencies
      - run: cd server && npm ci
      
      # 3. Crawl + Normalize (không cần Firebase)
      - run: |
          cd server
          npm run crawl:viecoi-jobs    # Crawl 50 jobs mới
          npm run normalize:viecoi      # Chuẩn hóa
      
      # 4. Lưu vào Firestore
      - run: npm run upsert:viecoi-jobs
        env:
          FIREBASE_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID }}
          # ... credentials từ GitHub Secrets
      
      # 5. Sync lên Algolia
      - run: npm run sync:viecoi-algolia
        env:
          ALGOLIA_APP_ID: ${{ secrets.ALGOLIA_APP_ID }}
          # ...
```

**Lịch chạy:**
- Tự động mỗi 6 giờ (00:00, 06:00, 12:00, 18:00 UTC)
- Hoặc chạy thủ công từ tab Actions

---

## 🔧 NPM Scripts

Trong `server/package.json`:

```json
{
  "scripts": {
    "crawl:viecoi-jobs": "ts-node src/crawlers/viecoi/job-crawler.ts",
    "normalize:viecoi": "ts-node src/crawlers/viecoi/normalize-runner.ts",
    "upsert:viecoi-jobs": "ts-node src/crawlers/viecoi/upsert-jobs.ts",
    "sync:viecoi-algolia": "ts-node src/crawlers/viecoi/sync-algolia.ts",
    
    // Full pipeline (chạy tất cả)
    "crawl:viecoi-full": "npm run crawl:viecoi-jobs && npm run normalize:viecoi && npm run upsert:viecoi-jobs && npm run sync:viecoi-algolia"
  }
}
```

---

## ❓ FAQ - Câu Hỏi Thường Gặp

### **Q1: Dữ liệu có tự động sync lên Algolia không?**
✅ **CÓ** - Sau khi upsert vào Firestore, workflow sẽ tự động chạy `sync:viecoi-algolia`

### **Q2: Dữ liệu có tự chuẩn hóa không?**
✅ **CÓ** - Bước `normalize:viecoi` sẽ:
- Parse salary text → số
- Map job type → ID chuẩn (`full-time`, `part-time`,...)
- Map category → ID chuẩn (`it-software`, `marketing`,...)
- Loại bỏ duplicates

### **Q3: Mỗi lần crawl bao nhiêu jobs?**
- **Mặc định:** 50 jobs mới nhất
- **Có thể thay đổi:** `npm run crawl:viecoi-jobs -- --limit 100`

### **Q4: Jobs mới có hiển thị ngay trong app không?**
⚠️ **KHÔNG NGAY** - Jobs crawl có `status: 'pending'`
- Cần Admin duyệt → đổi thành `status: 'active'`
- Hoặc sửa code để set `status: 'active'` luôn

### **Q5: Tại sao filter Job Types không hoạt động?**
**Đã fix!** Vấn đề là:
- Jobs từ viecoi lưu `job_type_id: "full-time"` (string)
- Jobs tạo thủ công lưu `jobTypes: { $id: "full-time" }` (object)
- Code filter đã được update để hỗ trợ cả 2 format

### **Q6: Crawler có tốn tiền không?**
❌ **KHÔNG** - Repo public được GitHub Actions miễn phí unlimited

### **Q7: Nếu viecoi.vn đổi giao diện thì sao?**
⚠️ Crawler sẽ fail vì CSS selectors không còn đúng
- Cần update file `job-crawler.ts` với selectors mới

---

## 🔍 Debug & Troubleshooting

### **Chạy local để test:**
```bash
cd server

# Test từng bước
npm run crawl:viecoi-jobs -- --limit 5   # Crawl 5 jobs để test
npm run normalize:viecoi                  # Chuẩn hóa
npm run upsert:viecoi-jobs               # Lưu Firestore (cần serviceAccountKey.json)
npm run sync:viecoi-algolia              # Sync Algolia
```

### **Xem dữ liệu crawl:**
- Raw: `server/data/viecoi-jobs-raw.json`
- Normalized: `server/data/viecoi-jobs-normalized.json`

### **Xem logs GitHub Actions:**
1. Vào repo → tab **Actions**
2. Click workflow run
3. Click job **"Crawl Jobs from Viecoi.vn"**
4. Xem logs từng step

---

## 📊 Luồng Dữ Liệu Tổng Quan

```
                         GitHub Actions (mỗi 6 giờ)
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────┐
│                         CRAWL PIPELINE                           │
│                                                                  │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────────┐    │
│  │  sitemap    │ --> │  50 URLs    │ --> │  50 Raw Jobs    │    │
│  │  viecoi.vn  │     │  job pages  │     │  (JSON file)    │    │
│  └─────────────┘     └─────────────┘     └─────────────────┘    │
│                                                   │              │
│                                                   ▼              │
│                                          ┌─────────────────┐    │
│                                          │   Normalize     │    │
│                                          │   + Dedupe      │    │
│                                          └─────────────────┘    │
│                                                   │              │
│                                                   ▼              │
│                                          ┌─────────────────┐    │
│                                          │  Normalized     │    │
│                                          │  Jobs (JSON)    │    │
│                                          └─────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────┐
│                         STORAGE                                  │
│                                                                  │
│  ┌─────────────────┐              ┌─────────────────┐           │
│  │    Firestore    │    ------>   │     Algolia     │           │
│  │  (jobs, etc.)   │    sync      │   (search)      │           │
│  └─────────────────┘              └─────────────────┘           │
└──────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────┐
│                        MOBILE APP                                │
│                                                                  │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────────┐    │
│  │  Job List   │     │   Search    │     │  Job Details    │    │
│  │  (Firestore)│     │  (Algolia)  │     │                 │    │
│  └─────────────┘     └─────────────┘     └─────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

---

## ✅ Checklist Setup

- [x] Tạo GitHub Secrets (Firebase, Algolia credentials)
- [x] Node.js version 20 trong workflow
- [x] Fix job type filter trong app
- [x] Xóa workflow duplicate
- [ ] (Tùy chọn) Đổi `status: 'pending'` → `'active'` để jobs hiện ngay

---

*Cập nhật: December 1, 2025*
