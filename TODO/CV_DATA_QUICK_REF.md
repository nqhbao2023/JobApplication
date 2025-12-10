# 🚀 QUICK REFERENCE - CV DATA FEATURE

## 📝 TÓM TẮT

Tính năng cho phép candidate đính kèm CV vào Quick Post theo 3 cách:
- ✅ **Template CV** (từ CV Builder - lưu snapshot đầy đủ)
- ✅ **External Link** (Google Drive, Dropbox, etc.)
- ✅ **No CV** (không đính kèm)

## 🎯 ĐIỂM KHÁC BIỆT SO VỚI PLAN GỐC

### Plan gốc đề xuất:
```typescript
cvData: {
  type: 'pdf' | 'template';
  pdfUrl?: string;        // Upload PDF file
  cvSnapshot?: CVData;
}
```

### Thực tế triển khai:
```typescript
cvData: {
  type: 'template' | 'external' | 'none';
  cvSnapshot?: CVData;     // Template CV
  externalUrl?: string;    // External link (thay vì upload PDF)
}
```

**Lý do:**
1. ❌ Chưa có upload PDF feature trong dự án
2. ✅ Đã có CV template system hoàn chỉnh
3. ✅ External link đơn giản hơn, dễ dùng hơn
4. ✅ Backward compatible với cvUrl hiện tại

## 📂 FILES QUAN TRỌNG

| File | Mục đích | Đã làm |
|------|----------|--------|
| `src/services/quickPostApi.service.ts` | Types definition | ✅ Thêm QuickPostCVData |
| `src/components/QuickPostForm.tsx` | Candidate create | ✅ Build cvData structure |
| `server/src/services/quickpost.service.ts` | Backend validation | ✅ Validate cvData |
| `app/(employer)/findCandidates.tsx` | Employer view | ✅ CV section + viewing |
| `app/(shared)/cvPreview.tsx` | CV preview | ✅ NEW screen |

## 🔍 DEBUG CHECKLIST

### ✅ Candidate Side
- [ ] Console log khi chọn CV: `📄 CV Template attached`
- [ ] Console log khi submit: `🚀 Submitting quick post with cvData`
- [ ] cvData có trong request payload
- [ ] Backend không return error

### ✅ Backend Side
- [ ] Console log validation: `✅ Valid template CV data`
- [ ] cvData được lưu vào Firestore
- [ ] cvSnapshot có đầy đủ data (personalInfo, education, skills...)

### ✅ Employer Side
- [ ] Thấy CV section trong contact modal
- [ ] Console log khi click CV: `🔍 Opening template CV preview`
- [ ] Navigate to cvPreview screen thành công
- [ ] CV hiển thị đẹp, đầy đủ thông tin

## 🐛 COMMON ISSUES & FIXES

### Issue 1: Không thấy CV section
**Nguyên nhân:** `cvData` undefined hoặc null
**Fix:** 
```javascript
// Trong findCandidates.tsx
const cvData = (selectedCandidate as any).cvData;
console.log('DEBUG cvData:', cvData); // Should log object
```

### Issue 2: CV Preview screen trống
**Nguyên nhân:** `cvSnapshot` không được truyền đúng
**Fix:**
```javascript
// Trong QuickPostForm.tsx - check khi build cvData
console.log('CV Snapshot:', selectedCV); // Should have full data
```

### Issue 3: Backend validation error
**Nguyên nhân:** cvData structure không đúng format
**Fix:** Check console logs:
```javascript
// Expected structure
{
  type: 'template',
  cvId: 'xxx',
  cvSnapshot: { personalInfo: {...}, education: [...] },
  attachedAt: '2025-12-10T...'
}
```

### Issue 4: External link không mở
**Nguyên nhân:** URL không hợp lệ
**Fix:** URL phải bắt đầu với `http://` hoặc `https://`

## 📊 DATA FLOW

```
CANDIDATE CREATES QUICK POST
         ↓
[Select CV from Library]
         ↓
QuickPostForm builds cvData:
  - type: 'template'
  - cvSnapshot: {...full CV object...}
         ↓
Submit to backend
         ↓
Backend validates structure
         ↓
Save to Firestore jobs collection
         ↓
EMPLOYER VIEWS IN "TÌM ỨNG VIÊN"
         ↓
Click "Liên hệ" button
         ↓
Modal shows CV section
         ↓
Click CV section
         ↓
Navigate to cvPreview screen
         ↓
CVTemplateViewer displays CV beautifully
```

## 🎨 UI COMPONENTS

### QuickPostForm CV Selection UI
```
┌─────────────────────────────────┐
│ 📚 Chọn từ thư viện CV          │
│ CV đã tạo hoặc đã tải lên       │
│ [✓ Selected CV Name]            │
└─────────────────────────────────┘
```

### Employer Contact Modal CV Section
```
┌─────────────────────────────────┐
│ 📄 CV của ứng viên              │
│ Xem CV trong ứng dụng           │
│                            →    │
└─────────────────────────────────┘
```

## 🧪 TESTING FLOW

### 1. Basic Test (Template CV)
```bash
1. Login candidate
2. Create CV in CV Management
3. Create Quick Post → Select CV
4. Submit
5. Login employer
6. View "Tìm ứng viên"
7. Click "Liên hệ"
8. Click CV section
9. ✅ See beautiful CV preview
```

### 2. External Link Test
```bash
1. Login candidate
2. Create Quick Post
3. Choose "🔗 Nhập link CV"
4. Paste Google Drive link
5. Submit
6. Login employer
7. Click CV section
8. ✅ Browser opens link
```

### 3. No CV Test
```bash
1. Login candidate
2. Create Quick Post
3. Don't select any CV
4. Submit
5. Login employer
6. ✅ No CV section shown
```

## 💡 BEST PRACTICES

### For Candidates:
1. ✅ Luôn tạo CV template trước
2. ✅ Điền đầy đủ thông tin
3. ✅ Preview CV trước khi submit
4. ❌ Không nên dùng link bị expire

### For Testing:
1. ✅ Check console logs từng bước
2. ✅ Verify data trong Firestore
3. ✅ Test cả 3 loại CV
4. ✅ Test error cases

### For Debugging:
1. ✅ Tìm icon emoji trong console (📄, 🔗, ✅, ❌)
2. ✅ Check network request payload
3. ✅ Verify cvSnapshot structure
4. ✅ Test trên real device

## 🔐 VALIDATION RULES

### Template CV:
- `type` = 'template' ✅
- `cvSnapshot` required ✅
- `cvSnapshot.personalInfo` required ✅

### External Link:
- `type` = 'external' ✅
- `externalUrl` required ✅
- URL must start with http/https ✅

### No CV:
- `type` = 'none' ✅
- No other fields required ✅

## 📱 COMPATIBILITY

- ✅ iOS
- ✅ Android
- ✅ Web (Expo Web)
- ✅ Backward compatible với old cvUrl
- ✅ Type safe với TypeScript

---

**Status:** ✅ READY FOR TESTING
**Version:** 1.0.0
**Last Updated:** December 10, 2025
