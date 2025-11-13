# PLAN: HỆ THỐNG THU THẬP DỮ LIỆU CÔNG VIỆC CHO JOB_4S (ĐỒ ÁN SINH VIÊN)

## 🎯 MỤC TIÊU THỰC TẾ

### ⚠️ Vấn đề ban đầu:
1. **TopCV, VietnamWorks robots.txt chặn crawl** → Không được phép crawl trực tiếp
2. **Không có máy chạy 24/7** → Cần giải pháp cloud miễn phí
3. **Employer giả (do admin tạo)** → Cần xử lý khi candidate nhấn apply/view job
4. **Pháp lý**: Crawl có thể vi phạm ToS, copyright JD/logo

### ✅ GIẢI PHÁP TÌM ĐƯỢC:
**Crawl từ viecoi.vn** - Trang tuyển dụng Việt Nam cho phép crawl hợp pháp!

**Kiểm tra robots.txt**: https://viecoi.vn/robots.txt
- ✅ `Allow: /viec-lam/*.html$` → Được phép crawl trang chi tiết job (có JD đầy đủ)
- ✅ `Allow: /tim-cong-ty/*.html$` và `/gioi-thieu-cong-ty/*.html$` → Được phép crawl công ty
- ✅ `Allow: /*.xml$` → Được phép crawl sitemap (https://viecoi.vn/sitemap.xml)
- ✅ Nguồn Việt Nam, dữ liệu phù hợp với sinh viên tại Bình Dương và các tỉnh lân cận

---

## 💡 GIẢI PHÁP CHÍNH THỨC: CRAWL TỪ VIECOI.VN

### **Tại sao chọn viecoi.vn?**
1. **Hợp pháp 100%**: robots.txt cho phép crawl job, công ty, sitemap
2. **Dữ liệu Việt Nam**: Phù hợp với đối tượng sinh viên Việt Nam
3. **JD đầy đủ**: Có thể lấy mô tả công việc, yêu cầu, lương, kỹ năng, công ty...
4. **Dễ crawl**: HTML structure rõ ràng, không có Cloudflare/captcha phức tạp
5. **Đủ số lượng**: Hàng nghìn job đang hoạt động

### **Quy trình crawl:**
```
1. Crawl sitemap.xml → Lấy danh sách URL job + công ty
2. Parse từng URL job → Lấy JD, lương, kỹ năng, địa điểm, loại hình, công ty...
3. Parse từng URL công ty → Lấy tên, mô tả, địa chỉ, ngành nghề, logo...
4. Normalize data → Map về taxonomy của Job_4S
5. Deduplicate → Loại bỏ job trùng lặp
6. Upsert vào Firestore → Batch insert/update
7. Sync lên Algolia → Tìm kiếm nhanh
```

---

## 🏗️ KIẾN TRÚC HỆ THỐNG

### 1. **GitHub Actions Workflow** (thay vì cron 24/7)
```yaml
# .github/workflows/sync-jobs-viecoi.yml
name: Sync Jobs from ViecoiVN

on:
  schedule:
    - cron: '0 2 * * *'  # Chạy mỗi ngày 02:00 (giảm tải server)
  workflow_dispatch:      # Hoặc chạy thủ công

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run crawl:viecoi-sitemap
        env:
          FIREBASE_SERVICE_ACCOUNT: ${{ secrets.FIREBASE_SA }}
          ALGOLIA_APP_ID: ${{ secrets.ALGOLIA_APP_ID }}
          ALGOLIA_API_KEY: ${{ secrets.ALGOLIA_API_KEY }}
      - run: npm run crawl:viecoi-jobs
      - run: npm run crawl:viecoi-companies
      - run: npm run sync:to-algolia
```

**Lợi ích:**
- ✅ Miễn phí (2000 phút/tháng)
- ✅ Không cần máy cá nhân bật
- ✅ Logs chi tiết, dễ debug
- ✅ Secrets management an toàn
- ✅ Crawl tự động hàng ngày

---

### 2. **Cấu trúc code chi tiết**
```
/server/src/
├── crawlers/
│   ├── viecoi/
│   │   ├── index.ts                    # Entry point
│   │   ├── SitemapCrawler.ts           # Crawl sitemap.xml → lấy URLs
│   │   ├── JobCrawler.ts               # Crawl /viec-lam/*.html → JD đầy đủ
│   │   ├── CompanyCrawler.ts           # Crawl /tim-cong-ty/*.html → Công ty
│   │   ├── parsers/
│   │   │   ├── JobParser.ts            # Parse HTML job → Extract data
│   │   │   └── CompanyParser.ts        # Parse HTML company → Extract data
│   │   └── utils/
│   │       ├── httpClient.ts           # Axios + retry logic
│   │       └── rateLimiter.ts          # Throttle requests
│   ├── processors/
│   │   ├── Normalizer.ts               # Map về taxonomy Job_4S
│   │   ├── Deduplicator.ts             # Fuzzy match job titles
│   │   ├── Validator.ts                # Validate data trước khi upsert
│   │   └── Enricher.ts                 # Thêm metadata (slug, timestamps...)
│   ├── storage/
│   │   ├── FirestoreUpserter.ts        # Batch upsert jobs/companies
│   │   └── AlgoliaSync.ts              # Incremental sync to Algolia
│   └── utils/
│       ├── logger.ts                   # Winston logger
│       └── mappings.ts                 # City, industry, job type mappings

/server/data/
├── viecoi-sitemap-cache.json           # Cache sitemap để tránh re-crawl
├── viecoi-jobs-raw.json                # Raw data từ viecoi
└── viecoi-companies-raw.json           # Raw companies data

/server/scripts/
├── crawl-viecoi-sitemap.ts             # Script crawl sitemap
├── crawl-viecoi-jobs.ts                # Script crawl jobs
├── crawl-viecoi-companies.ts           # Script crawl companies
└── sync-to-algolia.ts                  # Script sync lên Algolia

/.github/workflows/
└── sync-jobs-viecoi.yml                # GitHub Actions workflow
```

---

## 📋 QUY TRÌNH CRAWL CHI TIẾT

### **Bước 1: Crawl Sitemap**
```typescript
// crawl-viecoi-sitemap.ts
import axios from 'axios';
import xml2js from 'xml2js';

async function crawlSitemap() {
  const sitemapUrl = 'https://viecoi.vn/sitemap.xml';
  const res = await axios.get(sitemapUrl);
  const parsed = await xml2js.parseStringPromise(res.data);
  
  // Lọc URL jobs và companies
  const jobUrls = [];
  const companyUrls = [];
  
  for (const url of parsed.urlset.url) {
    const loc = url.loc[0];
    if (loc.includes('/viec-lam/') && loc.endsWith('.html')) {
      jobUrls.push(loc);
    } else if (loc.includes('/tim-cong-ty/') || loc.includes('/gioi-thieu-cong-ty/')) {
      companyUrls.push(loc);
    }
  }
  
  console.log(`Found ${jobUrls.length} jobs, ${companyUrls.length} companies`);
  
  // Lưu cache để tránh re-crawl
  await saveToFile('viecoi-sitemap-cache.json', { jobUrls, companyUrls, lastUpdated: new Date() });
  
  return { jobUrls, companyUrls };
}
```

**Kết quả**: Danh sách URL của tất cả jobs và companies

---

### **Bước 2: Crawl Job Details**
```typescript
// crawl-viecoi-jobs.ts
import axios from 'axios';
import * as cheerio from 'cheerio';
import { RateLimiter } from './utils/rateLimiter';

const rateLimiter = new RateLimiter({ maxRequests: 10, perSeconds: 1 }); // 10 req/giây

async function crawlJob(url: string) {
  await rateLimiter.wait();
  
  const res = await axios.get(url, {
    headers: { 'User-Agent': 'Job4S-Crawler/1.0 (Educational Project)' }
  });
  
  const $ = cheerio.load(res.data);
  
  // Parse HTML → Extract data
  const job = {
    title: $('.job-title').text().trim(),
    company_name: $('.company-name').text().trim(),
    location: $('.job-location').text().trim(),
    salary: $('.job-salary').text().trim(),
    job_type: $('.job-type').text().trim(), // Full-time, Part-time...
    deadline: $('.job-deadline').text().trim(),
    description: $('.job-description').html(),
    requirements: $('.job-requirements').html(),
    benefits: $('.job-benefits').html(),
    skills: $('.job-skills .skill-tag').map((i, el) => $(el).text().trim()).get(),
    experience: $('.job-experience').text().trim(),
    education: $('.job-education').text().trim(),
    quantity: $('.job-quantity').text().trim(),
    gender: $('.job-gender').text().trim(),
    
    // Metadata
    source: 'viecoi',
    external_url: url,
    application_type: 'external', // Redirect về viecoi khi apply
    crawled_at: new Date(),
  };
  
  return job;
}

async function crawlAllJobs(jobUrls: string[]) {
  const jobs = [];
  
  for (const url of jobUrls.slice(0, 100)) { // Test với 100 jobs đầu tiên
    try {
      const job = await crawlJob(url);
      jobs.push(job);
      console.log(`Crawled: ${job.title} at ${job.company_name}`);
    } catch (error) {
      console.error(`Failed to crawl ${url}:`, error.message);
    }
  }
  
  await saveToFile('viecoi-jobs-raw.json', jobs);
  return jobs;
}
```

**Lưu ý HTML selectors**: 
- Cần inspect trang viecoi.vn để lấy đúng class names
- Có thể thay đổi theo thời gian, cần maintain

---

### **Bước 3: Crawl Company Details**
```typescript
// crawl-viecoi-companies.ts
async function crawlCompany(url: string) {
  await rateLimiter.wait();
  
  const res = await axios.get(url, {
    headers: { 'User-Agent': 'Job4S-Crawler/1.0 (Educational Project)' }
  });
  
  const $ = cheerio.load(res.data);
  
  const company = {
    name: $('.company-name').text().trim(),
    logo: $('.company-logo img').attr('src'),
    industry: $('.company-industry').text().trim(),
    address: $('.company-address').text().trim(),
    website: $('.company-website').attr('href'),
    size: $('.company-size').text().trim(), // 50-100, 100-500...
    description: $('.company-description').html(),
    
    // Metadata
    source: 'viecoi',
    external_url: url,
    crawled_at: new Date(),
  };
  
  return company;
}
```

---

### **Bước 4: Normalize Data**
```typescript
// processors/Normalizer.ts
function normalizeJob(rawJob: any) {
  return {
    id: generateSlug(rawJob.title, rawJob.company_name),
    title: rawJob.title,
    company_id: null, // Sẽ map sau khi có companies
    company_name: rawJob.company_name,
    
    // Map location về taxonomy
    location: mapLocation(rawJob.location), // Hà Nội, TP.HCM, Bình Dương...
    
    // Map job type
    job_type_id: mapJobType(rawJob.job_type), // full-time, part-time, intern...
    
    // Map category
    category: extractCategory(rawJob.title, rawJob.description),
    
    // Parse salary
    salary_min: parseSalary(rawJob.salary).min,
    salary_max: parseSalary(rawJob.salary).max,
    currency: 'VND',
    
    // Extract skills
    skills: extractSkills(rawJob.skills, rawJob.requirements),
    
    description: sanitizeHTML(rawJob.description),
    requirements: parseRequirements(rawJob.requirements),
    benefits: parseBenefits(rawJob.benefits),
    
    // Metadata
    source: rawJob.source,
    application_type: rawJob.application_type,
    external_url: rawJob.external_url,
    is_verified: false, // Admin chưa kiểm duyệt
    is_crawled: true,
    
    // Timestamps
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
    expires_at: parseDeadline(rawJob.deadline),
    
    status: 'draft', // Admin sẽ approve thành 'active'
  };
}
```

---

### **Bước 5: Deduplicate**
```typescript
// processors/Deduplicator.ts
import Fuse from 'fuse.js';

async function deduplicateJobs(jobs: any[]) {
  const existingJobs = await getExistingJobsFromFirestore();
  
  const fuse = new Fuse(existingJobs, {
    keys: ['title', 'company_name', 'location'],
    threshold: 0.3,
  });
  
  const uniqueJobs = [];
  
  for (const job of jobs) {
    const matches = fuse.search(`${job.title} ${job.company_name}`);
    
    if (matches.length === 0) {
      uniqueJobs.push(job);
    } else {
      console.log(`Duplicate found: ${job.title} at ${job.company_name}`);
      // Update existing job thay vì tạo mới
      await updateJob(matches[0].item.id, job);
    }
  }
  
  return uniqueJobs;
}
```

---

### **Bước 6: Upsert vào Firestore**
```typescript
// storage/FirestoreUpserter.ts
async function upsertJobs(jobs: any[]) {
  const batch = admin.firestore().batch();
  const jobsRef = admin.firestore().collection('jobs');
  
  for (const job of jobs) {
    const docRef = jobsRef.doc(job.id);
    batch.set(docRef, job, { merge: true });
  }
  
  await batch.commit();
  console.log(`Upserted ${jobs.length} jobs to Firestore`);
}
```

---

### **Bước 7: Sync lên Algolia**
```typescript
// storage/AlgoliaSync.ts
import algoliasearch from 'algoliasearch';

const client = algoliasearch('3JGCR12NR5', 'd8e34f818e6a139b73220857f9c3c5b7');
const jobsIndex = client.initIndex('jobs');

async function syncToAlgolia(jobs: any[]) {
  const algoliaObjects = jobs.map(job => ({
    objectID: job.id,
    title: job.title,
    company_name: job.company_name,
    location: job.location,
    job_type_id: job.job_type_id,
    category: job.category,
    salary_min: job.salary_min,
    salary_max: job.salary_max,
    skills: job.skills,
    description: stripHTML(job.description).substring(0, 1000), // Limit for indexing
    status: job.status,
    created_at: job.created_at,
  }));
  
  await jobsIndex.saveObjects(algoliaObjects);
  console.log(`Synced ${algoliaObjects.length} jobs to Algolia`);
}
```

---

## 🔧 XỬ LÝ VẤN ĐỀ EMPLOYER & APPLICATION

### Vấn đề:
- Job crawl từ viecoi.vn không có employer thật trong hệ thống Job_4S
- Candidate nhấn "Apply" → Gửi CV cho ai?

### Giải pháp:

#### **Job từ viecoi.vn (nguồn bên ngoài):**
```typescript
// Schema job
{
  source: "viecoi",
  external_url: "https://viecoi.vn/viec-lam/...",
  application_type: "external", // Redirect về nguồn
  employer_id: null,             // Không lưu employer
  company_name: "FPT Software",  // Chỉ lưu tên, không tạo account
}
```

**Flow ứng tuyển:**
- Candidate xem job → Nhấn "Apply"
- App hiển thị modal xác nhận:
  ```
  ⚠️ Tin tuyển dụng từ Viecoi.vn
  
  Job này được tổng hợp từ nguồn bên ngoài.
  Bạn sẽ được chuyển đến trang gốc để ứng tuyển trực tiếp với nhà tuyển dụng.
  
  [Tiếp tục ứng tuyển] [Hủy]
  ```
- Nhấn "Tiếp tục" → `Linking.openURL(job.external_url)` (mở browser/WebView)
- Job_4S ghi log: `applications` collection với status = "redirected"

---

#### **Job do employer trong hệ thống tạo:**
```typescript
// Schema job
{
  source: "internal",
  external_url: null,
  application_type: "internal",
  employer_id: "real-employer-id", // Employer đã đăng ký
}
```

**Flow ứng tuyển:**
- Candidate nhấn Apply → Upload CV trong app
- Gửi vào collection `applications`
- Employer nhận thông báo, xem CV, liên hệ candidate

---

#### **Disclaimer trong UI:**
```tsx
// JobDetailScreen.tsx
{job.source === 'viecoi' && (
  <View style={styles.disclaimer}>
    <Ionicons name="information-circle-outline" size={20} color="#f59e0b" />
    <Text style={styles.disclaimerText}>
      Tin từ Viecoi.vn. Khi ứng tuyển, bạn sẽ được chuyển đến trang gốc.
    </Text>
  </View>
)}

// Apply button
{job.application_type === 'external' ? (
  <TouchableOpacity onPress={() => handleExternalApply(job)}>
    <Text>Ứng tuyển trên Viecoi.vn →</Text>
  </TouchableOpacity>
) : (
  <TouchableOpacity onPress={() => handleInternalApply(job)}>
    <Text>Ứng tuyển ngay</Text>
  </TouchableOpacity>
)}
```

---

## 📊 SCHEMA FIRESTORE (ĐIỀU CHỈNH)

### Collection: `jobs`
```typescript
{
  id: string;                  // Slug: "senior-fullstack-developer-fpt-software"
  title: string;
  company_id: string | null;   // Tham chiếu companies (nếu là internal)
  company_name: string;        // Tên công ty (cho external)
  company_logo?: string;       // URL logo (nếu crawl được)
  
  location: string;            // Bình Dương, TP.HCM, Hà Nội...
  job_type_id: string;         // full-time, part-time, intern, freelance
  category: string;            // Công nghệ thông tin, Marketing, Kế toán...
  
  salary_min?: number;
  salary_max?: number;
  currency: string;            // VND, USD
  salary_text?: string;        // "Thỏa thuận", "Lên đến 30 triệu"
  
  skills: string[];
  description: string;         // HTML or plain text
  requirements: string[];
  benefits?: string[];
  
  experience?: string;         // "1-2 năm", "Không yêu cầu"
  education?: string;          // "Đại học", "Cao đẳng"
  quantity?: number;           // Số lượng tuyển
  gender?: string;             // "Nam/Nữ", "Không yêu cầu"
  
  // Metadata
  source: "viecoi" | "internal" | "manual";
  application_type: "internal" | "external";
  external_url?: string;       // URL gốc nếu từ nguồn ngoài
  is_verified: boolean;        // Admin đã kiểm duyệt
  is_crawled: boolean;         // True nếu từ crawl
  
  // Timestamps
  created_at: Timestamp;
  updated_at: Timestamp;
  expires_at?: Timestamp;      // Deadline
  crawled_at?: Timestamp;      // Lần crawl cuối
  
  // Status
  status: "draft" | "active" | "closed" | "expired";
  
  // Stats (optional)
  view_count?: number;
  application_count?: number;
  save_count?: number;
}
```

### Collection: `companies`
```typescript
{
  id: string;                  // Slug: "fpt-software"
  name: string;
  logo?: string;
  industry: string;            // Công nghệ thông tin, Tài chính...
  address: string;
  website?: string;
  size?: string;               // "50-100", "100-500", "500+"
  description?: string;
  
  // Metadata
  source: "viecoi" | "internal";
  external_url?: string;
  is_verified: boolean;
  
  // Timestamps
  created_at: Timestamp;
  updated_at: Timestamp;
  
  // Stats
  job_count?: number;          // Số job đang tuyển
}
```

### Collection: `crawl_logs`
```typescript
{
  id: string;
  source: "viecoi";
  type: "sitemap" | "jobs" | "companies";
  started_at: Timestamp;
  completed_at: Timestamp;
  status: "success" | "failed" | "partial";
  
  stats: {
    total_urls: number;
    success_count: number;
    failed_count: number;
    new_jobs: number;
    updated_jobs: number;
    new_companies: number;
  };
  
  errors?: Array<{
    url: string;
    error: string;
  }>;
}
```

---

## 🎨 ADMIN UI

### Màn hình: `CrawledJobsManagement.tsx`
```tsx
function CrawledJobsManagement() {
  const [jobs, setJobs] = useState([]);
  const [filter, setFilter] = useState({ 
    source: 'viecoi',  // viecoi, internal, all
    status: 'draft'     // draft, active, closed
  });
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });

  return (
    <ScrollView>
      {/* Stats Cards */}
      <StatsCards stats={stats} />
      
      {/* Filters */}
      <View style={styles.filters}>
        <Picker value={filter.source} onChange={(v) => setFilter({...filter, source: v})}>
          <Picker.Item label="Tất cả" value="all" />
          <Picker.Item label="Viecoi.vn" value="viecoi" />
          <Picker.Item label="Nội bộ" value="internal" />
        </Picker>
        
        <Picker value={filter.status} onChange={(v) => setFilter({...filter, status: v})}>
          <Picker.Item label="Chờ duyệt" value="draft" />
          <Picker.Item label="Đã duyệt" value="active" />
          <Picker.Item label="Đã đóng" value="closed" />
        </Picker>
      </View>
      
      {/* Jobs Table */}
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <JobRow
            job={item}
            onApprove={() => approveJob(item.id)}
            onReject={() => rejectJob(item.id)}
            onEdit={() => navigateToEdit(item.id)}
            onViewOriginal={() => Linking.openURL(item.external_url)}
          />
        )}
      />
    </ScrollView>
  );
}

function JobRow({ job, onApprove, onReject, onEdit, onViewOriginal }) {
  return (
    <View style={styles.jobRow}>
      <View style={styles.jobInfo}>
        <Text style={styles.jobTitle}>{job.title}</Text>
        <Text style={styles.jobCompany}>{job.company_name}</Text>
        <Text style={styles.jobLocation}>{job.location} • {job.salary_text}</Text>
        <View style={styles.badges}>
          <Badge color="blue">{job.source}</Badge>
          <Badge color={job.status === 'draft' ? 'orange' : 'green'}>{job.status}</Badge>
        </View>
      </View>
      
      <View style={styles.actions}>
        {job.status === 'draft' && (
          <>
            <Button title="✓ Duyệt" onPress={onApprove} color="green" />
            <Button title="✕ Từ chối" onPress={onReject} color="red" />
          </>
        )}
        <Button title="✎ Sửa" onPress={onEdit} />
        {job.external_url && (
          <Button title="↗ Xem gốc" onPress={onViewOriginal} />
        )}
      </View>
    </View>
  );
}
```

**Actions:**
- **Approve**: Set `status: "active"`, `is_verified: true` → Hiển thị cho candidate
- **Reject**: Set `status: "closed"` hoặc delete
- **Edit**: Navigate to form edit (sửa JD, lương, kỹ năng...)
- **View Original**: Mở link gốc trên viecoi.vn để kiểm tra

---

### Màn hình: `CrawlLogsScreen.tsx`
```tsx
function CrawlLogsScreen() {
  const [logs, setLogs] = useState([]);
  
  return (
    <ScrollView>
      <Text style={styles.title}>Lịch sử crawl</Text>
      
      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.logRow}>
            <Text style={styles.logDate}>
              {item.completed_at.toDate().toLocaleString('vi-VN')}
            </Text>
            <Text style={styles.logType}>{item.type} từ {item.source}</Text>
            <Text style={styles.logStats}>
              ✓ {item.stats.success_count} / {item.stats.total_urls} URLs
              • {item.stats.new_jobs} jobs mới
              • {item.stats.updated_jobs} jobs cập nhật
            </Text>
            {item.stats.failed_count > 0 && (
              <Text style={styles.logErrors}>
                ⚠ {item.stats.failed_count} lỗi
              </Text>
            )}
          </View>
        )}
      />
    </ScrollView>
  );
}
```

---

## 🚀 DEPLOYMENT & CHẠY THỬ

### **Setup lần đầu:**
```bash
# 1. Clone repo
cd JobApplication/server

# 2. Install dependencies
npm install axios cheerio xml2js fuse.js winston

# 3. Setup .env
cp .env.example .env
# Edit .env với credentials:
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
ALGOLIA_APP_ID=3JGCR12NR5
ALGOLIA_API_KEY=d8e34f818e6a139b73220857f9c3c5b7

# 4. Test crawl sitemap (lấy 10 jobs đầu tiên)
npm run crawl:viecoi-test

# 5. Crawl full (100 jobs)
npm run crawl:viecoi-jobs

# 6. Sync lên Algolia
npm run sync:to-algolia

# 7. Check Firestore Console
# https://console.firebase.google.com/project/YOUR_PROJECT/firestore
```

### **Package.json scripts:**
```json
{
  "scripts": {
    "crawl:viecoi-test": "ts-node src/crawlers/viecoi/index.ts --limit 10",
    "crawl:viecoi-jobs": "ts-node src/crawlers/viecoi/index.ts --type jobs --limit 100",
    "crawl:viecoi-companies": "ts-node src/crawlers/viecoi/index.ts --type companies --limit 50",
    "crawl:viecoi-full": "npm run crawl:viecoi-jobs && npm run crawl:viecoi-companies",
    "sync:to-algolia": "ts-node src/scripts/sync-to-algolia.ts",
    "crawl:scheduled": "npm run crawl:viecoi-full && npm run sync:to-algolia"
  }
}
```

---

### **GitHub Actions setup:**
```bash
# 1. Vào GitHub repo → Settings → Secrets and variables → Actions
# 2. Thêm secrets:

Name: FIREBASE_SERVICE_ACCOUNT
Value: <paste toàn bộ nội dung serviceAccountKey.json>

Name: ALGOLIA_APP_ID
Value: 3JGCR12NR5

Name: ALGOLIA_API_KEY
Value: d8e34f818e6a139b73220857f9c3c5b7

# 3. Tạo file .github/workflows/sync-jobs-viecoi.yml (đã có ở trên)

# 4. Push code lên GitHub
git add .
git commit -m "Add viecoi crawler with GitHub Actions"
git push origin main

# 5. Enable Actions:
# Vào GitHub repo → Actions → Enable workflows

# 6. Test run thủ công:
# Vào Actions tab → Select "Sync Jobs from ViecoiVN" → Run workflow

# 7. Check logs để debug nếu có lỗi
```

---

### **Chạy thủ công (local):**
```bash
# Terminal 1: Crawl jobs
npm run crawl:viecoi-jobs

# Terminal 2: Monitor logs
tail -f logs/crawler.log

# Sau khi crawl xong, check Firestore:
# 1. Mở Firebase Console
# 2. Vào Firestore → jobs collection
# 3. Verify: source = "viecoi", status = "draft"

# Sync lên Algolia:
npm run sync:to-algolia

# Check Algolia Dashboard:
# https://www.algolia.com/apps/3JGCR12NR5/explorer/browse/jobs
```

---

### **Rate limiting & Best practices:**
```typescript
// utils/rateLimiter.ts
export class RateLimiter {
  private queue: Array<() => Promise<void>> = [];
  private running = 0;
  
  constructor(
    private maxRequests: number = 10,  // 10 requests
    private perSeconds: number = 1     // per second
  ) {}
  
  async wait() {
    if (this.running >= this.maxRequests) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    this.running++;
    setTimeout(() => this.running--, this.perSeconds * 1000);
  }
}

// Usage:
const limiter = new RateLimiter({ maxRequests: 5, perSeconds: 1 }); // 5 req/s

for (const url of urls) {
  await limiter.wait();
  await crawlJob(url);
}
```

**Best practices:**
- Crawl vào giờ thấp điểm (2-4 AM) để giảm tải server
- Dùng User-Agent rõ ràng: `Job4S-Crawler/1.0 (Educational Project)`
- Retry khi gặp lỗi 5xx (server error)
- Cache sitemap để tránh re-crawl toàn bộ
- Log chi tiết để dễ debug

---

## 📈 ROADMAP THỰC TẾ (CHO ĐỒ ÁN)

### **Tuần 1: Setup crawler cơ bản**
- [x] Phân tích robots.txt viecoi.vn → Xác nhận hợp pháp
- [ ] Setup project structure (`/server/src/crawlers/viecoi/`)
- [ ] Install dependencies (axios, cheerio, xml2js, fuse.js, winston)
- [ ] Viết `SitemapCrawler.ts` → Crawl sitemap.xml
- [ ] Test với 10 URLs đầu tiên
- [ ] Lưu raw data vào file JSON

**Mục tiêu**: Lấy được danh sách URL jobs và companies từ sitemap

---

### **Tuần 2: Crawl job details**
- [ ] Inspect HTML structure của viecoi.vn (DevTools)
- [ ] Viết `JobParser.ts` → Extract JD, lương, kỹ năng, công ty...
- [ ] Implement rate limiting (5-10 req/s)
- [ ] Viết `JobCrawler.ts` → Crawl 50-100 jobs
- [ ] Test data quality, adjust selectors nếu cần
- [ ] Lưu vào `viecoi-jobs-raw.json`

**Mục tiêu**: Crawl được 50-100 jobs với JD đầy đủ

---

### **Tuần 3: Normalize & Deduplicate**
- [ ] Viết `Normalizer.ts` → Map về schema Job_4S
- [ ] Map location, job_type, category về taxonomy
- [ ] Parse salary text → salary_min, salary_max
- [ ] Extract skills từ JD
- [ ] Viết `Deduplicator.ts` → Fuzzy match để tránh trùng
- [ ] Test với sample data

**Mục tiêu**: Dữ liệu sạch, chuẩn hóa, không trùng lặp

---

### **Tuần 4: Upsert Firestore & Algolia**
- [ ] Viết `FirestoreUpserter.ts` → Batch upsert jobs
- [ ] Test upsert 10 jobs → Verify trên Firestore Console
- [ ] Viết `AlgoliaSync.ts` → Sync jobs lên Algolia
- [ ] Test search trên Algolia Dashboard
- [ ] Handle errors, retry logic

**Mục tiêu**: Jobs hiển thị đầy đủ trên app, search hoạt động

---

### **Tuần 5: Crawl companies & Admin UI**
- [ ] Viết `CompanyCrawler.ts` + `CompanyParser.ts`
- [ ] Crawl 30-50 companies
- [ ] Link companies với jobs (match by name)
- [ ] Xây dựng `CrawledJobsManagement` screen
- [ ] Implement approve/reject actions
- [ ] Test flow kiểm duyệt

**Mục tiêu**: Admin có thể kiểm duyệt jobs, companies

---

### **Tuần 6: GitHub Actions & Scheduling**
- [ ] Tạo `.github/workflows/sync-jobs-viecoi.yml`
- [ ] Setup secrets trên GitHub
- [ ] Test workflow chạy thủ công
- [ ] Enable schedule (mỗi ngày 02:00)
- [ ] Monitor logs, fix bugs nếu có

**Mục tiêu**: Crawler chạy tự động hàng ngày

---

### **Tuần 7: Polish & Documentation**
- [ ] Implement disclaimer UI cho external jobs
- [ ] Test flow ứng tuyển (redirect về viecoi.vn)
- [ ] Viết `CrawlLogsScreen` để theo dõi lịch sử
- [ ] Optimize performance (caching, pagination...)
- [ ] Viết README.md hướng dẫn setup & chạy crawler
- [ ] Chuẩn bị demo cho hội đồng

**Mục tiêu**: Hệ thống hoàn chỉnh, sẵn sàng demo

---

### **Tuần 8+: Mở rộng (optional)**
- [ ] Crawl thêm categories (marketing, kế toán, bán hàng...)
- [ ] Implement incremental crawl (chỉ crawl jobs mới/update)
- [ ] Add analytics: job view count, application rate...
- [ ] AI suggestion: gợi ý job phù hợp với candidate
- [ ] Enrich data: salary prediction, skill extraction...

**Mục tiêu**: Nâng cao chất lượng, tăng giá trị đồ án

---

## ⚖️ PHÁP LÝ & DISCLAIMER

### **Tuân thủ robots.txt viecoi.vn:**
- ✅ Chỉ crawl các URL được `Allow`:
  - `/viec-lam/*.html` (job details)
  - `/tim-cong-ty/*.html`, `/gioi-thieu-cong-ty/*.html` (company details)
  - `sitemap.xml`
- ❌ Không crawl các URL bị `Disallow`:
  - `/admin/*`, `/employer/*`, `/jobseeker/*`
  - Các trang test, demo

### **Tôn trọng bản quyền:**
- Lưu toàn bộ JD, mô tả công ty vì được phép crawl
- Ghi rõ nguồn: `source: "viecoi"`, `external_url: "https://viecoi.vn/..."`
- Disclaimer rõ ràng trong app: "Tin từ Viecoi.vn"

### **Không gây quá tải server:**
- Rate limiting: 5-10 requests/giây
- Crawl vào giờ thấp điểm (2-4 AM)
- User-Agent rõ ràng: `Job4S-Crawler/1.0 (Educational Project)`
- Retry với exponential backoff khi gặp lỗi

### **Trong app, thêm disclaimer:**
```tsx
// Settings/About screen
<View style={styles.disclaimer}>
  <Text style={styles.disclaimerTitle}>Nguồn dữ liệu</Text>
  <Text style={styles.disclaimerText}>
    Job4S tổng hợp thông tin tuyển dụng từ Viecoi.vn và các nguồn công khai khác.
    Khi ứng tuyển, bạn sẽ được chuyển đến trang gốc để liên hệ trực tiếp với nhà tuyển dụng.
    Chúng tôi không chịu trách nhiệm về nội dung tin tuyển dụng từ nguồn bên ngoài.
  </Text>
</View>

// JobDetailScreen cho external jobs
{job.source === 'viecoi' && (
  <View style={styles.sourceNote}>
    <Text>📌 Tin từ Viecoi.vn</Text>
    <Text style={styles.noteText}>
      Ứng tuyển sẽ chuyển đến trang gốc. Job4S không trực tiếp xử lý ứng tuyển này.
    </Text>
  </View>
)}
```

### **Trong báo cáo đồ án, ghi rõ:**
```
PHẦN: THU THẬP DỮ LIỆU

1. Nguồn dữ liệu: Viecoi.vn
2. Phương pháp: Web crawling hợp pháp (tuân thủ robots.txt)
3. Quy trình:
   - Crawl sitemap.xml để lấy danh sách URL jobs và companies
   - Crawl từng trang chi tiết để extract thông tin
   - Normalize và deduplicate dữ liệu
   - Upsert vào Firestore, sync lên Algolia
4. Tuân thủ pháp lý:
   - Chỉ crawl các URL được phép trong robots.txt
   - Ghi rõ nguồn, không xóa link gốc
   - Rate limiting để không gây quá tải
   - Disclaimer rõ ràng trong app
5. Lý do chọn viecoi.vn:
   - TopCV, VietnamWorks chặn crawl trong robots.txt
   - Viecoi.vn cho phép crawl job và company details
   - Dữ liệu Việt Nam, phù hợp với đối tượng sinh viên
```

---

## 🎯 KẾT LUẬN

### **Điều chỉnh quan trọng từ plan cũ:**
1. ❌ **TopCV, VietnamWorks chặn crawl** → ✅ **Chuyển sang viecoi.vn (cho phép crawl)**
2. ❌ **Chỉ có metadata cơ bản** → ✅ **Crawl được JD đầy đủ từ viecoi.vn**
3. ❌ **Dataset thủ công tốn thời gian** → ✅ **Crawler tự động, có thể crawl hàng trăm jobs**
4. ✅ **GitHub Actions** thay vì cron 24/7 (giữ nguyên)
5. ✅ **Redirect external jobs** thay vì lưu employer giả (giữ nguyên)
6. ✅ **Disclaimer rõ ràng** trong UI (giữ nguyên)

### **Ưu điểm của giải pháp mới:**
- **Hợp pháp 100%**: Viecoi.vn cho phép crawl trong robots.txt
- **Dữ liệu Việt Nam**: Phù hợp với sinh viên tại Bình Dương và các tỉnh lân cận
- **JD đầy đủ**: Có đủ thông tin để demo chức năng tìm kiếm, ứng tuyển
- **Tự động hóa**: Crawler chạy hàng ngày, cập nhật jobs mới
- **Không tốn tiền**: GitHub Actions miễn phí, không cần server riêng
- **Dễ maintain**: Code structure rõ ràng, dễ debug và mở rộng

### **Phù hợp với yêu cầu đồ án:**
| Yêu cầu đề tài | Giải pháp |
|---------------|-----------|
| Thu thập dữ liệu tuyển dụng 24/7 | ✅ GitHub Actions chạy hàng ngày |
| AI & Web Scraping | ✅ Cheerio + Puppeteer (nếu cần) |
| Tích hợp search engine | ✅ Algolia đã setup |
| Kết nối sinh viên - nhà tuyển dụng | ✅ Redirect về viecoi.vn hoặc apply nội bộ |
| Gợi ý công việc thông minh | ✅ Có đủ data (kỹ năng, địa điểm, lương) |
| Quản lý CV, ứng tuyển | ✅ Internal jobs hỗ trợ đầy đủ |

### **Ước tính thời gian:**
- **Tuần 1-3**: Crawler cơ bản + crawl 100 jobs (cốt lõi)
- **Tuần 4-5**: Normalize, upsert Firestore, sync Algolia
- **Tuần 6-7**: Admin UI, GitHub Actions, disclaimer
- **Tuần 8+**: Polish, optimize, chuẩn bị demo

**Tổng thời gian**: 6-8 tuần (thực tế cho sinh viên)

### **Roadmap chi tiết:**
```
PHASE 1 (Tuần 1-3): CORE CRAWLER ⭐ Ưu tiên cao
├─ Setup project structure
├─ Crawl sitemap viecoi.vn
├─ Crawl 50-100 job details
└─ Test data quality

PHASE 2 (Tuần 4-5): DATA PROCESSING ⭐ Ưu tiên cao
├─ Normalize data về schema Job_4S
├─ Deduplicate jobs
├─ Upsert vào Firestore
└─ Sync lên Algolia

PHASE 3 (Tuần 6-7): AUTOMATION & UI ⭐ Ưu tiên trung bình
├─ GitHub Actions workflow
├─ Admin UI (approve/reject)
├─ Disclaimer cho external jobs
└─ Test end-to-end flow

PHASE 4 (Tuần 8+): POLISH & EXTEND 🎨 Optional
├─ Crawl companies
├─ Crawl logs screen
├─ Incremental crawl
└─ Analytics dashboard
```

---

## 📝 CHECKLIST TRƯỚC KHI BẮT ĐẦU

### **Kỹ thuật:**
- [ ] Đã có Firebase project + serviceAccountKey.json
- [ ] Đã có Algolia account + API keys
- [ ] Đã cài Node.js v18+, npm, TypeScript
- [ ] Đã test axios, cheerio trên terminal

### **Pháp lý:**
- [ ] Đã đọc kỹ robots.txt của viecoi.vn
- [ ] Hiểu rõ những URL nào được phép crawl
- [ ] Chuẩn bị disclaimer cho app và báo cáo
- [ ] Sẵn sàng giải thích với hội đồng nếu bị hỏi

### **Lập kế hoạch:**
- [ ] Đã đọc toàn bộ plan này
- [ ] Hiểu rõ quy trình crawl 7 bước
- [ ] Xác định timeline phù hợp (6-8 tuần)
- [ ] Chuẩn bị backup plan nếu viecoi.vn thay đổi HTML

---

## 🚀 BƯỚC TIẾP THEO NGAY BÂY GIỜ

1. **Inspect viecoi.vn** (5 phút):
   - Vào https://viecoi.vn/viec-lam/
   - Mở DevTools (F12) → Elements
   - Tìm các class/id cho: title, company, salary, location, description...
   - Ghi lại để viết parser

2. **Test crawl sitemap** (10 phút):
   ```bash
   cd JobApplication/server
   npm install axios xml2js
   node -e "
   const axios = require('axios');
   const xml2js = require('xml2js');
   (async () => {
     const res = await axios.get('https://viecoi.vn/sitemap.xml');
     const parsed = await xml2js.parseStringPromise(res.data);
     console.log('Total URLs:', parsed.urlset.url.length);
     console.log('Sample URL:', parsed.urlset.url[0].loc[0]);
   })();
   "
   ```

3. **Test crawl 1 job** (15 phút):
   ```bash
   npm install cheerio
   node -e "
   const axios = require('axios');
   const cheerio = require('cheerio');
   (async () => {
     const url = 'https://viecoi.vn/viec-lam/PASTE_URL_HERE.html';
     const res = await axios.get(url);
     const $ = cheerio.load(res.data);
     console.log('Title:', $('.job-title').text().trim());
     console.log('Company:', $('.company-name').text().trim());
   })();
   "
   ```

4. **Tạo project structure** (10 phút):
   ```bash
   mkdir -p server/src/crawlers/viecoi/{parsers,utils}
   mkdir -p server/src/crawlers/processors
   mkdir -p server/src/crawlers/storage
   mkdir -p server/data
   mkdir -p .github/workflows
   ```

5. **Bắt đầu code** → Theo roadmap tuần 1!

---

**Chúc bạn thành công với đồ án! 🎓**

**Nguồn hợp pháp + Crawler tự động + GitHub Actions = Giải pháp hoàn hảo cho sinh viên!**
