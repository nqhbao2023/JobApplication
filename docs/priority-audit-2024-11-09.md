# Backend/API Migration Audit — 2024-11-09

## Priority 1 status

### 1. Auth & role foundation (✅ hoàn tất)
- `AuthContext`, `RoleContext` và `utils/roles` đã chuyển sang gọi REST API (`userApiService`) để đồng bộ profile, refresh token claim và cache role trong AsyncStorage.【F:src/contexts/AuthContext.tsx†L30-L119】【F:src/contexts/RoleContext.tsx†L25-L103】【F:src/utils/roles.ts†L1-L38】
- Service backend cho profile/saved jobs hoạt động ổn định (validate chuẩn, enrich dữ liệu job).【F:server/src/services/user.service.ts†L76-L148】【F:server/src/services/savedJob.service.ts†L27-L121】

### 2. Candidate flows (đã làm một phần)
- Màn `appliedJob` và `savedJobs` đang dùng `applicationApiService` & `savedJobApiService` để lấy danh sách từ backend, đồng bộ job payload khi render UI.【F:app/(candidate)/appliedJob.tsx†L1-L154】【F:app/(candidate)/savedJobs.tsx†L1-L200】
- `useCandidateHome` đã gom dữ liệu job, company, category, notification count qua API; profile gọi `/users/me` để đồng bộ claim.【F:src/hooks/useCandidateHome.ts†L1-L200】
- **Còn thiếu**: `useJobDescription`, `useJobStatus`, màn `person`, `Notifications`, quy trình apply/cancel job vẫn truy vấn Firestore trực tiếp nên chưa tách khỏi client SDK.【F:src/hooks/useJobDescription.ts†L1-L303】【F:src/hooks/useJobStatus.ts†L1-L73】【F:app/(shared)/person.tsx†L1-L200】【F:app/(shared)/Notifications.tsx†L1-L156】
- **Việc cần làm ngay**: 
  1. Viết hook/service mới dùng API cho chi tiết job + apply/cancel/save (hoặc mở rộng endpoint nếu thiếu).
  2. Refactor `useJobStatus` để dùng `/api/saved-jobs` thay vì `saved_jobs` collection.
  3. Chuyển màn `person` sang gọi `/users/me` + API cập nhật profile (đẩy logic đổi email/phone lên server để audit/validation tốt hơn).

### 3. Employer flows (chưa bắt đầu)
- `app/(employer)/myJobs.tsx` vẫn query thẳng Firestore (`jobs`, deleteDoc) nên chưa đi qua layer Express.【F:app/(employer)/myJobs.tsx†L1-L168】
- Cần chuyển toàn bộ CRUD job của employer sang `jobApiService` + bổ sung endpoint update/delete nếu thiếu (đảm bảo sync với saved/applications service). 

## Lỗi nghiêm trọng cần xử lý
1. **Bootstrap user ghi đè savedJobIds** – `userService.upsertCurrentUser` luôn set `savedJobIds: []` khi merge, làm mất danh sách job đã lưu mỗi lần người dùng login hoặc cập nhật hồ sơ. Cần bỏ trường này khỏi `baseData` hoặc merge sâu thay vì overwrite.【F:server/src/services/user.service.ts†L117-L134】
2. **`refresh()` của `useJobDescription` không nạp lại dữ liệu** – `loadJobData` trả về ngay khi `jobData` đã tồn tại (`if (!jobId || jobData) return;`) nên pull-to-refresh và focus reload không hoạt động; hook cũng vẫn đọc/ghi Firestore trực tiếp (không qua API) và tự xoá/tạo doc trong collection client, dễ gây conflict với backend mới.【F:src/hooks/useJobDescription.ts†L39-L259】

## Đề xuất tối ưu UX/UI cấp bách
1. **Hồ sơ cá nhân (`app/(shared)/person.tsx`)**
   - Giao diện dạng ScrollView dài với nhiều Alert, thiếu trạng thái loading/error rõ ràng, thao tác cập nhật dùng trực tiếp Firebase nên khó kiểm soát validation.【F:app/(shared)/person.tsx†L1-L200】
   - Đề xuất: tách form thành card (Thông tin cá nhân, Bảo mật, CV), dùng modal chuẩn với state có validation, hiển thị avatar skeleton & trạng thái upload, chuyển toàn bộ submit qua API (backend xử lý cập nhật + audit).

2. **Thông báo (`app/(shared)/Notifications.tsx`)**
   - Danh sách render thuần tuý, không có empty state sinh động, không có phân nhóm theo ngày, và gọi `router.push('/jobDescription?...')` sai segment dễ lỗi deep link.【F:app/(shared)/Notifications.tsx†L1-L156】
   - Đề xuất: dùng SectionList group theo ngày, thêm badge trạng thái đọc, bottom sheet hành động, và sử dụng `notificationApiService` + `router.push({ pathname: '/(shared)/jobDescription', params: { jobId } })` để đồng bộ trải nghiệm và tránh lỗi.

3. **Employer My Jobs (`app/(employer)/myJobs.tsx`)**
   - Card danh sách chưa có trạng thái analytics (số CV, lượt xem), thiếu button chỉnh sửa, chưa có skeleton khi tải; thao tác delete trực tiếp Firestore không rollback nếu backend thất bại.【F:app/(employer)/myJobs.tsx†L1-L168】
   - Đề xuất: thay bằng màn hình sử dụng API `/api/jobs` (có pagination), hiển thị thống kê (applicantCount từ backend), thêm slide actions (edit/close), và confirm dialog thân thiện hơn.

