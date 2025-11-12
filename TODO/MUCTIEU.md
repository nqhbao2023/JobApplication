PROMPT: XÂY DỰNG HỆ THỐNG CRAWLER PRODUCTION HOÀN CHỈNH CHO JOB_4S
Bạn là senior full-stack engineer chuyên web scraping production. Nhiệm vụ: Xây dựng TOÀN BỘ hệ thống crawler từ A-Z, chạy được ngay, crawl thực tế về data từ TopCV/VietnamWorks/CareerLink.
MỤC TIÊU
Sau khi hoàn thành, tôi phải:

Chạy 1 lệnh → crawl được 100+ jobs thực tế từ TopCV/VNW
Data tự động normalize, deduplicate, upsert vào Firestore
Sync sang Algolia để search
Admin UI xem và duyệt data
Cron chạy tự động 24/7 không cần can thiệp

YÊU CẦU ĐẦU RA
1. CODE HOÀN CHỈNH - CHẠY ĐƯỢC NGAY
/functions/src/
├── crawler/
│   ├── index.ts                    # Entry point: npm run crawl
│   ├── base/BaseCrawler.ts         # Abstract crawler với anti-bot
│   ├── sites/
│   │   ├── TopCVCrawler.ts         # Crawl TopCV (ưu tiên)
│   │   ├── VietnamWorksCrawler.ts  # Crawl VietnamWorks
│   │   └── CareerLinkCrawler.ts    # Crawl CareerLink
│   ├── processors/
│   │   ├── Normalizer.ts           # Chuẩn hóa data
│   │   ├── Deduplicator.ts         # Loại trùng lặp
│   │   └── Validator.ts            # Validate schema
│   ├── storage/
│   │   ├── FirestoreUpserter.ts    # Upsert vào Firestore
│   │   ├── AlgoliaSync.ts          # Sync Algolia
│   │   └── BackupManager.ts        # Backup raw data
│   ├── utils/
│   │   ├── antibot.ts              # Puppeteer stealth setup
│   │   ├── retry.ts                # Retry với exponential backoff
│   │   ├── logger.ts               # Winston logger
│   │   └── constants.ts            # Taxonomy, mappings
│   └── cron/
│       ├── scheduler.ts            # Node-cron setup
│       └── monitor.ts              # Health check + alerting
├── admin/
│   ├── routes.ts                   # Express API cho admin
│   └── middleware.ts               # Auth middleware
└── index.ts                        # Firebase Functions entry

/admin-ui/                          # React admin dashboard
├── src/
│   ├── pages/CrawledJobs.tsx       # Table + filters
│   ├── components/JobPreview.tsx   # Preview modal
│   └── services/api.ts             # API calls
└── package.json

package.json                        # Dependencies
.env.example                        # Environment variables template
docker-compose.yml                  # Local dev setup
README.md                           # Setup guide
2. ANTI-BOT PHẢI VƯỢT QUA

Cloudflare challenge
reCAPTCHA v2/v3
Rate limiting detection
Headless detection
IP blocking

Giải pháp cần implement:
typescript// Puppeteer + stealth plugin
// Rotate User-Agent (50+ agents)
// Random delay 2-7s
// Headless: false khi dev, true khi production
// --disable-blink-features=AutomationControlled
// Cookie persistence
// Viewport randomization
// WebGL fingerprint spoofing
3. CRAWLING STRATEGY CỤ THỂ
TopCV (priority 1):
typescript// URL: https://www.topcv.vn/viec-lam-it
// Pagination: ?page=1,2,3...
// Selectors thực tế (2024):
// - Job card: .job-item-search-result
// - Title: .title a
// - Company: .company
// - Location: .label-content
// - Salary: .salary
// Detail page: https://www.topcv.vn/viec-lam/{slug}
VietnamWorks:
typescript// URL: https://www.vietnamworks.com/it-software-jobs
// React-rendered → Cần Puppeteer wait
// API endpoint: https://api.vietnamworks.com/jobs (inspect network)
// Nếu có API → dùng axios thay vì Puppeteer (nhanh hơn)
CareerLink:
typescript// URL: https://www.careerlink.vn/vieclam/list
// HTML server-rendered → Cheerio được
// Pagination: ?page=N
4. NORMALIZATION RULES
typescript// City mapping
const CITY_MAP = {
  "TP.HCM": "Hồ Chí Minh",
  "HCM": "Hồ Chí Minh",
  "Sài Gòn": "Hồ Chí Minh",
  "Hà Nội": "Hà Nội",
  "HN": "Hà Nội",
  "Đà Nẵng": "Đà Nẵng",
  "DN": "Đà Nẵng",
  "Bình Dương": "Bình Dương",
  // ... 63 tỉnh thành
};

// Industry mapping (fuzzy)
const INDUSTRIES = [
  "Công nghệ thông tin",
  "Marketing",
  "Kinh doanh",
  "Kế toán",
  // ...
];

// Job type mapping
const JOB_TYPES = {
  "fulltime": "Toàn thời gian",
  "parttime": "Bán thời gian",
  "intern": "Thực tập",
  "freelance": "Freelance"
};

// Salary parser
parseSalary("10-15 triệu") → {min: 10000000, max: 15000000, currency: "VND"}
parseSalary("Thỏa thuận") → {min: null, max: null, currency: "VND"}
parseSalary("Up to $2000") → {min: null, max: 2000, currency: "USD"}
5. DEDUPLICATION ALGORITHM
typescript// Step 1: Generate slug
function generateSlug(title: string): string {
  return removeVietnameseTones(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Step 2: Fuzzy match
import Fuse from 'fuse.js';
const fuse = new Fuse(existingJobs, {
  keys: ['title', 'company.name'],
  threshold: 0.3 // 70% similarity
});

// Step 3: Hash comparison
import crypto from 'crypto';
function hashJob(job: any): string {
  const str = `${job.title}-${job.company.name}-${job.location}`;
  return crypto.createHash('md5').update(str).digest('hex');
}

// Step 4: Merge logic
function mergeJobs(existing: Job, incoming: Job): Job {
  return {
    ...existing,
    ...incoming,
    sources: [...existing.sources, incoming.source],
    updatedAt: Date.now()
  };
}
6. FIRESTORE SCHEMA
typescript// Collection: jobs
interface Job {
  id: string;                    // Auto-generated
  slug: string;                  // For dedup
  title: string;
  company: {
    id: string;                  // Reference to companies collection
    name: string;
    logo: string;
  };
  description: string;           // Sanitized HTML
  requirements: string[];
  benefits: string[];
  salary: {
    min: number | null;
    max: number | null;
    currency: string;
  };
  location: {
    city: string;                // Normalized
    district: string;
    address: string;
  };
  jobType: string;               // fulltime/parttime/intern
  industry: string[];            // Normalized
  skills: string[];
  experienceYears: {
    min: number;
    max: number;
  };
  deadline: number;              // Timestamp
  contactEmail: string;
  contactPhone: string;
  sources: Array<{
    name: string;                // TopCV/VNW/CareerLink
    url: string;
    externalId: string;
  }>;
  isCrawled: boolean;            // true
  isApproved: boolean;           // false by default
  createdAt: number;
  updatedAt: number;
  crawledAt: number;
}

// Collection: companies
interface Company {
  id: string;
  slug: string;
  name: string;
  logo: string;
  description: string;
  industry: string;
  size: string;                  // 1-50, 51-200, 201-500, 500+
  website: string;
  address: string;
  createdAt: number;
  updatedAt: number;
}

// Collection: crawl_logs
interface CrawlLog {
  id: string;
  source: string;
  status: 'success' | 'failed';
  jobsCrawled: number;
  errors: string[];
  startedAt: number;
  completedAt: number;
  duration: number;
}
7. ALGOLIA SYNC
typescript// Index: jobs_production
const index = client.initIndex('jobs_production');

// Sync logic
async function syncToAlgolia(jobs: Job[]) {
  const algoliaObjects = jobs.map(job => ({
    objectID: job.id,
    title: job.title,
    company: job.company.name,
    location: job.location.city,
    salary: job.salary,
    jobType: job.jobType,
    skills: job.skills,
    createdAt: job.createdAt,
    isApproved: job.isApproved,
    _tags: [job.industry, job.location.city] // For filtering
  }));

  // Incremental update
  const existingIds = await getAlgoliaIds();
  const toUpdate = algoliaObjects.filter(obj => 
    existingIds.includes(obj.objectID)
  );
  const toAdd = algoliaObjects.filter(obj => 
    !existingIds.includes(obj.objectID)
  );

  if (toUpdate.length) {
    await index.partialUpdateObjects(toUpdate);
  }
  if (toAdd.length) {
    await index.saveObjects(toAdd);
  }
}
8. CRON + MONITORING
typescript// Cron schedule
import cron from 'node-cron';

// Every 6 hours
cron.schedule('0 */6 * * *', async () => {
  try {
    await runCrawlers();
  } catch (error) {
    await sendAlert(error);
  }
});

// Health check endpoint
app.get('/crawler/health', async (req, res) => {
  const lastRun = await getLastCrawlLog();
  const isHealthy = lastRun && 
    (Date.now() - lastRun.completedAt) < 6 * 60 * 60 * 1000;
  
  res.json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    lastRun: lastRun?.completedAt,
    errors: lastRun?.errors || []
  });
});

// Alert function
async function sendAlert(error: Error) {
  // Send email via SendGrid/Mailgun
  // Send Slack webhook
  // Log to Sentry
}
9. ADMIN UI REQUIREMENTS
typescript// Table columns
interface TableColumn {
  id: string;
  label: string;
  sortable: boolean;
}

const columns: TableColumn[] = [
  { id: 'thumbnail', label: 'Logo', sortable: false },
  { id: 'title', label: 'Tiêu đề', sortable: true },
  { id: 'company', label: 'Công ty', sortable: true },
  { id: 'source', label: 'Nguồn', sortable: false },
  { id: 'crawledAt', label: 'Crawl lúc', sortable: true },
  { id: 'status', label: 'Trạng thái', sortable: false },
  { id: 'actions', label: 'Thao tác', sortable: false }
];

// Filters
interface Filters {
  source: string[];       // TopCV, VNW, CareerLink
  dateRange: [Date, Date];
  status: 'all' | 'pending' | 'approved' | 'rejected';
  search: string;
}

// Actions
- Batch approve (select multiple → approve all)
- Batch reject
- Individual preview (modal với full data)
- Inline edit (double click to edit title/company/salary)
- Delete
10. DEPLOYMENT
bash# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with Firebase credentials, Algolia keys

# Run crawler locally
npm run crawl:topcv

# Deploy Firebase Functions
firebase deploy --only functions

# Deploy admin UI
cd admin-ui && npm run build && firebase deploy --only hosting

# Setup cron (if not using Firebase Scheduled Functions)
pm2 start ecosystem.config.js

CONSTRAINTS QUAN TRỌNG

Code phải chạy được ngay - không placeholders, không TODOs
Puppeteer setup đầy đủ - vượt được Cloudflare/reCAPTCHA thực tế
Error handling toàn bộ - try-catch mọi external call
Logging chi tiết - Winston với file rotation
Backup raw data - lưu HTML gốc vào Cloud Storage trước khi parse
Rate limiting - tôn trọng robots.txt, delay 2-7s random
Memory management - close browser trong finally block
Schema validation - Joi/Zod validate trước khi upsert
Firestore optimization - dùng bulkWriter, handle RESOURCE_EXHAUSTED
Algolia optimization - incremental update, không replaceAll mỗi lần


EXPECTED OUTPUT
Cung cấp TOÀN BỘ CODE theo structure trên, kèm:

package.json với đầy đủ dependencies
.env.example với tất cả biến cần thiết
README.md với hướng dẫn setup từng bước
docker-compose.yml cho local dev
firestore.indexes.json cho Firestore indexes
ecosystem.config.js cho PM2

Bắt đầu ngay. Viết code production-ready, có thể chạy thực tế crawl về data. Ưu tiên TopCV trước, sau đó VNW và CareerLink.