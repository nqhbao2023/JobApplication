# 🎬 KỊCH BẢN THUYẾT TRÌNH & DEMO DỰ ÁN JOB4S (10 PHÚT)

**Người trình bày:** [Tên của bạn]  
**Dự án:** Job4S - Nền tảng tuyển dụng thông minh tích hợp AI  
**Thời lượng:** ~10 phút

---

## 📋 TỔNG QUAN KỊCH BẢN

| Thời gian | Phần | Nội dung chính |
| :--- | :--- | :--- |
| **00:00 - 01:00** | **1. Giới thiệu** | Vấn đề, Giải pháp, Tech Stack |
| **01:00 - 02:30** | **2. Data & Backend** | Demo Auto-Crawler, giải thích luồng dữ liệu |
| **02:30 - 05:30** | **3. Candidate Flow** | Tìm việc, Ứng tuyển, AI Chatbot |
| **05:30 - 07:30** | **4. Employer Flow** | Đăng tin, Quản lý ứng viên |
| **07:30 - 08:30** | **5. Admin Flow** | Duyệt tin, Quản lý hệ thống |
| **08:30 - 10:00** | **6. Tổng kết** | Điểm nổi bật, Hướng phát triển |

---

## 🎤 KỊCH BẢN CHI TIẾT

### 1. GIỚI THIỆU (00:00 - 01:00)

**(Màn hình: Slide mở đầu hoặc Trang chủ ứng dụng)**

**Lời thoại:**
"Xin chào thầy cô và các bạn. Em là [Tên bạn], hôm nay em xin phép trình bày về đồ án tốt nghiệp của mình: **Job4S - Nền tảng tuyển dụng và tìm việc làm thông minh.**"

"Thị trường tuyển dụng hiện nay có hai vấn đề lớn:
1.  **Dữ liệu phân mảnh:** Ứng viên phải tìm kiếm trên quá nhiều trang web khác nhau.
2.  **Thiếu tương tác:** Việc tìm kiếm việc làm thường khô khan và thiếu sự tư vấn trực tiếp."

"Job4S ra đời để giải quyết vấn đề này với 3 điểm nhấn công nghệ:
*   **Mobile First:** Ứng dụng đa nền tảng (Android/iOS) viết bằng React Native.
*   **Automation:** Hệ thống tự động thu thập (crawl) dữ liệu việc làm từ các nguồn lớn.
*   **AI Integration:** Tích hợp Google Gemini để tư vấn nghề nghiệp và gợi ý việc làm thông minh."

"Về kiến trúc, em sử dụng mô hình Client-Server với:
*   **Frontend:** React Native, Expo.
*   **Backend:** Node.js, Express.
*   **Database:** Firebase Firestore (Realtime) và Algolia (Search Engine).
*   **AI:** Google Gemini 1.5 Flash."

---

### 2. DATA & BACKEND (01:00 - 02:30)

**(Màn hình: Chuyển sang VS Code, mở Terminal)**

**Lời thoại:**
"Một ứng dụng tuyển dụng sẽ vô nghĩa nếu không có dữ liệu. Thay vì nhập liệu thủ công, em đã xây dựng một hệ thống **Auto-Crawler**."

**(Thao tác: Chạy lệnh crawl trong terminal)**
`npm run crawl:viecoi-pipeline -- --limit 5`

"Như mọi người thấy trên màn hình, em đang chạy script crawler. Hệ thống sử dụng **Puppeteer** để giả lập trình duyệt, tự động truy cập các trang tuyển dụng uy tín (như Viecoi.vn), bóc tách dữ liệu thô, sau đó:
1.  **Chuẩn hóa dữ liệu:** Làm sạch text, định dạng lương.
2.  **Phân loại bằng AI:** Dùng Gemini để xác định xem job này thuộc ngành nghề nào (IT, Marketing, v.v.).
3.  **Lưu trữ & Đồng bộ:** Lưu vào Firestore và đẩy sang Algolia để phục vụ tìm kiếm tức thì."

"Quá trình này hoàn toàn tự động, giúp hệ thống luôn có việc làm mới mỗi ngày mà không tốn sức người quản trị."

---

### 3. CANDIDATE FLOW (ỨNG VIÊN) (02:30 - 05:30)

**(Màn hình: Mở máy ảo Android/iOS hoặc chia sẻ màn hình điện thoại)**

**Lời thoại:**
"Bây giờ, hãy cùng trải nghiệm ứng dụng dưới góc độ một Ứng viên."

#### A. Đăng ký & Home (02:30 - 03:30)
"Em sẽ đăng nhập vào tài khoản ứng viên.
Ngay tại màn hình Home, giao diện được thiết kế tập trung vào trải nghiệm tìm kiếm.
Thanh tìm kiếm này được tích hợp **Algolia**. Ví dụ em gõ 'React Native'..."

**(Thao tác: Gõ từ khóa, kết quả hiện ra ngay lập tức)**

"...kết quả trả về gần như tức thì (mili-giây), hỗ trợ cả tìm kiếm sai chính tả (typo tolerance)."

#### B. Chi tiết việc làm & Ứng tuyển (03:30 - 04:30)
"Em chọn một công việc cụ thể. Tại đây có đầy đủ thông tin: Mức lương, Yêu cầu, Phúc lợi.
Nếu thấy phù hợp, em nhấn **'Ứng tuyển ngay'**."

**(Thao tác: Nhấn nút Ứng tuyển, chọn CV hoặc upload CV mới)**

"Hệ thống cho phép em chọn CV đã lưu hoặc upload file PDF mới. Sau khi nộp, thông báo sẽ được gửi realtime đến Nhà tuyển dụng."

#### C. AI Chatbot (04:30 - 05:30)
"Điểm đặc biệt nhất của Job4S là trợ lý ảo AI. Em sẽ vào tab **Chat**."

**(Thao tác: Vào màn hình Chat, gõ câu hỏi: "Tôi là sinh viên mới ra trường, thích code mobile thì nên học gì?")**

"Em có thể hỏi bất cứ điều gì về định hướng nghề nghiệp. Gemini AI sẽ phân tích context và trả lời..."

**(Chờ AI trả lời)**

"...AI không chỉ trả lời chung chung, mà còn có thể gợi ý các Job đang có trên hệ thống phù hợp với câu hỏi của em. Đây là tính năng giúp giữ chân người dùng lâu hơn trên ứng dụng."

---

### 4. EMPLOYER FLOW (NHÀ TUYỂN DỤNG) (05:30 - 07:30)

**(Màn hình: Đăng xuất Candidate, Đăng nhập tài khoản Employer)**

**Lời thoại:**
"Tiếp theo, em xin chuyển sang vai trò Nhà tuyển dụng."

#### A. Đăng tin tuyển dụng (05:30 - 06:30)
"Nhà tuyển dụng có thể đăng tin mới dễ dàng. Em sẽ tạo nhanh một job 'Senior Backend Developer'."

**(Thao tác: Điền form đăng tin nhanh)**

"Sau khi đăng, tin này sẽ ở trạng thái **'Pending'** (Chờ duyệt). Đây là cơ chế kiểm duyệt để đảm bảo chất lượng nội dung trên sàn, tránh spam."

#### B. Quản lý ứng viên (06:30 - 07:30)
"Em sẽ vào mục **'Quản lý tin'**. Tại đây em thấy danh sách các tin đã đăng và số lượng người ứng tuyển.
Em mở tin 'React Native' lúc nãy. Đây là hồ sơ của bạn ứng viên vừa nộp."

**(Thao tác: Xem CV ứng viên, bấm nút 'Duyệt' hoặc 'Từ chối')**

"Em có thể xem CV trực tiếp (file PDF), và quyết định **Duyệt** hoặc **Từ chối**. Khi em thao tác, ứng viên sẽ nhận được thông báo ngay lập tức về kết quả ứng tuyển của mình."

---

### 5. ADMIN FLOW (QUẢN TRỊ VIÊN) (07:30 - 08:30)

**(Màn hình: Đăng xuất Employer, Đăng nhập tài khoản Admin)**

**Lời thoại:**
"Cuối cùng là vai trò Admin - người vận hành hệ thống."

"Trên Dashboard, Admin có cái nhìn tổng quan về sức khỏe hệ thống: Số lượng User mới, Job mới trong ngày.
Quan trọng nhất là tính năng **Duyệt tin**."

**(Thao tác: Vào màn hình duyệt tin)**

"Admin sẽ thấy danh sách các tin tuyển dụng mới được Employer đăng lên. Admin có thể xem chi tiết và nhấn **Approve** để tin này chính thức xuất hiện trên trang chủ và kết quả tìm kiếm."

---

### 6. TỔNG KẾT (08:30 - 10:00)

**(Màn hình: Quay lại Slide hoặc màn hình chính ứng dụng)**

**Lời thoại:**
"Tổng kết lại, Job4S là một giải pháp tuyển dụng toàn diện:
1.  **Tự động hóa** khâu thu thập dữ liệu, giải quyết bài toán 'con gà - quả trứng' về nội dung.
2.  **Tối ưu trải nghiệm tìm kiếm** với Algolia.
3.  **Cá nhân hóa** với AI Chatbot.

Trong tương lai, em dự định phát triển thêm tính năng:
*   Phỏng vấn thử với AI (AI Mock Interview).
*   Gợi ý việc làm dựa trên CV (CV Matching).

Em xin cảm ơn thầy cô và các bạn đã lắng nghe. Em rất mong nhận được những góp ý để hoàn thiện sản phẩm hơn ạ."

---

## 💡 LƯU Ý KHI QUAY/DEMO

1.  **Chuẩn bị dữ liệu:** Trước khi quay, hãy dùng script crawl để lấy khoảng 10-20 job mới nhất cho data nhìn "tươi".
2.  **Reset trạng thái:** Đảm bảo tài khoản Candidate demo chưa ứng tuyển vào Job mà bạn định demo.
3.  **Thông báo:** Nếu demo tính năng realtime notification, hãy chuẩn bị 2 thiết bị hoặc 2 cửa sổ giả lập nếu có thể (hoặc chỉ cần nói là "sẽ có thông báo").
4.  **AI Latency:** Khi chat với AI, có thể sẽ mất 2-3 giây để phản hồi, hãy giữ bình tĩnh và nói lấp vào khoảng trống đó (ví dụ: "Hệ thống đang phân tích câu hỏi...").

