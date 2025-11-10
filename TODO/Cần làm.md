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
-----------------------------------------------
Vấn đề chưa khắc phục ở tuần 1:
Mô tả vấn đề
Ứng dụng đang ở trạng thái “nửa vời”: phần server Express + service layer đã dựng, nhưng phần lớn màn hình React Native và context vẫn gọi thẳng Firestore client SDK, làm gián đoạn mục tiêu chuẩn hóa API và tách backend riêng.

Giải pháp (ưu tiên)

Ưu tiên 1 – Chuẩn hóa lớp nền tảng người dùng: thay AuthContext, RoleContext, utils/roles và mọi logic xác thực/sync hồ sơ đang đọc/ghi Firestore trực tiếp bằng lời gọi API (sign-in/up, role sync).
Ưu tiên 1 – Candidate flows: chuyển các màn AppliedJob, SavedJobs, Person profile, Job detail/shared hook sang gọi applicationApiService, jobApiService, notificationApiService thay vì firebase/firestore (đồng bộ với service layer hiện có).
Ưu tiên 1 – Employer flows: refactor màn Applications, MyJobs, job management để dùng API /api/applications, /api/jobs (server đã hỗ trợ) thay vì truy vấn collections trực tiếp.
Ưu tiên 2 – Admin portal: chuyển các màn quản trị (job-create, job-categories, users, analytics…) sang API; bổ sung endpoint tương ứng nếu thiếu.
Ưu tiên 2 – Shared utilities & hooks: chuẩn hóa các hook (useFirestoreCollection, useJobStatus, scripts seeding) để đọc qua backend (REST hoặc batch endpoints) nhằm loại bỏ phụ thuộc Firestore client trong app code.
Ưu tiên 3 – Background scripts & automation: cập nhật script seeding, notification cleanup để gọi API hoặc chuyển sang chạy ở server (Cloud Task/cron) tránh dùng SDK trực tiếp trong môi trường client.
Giải thích (đã làm & lý do giữ lại)

Backend Express đã dựng với middleware bảo mật, CORS, và route cấu trúc chuẩn, nên có nền tảng để chuyển front-end sang dùng API.
Service layer cho jobs, notifications, applications, v.v. đã tồn tại, thao tác với Firestore Admin – chỉ cần expose thêm endpoint khi refactor front-end.
Front-end có apiClient (axios + interceptor) và các service wrapper (jobApiService, applicationApiService, notificationApiService) đã sẵn sàng; một số hook như useCandidateHome đã bắt đầu dùng API cho jobs/categories/notifications (cần hoàn thiện nốt phần user profile).
2 câu hỏi học tập

Tại sao nên chuyển mọi truy cập Firestore ở client sang gọi API Gateway trong bối cảnh cần kiểm soát phân quyền và audit?
Khi refactor một màn hình từ Firestore SDK sang REST API, bạn sẽ thiết kế interface dữ liệu và xử lý lỗi thế nào để không phá vỡ UX hiện tại?
Vị trí chèn mã / cách tích hợp

Refactor context & hooks trong src/contexts, src/hooks, src/utils.
Thay thế logic màn hình trong app/(candidate), app/(employer), app/(shared), app/(admin) bằng lời gọi service API tương ứng.
Nếu thiếu endpoint, bổ sung controller/service/route trong server/src/controllers, server/src/services, server/src/routes.
Định hướng bước tiếp theo

Bắt đầu với AuthContext + RoleContext vì ảnh hưởng toàn ứng dụng, sau đó xử lý các luồng candidate/employer quan trọng nhất, cuối cùng mới dọn dẹp admin & scripts. Việc này đảm bảo mọi người dùng đi qua API thống nhất trước khi mở rộng thêm tính năng.
Mục tiêu dài hạn

Hoàn toàn loại bỏ Firestore client SDK khỏi ứng dụng di động, chuẩn hóa mọi truy cập dữ liệu qua backend Node/Express để dễ kiểm soát bảo mật, logging, và mở rộng các dịch vụ AI/ElasticSearch sau này.