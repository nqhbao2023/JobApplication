# MÔ TẢ CƠ SỞ DỮ LIỆU - ỨNG DỤNG JOB4S

## Tổng quan

Hệ thống sử dụng **Firebase Firestore** (NoSQL Database) với 12 collections chính.

---

## Bảng 3.1: Mô tả bảng người dùng (users)

| STT | Tên Trường | Kiểu | Mô tả |
|-----|------------|------|-------|
| 1 | uid | String | Mã người dùng (Firebase Auth UID) |
| 2 | email | String | Email đăng nhập |
| 3 | name | String | Tên hiển thị |
| 4 | phone | String | Số điện thoại |
| 5 | role | String | Vai trò: "candidate", "employer", "admin" |
| 6 | photoURL | String | URL ảnh đại diện |
| 7 | studentProfile | Map | Thông tin hồ sơ sinh viên (object lồng) |
| 8 | createdAt | Timestamp | Ngày tạo tài khoản |
| 9 | updatedAt | Timestamp | Ngày cập nhật gần nhất |

---

## Bảng 3.2: Mô tả bảng công việc (jobs)

| STT | Tên Trường | Kiểu | Mô tả |
|-----|------------|------|-------|
| 1 | id | String | Mã công việc (Document ID) |
| 2 | title | String | Tiêu đề công việc |
| 3 | description | String | Mô tả chi tiết công việc |
| 4 | location | String | Địa điểm làm việc |
| 5 | source | String | Nguồn tin: "internal", "viecoi", "quick-post" |
| 6 | jobType | String | Loại: "employer_seeking", "candidate_seeking" |
| 7 | status | String | Trạng thái: "active", "inactive", "pending", "closed" |
| 8 | companyId | String | Mã công ty (tham chiếu companies.id) |
| 9 | employerId | String | Mã nhà tuyển dụng (tham chiếu users.uid) |
| 10 | posterId | String | Mã người đăng (tham chiếu users.uid) |
| 11 | category | String | Danh mục công việc |
| 12 | salary_text | String | Mức lương hiển thị (text) |
| 13 | salary_min | Number | Lương tối thiểu |
| 14 | salary_max | Number | Lương tối đa |
| 15 | requirements | Array | Danh sách yêu cầu công việc |
| 16 | benefits | Array | Danh sách quyền lợi |
| 17 | contactInfo | Map | Thông tin liên hệ: {phone, email, zalo} |
| 18 | viewCount | Number | Số lượt xem |
| 19 | applicantCount | Number | Số lượng ứng viên |
| 20 | isVerified | Boolean | Trạng thái đã duyệt |
| 21 | createdAt | Timestamp | Ngày tạo |
| 22 | updatedAt | Timestamp | Ngày cập nhật |

---

## Bảng 3.3: Mô tả bảng đơn ứng tuyển (applications)

| STT | Tên Trường | Kiểu | Mô tả |
|-----|------------|------|-------|
| 1 | id | String | Mã đơn ứng tuyển (Document ID) |
| 2 | jobId | String | Mã công việc (tham chiếu jobs.id) |
| 3 | candidateId | String | Mã ứng viên (tham chiếu users.uid) |
| 4 | employerId | String | Mã nhà tuyển dụng (tham chiếu users.uid) |
| 5 | cvUrl | String | URL file CV |
| 6 | coverLetter | String | Thư xin việc |
| 7 | status | String | Trạng thái: "pending", "accepted", "rejected" |
| 8 | appliedAt | Timestamp | Ngày nộp đơn |
| 9 | updatedAt | Timestamp | Ngày cập nhật |

---

## Bảng 3.4: Mô tả bảng theo dõi ứng tuyển (applied_jobs)

| STT | Tên Trường | Kiểu | Mô tả |
|-----|------------|------|-------|
| 1 | id | String | Mã bản ghi (Document ID) |
| 2 | userId | String | Mã ứng viên (tham chiếu users.uid) |
| 3 | jobId | String | Mã công việc (tham chiếu jobs.id) |
| 4 | employerId | String | Mã nhà tuyển dụng |
| 5 | jobInfo | Map | Thông tin công việc: {title, company, salary} |
| 6 | userInfo | Map | Thông tin ứng viên: {name, email, photoURL} |
| 7 | cv_url | String | URL file CV |
| 8 | cv_path | String | Đường dẫn lưu trữ CV |
| 9 | cv_uploaded | Boolean | Trạng thái đã upload CV |
| 10 | status | String | Trạng thái ứng tuyển |
| 11 | applied_at | Timestamp | Ngày ứng tuyển |
| 12 | updated_at | Timestamp | Ngày cập nhật |

---

## Bảng 3.5: Mô tả bảng công ty (companies)

| STT | Tên Trường | Kiểu | Mô tả |
|-----|------------|------|-------|
| 1 | id | String | Mã công ty (Document ID) |
| 2 | corp_name | String | Tên công ty |
| 3 | corp_description | String | Mô tả công ty |
| 4 | city | String | Thành phố |
| 5 | nation | String | Quốc gia |
| 6 | image | String | URL logo công ty |
| 7 | color | String | Màu thương hiệu (hex) |
| 8 | ownerId | String | Mã chủ sở hữu (tham chiếu users.uid) |
| 9 | created_at | Timestamp | Ngày tạo |
| 10 | updated_at | Timestamp | Ngày cập nhật |

---

## Bảng 3.6: Mô tả bảng danh mục công việc (job_categories)

| STT | Tên Trường | Kiểu | Mô tả |
|-----|------------|------|-------|
| 1 | id | String | Mã danh mục (Document ID) |
| 2 | category_name | String | Tên danh mục |
| 3 | icon_name | String | Tên icon hiển thị |
| 4 | color | String | Màu sắc (hex) |
| 5 | description | String | Mô tả danh mục |
| 6 | created_at | String | Ngày tạo |

---

## Bảng 3.7: Mô tả bảng loại hình công việc (job_types)

| STT | Tên Trường | Kiểu | Mô tả |
|-----|------------|------|-------|
| 1 | id | String | Mã loại hình (Document ID) |
| 2 | type_name | String | Tên loại hình (Full-time, Part-time,...) |
| 3 | slug | String | Đường dẫn thân thiện URL |
| 4 | icon | String | Icon/emoji hiển thị |
| 5 | color | String | Màu sắc (hex) |
| 6 | description | String | Mô tả loại hình |
| 7 | isSystem | Boolean | Loại hình hệ thống |
| 8 | created_at | Timestamp | Ngày tạo |
| 9 | updated_at | Timestamp | Ngày cập nhật |

---

## Bảng 3.8: Mô tả bảng CV/Hồ sơ (cvs)

| STT | Tên Trường | Kiểu | Mô tả |
|-----|------------|------|-------|
| 1 | id | String | Mã CV (Document ID) |
| 2 | userId | String | Mã người dùng (tham chiếu users.uid) |
| 3 | type | String | Loại CV: "template", "uploaded" |
| 4 | pdfUrl | String | URL file PDF |
| 5 | personalInfo | Map | Thông tin cá nhân: {fullName, email, phone, address, avatar} |
| 6 | objective | String | Mục tiêu nghề nghiệp |
| 7 | education | Array | Danh sách học vấn |
| 8 | skills | Array | Danh sách kỹ năng |
| 9 | experience | Array | Danh sách kinh nghiệm làm việc |
| 10 | projects | Array | Danh sách dự án |
| 11 | activities | Array | Danh sách hoạt động |
| 12 | certifications | Array | Danh sách chứng chỉ |
| 13 | languages | Array | Danh sách ngôn ngữ |
| 14 | isDefault | Boolean | CV mặc định |
| 15 | templateId | String | Mã mẫu CV |
| 16 | createdAt | String | Ngày tạo |
| 17 | updatedAt | String | Ngày cập nhật |

---

## Bảng 3.9: Mô tả bảng công việc đã lưu (saved_jobs)

| STT | Tên Trường | Kiểu | Mô tả |
|-----|------------|------|-------|
| 1 | id | String | Mã bản ghi (Document ID) |
| 2 | userId | String | Mã người dùng (tham chiếu users.uid) |
| 3 | jobId | String | Mã công việc (tham chiếu jobs.id) |
| 4 | savedAt | Timestamp | Thời điểm lưu |
| 5 | created_at | String | Ngày tạo |

---

## Bảng 3.10: Mô tả bảng phòng chat (chats)

| STT | Tên Trường | Kiểu | Mô tả |
|-----|------------|------|-------|
| 1 | id | String | Mã phòng chat (format: uid1_uid2) |
| 2 | participants | Array | Danh sách 2 user ID tham gia |
| 3 | participantsInfo | Map | Thông tin người tham gia: {userId: {displayName, photoURL, role}} |
| 4 | lastMessage | String | Tin nhắn cuối cùng |
| 5 | messages | Map | Thông tin tin nhắn: {lastMessage} |
| 6 | updatedAt | Timestamp | Thời điểm cập nhật |

---

## Bảng 3.11: Mô tả bảng tin nhắn (chat_messages)

*Subcollection của chats: chats/{chatId}/messages*

| STT | Tên Trường | Kiểu | Mô tả |
|-----|------------|------|-------|
| 1 | id | String | Mã tin nhắn (Document ID) |
| 2 | chatId | String | Mã phòng chat (tham chiếu chats.id) |
| 3 | senderId | String | Mã người gửi (tham chiếu users.uid) |
| 4 | text | String | Nội dung tin nhắn |
| 5 | senderRole | String | Vai trò người gửi: "Recruiter", "Candidate" |
| 6 | createdAt | Timestamp | Thời điểm gửi |

---

## Bảng 3.12: Mô tả bảng thông báo (notifications)

| STT | Tên Trường | Kiểu | Mô tả |
|-----|------------|------|-------|
| 1 | id | String | Mã thông báo (Document ID) |
| 2 | userId | String | Mã người nhận (tham chiếu users.uid) |
| 3 | title | String | Tiêu đề thông báo |
| 4 | message | String | Nội dung thông báo |
| 5 | type | String | Loại: "application", "job", "system" |
| 6 | read | Boolean | Trạng thái đã đọc |
| 7 | status | String | Trạng thái liên quan |
| 8 | jobId | String | Mã công việc liên quan (tham chiếu jobs.id) |
| 9 | applicationId | String | Mã đơn ứng tuyển liên quan |
| 10 | created_at | Timestamp | Ngày tạo |

---

## Sơ đồ quan hệ giữa các bảng

```
users (1) ──────< (N) jobs           [employerId, posterId]
users (1) ──────< (N) applications   [candidateId, employerId]
users (1) ──────< (N) applied_jobs   [userId]
users (1) ──────< (N) companies      [ownerId]
users (1) ──────< (N) cvs            [userId]
users (1) ──────< (N) saved_jobs     [userId]
users (1) ──────< (N) chat_messages  [senderId]
users (1) ──────< (N) notifications  [userId]

jobs (1) ───────< (N) applications   [jobId]
jobs (1) ───────< (N) applied_jobs   [jobId]
jobs (1) ───────< (N) saved_jobs     [jobId]
jobs (1) ───────< (N) notifications  [jobId]

companies (1) ──< (N) jobs           [companyId]

job_categories (1) < (N) jobs        [category]

chats (1) ──────< (N) chat_messages  [chatId]
```

---

## Ghi chú

- **String**: Chuỗi ký tự
- **Number**: Số (integer hoặc float)
- **Boolean**: Giá trị true/false
- **Timestamp**: Thời gian (Firebase Timestamp)
- **Array**: Mảng dữ liệu
- **Map**: Object lồng (nested object)
