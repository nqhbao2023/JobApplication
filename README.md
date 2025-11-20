# 🚀 Job4S - Ứng Dụng Tìm Việc Thông Minh Cho Sinh Viên

> **Dự án tốt nghiệp**: Ứng dụng tìm việc part-time/full-time dành riêng cho sinh viên  
> **Công nghệ**: React Native + Firebase + AI (Google Gemini)  
> **Năm**: 2025

---

## 📌 GIỚI THIỆU

**Job4S** là ứng dụng tìm việc được thiết kế đặc biệt cho sinh viên Việt Nam, giúp:
- ✅ Tìm việc part-time phù hợp với lịch học
- ✅ Lọc công việc theo khoảng cách GPS (gần trường, gần nhà)
- ✅ Xây dựng CV chuyên nghiệp không cần kinh nghiệm
- ✅ Nhận gợi ý việc làm thông minh từ AI
- ✅ Chatbot AI hỗ trợ 24/7

---

## 🎯 TÍNH NĂNG NỔI BẬT

### **1. Hệ Thống AI Thông Minh (5 Tính Năng)**
- 🤖 **AI Chatbot 24/7**: Trả lời mọi câu hỏi về tìm việc, viết CV, lương...
- 🎯 **AI Gợi Ý Job**: Phân tích kỹ năng và đề xuất công việc phù hợp
- 📊 **AI Phân Tích CV**: Cho điểm CV và gợi ý cải thiện
- 💰 **AI Dự Đoán Lương**: Ước tính mức lương dựa trên ngành/vị trí
- 🏷️ **AI Phân Loại Job**: Tự động categorize công việc mới

### **2. Filter Thông Minh Cho Sinh Viên**
- 📅 **Lọc theo lịch học**: Chọn ngày rảnh (T2, T4, T6...)
- 📍 **Lọc theo khoảng cách**: GPS-based (gần trường/nhà)
- ⏰ **Lọc theo ca làm**: Sáng, chiều, tối, cuối tuần
- 💵 **Lọc theo lương**: Mức lương tối thiểu mong muốn

### **3. Quick Post - Đăng Tin Nhanh**
- Không cần tạo tài khoản
- Admin duyệt trước khi hiển thị
- Phát hiện spam tự động
- Email thông báo khi có ứng viên

### **4. CV Builder Thông Minh**
- Template dành riêng cho sinh viên
- Tự động điền từ profile
- Xuất PDF chuyên nghiệp
- Lưu nhiều phiên bản CV

### **5. Crawler Tự Động**
- Lấy job từ viecoi.vn
- AI tự động phân loại
- Update mỗi 6 tiếng

---

## 🛠️ CÔNG NGHỆ SỬ DỤNG

### **Frontend (Mobile)**
- React Native + Expo
- TypeScript
- Expo Router (File-based routing)
- Firebase Authentication

### **Backend**
- Node.js + Express
- Firebase Admin SDK
- Algolia Search
- Google Gemini AI

### **Database & Storage**
- Firebase Firestore
- Firebase Storage
- Algolia (Search Index)

---

## 📂 CẤU TRÚC DỰ ÁN

```
JobApplication/
├── app/                          # React Native app (Expo Router)
│   ├── (admin)/                  # Admin panel screens
│   ├── (candidate)/              # Candidate screens
│   ├── (employer)/               # Employer screens
│   ├── (shared)/                 # Shared screens
│   │   └── ai-assistant.tsx      # 🆕 AI Chatbot UI
│   └── _layout.tsx
│
├── server/                       # Backend API
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── ai.controller.ts      # 🆕 AI endpoints
│   │   │   └── quickpost.controller.ts
│   │   ├── services/
│   │   │   ├── ai.service.ts         # 🆕 AI core logic
│   │   │   └── email.service.ts      # 🆕 Email service
│   │   ├── routes/
│   │   │   └── ai.routes.ts          # 🆕 AI routes
│   │   └── crawlers/
│   │       └── viecoi/               # Auto crawler
│   └── package.json
│
├── src/                          # Shared frontend code
│   ├── components/               # Reusable components
│   ├── services/
│   │   └── aiApi.service.ts      # 🆕 AI API client
│   ├── hooks/
│   └── utils/
│
├── TIEN_DO_DU_AN.md             # 🆕 Tài liệu tiến độ chi tiết
└── README.md                     # File này
```

---

## 🚀 HƯỚNG DẪN CHẠY DỰ ÁN

### **1. Cài Đặt Dependencies**
```bash
# Frontend
npm install

# Backend
cd server
npm install
```

### **2. Cấu Hình Environment**
Tạo file `server/.env`:
```bash
# Firebase
FIREBASE_SERVICE_ACCOUNT=path/to/serviceAccountKey.json

# Google Gemini AI
AI_API_KEY=your-gemini-api-key
AI_API_URL=https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent

# Email (Gmail SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Algolia Search
ALGOLIA_APP_ID=your-app-id
ALGOLIA_API_KEY=your-api-key
```

### **3. Chạy Backend**
```bash
cd server
npm run dev
# Server chạy tại http://localhost:3000
```

### **4. Chạy Frontend**
```bash
npm start
# Chọn Android/iOS/Web
```

### **5. Test AI Features**
```bash
# Test AI Chatbot
POST http://localhost:3000/api/ai/ask
Body: { "prompt": "Cách viết CV tốt?" }

# Test AI Phân Tích CV
POST http://localhost:3000/api/ai/analyze-cv
Body: { "education": "...", "skills": [...] }

# Test AI Dự Đoán Lương
POST http://localhost:3000/api/ai/predict-salary
Body: { "category": "F&B", "type": "part-time", "location": "HCM" }
```

---

## 📊 TIẾN ĐỘ DỰ ÁN

**Xem chi tiết**: [`TIEN_DO_DU_AN.md`](./TIEN_DO_DU_AN.md)

**Tóm tắt**:
- ✅ Backend API: 90%
- ✅ Frontend Mobile: 85%
- ✅ AI Features: 100% (5/5 tính năng)
- ✅ Crawler: 90%
- ⏳ Auto-schedule: 50%

---

## 🎓 BẢO VỆ ĐỒ ÁN

### **Điểm Mạnh Của Dự Án**
1. **Focus vào sinh viên**: Filter theo lịch học, khoảng cách GPS
2. **AI thực tế**: 5 tính năng AI cụ thể, không chỉ lý thuyết
3. **Data thật**: Crawler viecoi.vn + Quick Post
4. **UX tốt**: Design thân thiện, dễ dùng

### **Demo Flow**
1. Mở app → Thấy nút AI tròn màu tím
2. Click vào → Chat với AI về viết CV
3. Xem danh sách jobs → Có match score %
4. Apply job Quick Post → Email tự động gửi

### **Khác Biệt So Với TopCV/VietnamWorks**
- TopCV/VietnamWorks: Cho người đi làm
- Job4S: Dành riêng sinh viên part-time
- Filter theo lịch học (độc quyền)
- GPS-based (job gần trường)
- AI Chatbot 24/7

---

## 📞 LIÊN HỆ

- **Email**: [your-email]
- **GitHub**: [your-github]
- **Phone**: [your-phone]

---

## 📜 LICENSE

MIT License - Dự án tốt nghiệp 2025

---

**🎉 Chúc bạn bảo vệ thành công!**
