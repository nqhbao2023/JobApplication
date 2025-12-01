# CHƯƠNG 3: THIẾT KẾ CƠ SỞ DỮ LIỆU

## 3.1. Sơ đồ quan hệ cơ sở dữ liệu (Firestore Schema)

Dự án sử dụng **Google Firebase Firestore** làm cơ sở dữ liệu chính. Đây là hệ quản trị cơ sở dữ liệu NoSQL dạng Document-oriented. Dưới đây là sơ đồ thể hiện cấu trúc các Collections (Bộ sưu tập) và mối quan hệ tham chiếu giữa chúng.

*(Chèn hình ảnh được export từ file `UML/Database_Schema.puml` tại đây)*

---

## 3.2. Mô tả chi tiết các bảng (Collections)

Dưới đây là mô tả chi tiết cấu trúc dữ liệu của các Collections chính trong hệ thống.

### Bảng 3.1: Mô tả bảng người dùng (users)
Lưu trữ thông tin tài khoản của tất cả các vai trò (Candidate, Employer, Admin).

| STT | Tên Trường | Kiểu dữ liệu | Mô tả |
|:---:|:---|:---|:---|
| 1 | uid | String | Mã định danh người dùng (Primary Key - từ Firebase Auth) |
| 2 | email | String | Địa chỉ email đăng nhập |
| 3 | displayName | String | Tên hiển thị đầy đủ |
| 4 | photoURL | String | Đường dẫn ảnh đại diện (Avatar) |
| 5 | role | String | Vai trò: 'candidate', 'employer', 'admin' |
| 6 | phoneNumber | String | Số điện thoại liên hệ |
| 7 | studentProfile | Map | Thông tin hồ sơ sinh viên (nếu là candidate) |
| 8 | companyProfile | Map | Thông tin công ty (nếu là employer) |
| 9 | createdAt | Timestamp | Thời gian tạo tài khoản |
| 10 | updatedAt | Timestamp | Thời gian cập nhật gần nhất |

### Bảng 3.2: Mô tả bảng tin tuyển dụng (jobs)
Lưu trữ thông tin các công việc, bao gồm cả tin do Employer đăng, tin Crawl từ Viecoi, và tin tìm việc của Candidate (Quick Post).

| STT | Tên Trường | Kiểu dữ liệu | Mô tả |
|:---:|:---|:---|:---|
| 1 | id | String | Mã tin tuyển dụng (Auto-generated ID) |
| 2 | title | String | Tiêu đề công việc |
| 3 | description | String | Mô tả chi tiết công việc (HTML/Text) |
| 4 | salary | Map | Cấu trúc lương ({min, max, currency, type}) |
| 5 | jobType | String | Loại tin: 'employer_seeking' (tìm ứng viên) hoặc 'candidate_seeking' (tìm việc) |
| 6 | source | String | Nguồn tin: 'internal', 'viecoi', 'quick-post' |
| 7 | status | String | Trạng thái: 'pending', 'active', 'rejected', 'closed' |
| 8 | posterId | String | Mã người đăng (Ref: users.uid) |
| 9 | companyId | String | Mã công ty (Ref: companies.id) - Nếu có |
| 10 | categoryId | String | Mã danh mục nghề nghiệp (Ref: job_categories.id) |
| 11 | location | String | Địa điểm làm việc |
| 12 | skills | Array | Danh sách kỹ năng yêu cầu |
| 13 | createdAt | Timestamp | Ngày đăng tin |

### Bảng 3.3: Mô tả bảng đơn ứng tuyển (applications)
Lưu trữ thông tin ứng tuyển của sinh viên vào các công việc Internal.

| STT | Tên Trường | Kiểu dữ liệu | Mô tả |
|:---:|:---|:---|:---|
| 1 | id | String | Mã đơn ứng tuyển |
| 2 | jobId | String | Mã công việc ứng tuyển (Ref: jobs.id) |
| 3 | candidateId | String | Mã ứng viên (Ref: users.uid) |
| 4 | employerId | String | Mã nhà tuyển dụng nhận đơn (Ref: users.uid) |
| 5 | cvUrl | String | Đường dẫn file CV đính kèm |
| 6 | coverLetter | String | Thư giới thiệu bản thân |
| 7 | status | String | Trạng thái: 'pending', 'accepted', 'rejected' |
| 8 | appliedAt | Timestamp | Thời gian nộp đơn |
| 9 | reviewedAt | Timestamp | Thời gian nhà tuyển dụng xem đơn |

### Bảng 3.4: Mô tả bảng công ty (companies)
Lưu trữ thông tin chi tiết về các công ty/doanh nghiệp.

| STT | Tên Trường | Kiểu dữ liệu | Mô tả |
|:---:|:---|:---|:---|
| 1 | id | String | Mã công ty |
| 2 | name | String | Tên công ty |
| 3 | logo | String | Logo công ty |
| 4 | description | String | Giới thiệu về công ty |
| 5 | address | String | Địa chỉ trụ sở |
| 6 | website | String | Website công ty |
| 7 | ownerId | String | Mã tài khoản quản lý công ty (Ref: users.uid) |
| 8 | isVerified | Boolean | Trạng thái xác thực công ty |

### Bảng 3.5: Mô tả bảng danh mục (job_categories)
Danh mục nghề nghiệp để phân loại công việc.

| STT | Tên Trường | Kiểu dữ liệu | Mô tả |
|:---:|:---|:---|:---|
| 1 | id | String | Mã danh mục |
| 2 | name | String | Tên danh mục (VD: IT, Marketing, Sales) |
| 3 | icon | String | Icon hiển thị trên App |
| 4 | description | String | Mô tả danh mục |
| 5 | active | Boolean | Trạng thái hoạt động |

### Bảng 3.6: Mô tả bảng công việc đã lưu (saved_jobs)
Lưu trữ danh sách các công việc mà ứng viên đã đánh dấu quan tâm.

| STT | Tên Trường | Kiểu dữ liệu | Mô tả |
|:---:|:---|:---|:---|
| 1 | id | String | Mã bản ghi |
| 2 | userId | String | Mã người dùng (Ref: users.uid) |
| 3 | jobId | String | Mã công việc (Ref: jobs.id) |
| 4 | savedAt | Timestamp | Thời gian lưu |

### Bảng 3.7: Mô tả bảng CV người dùng (user_cvs)
Quản lý các CV mà người dùng đã tạo hoặc tải lên hệ thống.

| STT | Tên Trường | Kiểu dữ liệu | Mô tả |
|:---:|:---|:---|:---|
| 1 | id | String | Mã CV |
| 2 | userId | String | Mã người sở hữu (Ref: users.uid) |
| 3 | name | String | Tên gợi nhớ của CV (VD: CV IT, CV Part-time) |
| 4 | fileUrl | String | Đường dẫn file PDF (nếu upload) |
| 5 | data | Map | Dữ liệu CV (nếu tạo trên App: học vấn, kinh nghiệm...) |
| 6 | isDefault | Boolean | Đánh dấu là CV mặc định để ứng tuyển nhanh |
| 7 | updatedAt | Timestamp | Thời gian cập nhật cuối cùng |
