📊 HIỆN TRẠNG - 3 NGUỒN JOB
1. VIECOI JOBS (Crawled - External)
🌐 viecoi.vn
    ↓ crawler
📦 jobs collection
    ↓ 
🔍 Algolia index
    ↓
👨‍🎓 Candidate xem
    ↓
🌐 Redirect về viecoi.vn để apply
Đặc điểm:

source: 'viecoi'
external_url: 'https://viecoi.vn/...'
Có company_logo, company_name
Candidate KHÔNG apply trong app
Chỉ xem thông tin → Click "Ứng tuyển trên Viecoi.vn"


2. EMPLOYER JOBS (Internal - Regular)
👔 Employer tạo job
    ↓
📝 Form đăng tin (title, description, salary...)
    ↓
📦 jobs collection (source: 'internal')
    ↓
🔍 Algolia index
    ↓
👨‍🎓 Candidate xem trong feed
    ↓
📤 Apply trực tiếp (upload CV trong app)
    ↓
👔 Employer xem applications
Đặc điểm:

source: 'internal'
employerId: '...' (người đăng)
companyId: '...'
Candidate apply TRONG app
Employer xem CV trong app


3. QUICK POST JOBS (Candidate seeking work)
👨‍🎓 Candidate tạo quick post
    ↓
📝 Form ngắn gọn (tôi cần tìm việc X)
    ↓
📦 jobs collection (source: 'quick-post')
    ↓
❓ VẤN ĐỀ: Hiển thị ở đâu? Cho ai xem?
VẤN ĐỀ HIỆN TẠI:

❌ Quick post job xuất hiện trong feed của CHÍNH candidate đó
❌ Candidate thấy nút "Gửi CV" cho job của mình → VÔ LÝ
❌ Employer không thấy quick post jobs
❌ Không có CTA phù hợp


🔴 GỐC RỄ VẤN ĐỀ
Jobs Collection Schema hiện tại:
typescript{
  id: string;
  title: string;
  source: 'viecoi' | 'internal' | 'quick-post';
  employerId?: string;  // Chỉ có với internal
  // ❌ THIẾU: Không có field nào cho biết job DIRECTION
}
Vấn đề logic:

Tất cả jobs đều hiển thị cho candidate → Sai với quick-post
Không phân biệt được:

Job do employer đăng TÌM ỨNG VIÊN (employer → candidate)
Job do candidate đăng TÌM VIỆC (candidate → employer)


CTA sai:

Quick post job hiện nút "Gửi CV" → Candidate tự gửi CV cho chính mình???




✅ GIẢI PHÁP - FLOW ĐÚNG
THÊM 1 FIELD QUAN TRỌNG:
typescript{
  jobType: 'employer_seeking' | 'candidate_seeking';
  posterId: string; // UID của người đăng (dù employer hay candidate)
}
```

### **LUẬT MỚI:**
```
jobType = 'employer_seeking':
  - Employer đăng để tìm candidate
  - Hiển thị cho CANDIDATE
  - CTA: "Gửi CV" / "Apply"

jobType = 'candidate_seeking':
  - Candidate đăng để tìm employer
  - Hiển thị cho EMPLOYER
  - CTA: "Liên hệ ứng viên" / "View profile"
```

---

## 🎨 FLOW MỚI - 3 NGUỒN JOB ĐÚNG

### **1. VIECOI JOBS**
```
FLOW:
🌐 Crawl → Firestore → Algolia
         ↓
    jobType: 'employer_seeking'  ← Tự động set
    source: 'viecoi'
    posterId: null (external)
         ↓
    👨‍🎓 CANDIDATE xem trong feed
         ↓
    CTA: "Ứng tuyển trên Viecoi.vn" (redirect)
```

**HIỂN THỊ:**
- ✅ Candidate home feed
- ❌ Employer dashboard
- ❌ Candidate KHÔNG thấy nếu là người đăng (N/A)

---

### **2. EMPLOYER JOBS**
```
FLOW:
👔 Employer tạo job
         ↓
    jobType: 'employer_seeking'  ← Set khi tạo
    source: 'internal'
    posterId: employerId
    employerId: employerId
         ↓
    📦 Firestore → Algolia
         ↓
    👨‍🎓 CANDIDATE xem trong feed
         ↓
    CTA: "Gửi CV" (apply trong app)
         ↓
    📤 Application lưu vào DB
         ↓
    👔 Employer xem danh sách CV
HIỂN THỊ:

✅ Candidate home feed (tất cả candidates)
❌ Employer dashboard (chỉ xem jobs của mình trong "My Jobs")
❌ Candidate là employer đăng job KHÔNG thấy trong feed của mình

LOGIC FILTER:
javascriptif (job.posterId === currentUserId) {
  // Đây là job của mình → KHÔNG hiển thị trong feed
  // Chuyển sang "My Jobs" section
}
```

---

### **3. QUICK POST JOBS** ⭐ THAY ĐỔI LỚN
```
FLOW:
👨‍🎓 Candidate tạo quick post "Tôi cần tìm việc X"
         ↓
    jobType: 'candidate_seeking'  ← KEY CHANGE
    source: 'quick-post'
    posterId: candidateId
    employerId: null
         ↓
    📦 Firestore (KHÔNG sync Algolia?)
         ↓
    👔 EMPLOYER xem trong "Tìm ứng viên" feed
         ↓
    CTA: "Liên hệ" / "Xem profile"
         ↓
    👔 Employer click → Xem profile candidate
         ↓
    📧 Email/SMS candidate
HIỂN THỊ:

❌ Candidate home feed (KHÔNG hiển thị cho candidates khác)
❌ Candidate tạo quick post KHÔNG thấy trong feed của CHÍNH MÌNH
✅ Employer "Tìm ứng viên" section (tab riêng)
✅ Có thể search/filter

LOGIC FILTER:
javascript// Candidate feed
jobs.filter(job => 
  job.jobType === 'employer_seeking' &&  // Chỉ jobs tìm ứng viên
  job.posterId !== currentUserId          // Không phải job của mình
)

// Employer "Tìm ứng viên" feed
jobs.filter(job => 
  job.jobType === 'candidate_seeking'     // Chỉ candidate tìm việc
)
```

---

## 📱 UI/UX ĐÚNG

### **CANDIDATE HOME:**
```
┌─────────────────────────────────┐
│ 🔍 Tìm việc làm                 │
├─────────────────────────────────┤
│ 💼 Nhân viên Marketing          │  ← employer_seeking
│ 📍 TP.HCM • 💰 5M-8M            │     (viecoi hoặc internal)
│ [❤️ Lưu] [📤 Ứng tuyển]        │
├─────────────────────────────────┤
│ 💼 Frontend Developer           │  ← employer_seeking
│ 📍 Bình Dương • 💰 10M-15M     │     (internal)
│ [❤️ Lưu] [📤 Gửi CV]           │
└─────────────────────────────────┘

❌ KHÔNG có quick-post jobs ở đây
```

### **EMPLOYER DASHBOARD:**
```
┌─────────────────────────────────┐
│ TAB: [My Jobs] [Tìm ứng viên]  │
├─────────────────────────────────┤
│ 👨‍🎓 Nguyễn Văn A - Tìm việc IT│  ← candidate_seeking
│ 🎓 CNTT • 💻 React, Node.js    │     (quick-post)
│ [👁️ Xem profile] [📧 Liên hệ] │
├─────────────────────────────────┤
│ 👨‍🎓 Trần Thị B - Tìm part-time│  ← candidate_seeking
│ 🎓 Marketing • ⏰ Tối, Cuối tuần│
│ [👁️ Xem profile] [📧 Liên hệ] │
└─────────────────────────────────┘
```

### **CANDIDATE "MY QUICK POSTS":**
```
┌─────────────────────────────────┐
│ Bài đăng tìm việc của tôi       │
├─────────────────────────────────┤
│ 💼 Tìm việc Frontend Developer  │
│ 📅 Đăng 2 ngày trước            │
│ 👁️ 15 lượt xem • 3 liên hệ     │
│ [✏️ Sửa] [🗑️ Xóa]              │
└─────────────────────────────────┘

❌ Không xuất hiện trong feed chính
✅ Chỉ xem trong "My Quick Posts" section

🎯 TÓM TẮT FLOW ĐÚNG
NguồnJobTypePosterIdHiển thị choCTAViecoiemployer_seekingnullCandidate"Ứng tuyển trên Viecoi"Employeremployer_seekingemployerIdCandidate (trừ chính mình)"Gửi CV"Quick Postcandidate_seekingcandidateIdEmployer"Liên hệ" / "Xem profile"

🔧 THAY ĐỔI CẦN THIẾT
1. Database Schema:
typescript// Thêm vào Job interface
jobType: 'employer_seeking' | 'candidate_seeking';
posterId: string;
2. UI Components:
typescript// Candidate feed filter
jobs.filter(job => 
  job.jobType === 'employer_seeking' &&
  job.posterId !== currentUserId
)

// Employer "Tìm ứng viên" filter
jobs.filter(job => 
  job.jobType === 'candidate_seeking'
)

// CTA conditional
if (job.jobType === 'employer_seeking') {
  return <Button>Gửi CV</Button>;
} else {
  return <Button>Liên hệ ứng viên</Button>;
}
3. Quick Post Flow:
typescript// Khi candidate tạo quick post
const quickPostJob = {
  ...jobData,
  jobType: 'candidate_seeking',  // KEY
  source: 'quick-post',
  posterId: currentUserId,
  employerId: null,
};

✅ KẾT LUẬN
Flow đúng:

Viecoi + Employer jobs → employer_seeking → Hiển thị cho candidate
Quick post jobs → candidate_seeking → Hiển thị cho employer
Người đăng KHÔNG bao giờ thấy job của chính mình trong feed chính

Điểm mới:

Thêm jobType field để phân biệt DIRECTION
Thêm posterId thống nhất cho cả 3 nguồn
UI có 2 feed riêng biệt: "Tìm việc" (candidate) và "Tìm ứng viên" (employer)