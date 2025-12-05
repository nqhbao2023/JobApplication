# 📊 BÁO CÁO TỔNG HỢP & HƯỚNG DẪN BẢO VỆ TỐT NGHIỆP

**Ngày cập nhật**: 05/12/2025
**Trạng thái**: ✅ **SẴN SÀNG BẢO VỆ (READY FOR DEFENSE)**
**Mục đích**: Tài liệu này tổng hợp toàn bộ tình hình dự án, các thay đổi mới nhất, flow hoạt động và bộ câu hỏi/trả lời chuẩn bị cho buổi bảo vệ trước hội đồng.

---

## 1. 🆕 CẬP NHẬT MỚI NHẤT (TỪ 28/11 - 05/12)

### 🛠️ Kỹ Thuật & Tính Năng
1.  **Hệ thống Auto-Crawler thông minh hơn**:
    *   Chuyển sang **Schedule 1 tuần/lần** (vào Chủ Nhật) để giảm tải hệ thống.
    *   Sử dụng script `setup-task.ps1` để tự động tạo Windows Task Scheduler.
    *   Tích hợp **Hybrid AI Categorization**: Kết hợp Regex (nhanh, chính xác 80%) và AI Gemini (xử lý 20% ca khó) để phân loại job tự động.

2.  **Nâng cấp AI Engine**:
    *   Chuyển sang model `gemini-2.5-flash-lite`: Tối ưu chi phí và tốc độ phản hồi.
    *   Độ tin cậy (Confidence threshold) được tinh chỉnh lên 80%.

3.  **Hoàn thiện Flow (Logic nghiệp vụ)**:
    *   **Quick Post**: Phân định rõ `jobType` ('employer_seeking' vs 'candidate_seeking'). Candidate đăng bài tìm việc sẽ không tự thấy nút "Nộp CV" cho chính mình nữa.
    *   **CV Management**: Employer luôn xem được CV dưới dạng PDF (dù là CV tạo từ template hay upload file). Giải quyết mâu thuẫn giữa việc dùng Template và Upload.

---

## 2. 🔄 FLOW DỰ ÁN (CÁCH HỆ THỐNG HOẠT ĐỘNG)

Để trả lời hội đồng, bạn cần nắm vững 3 luồng dữ liệu chính:

### Luồng 1: Dữ liệu từ Crawler (Viecoi.vn)
1.  **Crawler** (Puppeteer) chạy định kỳ → Lấy dữ liệu từ web Viecoi.vn.
2.  **AI Processing**: Dữ liệu thô đi qua AI để chuẩn hóa, phân loại ngành nghề, dự đoán mức lương (nếu thiếu).
3.  **Database**: Lưu vào Firebase Firestore.
4.  **Search Engine**: Đồng bộ sang Algolia để tìm kiếm siêu tốc.
5.  **App**: Candidate tìm thấy job → Click xem → Redirect về web gốc để nộp.

### Luồng 2: Dữ liệu Nội bộ (Employer đăng tuyển)
1.  **Employer** đăng nhập → Đăng tin tuyển dụng (Job Posting).
2.  **System**: Lưu vào Firestore → Index sang Algolia.
3.  **Candidate**: Tìm thấy job trên App → Nộp CV (Upload hoặc chọn CV có sẵn).
4.  **Employer**: Nhận thông báo → Xem hồ sơ (PDF) → Duyệt/Từ chối → Chat với ứng viên.

### Luồng 3: Quick Post (Candidate tìm việc)
1.  **Candidate** đăng "Quick Post" (VD: "Tìm việc làm thêm buổi tối").
2.  **Admin**: Duyệt bài đăng.
3.  **Employer**: Thấy bài đăng trong khu vực "Ứng viên tiềm năng" → Chủ động liên hệ.

---

## 3. 🎓 BỘ CÂU HỎI & TRẢ LỜI BẢO VỆ (Q&A)

Dưới đây là câu trả lời chi tiết cho 14 câu hỏi phản biện, được tùy biến theo đúng công nghệ của dự án **Job4S**.

### 1. Ứng dụng em phạm vi dùng cho những ai?
*   **Trả lời**: Ứng dụng phục vụ 3 đối tượng chính:
    *   **Sinh viên/Người tìm việc (Candidate)**: Tìm kiếm việc làm, tạo CV, nhận gợi ý việc làm từ AI.
    *   **Nhà tuyển dụng (Employer)**: Đăng tin tuyển dụng, quản lý hồ sơ ứng viên, tìm kiếm ứng viên tiềm năng.
    *   **Quản trị viên (Admin)**: Quản lý người dùng, duyệt tin đăng, kiểm soát nội dung hệ thống.

### 2. Ai là người đứng ra quản trị dự án này?
*   **Trả lời**: Hệ thống có phân quyền **Admin**. Admin có quyền truy cập Dashboard để quản lý toàn bộ Users, Jobs, duyệt các bài Quick Post và cấu hình các tham số hệ thống (như danh mục ngành nghề). Về mặt vận hành kỹ thuật, em là người thiết lập server và các job tự động.

### 3. Ứng dụng em có gì hơn được gì so với các MXH/App khác?
*   **Trả lời**: Điểm mạnh của Job4S là tính **Thực tế và Tập trung**:
    *   **Tích hợp AI sâu**: Không chỉ tìm việc, App có AI Chatbot tư vấn, AI phân tích CV để gợi ý sửa đổi, và AI dự đoán mức lương thị trường.
    *   **Dữ liệu phong phú**: Nhờ hệ thống **Auto-Crawler**, App không bị "đói" dữ liệu khi mới ra mắt mà luôn có hàng nghìn việc làm từ các nguồn uy tín (Viecoi).
    *   **Tính năng Quick Post**: Cho phép sinh viên chủ động đăng tin tìm việc (ngược lại với truyền thống), giải quyết nhu cầu việc làm thời vụ/part-time nhanh chóng.

### 4. Em chỉ phát triển được trong nước hay ra được quốc tế không?
*   **Trả lời**: Về mặt kỹ thuật, hệ thống hoàn toàn có thể **Scale ra quốc tế**.
    *   **Ngôn ngữ**: App sử dụng React Native, dễ dàng tích hợp đa ngôn ngữ (i18n).
    *   **Hạ tầng**: Firebase và Algolia là các dịch vụ toàn cầu, không giới hạn vị trí địa lý.
    *   **Crawler**: Chỉ cần viết thêm module crawler cho các trang web nước ngoài là có thể mở rộng dữ liệu.

### 5. Vì sao em chọn React Native sao không chọn công nghệ khác như Kotlin/Swift?
*   **Trả lời**: Em chọn React Native vì 3 lý do:
    *   **Đa nền tảng (Cross-platform)**: Viết code 1 lần chạy được cả iOS và Android, tiết kiệm 50% thời gian phát triển so với Native (Kotlin/Swift).
    *   **Hệ sinh thái JavaScript/TypeScript**: Em có thể dùng chung logic và type (interface) giữa Backend (Node.js) và Frontend (React Native), giảm thiểu lỗi và đồng bộ dữ liệu tốt hơn.
    *   **Tính năng OTA (Over The Air)**: Có thể cập nhật bản vá lỗi nhanh chóng mà không cần chờ duyệt lại trên Store (thông qua EAS Update).

### 6. Em bảo mật tài khoản và cả hệ thống của em như thế nào?
*   **Trả lời**:
    *   **Tài khoản**: Sử dụng **Firebase Authentication**, mật khẩu không lưu trực tiếp mà được quản lý bởi Google, hỗ trợ xác thực 2 lớp và OAuth (Google Login).
    *   **Hệ thống**: API Server sử dụng cơ chế **JWT (JSON Web Token)** để xác thực mỗi request.
    *   **Phân quyền**: Middleware kiểm tra Role (Admin/Employer/Candidate) chặt chẽ trước khi cho phép thực hiện hành động (VD: Candidate không thể xóa Job).

### 7. Xác thực của em có dùng công nghệ gì?
*   **Trả lời**: Em sử dụng **Firebase Authentication** kết hợp với **Custom Claims** trên Token. Khi user đăng nhập, Firebase trả về ID Token, Server sẽ verify token này và cấp quyền truy cập tương ứng.

### 8. Rồi em làm sao để bảo mật được dữ liệu người dùng?
*   **Trả lời**:
    *   **Encryption**: Dữ liệu truyền tải luôn qua giao thức **HTTPS**.
    *   **Access Control**: Sử dụng **Firebase Security Rules** (cho Firestore) và Logic phân quyền tại Server để đảm bảo User A không xem được dữ liệu riêng tư của User B.
    *   **Sensitive Data**: Các thông tin nhạy cảm không được log ra console hay lưu trữ dạng plain text.

### 9. Em xử lý hình ảnh như thế nào để lưu vào database hoặc cloud hoặc server của em?
*   **Trả lời**: Em không lưu ảnh trực tiếp vào Database (vì nặng).
    *   Quy trình: Ảnh được upload lên **Firebase Storage** (Cloud Storage).
    *   Sau khi upload thành công, Firebase trả về một đường dẫn (URL).
    *   Em chỉ lưu **URL** (chuỗi string) vào Database. Cách này giúp Database nhẹ và truy xuất nhanh.

### 10. Em đảm bảo được khi 10k người cùng truy cập cùng 1 lúc mà vẫn đảm bảo được hệ thống ổn định?
*   **Trả lời**:
    *   **Kiến trúc Node.js**: Sử dụng mô hình **Non-blocking I/O**, xử lý rất tốt các request đồng thời mà không bị tắc nghẽn.
    *   **Serverless/Cloud**: Firebase Firestore là dạng NoSQL Database có khả năng **Auto-scaling** (tự động mở rộng) cực tốt, chịu tải hàng triệu request.
    *   **Caching**: Việc sử dụng **Algolia** cho tìm kiếm giúp giảm tải 90% query nặng vào Database chính.

### 11. Giả dụ 10k người cùng post bài em đảm bảo được tính ổn định không?
*   **Trả lời**:
    *   **Queue System**: Nếu lượng write quá lớn, có thể áp dụng cơ chế hàng đợi (Message Queue - *hướng mở rộng*).
    *   Hiện tại, **Firestore** có thể xử lý hàng chục nghìn write/giây.
    *   Dữ liệu post bài được phân tán, không bị khóa (lock) bảng như SQL truyền thống, nên không bị nghẽn cổ chai khi ghi dữ liệu đồng thời.

### 12. Thư viện em có tích hợp của công nghệ nào không?
*   **Trả lời**: Có, em tích hợp các công nghệ hàng đầu:
    *   **Google Gemini AI**: Cho Chatbot và phân tích dữ liệu.
    *   **Algolia**: Cho công cụ tìm kiếm (Search Engine).
    *   **Firebase**: Cho Auth, Database, Storage, Notification.
    *   **Puppeteer**: Cho việc thu thập dữ liệu tự động.
    *   **Expo**: Framework phát triển App.

### 13. Khó khăn gì gặp phải khi đang nghiên cứu đề tài?
*   **Trả lời**:
    *   **Dữ liệu**: Việc crawl dữ liệu từ các trang web lớn rất khó do họ chặn (Cloudflare). Em phải nghiên cứu kỹ thuật giả lập User thật (Puppeteer) để vượt qua.
    *   **Độ chính xác của AI**: AI đôi khi trả lời sai hoặc phân loại nhầm. Em phải xây dựng cơ chế **Hybrid** (kết hợp Regex và AI) để đảm bảo độ chính xác cao nhất mà vẫn tiết kiệm chi phí.
    *   **Đồng bộ dữ liệu**: Giữ cho dữ liệu giữa Firestore và Algolia luôn khớp nhau là một thách thức về logic (xử lý bất đồng bộ).

### 14. Ứng dụng mà em làm xong có thể nâng cấp về sau này không?
*   **Trả lời**: Hoàn toàn được.
    *   **Kiến trúc Modular**: Code được chia tách rõ ràng (Controller - Service - Repository), dễ dàng thêm tính năng mới mà không đập đi xây lại.
    *   **API First**: Backend viết dạng RESTful API, sau này có thể phát triển thêm bản Web (ReactJS) hoặc Admin Web mà không cần sửa Backend.
    *   **Khả năng mở rộng**: Có thể tích hợp thêm Video Call phỏng vấn, Thanh toán online (Payment Gateway) dễ dàng.

---
**Chúc bạn bảo vệ thành công! Hãy tự tin vì bạn nắm rõ từng dòng code và luồng đi của dự án.**
