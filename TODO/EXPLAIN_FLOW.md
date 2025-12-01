# 🔄 Giải Thích Flow Crawl Job từ Viecoi.vn

## ⚠️ Lưu Ý Quan Trọng

**Viecoi.vn sử dụng Cloudflare Bot Protection!** 

Website viecoi.vn được bảo vệ bởi Cloudflare và chặn:
- ❌ Requests từ datacenter IPs (GitHub Actions)
- ❌ Requests từ axios/cheerio (không có browser)
- ✅ **Puppeteer với real browser** - bypass được Cloudflare! 🎉

### 🚀 Chạy Crawler Từ Máy Local (Puppeteer - KHUYÊN DÙNG)

```powershell
cd server

# Cách 1: Full pipeline (Crawl + AI Categorize + Normalize + Upsert + Sync Algolia)
npm run crawl:viecoi-full -- --limit 50

# Cách 2: Chỉ crawl dữ liệu thô (không cần Firebase)
npm run crawl:viecoi-puppeteer -- --limit 50

# Cách 3: Chạy pipeline từ dữ liệu đã crawl (skip crawl step)
npx ts-node src/crawlers/viecoi/puppeteer-full-pipeline.ts --skip-crawl
```

### 📊 Kết Quả Thực Tế

- **Success rate:** 100% (Puppeteer bypass Cloudflare thành công)
- **Dữ liệu:** JSON-LD structured data (schema.org/JobPosting)
- **Fallback:** DOM selectors nếu không có JSON-LD
- **AI Categorization:** Hybrid (Regex 80% + Gemini AI 20%)

---

## 🆕 NEW: Hybrid AI Categorization System

### Giới Thiệu
Hệ thống phân loại công việc thông minh 2 lớp:

```
┌────────────────────────────────────────────────────────────────┐
│                    HYBRID AI CATEGORIZATION                    │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Layer 1: REGEX PATTERNS (Fast, ~80% jobs)                    │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ • Confidence scoring với weighted patterns           │     │
│  │ • ~50 regex patterns cho 15 categories               │     │
│  │ • Threshold: ≥60% confidence → use regex result      │     │
│  │ • Xử lý: <10ms/job                                   │     │
│  └──────────────────────────────────────────────────────┘     │
│                           │                                    │
│                           │ confidence < 60%                   │
│                           ▼                                    │
│  Layer 2: GEMINI AI BATCH (~20% jobs)                         │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ • Batch processing: 5 jobs/request                   │     │
│  │ • Smart prompts với context                          │     │
│  │ • Fallback to "other" nếu AI error                   │     │
│  │ • Rate limiting: 500ms giữa các batch                │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Categories Supported (15 loại)
| ID | Category | Patterns Examples |
|----|----------|-------------------|
| `it-software` | IT/Software | developer, react, python, devops |
| `marketing` | Marketing | seo, content, social media |
| `sales` | Sales | bán hàng, kinh doanh, telesales |
| `design` | Design | ui/ux, photoshop, graphic |
| `finance` | Finance | kế toán, tài chính, ngân hàng |
| `hr` | HR/Admin | nhân sự, tuyển dụng, hành chính |
| `engineering` | Engineering | kỹ sư, cơ khí, điện tử |
| `healthcare` | Healthcare | bác sĩ, y tá, dược |
| `education` | Education | giáo viên, gia sư, đào tạo |
| `f&b` | F&B | nhà hàng, bartender, bếp |
| `retail` | Retail | bán lẻ, thu ngân, cửa hàng |
| `logistics` | Logistics | kho, vận chuyển, xuất nhập khẩu |
| `construction` | Construction | xây dựng, công trình |
| `manufacturing` | Manufacturing | sản xuất, nhà máy |
| `other` | Other | fallback category |

### Files Structure
```
server/src/crawlers/viecoi/
├── ai-categorizer.ts          # 🆕 Hybrid AI categorization service
├── puppeteer-full-pipeline.ts # Updated: integrated AI categorization
└── ...

server/data/logs/
├── categorization.log         # AI categorization detailed logs
└── pipeline.log               # Pipeline execution logs
```

### Sample Output
```json
{
  "title": "Senior React Developer",
  "company_name": "TechCorp",
  "jobCategories": "it-software",
  "categoryConfidence": 95,
  "categoryMethod": "regex",
  ...
}
```

---

## 🤖 Auto Scheduling (Windows Task Scheduler)

### Giới Thiệu
Tự động chạy crawler mỗi 6 giờ với PowerShell script.

### Files
```
JobApplication/
├── auto-crawl.ps1             # 🆕 PowerShell auto-run script
└── server/data/logs/
    ├── auto-crawl.log         # Auto-run execution logs
    ├── categorization.log     # AI categorization logs
    └── pipeline.log           # Pipeline logs
```

### Cài Đặt Task Scheduler (Windows)

#### Cách 1: GUI (Task Scheduler)

1. Mở **Task Scheduler** (Win + R → `taskschd.msc`)
2. Click **Create Basic Task...**
3. Điền thông tin:
   - **Name:** `Job4S Auto Crawler`
   - **Description:** `Automatically crawl jobs from viecoi.vn every 6 hours`
4. **Trigger:** Daily, repeat every 6 hours
   - Start: chọn thời gian bắt đầu
   - Repeat task every: `6 hours`
   - For a duration of: `Indefinitely`
5. **Action:** Start a program
   - Program: `powershell.exe`
   - Arguments: `-ExecutionPolicy Bypass -File "C:\Users\Admin\Documents\GitHub\JobApplication\auto-crawl.ps1" -Limit 50`
6. **Conditions:** 
   - ☐ Start only if computer is on AC power (uncheck)
   - ☑ Wake the computer to run this task (optional)
7. **Settings:**
   - ☑ Run task as soon as possible after a scheduled start is missed
   - ☐ Stop the task if it runs longer than: (uncheck or set 1 hour)

#### Cách 2: Command Line (schtasks)

```powershell
# Tạo task chạy mỗi 6 giờ
schtasks /create `
  /tn "Job4S_AutoCrawler" `
  /tr "powershell.exe -ExecutionPolicy Bypass -File 'C:\Users\Admin\Documents\GitHub\JobApplication\auto-crawl.ps1' -Limit 50" `
  /sc DAILY /st 00:00 `
  /ri 360 `
  /du 24:00 `
  /f

# Kiểm tra task đã tạo
schtasks /query /tn "Job4S_AutoCrawler"

# Chạy thủ công để test
schtasks /run /tn "Job4S_AutoCrawler"

# Xóa task
schtasks /delete /tn "Job4S_AutoCrawler" /f
```

### Script Options

```powershell
# Chạy với default settings (50 jobs)
.\auto-crawl.ps1

# Crawl nhiều jobs hơn
.\auto-crawl.ps1 -Limit 100

# Skip crawl, chỉ process data có sẵn
.\auto-crawl.ps1 -SkipCrawl

# Gửi email notification (cần config SMTP_USER, SMTP_PASS)
.\auto-crawl.ps1 -SendEmail -EmailTo "admin@example.com"

# Verbose mode
.\auto-crawl.ps1 -Verbose
```

### Email Notification Setup (Optional)

Để nhận email thông báo sau mỗi lần crawl:

1. Tạo Gmail App Password:
   - Vào https://myaccount.google.com/apppasswords
   - Tạo app password mới
   
2. Set environment variables:
```powershell
[System.Environment]::SetEnvironmentVariable("SMTP_USER", "your-email@gmail.com", "User")
[System.Environment]::SetEnvironmentVariable("SMTP_PASS", "your-app-password", "User")
```

3. Chạy với `-SendEmail`:
```powershell
.\auto-crawl.ps1 -Limit 50 -SendEmail -EmailTo "admin@yourcompany.com"
```

### Logs

Tất cả logs được lưu trong `server/data/logs/`:

```
logs/
├── auto-crawl.log       # Script execution logs
├── pipeline.log         # Pipeline details
└── categorization.log   # AI categorization stats
```

#### Sample Log Output:
```
[2024-12-01 06:00:01] [INFO] ============================================================
[2024-12-01 06:00:01] [INFO] Job4S Auto Crawler - 2024-12-01 06:00:01
[2024-12-01 06:00:01] [INFO] ============================================================
[2024-12-01 06:00:02] [INFO] Checking environment...
[2024-12-01 06:00:02] [INFO] Node.js version: v20.10.0
[2024-12-01 06:00:02] [INFO] npm version: 10.2.3
[2024-12-01 06:00:03] [INFO] Running pipeline command...
...
[2024-12-01 06:05:30] [INFO] Total jobs: 48
[2024-12-01 06:05:30] [INFO] Regex Categorized: 40
[2024-12-01 06:05:30] [INFO] AI Categorized: 8
[2024-12-01 06:05:30] [SUCCESS] Pipeline completed successfully!
```

---

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
│   ├── ai-categorizer.ts         # 🆕 Hybrid AI categorization (Regex + Gemini)
│   ├── puppeteer-crawler.ts      # Crawl bằng Puppeteer (bypass Cloudflare)
│   ├── puppeteer-full-pipeline.ts # Full pipeline: crawl → AI categorize → upsert → sync
│   ├── upsert-jobs.ts            # Lưu vào Firebase Firestore
│   └── sync-algolia.ts           # Đồng bộ lên Algolia Search
│   │
│   │ # Backup (trong thư mục TEMP)
│   └── ../TEMP/
│       ├── normalizer.ts         # Old normalizer (backup)
│       └── normalize-runner.ts   # Old runner (backup)
│
├── data/
│   ├── viecoi/
│   │   ├── raw-jobs.json         # Output crawl (dữ liệu thô từ JSON-LD)
│   │   └── normalized-jobs.json  # Output normalize (đã chuẩn hóa + AI categorized)
│   └── logs/
│       ├── categorization.log    # AI categorization detailed logs
│       ├── pipeline.log          # Pipeline execution logs
│       └── auto-crawl.log        # Auto scheduler logs
│
└── package.json                  # Định nghĩa các npm scripts

# Root level
JobApplication/
└── auto-crawl.ps1                # 🆕 PowerShell auto scheduler script
```

---

## 📝 Chi Tiết Từng Bước (Puppeteer - Mới)

### **Bước 1: Crawl URLs từ Trang Listing**
📄 **File:** `server/src/crawlers/viecoi/puppeteer-crawler.ts`

```typescript
// Dùng Puppeteer để load trang như browser thật
async function fetchJobURLsFromListing() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Navigate to listing page (Cloudflare bypass!)
  await page.goto('https://viecoi.vn/viec-lam', { waitUntil: 'networkidle2' });
  
  // Extract all job URLs from page
  const urls = await page.$$eval('a[href*="/viec-lam/"]', links =>
    links.map(a => a.href).filter(href => /\/viec-lam\/.*\.html$/.test(href))
  );
  
  return urls;
}
```

**Chức năng:**
- Puppeteer mở browser thật (Chromium)
- Bypass Cloudflare protection 
- Lấy danh sách URLs từ trang listing

---

### **Bước 2: Extract Job Detail từ JSON-LD**
📄 **File:** `server/src/crawlers/viecoi/puppeteer-crawler.ts`

```typescript
// Extract JSON-LD structured data (schema.org/JobPosting)
async function extractJobDetail(page: Page): Promise<RawJob | null> {
  // 1. Tìm JSON-LD trong trang
  const jsonLd = await page.$eval(
    'script[type="application/ld+json"]',
    el => JSON.parse(el.textContent || '{}')
  );
  
  // 2. Parse JobPosting schema
  if (jsonLd['@type'] === 'JobPosting') {
    return {
      title: jsonLd.title,
      company: jsonLd.hiringOrganization?.name,
      salary_min: jsonLd.baseSalary?.value?.minValue,
      salary_max: jsonLd.baseSalary?.value?.maxValue,
      location: jsonLd.jobLocation?.address?.addressLocality,
      description: jsonLd.description,
      employmentType: jsonLd.employmentType,
      // ...
    };
  }
  
  // 3. Fallback: DOM selectors nếu không có JSON-LD
  return extractFromDOM(page);
}
```

**Output mẫu (raw từ JSON-LD):**
```json
{
  "url": "https://viecoi.vn/viec-lam/nhan-vien-ke-toan-119163.html",
  "title": "NHÂN VIÊN KẾ TOÁN",
  "company": "Công ty ABC",
  "salary_min": 10000000,
  "salary_max": 15000000,
  "location": "Hồ Chí Minh",
  "employmentType": "FULL_TIME",
  "category": "Kế toán - Kiểm toán"
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
- Lưu kết quả vào `data/viecoi/normalized-jobs.json`

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

## ⚡ GitHub Actions - ĐÃ DISABLED

> ⚠️ **Lưu ý:** GitHub Actions đã bị disable vì Cloudflare chặn datacenter IPs.
> Crawler chỉ chạy được từ máy local bằng Puppeteer.

📄 **File:** `.github/workflows/auto-crawler.yml`

```yaml
# ⚠️ DISABLED - Cloudflare blocks GitHub Actions IPs
# Viecoi.vn returns 403 Forbidden when accessed from datacenter IPs
# 
# Solution: Run crawler locally using Puppeteer
# Command: cd server && npm run crawl:viecoi-full -- --limit 50

on:
  # schedule:   # ← DISABLED
  #   - cron: '0 */6 * * *'
  workflow_dispatch:  # Vẫn cho phép trigger thủ công để test
```

**Thay thế bằng:** Chạy thủ công từ máy local với Puppeteer

---

## 🔧 NPM Scripts (Puppeteer - Mới)

Trong `server/package.json`:

```json
{
  "scripts": {
    // 🆕 Puppeteer crawler (bypass Cloudflare)
    "crawl:viecoi-puppeteer": "npx ts-node src/crawlers/viecoi/puppeteer-crawler.ts",
    "crawl:viecoi-pipeline": "npx ts-node src/crawlers/viecoi/puppeteer-full-pipeline.ts",
    "crawl:viecoi-full": "npx ts-node src/crawlers/viecoi/puppeteer-crawler.ts && npx ts-node src/crawlers/viecoi/puppeteer-full-pipeline.ts",
    
    // Các script riêng lẻ
    "normalize:viecoi": "ts-node src/crawlers/viecoi/normalize-runner.ts",
    "upsert:viecoi-jobs": "ts-node src/crawlers/viecoi/upsert-jobs.ts",
    "sync:viecoi-algolia": "ts-node src/crawlers/viecoi/sync-algolia.ts"
  }
}
```

### Sử Dụng:

```powershell
cd server

# 1. Crawl 50 jobs mới nhất (bypass Cloudflare)
npm run crawl:viecoi-puppeteer -- --limit 50

# 2. Xử lý pipeline (normalize → upsert → sync)
npm run crawl:viecoi-pipeline

# 3. Full pipeline (1 + 2 gộp lại)
npm run crawl:viecoi-full -- --limit 50

# 4. Chỉ sync lại Algolia (không cần crawl lại)
npm run sync:viecoi-algolia
```

---

## ❓ FAQ - Câu Hỏi Thường Gặp

### **Q1: Dữ liệu có tự động sync lên Algolia không?**
✅ **CÓ** - Khi chạy `crawl:viecoi-full` hoặc `crawl:viecoi-pipeline`, Algolia sẽ được sync tự động

### **Q2: Dữ liệu có tự chuẩn hóa không?**
✅ **CÓ** - Pipeline sẽ tự động:
- Parse salary từ JSON-LD → số
- Map employment type → ID chuẩn (`full-time`, `part-time`,...)
- Map category → ID chuẩn (`it-software`, `marketing`,...)
- Loại bỏ duplicates theo URL

### **Q3: Mỗi lần crawl bao nhiêu jobs?**
- **Mặc định:** 50 jobs
- **Có thể thay đổi:** `npm run crawl:viecoi-full -- --limit 100`

### **Q4: Jobs mới có hiển thị ngay trong app không?**
⚠️ **KHÔNG NGAY** - Jobs crawl có `status: 'pending'`
- Cần Admin duyệt → đổi thành `status: 'active'`
- Hoặc sửa code trong `upsert-jobs.ts` để set `status: 'active'` luôn

### **Q5: Tại sao filter Job Types không hoạt động?**
**Đã fix!** Vấn đề là:
- Jobs từ viecoi lưu `job_type_id: "full-time"` (string)
- Jobs tạo thủ công lưu `jobTypes: { $id: "full-time" }` (object)
- Code filter đã được update để hỗ trợ cả 2 format

### **Q6: Crawler có tốn tiền không?**
❌ **KHÔNG** - Puppeteer chạy local, không tốn chi phí

### **Q7: Nếu viecoi.vn đổi giao diện thì sao?**
✅ **Ít bị ảnh hưởng** vì:
- Ưu tiên JSON-LD structured data (schema.org) - rất ổn định
- DOM selectors chỉ là fallback
- Nếu cần sửa: update file `puppeteer-crawler.ts`

### **Q8: Tại sao không dùng GitHub Actions?**
❌ Cloudflare chặn datacenter IPs của GitHub Actions
- Trả về 403 Forbidden
- Puppeteer cần chạy từ residential IP (máy local)

---

## 🔍 Debug & Troubleshooting

### **Chạy local để test:**
```powershell
cd server

# Test crawl 5 jobs
npm run crawl:viecoi-puppeteer -- --limit 5

# Test full pipeline
npm run crawl:viecoi-full -- --limit 10

# Chỉ chạy pipeline (nếu đã có raw data)
npm run crawl:viecoi-pipeline
```

### **Xem dữ liệu crawl:**
- Raw: `server/data/viecoi/raw-jobs.json`
- Normalized: `server/data/viecoi/normalized-jobs.json`

### **Debug JSON-LD:**
```powershell
# Xem JSON-LD của 1 trang job
# (Puppeteer crawler sẽ tự động log thông tin debug)
npm run crawl:viecoi-puppeteer -- --limit 1
```

### **Kiểm tra Firestore:**
- Vào Firebase Console → Firestore → Collection `jobs`
- Filter: `source == 'viecoi'`

### **Kiểm tra Algolia:**
- Vào Algolia Dashboard → Index `jobs`
- Search với filter: `source:viecoi`

---

## 📊 Luồng Dữ Liệu Tổng Quan (Puppeteer)

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
- [x] 🆕 Hybrid AI Categorization (Regex + Gemini)
- [x] 🆕 Auto scheduler với Windows Task Scheduler
- [x] 🆕 Logging đầy đủ cho monitoring
- [ ] (Tùy chọn) Đổi `status: 'pending'` → `'active'` để jobs hiện ngay
- [ ] (Tùy chọn) Setup email notification cho auto-crawl

---

## 🚀 Quick Start Guide

### 1. Chạy manual crawler:
```powershell
cd server
npx ts-node src/crawlers/viecoi/puppeteer-full-pipeline.ts --limit 50
```

### 2. Setup auto scheduler:
```powershell
# Từ root folder JobApplication
.\auto-crawl.ps1 -Limit 50
```

### 3. Setup Task Scheduler (chạy mỗi 6 giờ):
```powershell
schtasks /create /tn "Job4S_AutoCrawler" `
  /tr "powershell.exe -ExecutionPolicy Bypass -File 'C:\Users\Admin\Documents\GitHub\JobApplication\auto-crawl.ps1' -Limit 50" `
  /sc DAILY /st 00:00 /ri 360 /du 24:00 /f
```

### 4. Monitor logs:
```powershell
Get-Content server\data\logs\pipeline.log -Tail 50
Get-Content server\data\logs\categorization.log -Tail 50
```

---

*Cập nhật: December 1, 2025*
