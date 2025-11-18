# ✅ FIX: Jobs không hiện trong Categories & Companies

## 🔴 VẤN ĐỀ BAN ĐẦU

### Triệu chứng:
1. Nhấn vào **category** (ví dụ: "Giáo dục") → Không hiện job nào
2. Nhấn vào **company** → Không hiện job nào
3. Tổng có **34 jobs đã crawl** từ viecoi.vn

### Nguyên nhân:
Jobs crawled có cấu trúc:
```typescript
{
  title: "...",
  company_name: "Công ty ABC",  // ❌ String, không phải ID
  category: "IT/Software",       // ❌ String, không phải ID
  // THIẾU:
  // company: "company-id",      // ✅ Company ID
  // jobCategories: "it-software" // ✅ Category ID
}
```

Trong khi UI query:
```typescript
// categoryJobs.tsx
where("jobCategories", "==", categoryId)  // ❌ Field không tồn tại

// companyDescription.tsx
where("company", "==", companyId)         // ❌ Field không tồn tại
```

---

## ✅ GIẢI PHÁP ĐÃ THỰC HIỆN

### 1. Tạo Script Mapping Tự Động

**File**: `server/src/scripts/map-jobs-to-categories-companies.ts`

**Chức năng**:
- Map `category` (string) → `jobCategories` (category ID)
- Map `company_name` (string) → `company` (company ID)
- Tự động **tạo company** nếu chưa có trong database

**Kết quả**:
```
📊 Mapping Summary:
   Total jobs processed: 34
   Jobs updated: 34
   Categories matched: 34
   Companies matched: 34 (28 companies auto-created)
```

**Chạy script**:
```bash
cd server
npx ts-node src/scripts/map-jobs-to-categories-companies.ts
```

---

### 2. Fix Normalizer (Cho Crawler Mới)

**File**: `server/src/crawlers/viecoi/normalizer.ts`

**Thay đổi**:
```typescript
// ❌ Trước
interface NormalizedJob {
  category: string; // "IT/Software"
  // ...
}

function normalizeCategory(rawCategory: string): string {
  // Return string như "IT/Software"
}

// ✅ Sau
interface NormalizedJob {
  jobCategories: string; // "it-software"
  // ...
}

function normalizeCategory(rawCategory: string): string {
  // Return category ID
  if (category.includes('it')) return 'it-software';
  if (category.includes('marketing')) return 'marketing';
  // ...
  return 'other';
}
```

**Job type fix**:
```typescript
// ❌ Trước: return 'intern'
// ✅ Sau: return 'internship' (match với seeded job_types)
```

---

### 3. Fix Upsert Jobs (Auto-Create Companies)

**File**: `server/src/crawlers/viecoi/upsert-jobs.ts`

**Thêm function**:
```typescript
async function ensureCompany(companyName: string): Promise<string | null> {
  // 1. Tìm company trong DB (exact match hoặc partial match)
  // 2. Nếu không có → Tự động tạo company mới
  // 3. Return companyId
}
```

**Logic upsert**:
```typescript
async function upsertJob(job: any) {
  // Auto-create company if needed
  let companyId = null;
  if (job.company_name) {
    companyId = await ensureCompany(job.company_name);
  }
  
  const jobData = {
    ...job,
    company: companyId, // ✅ Thêm company ID
  };
  
  // Upsert job với company ID
}
```

---

## 📊 KẾT QUẢ

### Database Structure (Sau khi fix)

**Jobs Collection**:
```typescript
{
  $id: "job-123",
  title: "Nhân viên Marketing",
  company: "cong-ty-abc",           // ✅ Company ID
  company_name: "Công ty ABC",      // ✅ Giữ lại cho display
  jobCategories: "marketing",       // ✅ Category ID
  location: "TP.HCM",
  salary_text: "10-15 triệu",
  source: "viecoi",
  // ...
}
```

**Companies Collection** (Auto-generated):
```typescript
{
  $id: "cong-ty-abc",
  corp_name: "Công ty ABC",
  city: "Chưa xác định",
  nation: "Việt Nam",
  image: "https://ui-avatars.com/api/...",
  color: "#f4a261",
  source: "auto-generated", // ✅ Đánh dấu auto-created
  created_at: "2025-..."
}
```

**Categories Collection** (Seeded):
```typescript
{
  $id: "marketing",
  category_name: "Marketing / Truyền thông",
  icon: "📢"
}
```

---

## 🧪 TESTING

### Test Categories:
1. Mở app → Tab "Công việc"
2. Nhấn vào category "Marketing"
3. ✅ Phải hiện jobs có `jobCategories: "marketing"`

### Test Companies:
1. Mở app → "Danh sách công ty"
2. Nhấn vào một công ty (ví dụ: "Công ty ABC")
3. ✅ Phải hiện jobs có `company: "cong-ty-abc"`

---

## 🔄 WORKFLOW MỚI (Cho Crawler Tiếp Theo)

```bash
# 1. Crawl jobs từ viecoi.vn
npm run crawl:viecoi-jobs -- --limit 50

# 2. Normalize (tự động map category → categoryId)
npm run normalize:viecoi

# 3. Upsert (tự động tạo company nếu cần)
npm run upsert:viecoi-jobs

# 4. Sync to Algolia (optional)
npm run sync:viecoi-algolia
```

**Kết quả**: Jobs mới sẽ tự động có:
- ✅ `jobCategories`: category ID
- ✅ `company`: company ID (auto-created nếu cần)

---

## 📝 CATEGORY MAPPING

| Crawled Category | Category ID | Name |
|-----------------|-------------|------|
| IT/Software | `it-software` | IT / Phần mềm |
| Marketing/PR | `marketing` | Marketing / Truyền thông |
| Sales | `sales` | Kinh doanh / Bán hàng |
| Design | `design` | Thiết kế / Sáng tạo |
| Accounting | `finance` | Tài chính / Kế toán |
| HR | `hr` | Nhân sự / Hành chính |
| Healthcare | `healthcare` | Y tế / Dược |
| Education | `education` | Giáo dục |
| Other | `other` | Khác |

---

## 🎯 NOTES

### Employer-Posted Jobs:
- Employer tự chọn `company` từ dropdown → Đã có sẵn company ID
- Employer tự chọn `jobCategories` → Đã có sẵn category ID
- **Không cần mapping**

### Quick-Post Jobs:
- Chưa implement mapping (sẽ làm sau nếu cần)
- Có thể để `jobCategories: "other"` và `company: null`

### Auto-Generated Companies:
- Marked với `source: "auto-generated"`
- Admin có thể edit sau để cập nhật thông tin đầy đủ
- Có thể merge với companies thật sau này

---

## ✅ CHECKLIST

- [x] Script map existing jobs (34/34 jobs)
- [x] Fix normalizer để map category → categoryId
- [x] Fix upsert để auto-create companies
- [x] Test categories hiển thị jobs
- [x] Test companies hiển thị jobs
- [ ] Test crawler mới với flow đã fix
- [ ] Document workflow mới

---

**Tổng kết**: 
- ✅ 34 jobs đã có đầy đủ `company` và `jobCategories`
- ✅ 28 companies tự động được tạo
- ✅ UI categories và companies giờ sẽ hiện jobs đúng
- ✅ Crawler mới sẽ tự động map từ đầu
