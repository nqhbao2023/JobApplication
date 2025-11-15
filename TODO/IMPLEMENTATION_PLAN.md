# 🚀 IMPLEMENTATION PLAN - JOB AGGREGATOR

## ✅ COMPLETED

### Backend Setup
- [x] Cập nhật Job schema với jobSource field (crawled/quick-post/featured)
- [x] Thêm contactInfo, workSchedule, hourlyRate fields
- [x] Tạo QuickPost Service
- [x] Tạo QuickPost Controller
- [x] Tạo QuickPost Routes (/api/quick-posts)
- [x] Tạo QuickPost Validator
- [x] Integrate Quick Post routes vào main app

### Quick Post Features
- [x] POST /api/quick-posts - Tạo job không cần auth
- [x] GET /api/quick-posts/pending - Admin xem jobs chờ duyệt
- [x] PATCH /api/quick-posts/:id/approve - Admin duyệt job
- [x] PATCH /api/quick-posts/:id/reject - Admin từ chối job

---

## 🔄 IN PROGRESS

### Testing Quick Post API
- [ ] Test POST quick post với Postman
- [ ] Test Admin approve workflow
- [ ] Kiểm tra validation errors

---

## 📋 TODO

### Phase 1: Core Features (Week 1-2)

#### Backend
- [ ] **Job Service Enhancement**
  - [ ] Filter jobs by jobSource
  - [ ] Get verified quick posts endpoint
  - [ ] Get featured jobs endpoint
  - [ ] Aggregate jobs from all 3 sources

- [ ] **Featured Jobs**
  - [ ] Create featured job route (Admin only)
  - [ ] Mark job as featured (isFeatured flag)
  - [ ] Featured jobs priority in listing

- [ ] **Apply Workflow Backend**
  - [ ] Endpoint: Generate email với CV attachment (cho featured jobs)
  - [ ] Endpoint: Log apply action (tracking)
  - [ ] Return apply instructions based on jobSource

#### Frontend (React Native)
- [ ] **Screens**
  - [ ] JobList Screen (hiển thị 3 loại jobs)
  - [ ] JobDetail Screen (khác nhau theo jobSource)
  - [ ] QuickPost Form Screen
  - [ ] Profile/CV Builder Screen

- [ ] **Apply Workflow UI**
  - [ ] Type 1: External Jobs → Show redirect popup
  - [ ] Type 2: Quick Post → Show contact buttons (Call/Zalo/Email)
  - [ ] Type 3: Featured → Send CV form

- [ ] **Student Filters**
  - [ ] Filter by work schedule (Thứ 2,4,6...)
  - [ ] Filter by distance (GPS)
  - [ ] Filter by hourly rate
  - [ ] Filter by job type

---

### Phase 2: Crawler (Week 2-3)

- [ ] **Crawler Setup**
  - [ ] Research viecoi.vn structure
  - [ ] Implement Puppeteer/Cheerio crawler
  - [ ] Parse job data to our schema
  - [ ] Store with jobSource: 'crawled'
  - [ ] Add sourceUrl field

- [ ] **Crawler Automation**
  - [ ] Cron job (6h interval)
  - [ ] Error handling & retry logic
  - [ ] Duplicate detection
  - [ ] TTL 30 days (auto cleanup)

- [ ] **Other Sources**
  - [ ] Facebook Jobs (Graph API research)
  - [ ] timviec365.vn (if feasible)

---

### Phase 3: Smart Features (Week 3-4)

- [ ] **Job Matching Algorithm**
  - [ ] Score based on schedule match
  - [ ] Score based on distance (GPS)
  - [ ] Score based on salary
  - [ ] Score based on skills
  - [ ] Recommend endpoint

- [ ] **Application Tracker**
  - [ ] Track apply actions
  - [ ] Track viewed jobs
  - [ ] Track saved jobs
  - [ ] Statistics dashboard

- [ ] **Push Notifications**
  - [ ] New job matching filters
  - [ ] Job near you
  - [ ] High salary jobs
  - [ ] Saved job reminders

---

### Phase 4: Admin Dashboard (Week 4)

- [ ] **Admin Features**
  - [ ] Review pending quick posts
  - [ ] Approve/Reject UI
  - [ ] User management
  - [ ] Job statistics
  - [ ] Featured job management

---

## 🎯 IMMEDIATE NEXT STEPS

1. **Test Quick Post API** (30 mins)
   ```bash
   # Test create quick post
   POST http://localhost:3000/api/quick-posts
   {
     "title": "Phục vụ quán cafe gần TDMU",
     "description": "Tuyển sinh viên làm part-time...",
     "location": "Bình Dương",
     "workSchedule": "Thứ 2,4,6 tối",
     "hourlyRate": 25000,
     "contactInfo": {
       "phone": "0909123456",
       "zalo": "0909123456"
     }
   }
   
   # Admin approve
   PATCH http://localhost:3000/api/quick-posts/:id/approve
   ```

2. **Update Job Routes** - Add filter by jobSource (1 hour)

3. **Create Frontend Job List Screen** (2-3 hours)

4. **Implement Apply Workflow Logic** (3-4 hours)

---

## 📊 METRICS

- **Jobs Created**: 0
- **Quick Posts Approved**: 0
- **Crawled Jobs**: 0
- **Featured Jobs**: 0
- **Active Users**: 0

---

## 🐛 KNOWN ISSUES

- None yet

---

## 💡 NOTES

- Quick Post không cần authentication → dễ spam → cần admin verification
- Crawler phải respect robots.txt
- Featured jobs cần payment integration (sau này)
- CV attachment size limit: 5MB
