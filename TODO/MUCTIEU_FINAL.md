# PLAN CUỐI CÙNG: JOB_4S - ỨNG DỤNG TÌM VIỆC CHO SINH VIÊN

## 🎯 MỤC TIÊU CỐT LÕI

**Xây dựng ứng dụng di động giúp sinh viên:**
1. **TÌM** việc làm thêm, thực tập từ nhiều nguồn (viecoi.vn + internal)
2. **XEM & SO SÁNH** job đầy đủ ngay trong app (không chỉ redirect)
3. **QUẢN LÝ** CV, lịch sử ứng tuyển
4. **NHẬN GỢI Ý** job phù hợp với profile, kỹ năng
5. **ỨNG TUYỂN** dễ dàng (internal hoặc redirect external)

→ **Giá trị**: One-stop shop cho sinh viên tìm việc, không phải mở 10 tab browser!

---

## 🎭 VAI TRÒ NGƯỜI DÙNG

### 1. **SINH VIÊN (Candidate)** - ⭐ Vai trò chính
**Mục đích**: Tìm việc làm thêm, thực tập

**Chức năng:**
- ✅ Tìm kiếm job (Algolia search)
- ✅ Xem chi tiết job ĐẦY ĐỦ trong app (title, JD, lương, skills, yêu cầu...)
- ✅ Lưu job yêu thích
- ✅ So sánh job với profile → Match score %
- ✅ Quản lý CV (tạo, sửa, tải lên)
- ✅ Ứng tuyển:
  - Internal jobs → Nộp CV trong app
  - External jobs (viecoi) → Redirect sang browser
- ✅ Theo dõi lịch sử: đã xem, đã lưu, đã ứng tuyển
- ✅ Nhận thông báo job mới phù hợp

---

### 2. **ADMIN** - ⭐ Vai trò quản lý
**Mục đích**: Quản lý dữ liệu, kiểm duyệt, thống kê

**Chức năng:**
- ✅ Kiểm duyệt job từ viecoi (approve/reject)
- ✅ Tạo job internal (form đơn giản)
- ✅ Quản lý users (sinh viên, employer)
- ✅ Xem applications (CV sinh viên nộp cho internal jobs)
- ✅ Forward CV cho employer qua email
- ✅ Xem logs crawler, thống kê

---

### 3. **EMPLOYER (Nhà tuyển dụng)** - 🎨 Chức năng phụ (đơn giản hóa)
**Mục đích**: Đăng job, xem ứng viên (KHÔNG phức tạp như TopCV)

**Chức năng GỌN:**
- ✅ Đăng ký account employer (đơn giản)
- ✅ Đăng tin tuyển dụng (form đơn giản, admin duyệt)
- ✅ Xem danh sách ứng viên đã nộp CV
- ✅ Tải CV ứng viên
- ✅ Liên hệ ứng viên qua email/phone (KHÔNG có chat phức tạp)

**KHÔNG CÓ:**
- ❌ Chat real-time/nếu có rồi thì bỏ qua, ko cần xóa hẳn
- ❌ Tìm kiếm ứng viên chủ động
- ❌ Quản lý phức tạp như ATS (Applicant Tracking System)

→ Employer chỉ là **"đăng job + xem CV"**, admin hỗ trợ xử lý phần còn lại

---

## 💾 DỮ LIỆU: 2 NGUỒN

### **Nguồn 1: Crawl từ viecoi.vn** (External Jobs)
- Crawl sitemap → Lấy 100-200 jobs
- Lưu ĐẦY ĐỦ: title, company, JD, lương, skills, yêu cầu...
- Hiển thị trong app, sinh viên xem toàn bộ
- Khi ứng tuyển → Redirect sang viecoi.vn

**Ưu điểm:**
- Nhiều job, đa dạng
- Cập nhật tự động hàng ngày (GitHub Actions)
- Hợp pháp (tuân thủ robots.txt)

---

### **Nguồn 2: Job internal** (từ employer hoặc admin)
- Employer đăng job → Admin duyệt → Hiển thị
- Sinh viên ứng tuyển → Nộp CV trong app
- Employer xem CV → Liên hệ trực tiếp

**Ưu điểm:**
- Ứng tuyển dễ dàng, không rời app
- Admin kiểm soát chất lượng
- Employer có thể tương tác trực tiếp

---

## 🏗️ KIẾN TRÚC HỆ THỐNG

### **Frontend (React Native)**
```
App sinh viên:
├─ HomeScreen (search, job list)
├─ JobDetailScreen (hiển thị ĐẦY ĐỦ JD)
├─ ProfileScreen (CV, skills, preferences)
├─ SavedJobsScreen
├─ AppliedJobsScreen
└─ ApplyJobScreen (upload CV)

App admin:
├─ DashboardScreen (stats)
├─ CrawledJobsManagement (approve/reject)
├─ InternalJobsManagement
├─ UsersManagement
└─ ApplicationsManagement

App employer (đơn giản):
├─ PostJobScreen (form đơn giản)
├─ MyJobsScreen
└─ ApplicationsScreen (xem CV)
```

---

### **Backend (Node.js + Express + Firebase)**
```
/server/src/
├── api/
│   ├── jobs/ (CRUD jobs, search)
│   ├── users/ (candidate, employer, admin)
│   ├── applications/ (nộp CV, xem applications)
│   └── crawler/ (trigger crawl, logs)
├── crawlers/
│   ├── viecoi/ (crawl từ viecoi.vn)
│   ├── processors/ (normalize, dedupe)
│   └── storage/ (Firestore, Algolia)
├── services/
│   ├── algolia.service.ts
│   ├── email.service.ts (gửi email cho employer)
│   └── notification.service.ts (push notification)
└── middleware/
    ├── auth.ts (Firebase Auth)
    └── roleCheck.ts (admin, employer, candidate)
```

---

## 📊 SCHEMA FIRESTORE (ĐƠN GIẢN)

### Collection: `jobs`
```typescript
{
  id: string;
  title: string;
  company_name: string;
  company_logo?: string;
  
  location: string;
  job_type_id: string; // full-time, part-time, intern
  category: string;
  
  salary_min?: number;
  salary_max?: number;
  salary_text?: string; // "Thỏa thuận"
  
  skills: string[];
  description: string; // JD ĐẦY ĐỦ (HTML)
  requirements: string[];
  benefits?: string[];
  
  // Metadata
  source: "viecoi" | "internal";
  external_url?: string; // Nếu từ viecoi
  
  // Cho internal jobs
  employer_id?: string; // Nếu do employer đăng
  contact_email?: string;
  contact_phone?: string;
  
  status: "draft" | "active" | "closed";
  is_verified: boolean; // Admin đã duyệt
  
  created_at: Timestamp;
  expires_at?: Timestamp;
  
  // Stats
  view_count: number;
  application_count: number;
  save_count: number;
}
```

---

### Collection: `users`
```typescript
{
  id: string; // Firebase UID
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  
  role: "candidate" | "employer" | "admin";
  
  // Candidate fields
  cv_url?: string;
  skills?: string[];
  education?: string;
  experience?: string;
  preferences?: {
    job_types: string[];
    locations: string[];
    min_salary?: number;
  };
  
  // Employer fields
  company_name?: string;
  company_logo?: string;
  company_address?: string;
  
  created_at: Timestamp;
}
```

---

### Collection: `applications`
```typescript
{
  id: string;
  job_id: string;
  candidate_id: string;
  employer_id?: string; // Nếu là internal job
  
  candidate_name: string;
  candidate_email: string;
  candidate_phone: string;
  cv_url: string;
  cover_letter?: string;
  
  status: "pending" | "reviewed" | "contacted" | "rejected";
  applied_at: Timestamp;
  reviewed_at?: Timestamp;
}
```

---

### Collection: `saved_jobs`
```typescript
{
  id: string;
  candidate_id: string;
  job_id: string;
  saved_at: Timestamp;
}
```

---

### Collection: `job_views`
```typescript
{
  id: string;
  candidate_id: string;
  job_id: string;
  viewed_at: Timestamp;
}
```

---

## 🎨 UI/UX CHI TIẾT

### **JobDetailScreen (QUAN TRỌNG NHẤT)**
```tsx
function JobDetailScreen({ route }) {
  const { jobId } = route.params;
  const [job, setJob] = useState(null);
  const [matchScore, setMatchScore] = useState(0);
  const { user } = useAuth();
  
  return (
    <ScrollView>
      {/* Header */}
      <View style={styles.header}>
        {job.company_logo && <Image source={{ uri: job.company_logo }} />}
        <Text style={styles.title}>{job.title}</Text>
        <Text style={styles.company}>{job.company_name}</Text>
        <Text style={styles.location}>{job.location}</Text>
        <Text style={styles.salary}>{job.salary_text}</Text>
        
        {/* Source badge */}
        {job.source === 'viecoi' && (
          <Badge color="blue">Từ Viecoi.vn</Badge>
        )}
      </View>
      
      {/* Match Score (AI/Rules) */}
      <View style={styles.matchScore}>
        <CircularProgress value={matchScore} />
        <Text>Bạn phù hợp {matchScore}% với công việc này</Text>
        <Text style={styles.matchReason}>
          ✓ Có kỹ năng React, Node.js
          ✓ Vị trí gần bạn
          ✗ Thiếu 1 năm kinh nghiệm
        </Text>
      </View>
      
      {/* Job Details - HIỂN THỊ ĐẦY ĐỦ */}
      <View style={styles.content}>
        <Section title="Mô tả công việc">
          <RenderHtml source={{ html: job.description }} />
        </Section>
        
        <Section title="Yêu cầu">
          {job.requirements.map((req, i) => (
            <Text key={i}>• {req}</Text>
          ))}
        </Section>
        
        <Section title="Kỹ năng cần có">
          <View style={styles.skillsContainer}>
            {job.skills.map(skill => (
              <Chip 
                key={skill}
                selected={user.skills?.includes(skill)}
              >
                {skill}
              </Chip>
            ))}
          </View>
        </Section>
        
        {job.benefits && (
          <Section title="Quyền lợi">
            {job.benefits.map((benefit, i) => (
              <Text key={i}>• {benefit}</Text>
            ))}
          </Section>
        )}
      </View>
      
      {/* Actions */}
      <View style={styles.actions}>
        <IconButton
          icon="bookmark-outline"
          onPress={() => saveJob(job.id)}
        />
        
        <IconButton
          icon="share-outline"
          onPress={() => shareJob(job)}
        />
        
        {job.source === 'internal' ? (
          <Button
            mode="contained"
            onPress={() => navigation.navigate('ApplyJob', { jobId: job.id })}
          >
            Ứng tuyển ngay
          </Button>
        ) : (
          <Button
            mode="contained"
            icon="open-in-new"
            onPress={() => handleExternalApply(job)}
          >
            Ứng tuyển trên Viecoi.vn
          </Button>
        )}
      </View>
      
      {/* Similar Jobs */}
      <View style={styles.similarJobs}>
        <Text style={styles.sectionTitle}>Công việc tương tự</Text>
        <FlatList
          horizontal
          data={similarJobs}
          renderItem={({ item }) => <JobCard job={item} />}
        />
      </View>
    </ScrollView>
  );
}

function handleExternalApply(job) {
  Alert.alert(
    'Ứng tuyển trên Viecoi.vn',
    'Tin này từ nguồn bên ngoài. Bạn sẽ được chuyển đến trang gốc để ứng tuyển.',
    [
      { text: 'Hủy' },
      {
        text: 'Tiếp tục',
        onPress: async () => {
          // Log action
          await logExternalApplication(job.id, user.id);
          // Open browser
          Linking.openURL(job.external_url);
        }
      }
    ]
  );
}
```

---

### **HomeScreen (Tìm kiếm & Danh sách job)**
```tsx
function HomeScreen() {
  const [jobs, setJobs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    locations: [],
    job_types: [],
    salary_min: null,
  });
  
  return (
    <View>
      {/* Search Bar (Algolia InstantSearch) */}
      <SearchBar
        placeholder="Tìm việc, công ty, kỹ năng..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      
      {/* Quick Filters */}
      <ScrollView horizontal style={styles.filters}>
        <FilterChip label="Full-time" />
        <FilterChip label="Part-time" />
        <FilterChip label="Thực tập" />
        <FilterChip label="Remote" />
        <FilterChip label="Bình Dương" />
      </ScrollView>
      
      {/* Job List */}
      <FlatList
        data={jobs}
        renderItem={({ item }) => (
          <JobCard
            job={item}
            onPress={() => navigation.navigate('JobDetail', { jobId: item.id })}
          />
        )}
      />
    </View>
  );
}

function JobCard({ job, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.jobCard}>
      <View style={styles.cardHeader}>
        {job.company_logo && <Image source={{ uri: job.company_logo }} />}
        <View>
          <Text style={styles.jobTitle}>{job.title}</Text>
          <Text style={styles.companyName}>{job.company_name}</Text>
        </View>
        <IconButton icon="bookmark-outline" />
      </View>
      
      <View style={styles.cardBody}>
        <Text style={styles.location}>📍 {job.location}</Text>
        <Text style={styles.salary}>💰 {job.salary_text}</Text>
      </View>
      
      <View style={styles.cardFooter}>
        <View style={styles.skills}>
          {job.skills.slice(0, 3).map(skill => (
            <Chip key={skill} size="small">{skill}</Chip>
          ))}
        </View>
        {job.source === 'viecoi' && (
          <Badge size="small">Viecoi.vn</Badge>
        )}
      </View>
    </TouchableOpacity>
  );
}
```

---

## 🚀 ROADMAP THỰC TẾ (7 TUẦN)

### **Tuần 1-2: Setup & Crawl cơ bản** ⭐ Ưu tiên cao
- [ ] Setup project structure
- [ ] Crawl sitemap viecoi.vn
- [ ] Crawl 50-100 job details với JD đầy đủ
- [ ] Lưu vào Firestore
- [ ] Sync lên Algolia
- [ ] **Deliverable**: Có 50+ jobs trong database

---

### **Tuần 3: Frontend sinh viên - Core features** ⭐ Ưu tiên cao
- [ ] HomeScreen với search (Algolia)
- [ ] JobDetailScreen hiển thị ĐẦY ĐỦ JD
- [ ] Lưu job yêu thích
- [ ] **Deliverable**: Sinh viên có thể tìm và xem job

---

### **Tuần 4: CV & Apply** ⭐ Ưu tiên cao
- [ ] ProfileScreen (tạo/sửa CV)
- [ ] Upload CV lên Firebase Storage
- [ ] ApplyJobScreen (nộp CV cho internal jobs)
- [ ] Handle external apply (redirect)
- [ ] **Deliverable**: Sinh viên có thể ứng tuyển

---

### **Tuần 5: Admin & Employer (đơn giản)** ⭐ Ưu tiên trung bình
- [ ] Admin: Kiểm duyệt crawled jobs
- [ ] Admin: Tạo internal jobs
- [ ] Employer: Đăng job (form đơn giản)
- [ ] Employer: Xem applications, tải CV
- [ ] **Deliverable**: Có flow đầy đủ cho internal jobs

---

### **Tuần 6: Smart features** 🎨 Nice-to-have
- [ ] Match score (job vs profile)
- [ ] Gợi ý job phù hợp
- [ ] Push notification job mới
- [ ] Lịch sử xem/ứng tuyển
- [ ] **Deliverable**: Tính năng thông minh

---

### **Tuần 7: Polish & Deploy** 🎨 Finalize
- [ ] GitHub Actions auto-crawl hàng ngày
- [ ] Disclaimer cho external jobs
- [ ] Testing end-to-end
- [ ] Chuẩn bị demo cho hội đồng
- [ ] **Deliverable**: App hoàn chỉnh, sẵn sàng demo

---

## 🎯 DELIVERABLES (SẢN PHẨM CUỐI)

### **1. App di động (React Native)**
- Android APK + iOS build
- 3 vai trò: Candidate, Employer, Admin
- Chức năng đầy đủ như đã nêu

### **2. Backend API (Node.js + Express)**
- REST API cho jobs, users, applications
- Crawler tự động (GitHub Actions)
- Firebase Admin SDK

### **3. Tài liệu**
- README.md: Setup & Deploy
- API Documentation
- User Guide (screenshots)
- Báo cáo đồ án (theo yêu cầu trường)

### **4. Demo video**
- Flow sinh viên: Tìm → Xem → Ứng tuyển
- Flow employer: Đăng job → Xem CV
- Flow admin: Kiểm duyệt → Thống kê

---

## 💡 GIÁ TRỊ CỐT LÕI CỦA APP

### **So với các app khác (TopCV, VNW, viecoi):**

| Tính năng | TopCV/VNW | Viecoi.vn | **Job_4S** |
|-----------|-----------|-----------|-----------|
| Dành cho sinh viên | ❌ | ❌ | ✅ |
| Hiển thị JD đầy đủ trong app | ✅ | ✅ | ✅ |
| Tổng hợp nhiều nguồn | ❌ | ❌ | ✅ |
| Gợi ý job phù hợp | ⚠️ | ❌ | ✅ |
| Match score với profile | ❌ | ❌ | ✅ |
| Quản lý CV trong app | ✅ | ⚠️ | ✅ |
| Ứng tuyển nội bộ dễ dàng | ✅ | ✅ | ✅ |
| Không spam, ad | ❌ | ❌ | ✅ |

→ **Job_4S = TopCV/VNW cho sinh viên + Tổng hợp nhiều nguồn + Gợi ý thông minh**

---

## ⚠️ NHỮNG GÌ KHÔNG LÀM (Tránh scope creep)

❌ Chat real-time giữa candidate - employer
❌ Video interview
❌ AI resume builder phức tạp
❌ Gamification (điểm, rank...)
❌ Social features (feed, comment...)
❌ Payment gateway
❌ Employer analytics phức tạp

→ Tập trung vào **core value**: Tìm kiếm thông minh + Ứng tuyển dễ dàng

---

## 📝 CHECKLIST BẮT ĐẦU

### **Kỹ thuật:**
- [ ] Firebase project + Firestore + Storage
- [ ] Algolia account + indices
- [ ] Node.js v18+, npm, TypeScript
- [ ] React Native dev environment

### **Pháp lý:**
- [ ] Đọc robots.txt viecoi.vn ✓
- [ ] Chuẩn bị disclaimer
- [ ] Hiểu scope hợp pháp của crawling

### **Lập kế hoạch:**
- [ ] Đọc plan này kỹ
- [ ] Phân chia 7 tuần rõ ràng
- [ ] Chuẩn bị backup nếu có vấn đề

---

## 🚀 BƯỚC TIẾP THEO NGAY

**Tuần 1, Ngày 1:**
1. Setup Firebase project (10 phút)
2. Setup Algolia account (5 phút)
3. Clone repo, cd server
4. Test crawl sitemap viecoi.vn (15 phút)
5. Crawl 10 jobs đầu tiên (30 phút)

**Tuần 1, Ngày 2-3:**
- Hoàn thiện crawler (crawl 50-100 jobs)
- Normalize data
- Upsert Firestore

**Tuần 1, Ngày 4-5:**
- Sync lên Algolia
- Test search

**Tuần 1, Cuối tuần:**
- Review, fix bugs, prepare for Tuần 2

---

## 🎓 KẾT LUẬN

**Đây là plan THỰC TẾ, KHẢ THI cho đồ án sinh viên:**

✅ **Mục tiêu rõ ràng**: Sinh viên tìm việc dễ dàng hơn
✅ **Scope hợp lý**: 7 tuần, không quá phức tạp
✅ **Giá trị thật**: Tổng hợp + Gợi ý thông minh + UX tốt
✅ **Employer đơn giản**: Đăng job + Xem CV (không phức tạp)
✅ **Hợp pháp**: Crawl từ viecoi.vn (cho phép), có disclaimer
✅ **Tech stack ổn**: Firebase + Algolia + React Native

**Bạn sẵn sàng bắt đầu từ Tuần 1 chưa?** 🚀
