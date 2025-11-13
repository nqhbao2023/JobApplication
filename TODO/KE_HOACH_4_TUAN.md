# KẾ HOẠCH 4 TUẦN HOÀN THIỆN ĐỒ ÁN JOB_4S

## 📊 PHÂN TÍCH HIỆN TRẠNG

### ✅ ĐÃ HOÀN THÀNH (80% Project)

#### **1. Backend API (Node.js + Express + Firebase)**
- ✅ Server setup với security (helmet, cors, rate-limiting)
- ✅ Firebase Admin SDK integration
- ✅ Controllers: job, application, company, category, user, notification, AI
- ✅ Routes: đầy đủ cho tất cả entities
- ✅ Services: job.service, application.service hoạt động tốt
- ✅ Algolia integration: search service, sync scripts
- ✅ Seed scripts: job-types, companies với fixed IDs
- ✅ Error handling middleware

#### **2. Frontend Mobile (React Native + Expo)**
- ✅ 3 roles đầy đủ: Candidate, Employer, Admin
- ✅ Navigation structure với expo-router
- ✅ Firebase Authentication (email/password)
- ✅ Screens candidate: home, savedJobs, appliedJobs, profile, chat
- ✅ Screens employer: addJob, myJobs, applications, profile, chat
- ✅ Screens admin: jobs, companies, users, analytics, job-create
- ✅ Components: Search, JobCard, CompanyCard, filters
- ✅ Services: jobApi, applicationApi, algoliaSearch, authApi
- ✅ Hooks: useCandidateHome, useJobDescription, useJobStatus
- ✅ Context: RoleContext

#### **3. Database (Firestore)**
- ✅ Collections: jobs, applications, users, companies, job_types, categories
- ✅ Seeded data: 20+ companies, 8+ job types
- ✅ Algolia synced: jobs, companies, job_types indices

#### **4. Features Hoạt Động**
- ✅ User authentication (register/login/logout)
- ✅ Search jobs với Algolia (typo-tolerant, fast)
- ✅ View job details (jobDescription.tsx)
- ✅ Save/unsave jobs
- ✅ Apply to jobs (với CV upload)
- ✅ Employer post jobs
- ✅ Employer view applications
- ✅ Admin manage jobs/users/companies
- ✅ Real-time chat (basic)
- ✅ Push notifications setup

---

## ❌ THIẾU/CẦN BỔ SUNG (20% còn lại)

### **1. CRAWLER VIECOI.VN** ⚠️ Priority #1
- ❌ Script crawl sitemap.xml
- ❌ Script crawl job details (/viec-lam/*.html)
- ❌ Script crawl company details
- ❌ Normalize data từ viecoi → Job_4S schema
- ❌ Deduplicate logic
- ❌ GitHub Actions workflow cho auto-crawl hàng ngày

### **2. EXTERNAL JOBS HANDLING** ⚠️ Priority #2
- ❌ Field `source: "viecoi" | "internal"` trong job schema
- ❌ Field `external_url` để redirect
- ❌ UI distinction giữa internal vs external jobs
- ❌ Apply flow cho external jobs (redirect to viecoi.vn)
- ❌ Disclaimer "Công việc từ Viecoi.vn"

### **3. MATCH SCORE ALGORITHM** 🎨 Nice-to-have
- ❌ Rule-based match score: skills (40%), location (20%), job_type (15%), salary (15%), experience (10%)
- ❌ UI hiển thị match percentage
- ❌ Gợi ý "For You" jobs dựa trên match score

### **4. POLISH & TESTING** 🔧 Week 4
- ⚠️ Testing end-to-end: candidate → apply → employer view
- ⚠️ Fix UI bugs (nếu có)
- ⚠️ Performance optimization
- ⚠️ Demo preparation (screenshots, video)

---

## 🗓️ KẾ HOẠCH 4 TUẦN CHI TIẾT

### **TUẦN 1 (7 ngày): CRAWLER VIECOI.VN** 🔥 Critical

#### **Ngày 1-2: Setup Crawler Foundation**
**Mục tiêu**: Tạo cấu trúc crawler cơ bản, test crawl sitemap

**Tasks**:
- [ ] Tạo folder `server/src/crawlers/viecoi/`
- [ ] File `sitemap-crawler.ts`: Crawl https://viecoi.vn/sitemap.xml
- [ ] File `job-crawler.ts`: Crawl job detail pages
- [ ] File `company-crawler.ts`: Crawl company pages
- [ ] Cài packages: `cheerio`, `axios`, `xml2js`
- [ ] Test crawl 5 URLs sample

**Output**: Script chạy được, lấy được 5 jobs từ viecoi.vn

---

#### **Ngày 3-4: Job Details Crawler**
**Mục tiêu**: Crawl đầy đủ thông tin job từ viecoi.vn

**Tasks**:
- [ ] Parse HTML job page: title, company, location, salary
- [ ] Parse JD (description): convert HTML sang plain text/markdown
- [ ] Parse requirements, benefits, skills
- [ ] Parse job_type, category, expires_at
- [ ] Normalize data → map sang Job_4S schema
- [ ] Handle errors: missing fields, invalid HTML
- [ ] Test với 20 jobs

**Output**: Crawl 20 jobs, lưu vào `server/data/viecoi-jobs.json`

---

#### **Ngày 5: Company Crawler**
**Mục tiêu**: Crawl thông tin công ty từ viecoi.vn

**Tasks**:
- [ ] Parse company page: name, logo, description, website
- [ ] Parse address, industry, employees count
- [ ] Normalize data → map sang companies schema
- [ ] Deduplicate với companies đã có trong DB
- [ ] Test với 10 companies

**Output**: Crawl 10 companies, lưu vào `server/data/viecoi-companies.json`

---

#### **Ngày 6: Normalize & Upsert to Firestore**
**Mục tiêu**: Đưa data vào Firestore, đánh dấu source = "viecoi"

**Tasks**:
- [ ] Script `upsert-jobs.ts`: Batch upsert jobs to Firestore
- [ ] Thêm fields: `source: "viecoi"`, `external_url`, `is_verified: false`
- [ ] Script `upsert-companies.ts`: Batch upsert companies
- [ ] Deduplicate logic: check title + company + location
- [ ] Test với 50 jobs

**Output**: 50 jobs + 10 companies trong Firestore với source="viecoi"

---

#### **Ngày 7: Sync to Algolia & Test**
**Mục tiêu**: Sync jobs lên Algolia, test search

**Tasks**:
- [ ] Script `sync-viecoi-to-algolia.ts`: Sync jobs to Algolia
- [ ] Add filters: `source:viecoi`, `is_verified:true/false`
- [ ] Test search: "React", "Bình Dương", "Part-time"
- [ ] Verify facets: location, job_type, category
- [ ] Run full crawl: 100+ jobs

**Output**: 100+ jobs trên Algolia, search hoạt động

---

### **TUẦN 2 (7 ngày): GITHUB ACTIONS + EXTERNAL JOBS UI** 🚀

#### **Ngày 8-9: GitHub Actions Auto-Crawl**
**Mục tiêu**: Setup GitHub Actions chạy crawler hàng ngày

**Tasks**:
- [ ] Tạo file `.github/workflows/crawl-viecoi.yml`
- [ ] Schedule: cron `0 2 * * *` (2AM daily)
- [ ] Workflow steps: install deps → crawl → upsert → sync Algolia
- [ ] Setup secrets: Firebase credentials, Algolia keys
- [ ] Test manual trigger
- [ ] Monitor logs

**Output**: GitHub Actions chạy crawler tự động hàng ngày

---

#### **Ngày 10: Update Job Schema**
**Mục tiêu**: Thêm fields cho external jobs

**Tasks**:
- [ ] Update `server/src/types/index.ts`: thêm `source`, `external_url`
- [ ] Update `job.service.ts`: handle external jobs
- [ ] Update Firestore Security Rules: cho phép đọc external jobs
- [ ] Seed 10 internal jobs để test (từ employer hoặc admin)

**Output**: Schema hỗ trợ đầy đủ internal + external jobs

---

#### **Ngày 11-12: Frontend - External Jobs UI**
**Mục tiêu**: UI phân biệt internal vs external jobs

**Tasks**:
- [ ] JobCard: Badge "Từ Viecoi.vn" cho external jobs
- [ ] jobDescription.tsx: Hiển thị disclaimer cho external jobs
- [ ] Apply button:
  - Internal: Hiển thị "Ứng tuyển ngay" → navigate to submit CV
  - External: Hiển thị "Ứng tuyển trên Viecoi.vn" → redirect browser
- [ ] Alert confirm khi redirect external
- [ ] Log external applications (tracking)

**Output**: UI phân biệt rõ ràng internal vs external

---

#### **Ngày 13-14: Testing External Jobs Flow**
**Mục tiêu**: Test toàn bộ flow external jobs

**Tasks**:
- [ ] Test search: mix internal + external jobs
- [ ] Test filter: "Chỉ hiển thị job internal" (nếu cần)
- [ ] Test apply external: redirect đúng URL viecoi.vn
- [ ] Test save external jobs
- [ ] Test view count cho external jobs
- [ ] Fix bugs (nếu có)

**Output**: External jobs flow hoạt động mượt mà

---

### **TUẦN 3 (7 ngày): MATCH SCORE + ADMIN VERIFICATION** 🎯

#### **Ngày 15-16: Match Score Algorithm**
**Mục tiêu**: Rule-based match score cho gợi ý job

**Tasks**:
- [ ] File `server/src/services/match-score.service.ts`
- [ ] Algorithm:
  - Skills match: 40% (so sánh user.skills vs job.skills)
  - Location match: 20% (so sánh user.location vs job.location)
  - Job type match: 15% (user.preferences.job_types vs job.type)
  - Salary match: 15% (user.preferences.min_salary vs job.salary)
  - Experience match: 10% (user.experience vs job.requirements)
- [ ] API endpoint: `GET /api/jobs/:id/match-score`
- [ ] Test với 5 user profiles

**Output**: API trả về match score 0-100%

---

#### **Ngày 17: Frontend - Match Score UI**
**Mục tiêu**: Hiển thị match score trong UI

**Tasks**:
- [ ] Component `MatchScoreCircle`: circular progress với %
- [ ] Thêm vào `jobDescription.tsx`: hiển thị match score top page
- [ ] Hiển thị reasons: "✓ Có kỹ năng React", "✗ Thiếu 1 năm kinh nghiệm"
- [ ] Sort "For You" jobs theo match score giảm dần
- [ ] Badge "98% phù hợp" trên JobCard

**Output**: UI hiển thị match score đẹp, rõ ràng

---

#### **Ngày 18-19: Admin - Job Verification**
**Mục tiêu**: Admin duyệt jobs từ viecoi.vn

**Tasks**:
- [ ] Screen `(admin)/job-verification.tsx`
- [ ] List jobs với `is_verified: false`
- [ ] Actions: Approve (set `is_verified: true`, `status: active`)
- [ ] Actions: Reject (set `status: rejected`)
- [ ] Filter: only show `source: viecoi` jobs
- [ ] API: `PATCH /api/jobs/:id/verify`

**Output**: Admin có thể kiểm duyệt jobs

---

#### **Ngày 20-21: Employer - Keep Complex Features**
**Mục tiêu**: Giữ nguyên các tính năng employer đã có

**Tasks**:
- [ ] Review lại employer screens: addJob, myJobs, applications
- [ ] Test employer post job → candidate apply → employer view CV
- [ ] Test edit job, delete job
- [ ] Test download CV từ application
- [ ] Fix bugs (nếu có)

**Output**: Employer features hoạt động tốt

---

### **TUẦN 4 (7 ngày): POLISH + TESTING + DEMO** 🎨 Final

#### **Ngày 22-23: End-to-End Testing**
**Mục tiêu**: Test toàn bộ flow từ đầu đến cuối

**Test Scenarios**:
- [ ] **Candidate flow**:
  1. Register → Login
  2. Search job "React" → View details
  3. Save job → View saved jobs
  4. Apply internal job (upload CV) → Check applications list
  5. Apply external job (redirect viecoi.vn)
  6. View match score
- [ ] **Employer flow**:
  1. Register as employer → Login
  2. Post job → View my jobs
  3. Receive application → Download CV
  4. Edit job, delete job
- [ ] **Admin flow**:
  1. View crawled jobs (unverified)
  2. Approve job → appears in search
  3. Reject job → hidden
  4. Create internal job
  5. View analytics

**Output**: Tất cả flows hoạt động không lỗi

---

#### **Ngày 24: UI/UX Polish**
**Mục tiêu**: Làm đẹp UI, fix nhỏ

**Tasks**:
- [ ] Fix spacing, padding, alignment
- [ ] Consistent colors, fonts
- [ ] Add loading states cho tất cả API calls
- [ ] Add empty states: "Chưa có job nào", "Chưa ứng tuyển job nào"
- [ ] Add error states: "Không tải được job", "Mất kết nối"
- [ ] Add success toasts: "Lưu job thành công", "Ứng tuyển thành công"

**Output**: UI đẹp, professional

---

#### **Ngày 25: Performance Optimization**
**Mục tiêu**: Tối ưu tốc độ app

**Tasks**:
- [ ] Frontend: Lazy load images, pagination
- [ ] Backend: Add caching cho hot endpoints (jobs list)
- [ ] Algolia: Optimize search params (hitsPerPage, attributes)
- [ ] Firebase: Optimize queries (composite indexes nếu cần)
- [ ] Test load time: home screen, job detail, search

**Output**: App load nhanh < 2s

---

#### **Ngày 26-27: Demo Preparation**
**Mục tiêu**: Chuẩn bị cho buổi bảo vệ đồ án

**Tasks**:
- [ ] **Screenshots**:
  - Home screen (search, job list)
  - Job detail (internal)
  - Job detail (external với badge)
  - Apply flow (CV upload)
  - Employer dashboard
  - Admin dashboard
- [ ] **Demo Video** (3-5 phút):
  - Intro: Vấn đề sinh viên tìm việc
  - Solution: Job_4S app
  - Demo candidate flow
  - Demo employer flow
  - Demo admin + crawler
  - Outro: Tech stack, achievements
- [ ] **Slide thuyết trình**:
  - Vấn đề & Mục tiêu
  - Giải pháp (crawler viecoi.vn + internal jobs)
  - Kiến trúc hệ thống
  - Tech stack
  - Tính năng chính (list + screenshots)
  - Kết quả (số liệu: X jobs, Y companies, Z users)
  - Demo
- [ ] **README.md**:
  - Giới thiệu project
  - Features list
  - Tech stack
  - Setup instructions
  - Screenshots

**Output**: Sẵn sàng demo cho hội đồng

---

#### **Ngày 28 (Dự phòng): Buffer Day**
**Mục tiêu**: Fix lỗi phát sinh, hoàn thiện tài liệu

**Tasks**:
- [ ] Fix any critical bugs
- [ ] Finalize documentation
- [ ] Practice demo presentation
- [ ] Backup code, database

**Output**: 100% ready to defend

---

## 📋 CHECKLIST TRƯỚC BẢO VỆ

### **Technical**
- [ ] App build thành công (Android APK)
- [ ] Server deploy lên Railway/Render (hoặc local demo)
- [ ] Firebase project stable
- [ ] Algolia search hoạt động
- [ ] GitHub Actions crawler chạy hàng ngày
- [ ] Database có ít nhất 100+ jobs (mix internal + external)

### **Demo**
- [ ] Video demo 3-5 phút
- [ ] Slides thuyết trình đầy đủ
- [ ] Screenshots HD của tất cả screens
- [ ] Test device sẵn sàng (phone/emulator)

### **Documentation**
- [ ] README.md đầy đủ
- [ ] API Documentation
- [ ] User Guide
- [ ] Báo cáo đồ án (theo format trường)

---

## 🎯 KẾT QUẢ MONG ĐỢI SAU 4 TUẦN

### **Sản phẩm hoàn chỉnh**:
1. ✅ Mobile app (Android + iOS) với 3 roles hoạt động đầy đủ
2. ✅ Backend API stable với Node.js + Express + Firebase
3. ✅ Crawler tự động từ viecoi.vn (GitHub Actions)
4. ✅ 100+ jobs trong database (mix internal + external)
5. ✅ Search engine với Algolia (typo-tolerant, fast)
6. ✅ Match score algorithm (rule-based)
7. ✅ Admin verification cho crawled jobs

### **Tài liệu đầy đủ**:
1. ✅ README.md
2. ✅ API docs
3. ✅ User guide
4. ✅ Báo cáo đồ án

### **Demo materials**:
1. ✅ Video demo 3-5 phút
2. ✅ Slides thuyết trình
3. ✅ Screenshots HD

---

## 💪 LỜI KHUYÊN

### **Ưu tiên**:
1. **Tuần 1**: Focus 100% vào crawler - đây là tính năng mới nhất, quan trọng nhất
2. **Tuần 2**: External jobs UI - cần để phân biệt với internal jobs
3. **Tuần 3**: Match score (có thể bỏ nếu không đủ thời gian)
4. **Tuần 4**: Polish + Demo - KHÔNG bỏ qua!

### **Risk Management**:
- Nếu crawler quá khó: Giảm số lượng jobs xuống 50 (vẫn đủ demo)
- Nếu GitHub Actions không work: Chạy crawler local, manual sync
- Nếu Match score quá phức tạp: Bỏ qua, focus vào core features

### **Tips**:
- Commit code hàng ngày lên GitHub
- Test từng feature nhỏ trước khi chuyển sang feature khác
- Giữ backup database trước mỗi lần seed/crawl
- Chuẩn bị plan B nếu demo live bị lỗi (video backup)

---

## 🚀 BẮT ĐẦU NGAY

**Ngày mai (Tuần 1, Ngày 1)**:
1. Tạo folder `server/src/crawlers/viecoi/`
2. Cài packages: `npm install cheerio xml2js`
3. Tạo file `sitemap-crawler.ts`
4. Test crawl https://viecoi.vn/sitemap.xml

→ **Bạn sẵn sàng chưa? Let's go! 🔥**
