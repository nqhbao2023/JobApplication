# 🔧 Quick Post Feature - Bug Fixes & Improvements

## 📅 Date: 2025-11-27 (Updated: Complete Flow Implementation)

---

## ✅ HOÀN THIỆN: QuickPostForm 2 Modes (27/11/2025)

### Vấn đề:
- Candidate nhấn nút Quick Post nhưng thấy form "Đăng tin tuyển dụng" → Không đúng logic
- Candidate cần đăng tin "Tìm việc", không phải "Tuyển dụng"

### Giải pháp:

**1. QuickPostForm nhận props `mode`:**
```typescript
type QuickPostMode = 'candidate_seeking' | 'employer_seeking';

const QuickPostForm = ({ mode = 'employer_seeking' }: QuickPostFormProps) => {
  const isCandidateSeeking = mode === 'candidate_seeking';
  // ... UI và labels thay đổi dựa theo mode
}
```

**2. UI thay đổi theo mode:**

| Element | employer_seeking | candidate_seeking |
|---------|-----------------|-------------------|
| Header | "Đăng tin tuyển dụng" | "⚡ Đăng tin tìm việc" |
| Header color | White | Green (#10b981) |
| Subtitle | "Đăng tin nhanh, không cần tài khoản" | "Tạo hồ sơ ngắn để nhà tuyển dụng có thể liên hệ với bạn" |
| Title label | "Tiêu đề" | "Vị trí mong muốn" |
| Description label | "Mô tả công việc" | "Giới thiệu bản thân" |
| Company field | Hiển thị | Ẩn |
| Location label | "Địa điểm" | "Khu vực mong muốn" |
| Submit button | "Đăng tin" (blue) | "🚀 Đăng tin tìm việc" (green) |

**3. Candidate index pass mode:**
```typescript
router.push('/(shared)/quickPost?mode=candidate_seeking');
```

**4. Icon nút Quick Post trên candidate home:**
- Đổi từ `add-circle-outline` → `flash` (icon lightning)
- Màu xanh lá `#10b981` để nhấn mạnh đây là nút đăng tin tìm việc

### Files đã sửa:
- `app/(shared)/quickPost.tsx` - Nhận `mode` từ query params
- `src/components/QuickPostForm.tsx` - Hỗ trợ 2 modes với UI riêng
- `app/(candidate)/index.tsx` - Pass `mode=candidate_seeking`, đổi icon
- `src/services/quickPostApi.service.ts` - Thêm `jobType` và `posterId` types
- `server/src/controllers/quickpost.controller.ts` - Nhận `jobType` từ frontend

---

## ✅ FIX: Glide Image Caching Error (27/11/2025)

### Vấn đề:
```
ERROR  java.lang.IllegalStateException: You can't start or clear loads in 
RequestListener or Target callbacks...
```

### Nguyên nhân:
- expo-image (Glide on Android) cố gắng load/clear image trong callback
- Xảy ra khi FlatList recycle views nhanh

### Giải pháp:
Thêm `cachePolicy` và `recyclingKey` cho expo-image:
```tsx
<Image
  source={{ uri: imageUrl }}
  cachePolicy="memory-disk"
  recyclingKey={item.$id}
/>
```

### Files đã sửa:
- `src/components/candidate/HomeComponents.tsx` - Thêm caching cho JobCard và CompanyCard

---

## 🎯 NEW: JobType & PosterId Flow (Major Architecture Fix)

### Vấn đề gốc rễ:
- Quick Post job xuất hiện trong feed của CHÍNH candidate đã tạo nó
- Candidate thấy nút "Gửi CV" cho job của mình → VÔ LÝ
- Employer không thấy quick post jobs để liên hệ ứng viên

### Giải pháp: Thêm 2 fields quan trọng

```typescript
// Job interface
{
  jobType: 'employer_seeking' | 'candidate_seeking';
  posterId: string; // UID của người đăng
}
```

### Luật mới:
| jobType | Source | Hiển thị cho | CTA |
|---------|--------|--------------|-----|
| `employer_seeking` | viecoi, internal | Candidate | "Gửi CV" |
| `candidate_seeking` | quick-post | Employer | "Liên hệ" |

### Files đã sửa:

1. **Types (Frontend & Backend)**
   - `src/types/index.ts` - Thêm `jobType` và `posterId`
   - `server/src/types/index.ts` - Thêm `jobType` và `posterId`

2. **Backend Services**
   - `server/src/controllers/quickpost.controller.ts` - Set `jobType: 'candidate_seeking'`
   - `server/src/services/quickpost.service.ts` - Set `jobType: 'candidate_seeking'`
   - `server/src/services/job.service.ts` - Set `jobType: 'employer_seeking'` và `posterId`

3. **Frontend Filtering**
   - `src/hooks/useCandidateHome.ts` - Filter ra `candidate_seeking` jobs và jobs của chính mình

4. **New Employer Page**
   - `app/(employer)/findCandidates.tsx` - ✅ NEW: Trang "Tìm ứng viên" hiển thị `candidate_seeking` jobs
   - `app/(employer)/index.tsx` - Thêm button "Tìm ứng viên"

---

## 📊 NEW Flow Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                    COMPLETE JOB FLOW                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  🏢 EMPLOYER JOBS (internal)                                     │
│  ─────────────────────────────────────────────────────           │
│  Employer tạo job                                                │
│    ↓                                                             │
│  jobType: 'employer_seeking'                                     │
│  posterId: employerId                                            │
│  source: 'internal'                                              │
│    ↓                                                             │
│  👨‍🎓 Hiển thị cho CANDIDATE (trừ chính mình)                     │
│    ↓                                                             │
│  CTA: "Gửi CV" → Apply trong app                                 │
│                                                                  │
│  🌐 VIECOI JOBS (crawled)                                        │
│  ─────────────────────────────────────────────────────           │
│  Crawler tự động                                                 │
│    ↓                                                             │
│  jobType: 'employer_seeking' (default)                           │
│  posterId: null                                                  │
│  source: 'viecoi'                                                │
│    ↓                                                             │
│  👨‍🎓 Hiển thị cho CANDIDATE                                      │
│    ↓                                                             │
│  CTA: "Ứng tuyển trên Viecoi" → Redirect external                │
│                                                                  │
│  ⚡ QUICK POST (candidate_seeking) ← NEW FLOW                    │
│  ─────────────────────────────────────────────────────           │
│  Candidate tạo Quick Post (tìm việc)                             │
│    ↓                                                             │
│  jobType: 'candidate_seeking' ← KEY CHANGE                       │
│  posterId: candidateId (nếu đăng nhập)                           │
│  source: 'quick-post'                                            │
│    ↓                                                             │
│  Admin duyệt → status: 'active'                                  │
│    ↓                                                             │
│  👔 Hiển thị cho EMPLOYER trong "Tìm ứng viên" ← NEW             │
│  ❌ KHÔNG hiển thị cho candidate feed                            │
│    ↓                                                             │
│  CTA: "Liên hệ" → Gọi điện/Zalo/Email                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🐛 Previous Bugs Fixed

### 1. **CRITICAL: Wrong Collection Query in `usePendingCounts`**

**File:** `src/hooks/useAnalyticsMetrics.ts`

**Problem:** 
- Hook was querying collection `quick_posts` which doesn't exist
- Quick posts are stored in `jobs` collection with `jobSource: 'quick-post'`

**Before:**
```typescript
const quickPostsQuery = query(
  collection(db, 'quick_posts'),  // ❌ Wrong collection
  where('status', '==', 'pending')
);
```

**After:**
```typescript
const quickPostsQuery = query(
  collection(db, 'jobs'),  // ✅ Correct collection
  where('jobSource', '==', 'quick-post'),
  where('status', '==', 'inactive')  // ✅ Correct status
);
```

**Impact:** Admin dashboard now correctly shows pending quick posts count.

---

### 2. **Status Field Mismatch**

**File:** `server/src/controllers/quickpost.controller.ts`

**Problem:**
- Controller was setting `status: 'pending'`
- Service was querying `status: 'inactive'`
- This caused newly created quick posts to not appear in admin pending list

**Before:**
```typescript
const jobData = {
  ...req.body,
  status: 'pending',  // ❌ Mismatched with service query
};
```

**After:**
```typescript
const jobData = {
  ...req.body,
  status: 'inactive',  // ✅ Synced with service
};
```

---

### 3. **Firebase Storage Permission Error** (Fixed 2025-11-27)

**Problem:**
- Quick Post không yêu cầu đăng nhập
- Firebase Storage rules yêu cầu authentication để upload
- Gây ra lỗi: `User does not have permission to access 'quick-posts/...'`

**Solution:**
- Thay đổi từ upload ảnh sang nhập link ảnh (URL)
- User có thể dán link ảnh từ Facebook, Google Photos, v.v.
- Đơn giản hơn và không cần authentication

---

## ✨ Features

### Image Support (via URL input)

Cho phép user thêm hình ảnh bằng cách nhập link URL.

**Lý do chọn URL thay vì upload:**
1. Quick Post không yêu cầu đăng nhập → Không có Firebase auth token
2. Firebase Storage rules yêu cầu authentication để upload
3. Giải pháp URL đơn giản hơn và phù hợp với tính năng "đăng nhanh"

**UI Flow:**
1. User nhấn "Thêm link ảnh minh họa"
2. Hiện input để nhập URL
3. Preview ảnh nếu URL hợp lệ
4. Có thể xóa và nhập lại

---

## 📊 Quick Post Flow Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                    QUICK POST COMPLETE FLOW                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1️⃣ USER CREATES QUICK POST (No Auth Required)                   │
│  ─────────────────────────────────────────────────────           │
│  [QuickPostForm.tsx]                                             │
│    ↓                                                             │
│  - Validates form data (title, description, contact)             │
│  - Uploads image to Firebase Storage (optional)                  │
│  - Calls POST /api/quick-posts                                   │
│    ↓                                                             │
│  [quickpost.controller.ts]                                       │
│    ↓                                                             │
│  - Extracts metadata (IP, User-Agent, timestamp)                 │
│  - Runs spam detection (keyword check, phone validation)         │
│  - If spam score >= 50 → AUTO REJECT                             │
│  - Otherwise → Save to Firestore                                 │
│    ↓                                                             │
│  [quickpost.service.ts]                                          │
│    ↓                                                             │
│  - Save to `jobs` collection with:                               │
│    • jobSource: 'quick-post'                                     │
│    • status: 'inactive' (pending review)                         │
│    • isVerified: false                                           │
│  - Send confirmation email (if email provided)                   │
│                                                                  │
│  2️⃣ ADMIN REVIEWS PENDING POSTS                                  │
│  ─────────────────────────────────────────────────────           │
│  [quick-posts-pending.tsx]                                       │
│    ↓                                                             │
│  - Calls GET /api/quick-posts/pending                            │
│  - Displays list with:                                           │
│    • Image preview                                               │
│    • Spam score badge (green/yellow/red)                         │
│    • Contact info                                                │
│    • Metadata (IP, timestamp)                                    │
│    ↓                                                             │
│  Admin Actions:                                                  │
│  ┌──────────┐    ┌──────────┐                                    │
│  │  APPROVE │    │  REJECT  │                                    │
│  └────┬─────┘    └────┬─────┘                                    │
│       ↓               ↓                                          │
│  PATCH /approve   PATCH /reject                                  │
│       ↓               ↓                                          │
│  status: 'active' DELETE from DB                                 │
│  isVerified: true                                                │
│                                                                  │
│  3️⃣ CANDIDATE VIEWS APPROVED QUICK POST                          │
│  ─────────────────────────────────────────────────────           │
│  [jobDescription.tsx]                                            │
│    ↓                                                             │
│  - Shows "⚡ Quick Post" badge                                    │
│  - Displays job image (if uploaded)                              │
│  - Shows "Liên hệ ngay" button                                   │
│    ↓                                                             │
│  Contact Options:                                                │
│  📧 Gửi CV qua Email (requires auth)                             │
│  📞 Gọi điện thoại                                               │
│  💬 Zalo                                                         │
│  📘 Facebook                                                     │
│                                                                  │
│  4️⃣ CANDIDATE APPLIES (Email Notification)                       │
│  ─────────────────────────────────────────────────────           │
│  POST /api/quick-posts/:id/notify                                │
│    ↓                                                             │
│  - Requires authentication                                       │
│  - Sends email to job poster with:                               │
│    • Candidate name, email, phone                                │
│    • CV URL (if available)                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 Files Changed

| File | Changes |
|------|---------|
| `src/hooks/useAnalyticsMetrics.ts` | Fixed collection query |
| `server/src/controllers/quickpost.controller.ts` | Fixed status value |
| `src/services/quickPostApi.service.ts` | Added image field, fixed status types |
| `src/components/QuickPostForm.tsx` | Added image picker UI & upload logic |
| `server/src/validators/quickpost.validator.ts` | Added image validation |
| `app/(admin)/quick-posts-pending.tsx` | Enhanced UI with image display |

---

## ✅ Testing Checklist

### Quick Post Creation
- [x] Create quick post without image - should work
- [x] Create quick post with image URL - should display preview
- [x] Spam detection rejects high-spam posts

### Admin Dashboard
- [x] Admin dashboard shows correct pending count
- [x] Admin can see quick post images in pending list
- [x] Admin approve works - sets status to active
- [x] Admin reject works - deletes from database

### Flow Separation (NEW) ✅ MIGRATED
- [x] Candidate feed does NOT show `candidate_seeking` jobs (quick-posts)
- [x] Candidate feed does NOT show jobs created by themselves
- [x] Employer "Tìm ứng viên" shows only `candidate_seeking` jobs
- [x] CTA for quick-post is "Liên hệ" (not "Gửi CV")

### Contact & Apply
- [x] Contact options work (phone, zalo, email)
- [x] Email notification sent when candidate applies

### Migration Status ✅ COMPLETED
- [x] Migration script created: `server/src/scripts/migrate-job-types.ts`
- [x] Migration executed: 39 jobs updated
  - 38 jobs → `employer_seeking`
  - 1 job → `candidate_seeking`
  - 1 internal job with posterId: `YX5X4PdgVcOQFvEIagMctvApUEg1`

---

## ⚠️ Lưu ý về dữ liệu cũ (Migration)

Jobs đã tồn tại trong database sẽ **KHÔNG có `jobType` hoặc `posterId`**. 

### Backward Compatibility:
- Jobs không có `jobType` → Vẫn hiển thị trong candidate feed (mặc định = employer_seeking)
- Chỉ jobs mới tạo sau này mới có `jobType` field

### Migration Script (Optional):
Nếu cần update jobs cũ:
```javascript
// Run in Firebase console or migration script
const batch = db.batch();
const jobs = await db.collection('jobs').get();

jobs.docs.forEach(doc => {
  const data = doc.data();
  const updates = {};
  
  // Set jobType based on source
  if (data.source === 'quick-post' || data.jobSource === 'quick-post') {
    updates.jobType = 'candidate_seeking';
    updates.posterId = data.posterId || data.employerId || null;
  } else {
    updates.jobType = 'employer_seeking';
    updates.posterId = data.employerId || data.ownerId || null;
  }
  
  batch.update(doc.ref, updates);
});

await batch.commit();
```

---

## 🔮 Future Improvements

1. ~~**Notification to poster** - Send email when post is approved/rejected~~ ✅ DONE (27/11/2025)
2. **Add validation middleware** - Use Joi validator in routes
3. **Image compression** - Compress before upload for faster loading
4. **Multiple images** - Allow users to add multiple images
5. **Edit quick post** - Allow poster to edit before approval

---

## 📧 Email Notifications (NEW - 27/11/2025)

### Khi Quick Post được tạo:
- ✅ Email xác nhận gửi cho poster
- Template: `sendQuickPostConfirmation()`

### Khi Admin duyệt:
- ✅ Email thông báo "Tin đã được duyệt!"
- Template: `sendQuickPostApproved()`

### Khi Admin từ chối:
- ✅ Email thông báo với lý do
- Admin có thể nhập lý do (Alert.prompt)
- Template: `sendQuickPostRejected(reason)`

### Files thay đổi:
- `server/src/services/email.service.ts` - Thêm `sendQuickPostApproved()` và `sendQuickPostRejected()`
- `server/src/services/quickpost.service.ts` - Gọi email khi approve/reject
- `app/(admin)/quick-posts-pending.tsx` - Admin nhập lý do từ chối
