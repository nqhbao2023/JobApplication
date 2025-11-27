# Fix: Employer Jobs Không Hiển Thị Ảnh

## Vấn đề
Khi employer tạo job, ở trang candidate home và job detail:
- ✅ Job hiển thị trong danh sách
- ❌ Ảnh công ty không hiển thị (blank/trống)
- ❌ Trong job description cũng không có ảnh

## Nguyên nhân

### 1. Firebase Storage Permission
- Khi upload ảnh công ty/job, gặp lỗi `storage/unauthorized`
- Firebase Storage rules chưa cho phép upload vào folder `companies/` và `jobs/`
- Đã fix bằng error handling - job vẫn tạo thành công nhưng không có ảnh

### 2. Missing Company Data
**Vấn đề chính**: Job chỉ lưu `companyId`, không có company object đầy đủ

Khi employer tạo job:
```typescript
// Server lưu job với companyId
{
  title: "Job_4S",
  companyId: "abc123",  // ✅ Có companyId
  company: "TNHH Một Minh Tui",  // String, không có image
  image: "",  // Upload failed do storage permission
  // ... other fields
}
```

Code cũ trong `getJobCompany()`:
```typescript
// ❌ Chỉ check job.company field, bỏ qua companyId
if (!job.company) return undefined;
if (typeof job.company === 'string') return companyMap[job.company]; // Không tìm thấy!
```

Kết quả:
- `getJobCompany()` trả về `undefined`
- JobCard nhận `company={undefined}`
- Không có `company.image` để hiển thị
- Fallback về placeholder nhưng placeholder cũ không đẹp

## Giải pháp đã triển khai

### ✅ 1. Update Job Type
**File**: `src/types/index.ts`

Thêm `companyId` field vào Job interface:
```typescript
export interface Job {
  // ...
  companyId?: string;   // ✅ Company ID reference (employer-created jobs)
  employerId?: string;
  // ...
}
```

### ✅ 2. Fix getJobCompany() Logic
**File**: `src/hooks/useCandidateHome.ts`

**Trước:**
```typescript
const getJobCompany = useCallback((job: Job): Company | undefined => {
  if (!job.company) return undefined;
  if (typeof job.company === 'string') return companyMap[job.company];
  if (typeof job.company === 'object' && job.company.$id) {
    return companyMap[job.company.$id];
  }
  return undefined;
}, [companyMap]);
```

**Sau:**
```typescript
const getJobCompany = useCallback((job: Job): Company | undefined => {
  // Priority 1: Try companyId field (employer-created jobs)
  if (job.companyId) {
    const company = companyMap[job.companyId];
    if (company) return company;
  }
  
  // Priority 2: Try company field (legacy)
  if (!job.company) return undefined;
  if (typeof job.company === 'string') return companyMap[job.company];
  if (typeof job.company === 'object' && job.company.$id) {
    return companyMap[job.company.$id];
  }
  
  return undefined;
}, [companyMap]);
```

### ✅ 3. Fetch Company in Job Detail
**File**: `src/hooks/useJobDescription.ts`

Thêm logic fetch company từ companyId:
```typescript
// ✅ Fetch company data from companyId (for employer-created jobs)
if (job.companyId) {
  try {
    const company = await companyApiService.getCompanyById(job.companyId);
    if (mountedRef.current) {
      setCompanyData(company);
    }
  } catch (companyError) {
    console.warn('⚠️ Could not fetch company:', companyError);
    // Continue without company data
  }
}
```

Export `companyData` từ hook để component sử dụng.

### ✅ 4. Update JobCard Image Logic
**File**: `src/components/candidate/HomeComponents.tsx`

Logic đã đúng, ưu tiên:
1. `item.company_logo` (viecoi jobs)
2. `item.image` (job image)
3. `company.image` (employer company image) ← **Bây giờ có data**
4. ui-avatars placeholder (đẹp hơn)

### ✅ 5. Update Job Description Image
**File**: `app/(shared)/jobDescription.tsx`

**Trước:**
```typescript
// Priority: company_logo (viecoi) > image > company.image > placeholder
if (job?.company_logo) return job.company_logo;
if (job?.image) return job.image;

const company = job?.company;
if (company && typeof company === 'object' && (company as any).image) {
  return (company as any).image;
}

// Placeholder xấu
return `https://via.placeholder.com/100?text=${encodeURIComponent(companyName)}`;
```

**Sau:**
```typescript
// Priority: company_logo (viecoi) > image > companyData.image > company.image > placeholder
if (job?.company_logo) return job.company_logo;
if (job?.image) return job.image;

// Check fetched company data (employer jobs) ← ✅ NEW
if (companyData?.image && 
    (companyData.image.startsWith('http://') || companyData.image.startsWith('https://'))) {
  return companyData.image;
}

// Check company object in job data
const company = job?.company;
if (company && typeof company === 'object' && (company as any).image) {
  const img = (company as any).image;
  if (img && (img.startsWith('http://') || img.startsWith('https://'))) {
    return img;
  }
}

// Fallback to ui-avatars placeholder (đẹp hơn) ← ✅ IMPROVED
const companyName = companyData?.corp_name || 
  job?.company_name || 
  (company && typeof company === 'object' ? company.corp_name : '') || 
  'Job';
return `https://ui-avatars.com/api/?name=${encodeURIComponent(companyName)}&size=200&background=4A80F0&color=fff&bold=true&format=png`;
```

## Kết quả

### ✅ Employer Jobs (source: 'internal')
- **Trang Home**: Hiển thị ảnh công ty từ `companyMap[job.companyId]`
- **Job Detail**: Fetch company data và hiển thị ảnh
- **Fallback**: Placeholder đẹp với tên công ty (ui-avatars)

### ✅ Viecoi Jobs (source: 'viecoi')
- Vẫn dùng `company_logo` field như cũ
- Không ảnh hưởng gì

### ✅ Quick Post Jobs (source: 'quick-post')
- Có thể có hoặc không có ảnh
- Fallback về placeholder

## Test Scenarios

### Test 1: Employer tạo job mới với company có ảnh
**Expected**:
- ✅ Home: Hiển thị company image
- ✅ Job Detail: Hiển thị company image
- ✅ Company name: "TNHH Một Minh Tui"

### Test 2: Employer tạo job mới với company không có ảnh
**Expected**:
- ✅ Home: Hiển thị placeholder với initial "T" (TNHH)
- ✅ Job Detail: Hiển thị placeholder với initial "T"
- ✅ Background: #4A80F0 (blue)

### Test 3: Viecoi crawled job
**Expected**:
- ✅ Home: Hiển thị company_logo từ viecoi
- ✅ Job Detail: Hiển thị company_logo
- ✅ Không bị ảnh hưởng

## Files Modified

1. ✅ `src/types/index.ts` - Added `companyId` to Job type
2. ✅ `src/hooks/useCandidateHome.ts` - Fixed `getJobCompany()` logic
3. ✅ `src/hooks/useJobDescription.ts` - Added company fetching
4. ✅ `app/(shared)/jobDescription.tsx` - Updated image display logic
5. ✅ (Existing) `src/components/candidate/HomeComponents.tsx` - JobCard logic already good

## Notes

- Placeholder sử dụng ui-avatars.com API với:
  - Size: 200x200
  - Background: #4A80F0 (app primary color)
  - Text color: white
  - Font: bold
  - Format: PNG
  
- Company data được cache trong home page (`companyMap`)
- Job detail page fetch company riêng nếu cần
- Error handling: Nếu fetch company thất bại, vẫn hiển thị placeholder

## Related Issues

- Firebase Storage Permission → See `FIREBASE_STORAGE_FIX.md`
- Job Source Marking → Jobs have `source: 'internal'` field
