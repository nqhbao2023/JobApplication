# Firebase Storage Permission Fix

## Vấn đề
Khi employer tạo công việc mới và thêm công ty mới với ảnh, gặp lỗi:
```
Firebase Storage: User does not have permission to access 'companies/1763798257551.jpg'. (storage/unauthorized)
```

## Nguyên nhân
Firebase Storage rules chưa cấp quyền upload cho folder `companies/` và `jobs/`.

## Giải pháp đã triển khai (Code Level)

### 1. Error Handling cho Company Image Upload
File: `src/hooks/addJob/useAddJobForm.ts`

**Trước:**
```typescript
if (newCompanyImageUri)
  companyImageUrl = await uploadImageToFirebase(newCompanyImageUri, "companies");
```

**Sau:**
```typescript
if (newCompanyImageUri) {
  try {
    companyImageUrl = await uploadImageToFirebase(newCompanyImageUri, "companies");
    console.log('✅ Company image uploaded:', companyImageUrl);
  } catch (uploadError: any) {
    console.warn('⚠️ Company image upload failed, continuing without image:', uploadError.message);
    companyImageUrl = '';
  }
}
```

### 2. Error Handling cho Job Image Upload
**Trước:**
```typescript
let jobImageUrl = formData.image;
if (formData.imageUri) jobImageUrl = await uploadImageToFirebase(formData.imageUri, "jobs");
if (!jobImageUrl) {
  Alert.alert("Thiếu ảnh", "Vui lòng cung cấp ảnh cho công việc.");
  return;
}
```

**Sau:**
```typescript
let jobImageUrl = formData.image;
if (formData.imageUri) {
  try {
    jobImageUrl = await uploadImageToFirebase(formData.imageUri, "jobs");
    console.log('✅ Job image uploaded:', jobImageUrl);
  } catch (uploadError: any) {
    console.warn('⚠️ Job image upload failed, continuing without image:', uploadError.message);
    jobImageUrl = '';
  }
}
```

### 3. Job Source Marking
Thêm field `source: 'internal'` để phân biệt employer jobs với crawled/quick-post jobs:

```typescript
const apiPayload = {
  title: formData.title.trim(),
  company: companyName,
  companyId: companyId,
  description: formData.jobDescription.trim(),
  requirements: finalRequirements,
  skills: finalSkills,
  salary: {
    min: min,
    max: max,
    currency: 'VND' as const,
  },
  location: location,
  type: mappedType,
  category: categoryName,
  status: 'active' as const,
  source: 'internal' as const, // ✅ Mark as employer-created job
  image: jobImageUrl || undefined, // ✅ Optional job image
  experience: formData.experience, // ✅ Include experience level
};
```

## Giải pháp lâu dài (Firebase Console)

### Cập nhật Firebase Storage Rules

Truy cập [Firebase Console](https://console.firebase.google.com) → Chọn project `job4s-app` → Storage → Rules

**Rules hiện tại (giả định):**
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if false; // ❌ Chặn tất cả write
    }
  }
}
```

**Rules được đề xuất:**
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Public read
    match /{allPaths=**} {
      allow read: if true;
    }
    
    // Companies folder - chỉ authenticated users mới upload được
    match /companies/{imageId} {
      allow write: if request.auth != null 
                   && request.resource.size < 5 * 1024 * 1024 // Max 5MB
                   && request.resource.contentType.matches('image/.*');
    }
    
    // Jobs folder - chỉ authenticated users mới upload được
    match /jobs/{imageId} {
      allow write: if request.auth != null 
                   && request.resource.size < 5 * 1024 * 1024 // Max 5MB
                   && request.resource.contentType.matches('image/.*');
    }
    
    // Avatars folder (nếu có)
    match /avatars/{imageId} {
      allow write: if request.auth != null 
                   && request.resource.size < 2 * 1024 * 1024 // Max 2MB
                   && request.resource.contentType.matches('image/.*');
    }
    
    // CVs folder (nếu có)
    match /cvs/{userId}/{fileName} {
      allow write: if request.auth != null 
                   && request.auth.uid == userId
                   && request.resource.size < 10 * 1024 * 1024; // Max 10MB
    }
  }
}
```

### Test Rules
Sau khi cập nhật rules, test bằng cách:
1. Đăng nhập với employer account
2. Tạo job mới với company mới
3. Upload ảnh cho company
4. Upload ảnh cho job
5. Kiểm tra console log để confirm upload thành công

## Kết quả

### Hiện tại (Code Level Fix)
- ✅ Employer có thể tạo job ngay cả khi upload ảnh thất bại
- ✅ Company được tạo với image = "" nếu upload thất bại
- ✅ Job được tạo với image = undefined nếu upload thất bại
- ✅ Job có field `source: 'internal'` để phân biệt với crawled/quick-post jobs
- ✅ Không còn crash khi gặp storage permission error
- ⚠️ Ảnh vẫn chưa upload được (cần fix Firebase rules)

### Sau khi fix Firebase Storage Rules
- ✅ Employer có thể upload ảnh cho company
- ✅ Employer có thể upload ảnh cho job
- ✅ Ảnh được validate (size < 5MB, chỉ accept image/*)
- ✅ Bảo mật: Chỉ authenticated users mới upload được

## Job Types trong hệ thống

### 1. Internal Jobs (Employer-created)
- `source: 'internal'`
- `employerId`: ID của employer tạo job
- `companyId`: ID công ty trong Firestore
- Có thể có hoặc không có image
- Full fields: title, description, requirements, skills, salary, location, type, category

### 2. Crawled Jobs (Viecoi)
- `source: 'viecoi'`
- `external_url`: Link gốc từ viecoi
- `company_name`, `company_logo`: Dữ liệu crawl
- `salary_text`: Mô tả lương dạng text
- Không có employerId (hoặc system employerId)

### 3. Quick Post Jobs
- `source: 'quick-post'`
- Minimal fields
- Được tạo nhanh từ mobile
- Có thể thiếu một số fields optional

## Lưu ý
- Tất cả 3 loại job đều có thể tồn tại trong cùng collection `jobs`
- Filter jobs theo `source` field nếu cần
- Server API (`job.service.ts`) đã handle tất cả 3 loại job
- Algolia search đã sync tất cả 3 loại job

## Monitoring
Check logs để theo dõi upload status:
```
✅ Company image uploaded: https://...  // Success
⚠️ Company image upload failed, continuing without image: ...  // Failed but handled
✅ Job image uploaded: https://...  // Success
⚠️ Job image upload failed, continuing without image: ...  // Failed but handled
📤 API Payload: {...}  // Job data sent to API
```
