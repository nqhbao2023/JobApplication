JOB_4S - PLAN HOÀN CHỈNH (REVISED)
Ứng dụng tìm việc làm cho sinh viên đại học

🎯 MỤC TIÊU DỰ ÁN
Mục tiêu chính (Core Focus)
Xây dựng ứng dụng di động giúp sinh viên tìm kiếm, theo dõi và quản lý quá trình ứng tuyển việc làm (part-time, intern, fresher) một cách hiệu quả.
Giá trị cốt lõi

Tổng hợp đa nguồn: Thu thập jobs từ viecoi.vn vào 1 app duy nhất
Lọc thông minh: Chỉ hiển thị jobs phù hợp sinh viên (không yêu cầu nhiều kinh nghiệm)
Quản lý tập trung: Profile, CV, tracking ứng tuyển tất cả trong 1 chỗ
Gợi ý cá nhân hóa: Dựa trên kỹ năng, vị trí, lịch rảnh
Thống kê tiến độ: Giúp sinh viên biết được hiệu quả ứng tuyển


🏗️ KIẾN TRÚC HỆ THỐNG
┌─────────────────────────────────────────────────────────────┐
│                   REACT NATIVE APP (Expo SDK 54)            │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  CANDIDATE   │  │  EMPLOYER    │  │    ADMIN     │      │
│  │   (CHÍNH)    │  │    (PHỤ)     │  │   (QUẢN TRỊ)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                          ↓ ↑
                    (Read/Write)
                          ↓ ↑
┌─────────────────────────────────────────────────────────────┐
│                   FIREBASE BACKEND                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ • Firestore: users, jobs, applications, saved_jobs  │   │
│  │ • Auth: Email/Password, Google                       │   │
│  │ • Storage: CVs, avatars, company logos               │   │
│  │ • FCM: Push notifications                            │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          ↑
                    (Write jobs)
                          ↑
┌─────────────────────────────────────────────────────────────┐
│              GITHUB ACTIONS CRAWLER (24/7 Auto)             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 1. Crawl sitemap viecoi.vn mỗi ngày 02:00 AM        │   │
│  │ 2. Parse job details (title, salary, location...)   │   │
│  │ 3. Filter: CHỈ jobs phù hợp sinh viên                │   │
│  │ 4. Normalize & deduplicate                           │   │
│  │ 5. Upsert vào Firestore (batch write)               │   │
│  │ 6. Log results → crawl_logs collection              │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          ↑
                    (Optional: sync)
                          ↑
┌─────────────────────────────────────────────────────────────┐
│                   ALGOLIA SEARCH ENGINE                      │
│  • Fast search & filtering                                   │
│  • Faceted search (location, salary, job_type)              │
│  • Free tier: 10K records, 10K searches/month               │
└─────────────────────────────────────────────────────────────┘

👥 VAI TRÒ NGƯỜI DÙNG
1. CANDIDATE (Sinh viên) - CHÍNH 🎯
1.1. Đăng ký & Profile

Đăng ký/Đăng nhập qua email hoặc Google
Tạo profile: Tên, SĐT, trường học, chuyên ngành, năm học
Thêm kỹ năng (tags: React Native, JavaScript, Photoshop...)
Cài đặt lịch rảnh (Thứ 2,4,6 chiều, Chủ nhật cả ngày...)
Upload CV (PDF, max 5MB)
Cài đặt preferences: Vị trí ưu tiên, loại công việc, mức lương tối thiểu

1.2. Tìm kiếm & Khám phá Jobs

Home Screen:

"Jobs gợi ý cho bạn" (dựa trên profile)
"Jobs mới hôm nay"
"Jobs gần bạn" (Bình Dương, TP.HCM...)


Search Screen:

Tìm theo từ khóa: "React Native", "Marketing intern"...
Filter: Location, Job type, Salary range, Posted date
Sort: Mới nhất, Lương cao nhất, Gần nhất


Job Detail Screen:

Tiêu đề, công ty, logo
Mô tả công việc, yêu cầu, quyền lợi
Kỹ năng cần thiết (highlight match với profile)
Địa điểm (hiển thị map, khoảng cách)
Mức lương
Deadline



1.3. Ứng tuyển
Flow ứng tuyển jobs từ viecoi.vn (External):
1. Nhấn "Ứng tuyển"
2. Modal xác nhận:
   - Hiển thị CV đính kèm
   - Lưu ý: "Sẽ chuyển đến trang gốc để hoàn tất"
3. Nhấn "Xác nhận"
   → Lưu vào Firestore: applications collection
   → Mở browser: Linking.openURL(job.external_url)
4. Toast: "✅ Đã lưu vào hồ sơ ứng tuyển"
Flow ứng tuyển jobs nội bộ (Internal - từ Employer):
1. Nhấn "Ứng tuyển"
2. Modal upload:
   - Chọn CV từ profile hoặc upload mới
   - Viết thư giới thiệu (optional)
3. Submit
   → Lưu vào applications collection
   → Employer nhận notification
4. Toast: "✅ Đã gửi hồ sơ đến nhà tuyển dụng"
1.4. Quản lý Ứng tuyển

Tab "Hồ sơ ứng tuyển":

Đang chờ phản hồi (status: applied)
Đã được phỏng vấn (status: interviewing)
Đã trúng tuyển (status: accepted)
Đã bị từ chối (status: rejected)


Mỗi item hiển thị:

Tên job, công ty
Ngày ứng tuyển
Trạng thái hiện tại
Button: [Xem chi tiết] [Cập nhật trạng thái] [Ghi chú]


Sinh viên tự update trạng thái:

"Đã được gọi phỏng vấn" → Nhập ngày giờ
"Đã phỏng vấn xong"
"Đã trúng tuyển"
"Đã bị từ chối"
"Không quan tâm nữa"



1.5. Lưu & Yêu thích

Nhấn ♡ để save job
Tab "Jobs đã lưu": Xem lại danh sách
Nhận notification khi job sắp hết hạn: "Job X bạn lưu sẽ đóng sau 3 ngày"

1.6. Thống kê Cá nhân

Dashboard hiển thị:

Tổng số jobs đã xem
Số jobs đã lưu
Số lần ứng tuyển
Tỷ lệ phản hồi (nếu có)
Tỷ lệ trúng tuyển


Biểu đồ:

Số lượng ứng tuyển theo thời gian
Top kỹ năng được yêu cầu trong jobs đã xem
Mức lương trung bình theo vị trí


Gợi ý cải thiện:

"Các job yêu cầu TypeScript có lương cao hơn 20%"
"Bạn nên học thêm X để tăng cơ hội"



1.7. Notifications

Push notification khi:

Có job mới phù hợp profile
Job đã lưu sắp hết hạn
Employer xem CV (nếu internal job)
Employer gửi tin nhắn (nếu có chat - optional)




2. EMPLOYER (Nhà tuyển dụng) - PHỤ 🏢

Lưu ý: Employer là tính năng PHỤ, chỉ để làm phong phú app. KHÔNG BẮT BUỘC cho demo tốt nghiệp.

2.1. Đăng ký & Profile

Đăng ký tài khoản Employer
Tạo company profile:

Tên công ty, logo
Ngành nghề
Địa chỉ
Website
Mô tả công ty


Chờ Admin duyệt → status: verified

2.2. Đăng tin Tuyển dụng

Form đăng job:

Tiêu đề (React Native Developer, Marketing Intern...)
Mô tả công việc
Yêu cầu (kinh nghiệm, kỹ năng, học vấn)
Quyền lợi
Loại hình: Full-time, Part-time, Intern, Freelance
Địa điểm
Mức lương (hoặc "Thỏa thuận")
Số lượng tuyển
Deadline
Kỹ năng yêu cầu (tags)


Submit → Chờ Admin duyệt

2.3. Quản lý Jobs

Tab "Jobs của tôi":

Đang chờ duyệt (status: draft)
Đã đăng (status: active)
Đã đóng (status: closed)


Actions:

[Sửa] [Đóng] [Xóa]
Xem số lượt xem, số ứng viên



2.4. Quản lý Ứng viên

Tab "Ứng viên":

Danh sách candidates đã apply
Xem CV (PDF viewer trong app)
Xem profile chi tiết (kỹ năng, kinh nghiệm, lịch rảnh)


Actions:

[Chấp nhận] → Gửi notification cho candidate
[Từ chối] → Gửi notification
[Liên hệ] → Hiển thị email/SĐT



2.5. Chat với Candidate (Optional)

Nếu có thời gian làm chat:

Employer nhắn tin cho candidate
Realtime messaging (Firestore)
Simple UI, không cần typing indicator, read receipts




3. ADMIN (Quản trị viên) - QUẢN LÝ 👨‍💼
3.1. Quản lý Jobs Crawled

Screen: "Jobs từ Viecoi.vn"
Danh sách jobs đã crawl:

Chờ duyệt (status: draft)
Đã duyệt (status: active)
Đã từ chối (status: rejected)


Actions:

[✓ Duyệt] → Set status = active, is_verified = true
[✕ Từ chối] → Set status = rejected
[✎ Sửa] → Edit JD, salary, skills...
[↗ Xem gốc] → Open viecoi.vn URL



3.2. Quản lý Employer Jobs

Screen: "Jobs từ Nhà tuyển dụng"
Tương tự như trên
Kiểm duyệt nội dung:

Có phù hợp không?
Có spam không?
Thông tin đầy đủ chưa?



3.3. Quản lý Users

Danh sách Candidates
Danh sách Employers
Actions:

Ban user (nếu spam)
Verify employer



3.4. Crawler Logs

Screen: "Lịch sử Crawl"
Danh sách crawl runs:

Ngày giờ chạy
Số URLs crawl
Số jobs mới
Số jobs update
Số lỗi


Chi tiết lỗi (nếu có)

3.5. Thống kê Hệ thống

Dashboard:

Tổng số users (candidates, employers)
Tổng số jobs (active, draft, closed)
Tổng số applications
Biểu đồ: Users mới theo ngày
Biểu đồ: Jobs đăng theo ngày
Top kỹ năng được tìm kiếm




📊 FIRESTORE SCHEMA
Collection: users
typescript{
  id: string; // Auto-generated
  role: "candidate" | "employer" | "admin";
  
  // Auth
  email: string;
  display_name: string;
  avatar_url?: string;
  
  // Candidate fields
  phone?: string;
  school?: string; // "Đại học Thủ Dầu Một"
  major?: string; // "Công nghệ thông tin"
  year?: number; // 3
  skills?: string[]; // ["React Native", "JavaScript"]
  cv_url?: string;
  
  // Preferences
  preferred_locations?: string[]; // ["Bình Dương", "TP.HCM"]
  preferred_job_types?: string[]; // ["part-time", "intern"]
  min_salary?: number; // 5000000
  availability?: {
    monday?: string[]; // ["afternoon", "evening"]
    tuesday?: string[];
    // ...
  };
  
  // Employer fields
  company_name?: string;
  company_logo?: string;
  company_address?: string;
  company_website?: string;
  company_description?: string;
  industry?: string;
  is_verified?: boolean; // Admin duyệt
  
  // Metadata
  created_at: Timestamp;
  updated_at: Timestamp;
  last_login_at?: Timestamp;
}
Collection: jobs
typescript{
  id: string; // Slug: "react-native-dev-fpt-software"
  
  // Basic info
  title: string;
  company_id?: string; // Ref to users (nếu internal job)
  company_name: string;
  company_logo?: string;
  
  // Details
  description: string; // HTML hoặc plain text
  requirements: string;
  benefits?: string;
  
  // Categorization
  location: string; // "Bình Dương"
  job_type: "full-time" | "part-time" | "intern" | "freelance";
  category?: string; // "Công nghệ thông tin", "Marketing"...
  
  // Salary
  salary_min?: number;
  salary_max?: number;
  salary_text?: string; // "Thỏa thuận"
  currency: "VND" | "USD";
  
  // Requirements
  skills: string[]; // ["React Native", "TypeScript"]
  experience?: string; // "0-1 năm"
  education?: string; // "Đại học"
  quantity?: number; // Số lượng tuyển
  
  // Target
  is_for_student: boolean; // Lọc này quan trọng!
  
  // Source
  source: "viecoi" | "internal" | "manual";
  application_type: "external" | "internal";
  external_url?: string; // Nếu từ viecoi.vn
  
  // Status
  status: "draft" | "active" | "closed" | "expired";
  is_verified: boolean; // Admin đã duyệt
  
  // Dates
  created_at: Timestamp;
  updated_at: Timestamp;
  expires_at?: Timestamp; // Deadline
  posted_by?: string; // User ID (employer)
  
  // Stats
  view_count: number;
  application_count: number;
  save_count: number;
}
Collection: applications
typescript{
  id: string;
  
  candidate_id: string; // Ref to users
  job_id: string; // Ref to jobs
  
  // CV & intro
  cv_url: string;
  cover_letter?: string;
  
  // Status tracking
  status: "applied" | "viewed" | "interviewing" | "accepted" | "rejected";
  applied_at: Timestamp;
  
  // Interview (optional)
  interview_date?: Timestamp;
  interview_location?: string;
  interview_notes?: string;
  
  // Updates by candidate
  candidate_notes?: string;
  last_updated_at: Timestamp;
  
  // Source (để biết redirect hay internal)
  source: "viecoi" | "internal";
  external_url?: string;
}
Collection: saved_jobs
typescript{
  id: string;
  candidate_id: string;
  job_id: string;
  saved_at: Timestamp;
}
Collection: crawl_logs
typescript{
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
  };
  
  errors?: Array<{
    url: string;
    error: string;
  }>;
}
Collection: notifications
typescript{
  id: string;
  user_id: string;
  
  type: "job_match" | "job_expiring" | "application_viewed" | "message";
  title: string;
  body: string;
  
  // Data
  job_id?: string;
  application_id?: string;
  
  // Status
  is_read: boolean;
  created_at: Timestamp;
}

🤖 CRAWLER SYSTEM (GitHub Actions)
Workflow File: .github/workflows/sync-jobs-viecoi.yml
yamlname: Sync Jobs from Viecoi.vn

on:
  schedule:
    - cron: '0 2 * * *'  # Mỗi ngày 02:00 AM UTC
  workflow_dispatch:      # Chạy thủ công

jobs:
  crawl-and-sync:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd server
          npm install
      
      - name: Crawl sitemap
        run: npm run crawl:sitemap
        env:
          FIREBASE_SERVICE_ACCOUNT: ${{ secrets.FIREBASE_SA }}
      
      - name: Crawl jobs
        run: npm run crawl:jobs -- --limit 100
        env:
          FIREBASE_SERVICE_ACCOUNT: ${{ secrets.FIREBASE_SA }}
      
      - name: Sync to Algolia (optional)
        run: npm run sync:algolia
        env:
          ALGOLIA_APP_ID: ${{ secrets.ALGOLIA_APP_ID }}
          ALGOLIA_API_KEY: ${{ secrets.ALGOLIA_API_KEY }}
      
      - name: Notify on failure
        if: failure()
        run: echo "Crawler failed! Check logs."
Crawler Structure
/server/
├── src/
│   ├── crawlers/
│   │   ├── viecoi/
│   │   │   ├── index.ts              # Entry point
│   │   │   ├── SitemapCrawler.ts     # Crawl sitemap.xml
│   │   │   ├── JobCrawler.ts         # Crawl job details
│   │   │   ├── parsers/
│   │   │   │   └── JobParser.ts      # Parse HTML → Extract data
│   │   │   └── utils/
│   │   │       ├── httpClient.ts     # Axios + retry logic
│   │   │       └── rateLimiter.ts    # Throttle requests
│   │   └── processors/
│   │       ├── Normalizer.ts         # Map về schema Job_4S
│   │       ├── StudentFilter.ts      # Lọc job phù hợp SV
│   │       ├── Deduplicator.ts       # Fuzzy match titles
│   │       └── Validator.ts          # Validate data
│   ├── storage/
│   │   ├── FirestoreUpserter.ts      # Batch upsert jobs
│   │   └── AlgoliaSync.ts            # Sync to Algolia
│   └── utils/
│       ├── firebase.ts               # Firebase Admin SDK
│       ├── logger.ts                 # Winston logger
│       └── mappings.ts               # City, industry mappings
├── scripts/
│   ├── crawl-sitemap.ts
│   ├── crawl-jobs.ts
│   └── sync-algolia.ts
└── package.json
Crawler Logic: StudentFilter.ts
typescript// Quan trọng: Chỉ lấy jobs phù hợp sinh viên
export function isJobForStudent(job: any): boolean {
  const title = job.title.toLowerCase();
  const description = job.description.toLowerCase();
  const requirements = job.requirements.toLowerCase();
  
  // Từ khóa phù hợp
  const goodKeywords = [
    'intern', 'internship', 'thực tập',
    'fresher', 'sinh viên', 'student',
    'part-time', 'bán thời gian',
    'junior', 'entry level',
    'không yêu cầu kinh nghiệm',
    'học việc'
  ];
  
  // Từ khóa không phù hợp
  const badKeywords = [
    'senior', 'lead', 'manager', 'director',
    '5 năm', '3+ năm', 'kinh nghiệm lâu năm',
    'giám đốc', 'trưởng phòng'
  ];
  
  const hasGoodKeyword = goodKeywords.some(kw => 
    title.includes(kw) || 
    description.includes(kw) ||
    requirements.includes(kw)
  );
  
  const hasBadKeyword = badKeywords.some(kw => 
    title.includes(kw) || 
    requirements.includes(kw)
  );
  
  // Logic: Có từ khóa tốt HOẶC (không yêu cầu kinh nghiệm VÀ không có từ khóa xấu)
  if (hasGoodKeyword) return true;
  if (hasBadKeyword) return false;
  
  // Check experience requirement
  const experienceMatch = requirements.match(/(\d+)\s*(năm|year)/i);
  if (experienceMatch) {
    const years = parseInt(experienceMatch[1]);
    if (years > 2) return false; // Yêu cầu >2 năm → Không phù hợp
  }
  
  // Check job type
  if (job.job_type === 'part-time' || job.job_type === 'intern') {
    return true;
  }
  
  return false; // Mặc định: không phù hợp
}

🎨 UI/UX SCREENS
Candidate Flow
1. OnboardingScreen (Lần đầu mở app)

3-4 slides giới thiệu app
"Tìm việc dễ dàng", "Quản lý ứng tuyển", "Gợi ý thông minh"
Button: [Đăng ký] [Đăng nhập]

2. AuthScreen

Tab: [Đăng nhập] [Đăng ký]
Input: Email, Password
Button: [Đăng nhập với Google]
Link: "Quên mật khẩu?"

3. ProfileSetupScreen (Sau khi đăng ký)

Form wizard (3 steps):

Step 1: Thông tin cơ bản (Tên, SĐT, Trường, Ngành)
Step 2: Kỹ năng (Multi-select tags)
Step 3: Upload CV


Button: [Hoàn tất]

4. HomeScreen (Main)

Header: Logo, Search icon, Avatar
Sections:

"Jobs gợi ý cho bạn" (Horizontal scroll)
"Jobs mới hôm nay" (FlatList)
"Công ty nổi bật" (Horizontal scroll)


Bottom tabs: [Trang chủ] [Tìm kiếm] [Đã lưu] [Hồ sơ]

5. SearchScreen

SearchBar: "Tìm kiếm công việc..."
FilterBar: [Vị trí] [Loại hình] [Mức lương] [Ngày đăng]
Results: FlatList with job cards
EmptyState: "Không tìm thấy kết quả"

6. JobDetailScreen

ScrollView:

Header: Title, Company, Logo
Info row: Location, Job type, Salary
Tags: Skills required
Section: Mô tả công việc
Section: Yêu cầu
Section: Quyền lợi
Section: Địa điểm (Map preview)
Disclaimer (nếu external job): "Tin từ Viecoi.vn"


Bottom bar: [♡ Lưu] [Ứng tuyển]

7. ApplicationsScreen

Tabs: [Tất cả] [Chờ phản hồi] [Phỏng vấn] [Đã trúng tuyển]
FlatList: Application cards

Job title, company
Applied date
Status badge
[Cập nhật trạng thái]



8. SavedJobsScreen

FlatList: Saved job cards
Swipe to delete

9. ProfileScreen

Avatar, Name, Email
Sections:

Thông tin cá nhân
Kỹ năng
CV đính kèm
Lịch rảnh


Buttons: [Chỉnh sửa] [Đăng xuất]

10. StatsScreen

Cards:

Jobs đã xem
Jobs đã lưu
Đã ứng tuyển
Tỷ lệ phản hồi


Charts:

Line chart: Ứng tuyển theo thời gian
Bar chart: Top kỹ năng yêu cầu
Pie chart: Phân bố job type


Insights: "Gợi ý cải thiện"


Employer Flow (PHỤ)
1. Employer Dashboard

Stats cards:

Jobs đã đăng
Ứng viên đã nhận
Lượt xem


Actions: [+ Đăng tin mới]

2. PostJobScreen

Form:

Tiêu đề
Mô tả
Yêu cầu
Quyền lợi
Location picker
Job type picker
Salary range
Skills (multi-select)
Deadline picker


Button: [Đăng tin]

3. ManageJobsScreen

Tabs: [Chờ duyệt] [Đã đăng] [Đã đóng]
FlatList: Job cards với actions [Sửa] [Đóng] [Xóa]
Hiển thị: View count, Application count

4. ApplicantsScreen

Job selector dropdown
FlatList: Applicant cards

Avatar, Name, Skills
Applied date
[Xem CV] [Chấp nhận] [Từ chối]




Admin Flow
1. AdminDashboard

Stats overview:

Total users (Candidates, Employers)
Total jobs (Active, Draft)
Total applications
Crawl status (Last run, Next run)


Quick actions: [Duyệt jobs] [Xem logs]

2. CrawledJobsScreen

Filters: [Source] [Status]
FlatList: Job cards

Title, Company, Location
Source badge: "Viecoi.vn"
Status badge: "Chờ duyệt"
[✓ Duyệt] [✕ Từ chối] [✎ Sửa] [↗ Xem gốc]



3. CrawlLogsScreen

FlatList: Crawl runs

Date/time
Type (sitemap, jobs)
Status (success, failed)
Stats: URLs crawled, New jobs, Errors
[Xem chi tiết]



4. UsersManagementScreen

Tabs: [Candidates] [Employers]
Search bar
FlatList: User cards

Avatar, Name, Email
Role, Verified status
[Ban] [Verify] [Delete]




🛠️ TECH STACK
Frontend (React Native)
json{
  "dependencies": {
    "react": "18.2.0",
    "react-native": "0.74.5",
    "expo": "~54.0.0",
    
    "react-navigation": {
      "@react-navigation/native": "^6.1.9",
      "@react-navigation/bottom-tabs": "^6.5.11",
      "@react-navigation/native-stack": "^6.9.17"
    },
    
    "firebase": {
      "firebase": "^10.7.1",
      "@react-native-firebase/app": "^18.7.0",
      "@react-native-firebase/auth": "^18.7.0",
      "@react-native-firebase/firestore": "^18.7.0",
      "@react-native-firebase/storage": "^18.7.0",
      "@react-native-firebase/messaging": "^18.7.0"
    },
    
    "state_management": {
      "@reduxjs/toolkit": "^2.0.1",
      "react-redux": "^9.0.4"
    },
    
    "ui_components": {
      "react-native-paper": "^5.11.3",
      "react-native-vector-icons": "^10.0.3",
      "@expo/vector-icons": "^14.0.0"
    },
    
    "utilities": {
      "axios": "^1.6.2",
      "date-fns": "^2.30.0",
      "react-native-maps": "^1.10.0",
      "react-native-pdf": "^6.7.3",
      "expo-document-picker": "^12.0.2",
      "expo-image-picker": "^15.0.7",
      "expo-notifications": "^0.28.16"
    },
    
    "search": {
      "algoliasearch": "^4.20.0",
      "react-instantsearch-native": "^6.38.3"
    }
  }
}
Backend (Firebase)

Firestore: NoSQL database
Authentication: Email/Password, Google Sign-In
Cloud Storage: CV files, avatars, logos
Cloud Messaging (FCM): Push notifications
Security Rules: Row-level security

Crawler (Node.js + TypeScript)
json{
  "dependencies": {
    "axios": "^1.6.2",
    "cheerio": "^1.0.0-rc.12",
    "xml2js": "^0.6.2",
    "firebase-admin": "^11.11.1",
    "fuse.js": "^7.0.0",
    "winston": "^3.11.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "@types/node": "^20.10.5",
    "ts-node": "^10.9.2"
  }
}
Search Engine (Optional)

Algolia: Free tier (10K records, 10K searches/month)
Alternative: Firestore queries (if budget = 0)

DevOps

Version Control: Git + GitHub
CI/CD: GitHub Actions
Hosting:

App: Expo (build cloud)
Backend: Firebase (free tier)
Crawler: GitHub Actions (free 2000 min/month)




⏱️ TIMELINE CHI TIẾT (8 TUẦN)
📅 TUẦN 1: Setup Project + Crawler Foundation
Mục tiêu: Project structure sẵn sàng, crawler test thành công
Tasks:

 Init React Native project với Expo
 Setup Firebase project (Firestore, Auth, Storage)
 Configure Firebase trong app
 Setup project structure (/src/screens, /components, /services...)
 Init Node.js project cho crawler (/server)
 Test crawl sitemap viecoi.vn (10 URLs)
 Test parse 1 job detail page
 Design Firestore schema
 Write security rules

Deliverables:

React Native app chạy được "Hello World"
Crawler log ra được 10 job URLs từ sitemap
Firestore collections tạo xong


📅 TUẦN 2: Crawler Full + Data Pipeline
Mục tiêu: Có 50-100 jobs trong Firestore
Tasks:

 Implement JobCrawler.ts - crawl chi tiết jobs
 Implement JobParser.ts - parse HTML thành data
 Implement StudentFilter.ts - lọc jobs phù hợp SV
 Implement Normalizer.ts - chuẩn hóa data
 Implement Deduplicator.ts - loại trùng lặp
 Implement FirestoreUpserter.ts - batch upsert
 Test crawl 50-100 jobs
 Verify data trong Firestore Console

Deliverables:

Script chạy được: npm run crawl:jobs -- --limit 100
Firestore collection jobs có 50-100 documents
Data quality tốt (đầy đủ fields, không lỗi)


📅 TUẦN 3: Auth + Profile (Candidate)
Mục tiêu: Sinh viên đăng ký/đăng nhập được, tạo profile được
Tasks:

 Design UI: OnboardingScreen, AuthScreen
 Implement Firebase Auth (Email/Password)
 Implement Google Sign-In
 Design UI: ProfileSetupScreen (wizard)
 Implement form validation
 Implement CV upload (Firebase Storage)
 Save profile to Firestore
 Test full flow: Đăng ký → Setup profile → Lưu

Deliverables:

User có thể đăng ký bằng email hoặc Google
ProfileSetupScreen hoàn chỉnh
Profile lưu vào Firestore collection users
CV upload thành công lên Storage


📅 TUẦN 4: Job Listing + Detail + Navigation
Mục tiêu: Hiển thị danh sách jobs, xem chi tiết
Tasks:

 Setup React Navigation (Bottom Tabs, Stack)
 Design UI: HomeScreen
 Implement job list (FlatList)
 Fetch jobs từ Firestore (query + pagination)
 Design UI: JobDetailScreen
 Implement job detail rendering (HTML description)
 Add loading states, error handling
 Implement pull-to-refresh
 Test navigation flow

Deliverables:

HomeScreen hiển thị list 20 jobs
Load more khi scroll xuống
Nhấn vào job → Navigate to JobDetailScreen
JobDetailScreen hiển thị đầy đủ thông tin


📅 TUẦN 5: Apply + Save Jobs + Tracking
Mục tiêu: Ứng tuyển được, lưu jobs, tracking
Tasks:

 Implement "Apply" flow:

Modal xác nhận (cho external jobs)
Lưu vào applications collection
Redirect Linking.openURL() cho external
Form ứng tuyển cho internal jobs


 Implement "Save job" (heart icon)
 Design UI: ApplicationsScreen
 Implement applications list với filters (status)
 Implement update status (pending, accepted, rejected)
 Design UI: SavedJobsScreen
 Test full flow

Deliverables:

Nhấn "Ứng tuyển" → Modal → Confirm → Redirect/Submit
Applications lưu vào Firestore
ApplicationsScreen hiển thị danh sách đã ứng tuyển
Candidate update status được
Save/Unsave jobs hoạt động


📅 TUẦN 6: Search + Filter + Recommendations
Mục tiêu: Tìm kiếm, lọc, gợi ý jobs
Tasks:

 Design UI: SearchScreen
 Implement search (Firestore queries hoặc Algolia)
 Implement filters:

Location (picker)
Job type (checkboxes)
Salary range (slider)
Posted date (last 7 days, 30 days...)


 Implement sort (newest, highest salary, nearest)
 Implement recommendation algorithm:

Match skills
Match location
Match availability (schedule)


 Display "Jobs gợi ý cho bạn" on HomeScreen
 Test search & filter

Deliverables:

SearchScreen với search bar và filters
Kết quả tìm kiếm chính xác
HomeScreen có section "Jobs gợi ý" (personalized)
Recommendation logic hoạt động


📅 TUẦN 7: Stats + Notifications + Employer (PHỤ)
Mục tiêu: Thống kê cá nhân, push notifications, employer cơ bản
Tasks:

 Design UI: StatsScreen
 Implement analytics:

Count jobs viewed, saved, applied
Calculate success rate
Top skills từ jobs đã xem


 Implement charts (simple bar/line charts)
 Setup Firebase Cloud Messaging
 Implement push notifications:

New job matches profile
Saved job expiring soon


 (Optional) Employer screens:

EmployerDashboard
PostJobScreen (simple form)
ManageJobsScreen


 Test notifications

Deliverables:

StatsScreen hiển thị metrics
Charts rendering correctly
Push notifications hoạt động (test bằng Firebase Console)
(Optional) Employer có thể post job đơn giản


📅 TUẦN 8: Admin Panel + GitHub Actions + Polish
Mục tiêu: Hoàn thiện, automation, chuẩn bị demo
Tasks:

 Design Admin screens:

AdminDashboard
CrawledJobsScreen (approve/reject)
CrawlLogsScreen
UsersManagementScreen


 Implement approve/reject jobs
 Setup GitHub Actions workflow
 Test crawler chạy tự động (trigger workflow)
 UI/UX polish:

Animations (LayoutAnimation, Animated)
Loading states everywhere
Error boundaries
EmptyState components


 Bug fixes
 Performance optimization
 Write documentation
 Record demo video

Deliverables:

Admin panel hoàn chỉnh
GitHub Actions chạy mỗi ngày 02:00 AM
App mượt mà, không bug
Documentation đầy đủ
Demo video 5-10 phút


📂 PROJECT STRUCTURE
JobApplication/
├── /mobile-app/                      # React Native App
│   ├── /src/
│   │   ├── /screens/
│   │   │   ├── /auth/
│   │   │   │   ├── OnboardingScreen.tsx
│   │   │   │   ├── AuthScreen.tsx
│   │   │   │   └── ProfileSetupScreen.tsx
│   │   │   ├── /candidate/
│   │   │   │   ├── HomeScreen.tsx
│   │   │   │   ├── SearchScreen.tsx
│   │   │   │   ├── JobDetailScreen.tsx
│   │   │   │   ├── ApplicationsScreen.tsx
│   │   │   │   ├── SavedJobsScreen.tsx
│   │   │   │   ├── ProfileScreen.tsx
│   │   │   │   └── StatsScreen.tsx
│   │   │   ├── /employer/
│   │   │   │   ├── EmployerDashboard.tsx
│   │   │   │   ├── PostJobScreen.tsx
│   │   │   │   ├── ManageJobsScreen.tsx
│   │   │   │   └── ApplicantsScreen.tsx
│   │   │   └── /admin/
│   │   │       ├── AdminDashboard.tsx
│   │   │       ├── CrawledJobsScreen.tsx
│   │   │       ├── CrawlLogsScreen.tsx
│   │   │       └── UsersManagementScreen.tsx
│   │   ├── /components/
│   │   │   ├── /common/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   ├── Loading.tsx
│   │   │   │   └── EmptyState.tsx
│   │   │   ├── /job/
│   │   │   │   ├── JobCard.tsx
│   │   │   │   ├── JobListItem.tsx
│   │   │   │   └── SkillTag.tsx
│   │   │   └── /application/
│   │   │       ├── ApplicationCard.tsx
│   │   │       └── StatusBadge.tsx
│   │   ├── /navigation/
│   │   │   ├── AppNavigator.tsx
│   │   │   ├── AuthNavigator.tsx
│   │   │   ├── CandidateNavigator.tsx
│   │   │   ├── EmployerNavigator.tsx
│   │   │   └── AdminNavigator.tsx
│   │   ├── /services/
│   │   │   ├── firebase/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── firestore.ts
│   │   │   │   ├── storage.ts
│   │   │   │   └── messaging.ts
│   │   │   ├── api/
│   │   │   │   ├── jobs.ts
│   │   │   │   ├── applications.ts
│   │   │   │   └── users.ts
│   │   │   └── algolia/
│   │   │       └── search.ts
│   │   ├── /store/
│   │   │   ├── index.ts
│   │   │   ├── slices/
│   │   │   │   ├── authSlice.ts
│   │   │   │   ├── jobsSlice.ts
│   │   │   │   └── applicationsSlice.ts
│   │   │   └── hooks.ts
│   │   ├── /utils/
│   │   │   ├── constants.ts
│   │   │   ├── helpers.ts
│   │   │   └── validators.ts
│   │   ├── /types/
│   │   │   ├── user.ts
│   │   │   ├── job.ts
│   │   │   └── application.ts
│   │   └── /config/
│   │       ├── firebase.ts
│   │       └── algolia.ts
│   ├── /assets/
│   │   ├── /images/
│   │   └── /fonts/
│   ├── App.tsx
│   ├── app.json
│   ├── package.json
│   └── tsconfig.json
│
├── /server/                          # Crawler Backend
│   ├── /src/
│   │   ├── /crawlers/
│   │   │   └── /viecoi/
│   │   │       ├── index.ts
│   │   │       ├── SitemapCrawler.ts
│   │   │       ├── JobCrawler.ts
│   │   │       ├── /parsers/
│   │   │       │   └── JobParser.ts
│   │   │       └── /utils/
│   │   │           ├── httpClient.ts
│   │   │           └── rateLimiter.ts
│   │   ├── /processors/
│   │   │   ├── Normalizer.ts
│   │   │   ├── StudentFilter.ts
│   │   │   ├── Deduplicator.ts
│   │   │   └── Validator.ts
│   │   ├── /storage/
│   │   │   ├── FirestoreUpserter.ts
│   │   │   └── AlgoliaSync.ts
│   │   └── /utils/
│   │       ├── firebase.ts
│   │       ├── logger.ts
│   │       └── mappings.ts
│   ├── /scripts/
│   │   ├── crawl-sitemap.ts
│   │   ├── crawl-jobs.ts
│   │   └── sync-algolia.ts
│   ├── /data/
│   │   ├── viecoi-sitemap-cache.json
│   │   └── viecoi-jobs-raw.json
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── /.github/
│   └── /workflows/
│       └── sync-jobs-viecoi.yml
│
├── /docs/
│   ├── API.md
│   ├── DATABASE_SCHEMA.md
│   ├── DEPLOYMENT.md
│   └── USER_GUIDE.md
│
└── README.md

🔒 FIREBASE SECURITY RULES
Firestore Rules
javascriptrules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isSignedIn() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }
    
    function isAdmin() {
      return isSignedIn() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    function isEmployer() {
      return isSignedIn() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'employer';
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn();
      allow update: if isOwner(userId) || isAdmin();
      allow delete: if isAdmin();
    }
    
    // Jobs collection
    match /jobs/{jobId} {
      allow read: if true; // Public read
      allow create: if isEmployer() || isAdmin();
      allow update: if isAdmin() || 
                      (isEmployer() && resource.data.posted_by == request.auth.uid);
      allow delete: if isAdmin();
    }
    
    // Applications collection
    match /applications/{applicationId} {
      allow read: if isOwner(resource.data.candidate_id) || 
                    isAdmin() ||
                    (isEmployer() && resource.data.employer_id == request.auth.uid);
      allow create: if isSignedIn() && request.auth.uid == request.resource.data.candidate_id;
      allow update: if isOwner(resource.data.candidate_id) || isAdmin();
      allow delete: if isOwner(resource.data.candidate_id) || isAdmin();
    }
    
    // Saved jobs collection
    match /saved_jobs/{saveId} {
      allow read: if isOwner(resource.data.candidate_id);
      allow create, delete: if isSignedIn() && request.auth.uid == request.resource.data.candidate_id;
    }
    
    // Crawl logs (admin only)
    match /crawl_logs/{logId} {
      allow read: if isAdmin();
      allow write: if false; // Only server can write
    }
    
    // Notifications
    match /notifications/{notificationId} {
      allow read: if isOwner(resource.data.user_id);
      allow create: if false; // Only server can create
      allow update: if isOwner(resource.data.user_id); // Mark as read
      allow delete: if isOwner(resource.data.user_id);
    }
  }
}
Storage Rules
javascriptrules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    
    // CVs
    match /cvs/{userId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId && 
                     request.resource.size < 5 * 1024 * 1024 && // 5MB
                     request.resource.contentType == 'application/pdf';
    }
    
    // Avatars
    match /avatars/{userId}/{fileName} {
      allow read: if true;
      allow write: if request.auth.uid == userId && 
                     request.resource.size < 2 * 1024 * 1024 && // 2MB
                     request.resource.contentType.matches('image/.*');
    }
    
    // Company logos
    match /logos/{companyId}/{fileName} {
      allow read: if true;
      allow write: if request.auth != null && 
                     request.resource.size < 1 * 1024 * 1024 && // 1MB
                     request.resource.contentType.matches('image/.*');
    }
  }
}

🚀 DEPLOYMENT
Mobile App (Expo)
Development Build
bashcd mobile-app

# Install dependencies
npm install

# Start development server
expo start

# Run on Android
expo start --android

# Run on iOS
expo start --ios
Production Build
bash# Build for Android (APK)
eas build --platform android --profile production

# Build for iOS
eas build --platform ios --profile production

# Submit to stores
eas submit --platform android
eas submit --platform ios
Crawler (GitHub Actions)
Setup Secrets
bash# 1. Vào GitHub repo → Settings → Secrets and variables → Actions
# 2. Thêm secrets:

FIREBASE_SERVICE_ACCOUNT
# Value: Paste toàn bộ nội dung serviceAccountKey.json

ALGOLIA_APP_ID
# Value: 3JGCR12NR5

ALGOLIA_API_KEY
# Value: d8e34f818e6a139b73220857f9c3c5b7
Manual Trigger
bash# Vào GitHub repo → Actions → Sync Jobs from Viecoi.vn
# Click "Run workflow" → Select branch → Run

📊 TESTING STRATEGY
Unit Tests
bash# Frontend
cd mobile-app
npm test

# Backend
cd server
npm test
Integration Tests
bash# Test crawl flow
npm run test:crawl

# Test Firestore upsert
npm run test:firestore

# Test Algolia sync
npm run test:algolia
E2E Tests (Optional)
bash# Detox for React Native
npm run test:e2e:android
npm run test:e2e:ios
Manual Testing Checklist
Candidate Flow

 Đăng ký bằng email
 Đăng nhập bằng Google
 Setup profile
 Upload CV
 Xem danh sách jobs
 Search jobs
 Filter jobs (location, salary...)
 Xem chi tiết job
 Save job
 Ứng tuyển external job (redirect)
 Ứng tuyển internal job (upload CV)
 Xem danh sách applications
 Update application status
 Xem stats
 Nhận push notification

Employer Flow (PHỤ)

 Đăng ký employer
 Tạo company profile
 Post job
 Chỉnh sửa job
 Đóng job
 Xem danh sách applicants
 View applicant CV
 Chấp nhận/từ chối applicant

Admin Flow

 Login admin
 Xem dashboard
 Duyệt crawled jobs
 Từ chối jobs không phù hợp
 Xem crawl logs
 Quản lý users
 Ban user


📈 SUCCESS METRICS
Mục tiêu cho Demo (Sau 8 tuần)
MetricTargetHow to measureJobs trong DB100+Firestore countActive users10-20Test accountsApplications5-10Test applicationsCrawl success rate>90%GitHub Actions logsApp performance<3s load timeReact Native Perf MonitorSearch speed<1sAlgolia/Firestore queriesBug count<5 criticalManual testing
Mục tiêu cho Production (Nếu triển khai thật)
MetricTargetMAU (Monthly Active Users)1000+Jobs posted/month500+Applications/month200+Job match accuracy>70%User satisfaction>4.0/5.0

🐛 KNOWN ISSUES & WORKAROUNDS
1. Viecoi.vn HTML structure thay đổi
Problem: HTML selectors không còn đúng
Solution:

Crawler log error khi parse fail
Admin nhận notification
Update selectors trong JobParser.ts
Re-run crawler

2. Firestore free tier limit
Limits:

1GB storage
50K reads/day
20K writes/day

Workarounds:

Cache data ở client (Redux persist)
Pagination (load 20 items/page)
Nếu vượt limit → Upgrade to Blaze plan

3. GitHub Actions timeout (6 hours max)
Problem: Crawl quá nhiều jobs → Timeout
Solution:

Crawl incremental (chỉ jobs mới/updated)
Batch crawling (50 jobs/lần)
Split workflow (sitemap → jobs → companies)

4. External jobs không track được status
Problem: Candidate apply trên viecoi.vn → App không biết kết quả
Solution:

Candidate tự update status trong app
Disclaimer rõ ràng: "Bạn cần tự theo dõi và cập nhật"


💡 FUTURE ENHANCEMENTS (Sau khi tốt nghiệp)
Phase 2 (Nếu có thời gian)

 Chat realtime giữa Candidate - Employer
 Video phỏng vấn (WebRTC)
 AI resume parser (extract skills từ PDF CV)
 Salary prediction (ML model)
 Job recommendation với Collaborative Filtering
 Company reviews & ratings
 Referral system (giới thiệu bạn bè)

Phase 3 (Scale up)

 Crawl thêm nguồn: TopCV, VietnamWorks (nếu được phép)
 Multi-language (English, Vietnamese)
 Web app version (React.js)
 Advanced analytics dashboard
 A/B testing framework
 Premium features (employer trả phí)