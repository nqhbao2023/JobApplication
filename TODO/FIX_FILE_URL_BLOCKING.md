# Fix: Support Both Template CV and Uploaded CV with file:/// URL Protection

## Vấn đề

Ứng dụng bị lỗi nghiêm trọng khi cố gắng xem CV ở trang ứng viên/chi tiết ứng tuyển:

```
ERROR ❌ BLOCKED: Attempt to open file:/// URL - This should NEVER reach WebView!
```

**Nguyên nhân:** Dữ liệu cũ trong Firestore có chứa `cv_url` với giá trị local file path (`file:///data/user/0/...`) thay vì Firebase Storage URL hợp lệ.

**Yêu cầu:**
1. ✅ Candidate có thể nộp **CV template** (đã chỉnh sửa, KHÔNG CẦN xuất PDF)
2. ✅ Candidate có thể nộp **CV upload** (file PDF/DOC)
3. ✅ Employer có thể xem cả 2 loại CV (không nhất thiết tải về)
4. ❌ Block `file:///` URLs chỉ cho uploaded CVs (không block template CVs)

## Giải pháp đã implement

### 1. Hỗ trợ nộp CV Template không cần PDF (submit.tsx)

**File: `app/(shared)/submit.tsx`**

**Logic:**
- CV từ library (template): Cho phép nộp KHÔNG CẦN PDF URL
  - Lưu `cv_id`, `cv_source='library'` vào Firestore
  - Employer sẽ xem qua CVTemplateViewer dựa vào `cv_id`
- CV upload (PDF/DOC): Phải có Firebase Storage URL hợp lệ
  - Block nếu URL là `file:///`
  - Upload lên Firebase Storage và lấy download URL

**Code change:**
```typescript
// Template CVs: URL optional (can view via CVTemplateViewer using cvId)
// Uploaded CVs: URL required and must be valid Firebase Storage URL
if (selectedCV.type === 'uploaded' && cvUrl) {
  if (cvUrl.startsWith('file:///')) {
    // Block invalid file:/// URLs
    return null;
  }
}
// Return cvUrl if available, or null for templates
return cvUrl || null;
```

### 2. Xem CV với ưu tiên Template CV trước (Application.tsx, applicationDetail.tsx)

**Priority Order:**
1. **CV từ library** (có `cvId` + `cv_source='library'`)
   - Fetch từ Firestore collection `cvs` 
   - Hiển thị qua CVTemplateViewer
   
2. **CV upload** (có `cvUrl`)
   - Nếu có `cvUrl` và là `file:///` → Block + Alert
   - Nếu có `cvUrl` hợp lệ → Hiển thị qua CVViewer (WebView PDF)
   
3. **Fallback từ candidate profile**
   - Tìm `cvId` từ candidate's user document
   - Fetch và hiển thị template

**Code changes:**
- `Application.tsx`: Priority cvId → cvUrl (with file:/// check)
- `applicationDetail.tsx`: Priority cvId → cvUrl (with file:/// check)
- `candidateProfile.tsx`: Priority cvData → cvUrl (with file:/// check)
- `findCandidates.tsx`: Priority cvData → cvUrl (with file:/// check)

### 3. Block file:/// URLs chỉ cho Uploaded CVs

**Logic:**
- **Template CVs**: KHÔNG check `file:///` vì dùng `cvId` (không cần URL)
- **Uploaded CVs**: Check `file:///` và block nếu phát hiện

**Implementation:**
```typescript
// ONLY block file:/// for uploaded CVs (when no cvId)
if (finalUrl && finalUrl.startsWith('file:///')) {
  Alert.alert('CV chứa đường dẫn file nội bộ không hợp lệ...');
  return;
}
```

### 4. Migration Script (Optional - chỉ dùng khi cần clean up)

**File: `scripts/clean-file-urls.js`**

Script này **KHÔNG NÊN CHẠY** vì:
- Template CVs không cần PDF URL (dùng cvId)
- Chỉ nên clean up khi có dữ liệu uploaded CV bị lưu sai `file:///`

## Kết quả

### ✅ Đã fix
1. **Hỗ trợ CV Template** - Candidate nộp CV template KHÔNG CẦN xuất PDF
2. **Hỗ trợ CV Upload** - Candidate upload file PDF/DOC bình thường
3. **Xem CV linh hoạt** - Employer xem cả 2 loại CV:
   - Template CV → CVTemplateViewer (render từ CVData)
   - Upload CV → CVViewer (WebView PDF)
4. **Block file:/// URLs** - Chỉ block cho uploaded CVs, không ảnh hưởng template CVs

### 📊 Flow hoàn chỉnh

#### Candidate nộp CV:
1. Chọn CV từ library → Nộp luôn (không cần PDF)
   - Firestore: `cv_id`, `cv_source='library'`, `cv_url=null`
   
2. Upload file PDF → Upload lên Storage → Nộp
   - Firestore: `cv_url='https://...'`, `cv_source='upload'`

#### Employer xem CV:
1. Load application → Check `cv_id` + `cv_source`
   - Nếu `library` → Fetch từ `cvs` collection → CVTemplateViewer
   - Nếu `upload` → Check `cv_url`:
     - Hợp lệ → CVViewer
     - `file:///` → Alert error

### 🔍 Test Cases

1. ✅ Nộp CV template (không PDF) → Success
2. ✅ Xem CV template → CVTemplateViewer hiển thị
3. ✅ Nộp CV upload (PDF valid) → Success
4. ✅ Xem CV upload (PDF valid) → CVViewer hiển thị
5. ✅ Xem CV upload có `file:///` URL → Alert error, không crash
6. ✅ Xem CV template (dù có `file:///` trong data cũ) → Ignore URL, dùng cvId

## Files thay đổi

```
Modified:
- app/(shared)/submit.tsx (Allow template CV without PDF)
- src/components/Application.tsx (Priority cvId → cvUrl with file:/// check)
- app/(employer)/applicationDetail.tsx (Priority cvId → cvUrl with file:/// check)
- app/(shared)/candidateProfile.tsx (Priority cvData → cvUrl with file:/// check)
- app/(employer)/findCandidates.tsx (Priority cvData → cvUrl with file:/// check)

Created:
- scripts/clean-file-urls.js (Optional migration - NOT recommended)
- TODO/FIX_FILE_URL_BLOCKING.md (This doc)

Updated:
- scripts/README.md
```

## Notes

- ✅ CV Template: Dùng `cvId` để fetch từ Firestore → Không cần PDF URL
- ✅ CV Upload: Dùng `cvUrl` từ Firebase Storage → Phải là HTTPS URL
- ❌ `file:///` URLs: Chỉ block cho uploaded CVs, không ảnh hưởng template CVs
- 🔄 Migration script: **KHÔNG NÊN CHẠY** - app đã xử lý gracefully

## Related Issues

- Fixes: "BLOCKED: Attempt to open file:/// URL" error for uploaded CVs
- Supports: Template CV submission without PDF export
- Prevents: WebView security vulnerabilities from local file access
- Improves: Data integrity and user experience
