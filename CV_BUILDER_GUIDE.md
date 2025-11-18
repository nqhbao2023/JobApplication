# CV Builder - Hướng dẫn sử dụng

## 🎯 Tổng quan

Hệ thống **CV Builder** cho phép sinh viên tạo và quản lý CV trực tuyến ngay trên ứng dụng Job_4S. Đây là tính năng **BẮT BUỘC** trong đồ án tốt nghiệp (Mục tiêu #5).

## ✨ Tính năng chính

### 1. Quản lý nhiều CV
- Tạo và lưu trữ nhiều phiên bản CV khác nhau
- Đặt CV mặc định cho ứng tuyển
- Sao chép CV để tạo phiên bản mới
- Xóa CV không cần thiết

### 2. Tự động điền thông tin
- **Auto-fill từ Hồ sơ Sinh viên**: Tự động lấy thông tin từ Student Profile
- Tiết kiệm thời gian nhập liệu
- Đảm bảo tính nhất quán

### 3. Chỉnh sửa CV trực quan
- Giao diện collapsible sections dễ sử dụng
- **Personal Info**: Họ tên, email, số điện thoại, địa chỉ
- **Objective**: Mục tiêu nghề nghiệp
- **Education**: Học vấn (nhiều trường)
- **Skills**: Kỹ năng (tự động từ hồ sơ)
- **Experience**: Kinh nghiệm làm việc (tùy chọn)

### 4. Xuất CV sang HTML
- Xuất CV thành file HTML đẹp mắt
- Chia sẻ qua Email, WhatsApp, Zalo
- Lưu vào Files để in sau
- Mở trong trình duyệt để chuyển sang PDF

## 📁 Cấu trúc File

```
src/
├── types/
│   └── cv.types.ts              # Interfaces cho CV data
├── services/
│   ├── cv.service.ts            # CRUD operations cho CV
│   └── cvExport.service.ts      # Export CV sang HTML/PDF
app/(candidate)/
├── cvManagement.tsx             # Màn hình danh sách CV
└── cvEditor.tsx                 # Màn hình chỉnh sửa CV
```

## 🔧 Technical Stack

- **Database**: Firestore collection `cvs`
- **File System**: `expo-file-system` (Paths, File classes)
- **Sharing**: `expo-sharing` (shareAsync)
- **Navigation**: Expo Router
- **State Management**: React useState/useEffect
- **Export Method**: HTML file (compatible with Expo Go)

> ⚠️ **Expo Go Limitation**: Cannot use `react-native-html-to-pdf` vì cần native modules. Solution: Export HTML file → User opens in browser → Print to PDF.

## 🚀 Cách sử dụng (User Flow)

### Bước 1: Truy cập Quản lý CV
1. Mở drawer menu (≡)
2. Chọn "Quản lý CV" (icon: documents)

### Bước 2: Tạo CV mới
1. Nhấn nút "Tạo CV mới" (màu xanh)
2. Hệ thống tự động:
   - Lấy User Profile
   - Lấy Student Profile
   - Điền sẵn thông tin cơ bản
3. Chuyển sang màn hình chỉnh sửa

### Bước 3: Chỉnh sửa CV
1. Nhấn vào section header để mở/đóng
2. Nhập thông tin vào các trường
3. Thêm/xóa mục Education, Experience
4. Nhấn "Lưu CV" khi hoàn tất

### Bước 4: Xuất CV
**Cách 1: Từ màn hình Editor**
- Nhấn nút "Xuất CV (HTML)" (màu xanh lá)

**Cách 2: Từ màn hình Management**
- Nhấn nút "Xuất" ở CV card

**Sau khi xuất:**
1. Chọn app để chia sẻ (Gmail, Files, etc.)
2. Lưu vào Files
3. Mở file .html trong Chrome/Safari
4. Chọn Print → Save as PDF

### Bước 5: Đặt CV mặc định
- Nhấn nút "Mặc định" (icon: ⭐)
- CV này sẽ được dùng cho ứng tuyển

## 💾 Firestore Schema

```typescript
Collection: cvs
Document ID: Auto-generated

{
  id: string,
  userId: string,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  isDefault: boolean,
  personalInfo: {
    fullName: string,
    email: string,
    phone: string,
    address?: string
  },
  objective?: string,
  education: [
    {
      school: string,
      degree: string,
      major?: string,
      startDate: string,
      endDate?: string,
      gpa?: string
    }
  ],
  skills: [
    {
      categoryName: string,
      skills: [
        { name: string, levelText?: string }
      ]
    }
  ],
  experience: [
    {
      position: string,
      company: string,
      location?: string,
      startDate: string,
      endDate?: string,
      description?: string
    }
  ]
}
```

## 🎨 HTML Template

CV được xuất theo template chuyên nghiệp:
- Font: Times New Roman (chuẩn CV)
- Color scheme: Blue header (#2563eb)
- Sections có border-bottom rõ ràng
- Icons: Unicode emoji (📧📱📍)
- Print-friendly CSS
- Responsive design

## 🔒 Security Rules

Firestore rules đã được cấu hình:
```javascript
match /cvs/{cvId} {
  allow read, write: if request.auth != null 
    && request.auth.uid == resource.data.userId;
}
```

## 📱 Navigation Integration

Đã thêm vào:
- **Candidate Layout**: `_layout.tsx` (2 routes)
- **Drawer Menu**: `DrawerMenu.tsx` (1 item)
- Routes:
  - `/(candidate)/cvManagement`
  - `/(candidate)/cvEditor`

## ✅ Checklist hoàn thành

- [x] CV Types & Interfaces
- [x] CV Service (CRUD + auto-fill)
- [x] CV Export Service (HTML + Share)
- [x] CV Management Screen
- [x] CV Editor Screen
- [x] Navigation Integration
- [x] Package Installation
- [x] TypeScript compilation
- [ ] Testing trên thiết bị thật
- [ ] Testing export PDF workflow

## 🎓 Ý nghĩa cho Đồ án

### Đáp ứng yêu cầu bắt buộc:
✅ **Mục tiêu #5**: "Cho phép tạo và quản lý CV trực tuyến ngay trên ứng dụng"

### Điểm cộng khi bảo vệ:
1. **Auto-fill thông minh**: Tận dụng Student Profile đã có
2. **UX tốt**: Collapsible sections, keyboard handling
3. **Export linh hoạt**: HTML → Share → PDF
4. **Multi-CV management**: Quản lý nhiều phiên bản
5. **Default CV**: Tích hợp với job application flow

## 🐛 Known Issues & Workarounds

### Issue: Expo Go không hỗ trợ native PDF generation
- **Problem**: `react-native-html-to-pdf` cần native modules, không hoạt động với Expo Go
- **Solution**: Export HTML → Share file → User mở browser → Print to PDF
- **Benefits**: 
  - ✅ Hoạt động với Expo Go
  - ✅ Không cần eject khỏi Expo
  - ✅ Cross-platform (Android + iOS)
  - ✅ User có full control về PDF quality

### Issue: `expo-file-system` API mới
- **Problem**: API đã thay đổi, không còn `documentDirectory` string
- **Solution**: Dùng `Paths.document` và `File` class
- **Code**: `new File(Paths.document, fileName)`

### Issue: Firestore composite index
- **Problem**: Query với `where` + `orderBy` cần composite index
- **Solution**: Chỉ dùng `where`, sort ở client-side
- **Code**: 
```typescript
const cvs = snapshot.docs.map(doc => doc.data());
return cvs.sort((a, b) => timeB - timeA);
```

## 📝 Testing Checklist

### Unit Tests (Manual)
- [ ] Tạo CV mới - Auto-fill hoạt động
- [ ] Lưu CV - Data persist vào Firestore
- [ ] Load danh sách CV
- [ ] Chỉnh sửa CV - Update thành công
- [ ] Đặt default CV
- [ ] Sao chép CV
- [ ] Xóa CV (không cho xóa default)
- [ ] Export HTML
- [ ] Share file

### Integration Tests
- [ ] Auto-fill lấy đúng data từ Student Profile
- [ ] Default CV được dùng khi ứng tuyển
- [ ] HTML template render đúng tất cả sections
- [ ] File sharing hoạt động trên Android/iOS

## 🚀 Next Steps

1. **Testing**: Test trên thiết bị thật (Android + iOS)
2. **UI Polish**: Thêm loading states, animations
3. **Templates**: Thêm nhiều CV templates khác nhau
4. **PDF Direct**: Tích hợp PDF library nếu cần (react-native-pdf)
5. **Preview**: Thêm màn hình preview CV trước khi export

## 📞 Support

Nếu gặp lỗi khi sử dụng CV Builder:
1. Check Firestore rules
2. Check expo-file-system version
3. Check expo-sharing permissions
4. Xem logs: `npx expo start --clear`

---

**Completed**: CV Builder hoàn chỉnh, sẵn sàng cho thesis defense! 🎉
