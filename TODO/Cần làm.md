# 🗓️ Lộ Trình Hoàn Thành Dự Án Job_4S  
**Thời gian:** 07/11/2025 → 05/12/2025  
**Mục tiêu:** Hoàn thiện 100% dự án **trước ngày 05/12/2025** (trước hạn báo cáo 10 ngày)

---

## 🎯 Mục tiêu tổng thể
Hoàn thiện toàn bộ dự án **Job_4S (React Native + Firebase + Node.js + Express + Puppeteer/Cheerio + Algolia)** bao gồm:
- App client (Expo SDK 54)
- Backend Node.js/Express
- AI đề xuất việc làm
- Search nâng cao
- Báo cáo, video demo, file build `.apk`

---

## 🧩 Giai đoạn chi tiết

### **Tuần 1 (07/11 → 13/11)** — *Chốt client app 100%*
**Mục tiêu:** Hoàn thiện toàn bộ phần frontend (Expo)

#### ✅ Công việc
- [ ] Refactor `AddJob` thành 4 file trong `src/`
- [ ] Tạo file `src/styles/addJob.styles.ts`
- [ ] Kiểm tra toàn bộ flow:
  - Đăng nhập / Đăng ký  
  - Add Job / Apply / Hủy Apply  
  - Chat realtime  
  - Admin CRUD  
- [ ] Dọn code, fix toàn bộ warning & log  
- [ ] Di chuyển truy vấn Firestore sang `src/services/`  
- [ ] Commit milestone: **Frontend stable (Expo SDK 54)**

**Kết quả:** App client-side chạy mượt, code sạch, sẵn sàng tích hợp backend.

---

### **Tuần 2 (14/11 → 20/11)** — *Xây dựng backend Node.js + AI / Search API*
**Mục tiêu:** Có backend hoạt động thực tế

#### ✅ Công việc
- [ ] Tạo thư mục `server/` dùng **Node.js + Express**
- [ ] Viết API cơ bản:
  - `/api/jobs` (CRUD job)
  - `/api/ai/recommend` (gợi ý việc làm từ kỹ năng)
  - `/api/news` (crawler Puppeteer/Cheerio)
- [ ] Cấu hình `.env`, `cors`, `express.json()`, `nodemon`
- [ ] Deploy backend lên **Render / Railway**
- [ ] Test API bằng Postman
- [ ] Vẽ sơ đồ flow API (phục vụ báo cáo)
- [ ] Commit milestone: **Backend online (Express + AI Suggestion)**

**Kết quả:** Backend online, client có thể fetch API thành công.

---

### **Tuần 3 (21/11 → 27/11)** — *Tích hợp backend + Search engine*
**Mục tiêu:** Kết nối client và backend, thêm tìm kiếm nâng cao

#### ✅ Công việc
- [ ] Thay call Firestore trực tiếp → `jobService` gọi API
- [ ] Tạo hook `useFetchJobs` để gọi API  
- [ ] Tích hợp **Algolia / Elasticsearch**:
  - Đồng bộ job Firestore → Algolia index
  - Tạo API `/api/search?query=...`
- [ ] Test tốc độ và fix CORS
- [ ] Commit milestone: **Client-Server Integration**

**Kết quả:** App kết nối backend riêng, có tìm kiếm và gợi ý AI.

---

### **Tuần 4 (28/11 → 04/12)** — *Hoàn thiện đồ án + tài liệu*
**Mục tiêu:** Chuẩn bị báo cáo và bản build chính thức

#### ✅ Công việc
- [ ] Viết **README.md** mô tả:
  - Cấu trúc thư mục  
  - Hướng dẫn cài đặt & build  
  - Kiến trúc hệ thống  
  - Luồng dữ liệu (UML, Sequence)  
- [ ] Hoàn thiện **báo cáo Word/PDF**:
  - Giới thiệu, mục tiêu  
  - Kiến trúc tổng thể  
  - Các tính năng nổi bật (AI, Chat, Apply)  
  - Hướng phát triển  
- [ ] Quay **video demo (2–3 phút)**:
  - Add Job  
  - Apply Job  
  - Chat  
  - AI Recommend  
- [ ] Build `.apk` bằng `EAS Build`
- [ ] Commit milestone: **Release Candidate (v1.0)**

**Kết quả:** Có app build `.apk`, báo cáo, video demo hoàn chỉnh.

---

## 🗓️ Tuần dự phòng (05/12 → 10/12) — *Hoàn thiện & luyện bảo vệ*
#### ✅ Công việc
- [ ] Fix bug nhỏ, test lại toàn bộ API & app
- [ ] Chuẩn bị **slide PowerPoint (5–7 trang)**
- [ ] Luyện thuyết trình demo
- [ ] Backup toàn bộ code và tài liệu lên GitHub + Google Drive

**Kết quả:** Sẵn sàng bảo vệ đồ án trước 15/12/2025.

---

## 📈 Tiến độ tổng quan

| Giai đoạn | Thời gian | Mục tiêu đạt được |
|------------|------------|-------------------|
| Tuần 1 | 07–13/11 | Client hoàn thiện, code sạch |
| Tuần 2 | 14–20/11 | Backend Node.js hoạt động |
| Tuần 3 | 21–27/11 | Kết nối API + Search engine |
| Tuần 4 | 28/11–04/12 | Báo cáo, video, build APK |
| Dự phòng | 05–10/12 | Fix bug, luyện bảo vệ |

---

## 💡 Lưu ý & Kỷ luật làm việc
- Mỗi ngày commit ít nhất **1 lần có ý nghĩa** (feature/fix/doc).  
- Ghi rõ **tên commit**:  
  - `feat(backend): add AI recommend API`  
  - `fix(apply): prevent duplicate submission`  
- Duy trì `TODO.md` để theo dõi backlog Candidate/Employer.  
- Mỗi **Chủ nhật** → test full flow end-to-end.

---

## 🏁 Mục tiêu cuối cùng
Hoàn thành Job_4S **100% trước 05/12/2025**,  
có đầy đủ:
- ✅ App Expo build `.apk`  
- ✅ Backend Node.js + AI + Search  
- ✅ Báo cáo, sơ đồ, video demo  
- ✅ Slide thuyết trình và file backup  

→ **Sẵn sàng bảo vệ đồ án ngày 15/12/2025**.
