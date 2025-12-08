# 🚀 KỊCH BẢN DEMO & BÁO CÁO DỰ ÁN (DEMO SCRIPT)

Tài liệu này hướng dẫn chi tiết từng bước để báo cáo và demo dự án một cách mượt mà, chuyên nghiệp nhất.

---

## 📋 1. CHUẨN BỊ TRƯỚC KHI BÁO CÁO (PREPARATION)

Trước khi bắt đầu demo, hãy đảm bảo mọi thứ đã sẵn sàng để tránh lỗi không đáng có.

### 🛠️ Kiểm tra môi trường
1.  **Database**: Đảm bảo Firestore và Algolia đang hoạt động.
2.  **API Keys**: Kiểm tra file `.env` trong thư mục `server` đã có `AI_API_KEY` (Gemini) chưa.
3.  **Mạng**: Đảm bảo kết nối internet ổn định (cần cho Gemini và Crawl).
4.  **Node.js**: Đảm bảo đã cài Node.js phiên bản >= 18.0.0

### 🔧 Cài đặt Dependencies (CHỈ CẦN LÀM 1 LẦN ĐẦU)
Nếu chưa cài đặt, chạy các lệnh sau:

```powershell
# Cài dependencies cho thư mục gốc (Frontend)
npm install

# Cài dependencies cho Server (Backend)
cd server
npm install
cd ..
```

### 🚀 Khởi động hệ thống
Mở 2 terminal riêng biệt trong VS Code:

**Terminal 1: Backend (Server)**
```powershell
cd server
npm run dev
# Chờ đến khi thấy: "Server running on port 5000" và "Connected to MongoDB/Firestore"
```

**Terminal 2: Frontend (App)**
```powershell
# Tại thư mục gốc
npx expo start -c
# Quét mã QR bằng điện thoại hoặc nhấn 'a' để chạy Android Emulator
```

---

## 🎬 2. KỊCH BẢN DEMO CHI TIẾT (THE FLOW)

### 🔹 PHẦN 1: GIỚI THIỆU & CRAWL DỮ LIỆU (DATA ACQUISITION)
**Mục tiêu**: Chứng minh hệ thống có dữ liệu thật, tự động hóa, không nhập tay thủ công.

1.  **Giới thiệu**: "Một trong những thách thức lớn nhất của nền tảng tuyển dụng là dữ liệu. Thay vì nhập tay, em đã xây dựng hệ thống **Auto-Crawler** thông minh."

2.  **Thao tác**: Mở Terminal trong VS Code, vào thư mục `server`:
    ```powershell
    cd server
    ```

3.  **Chạy crawler** (CHỌN 1 TRONG 2 CÁCH):

    **🔥 CÁCH 1: Full Pipeline (KHUYẾN NGHỊ - Tự động làm hết)**
    ```powershell
    npm run crawl:viecoi-pipeline -- --limit 10
    ```
    > Script này tự động: Crawl → Normalize → AI Categorize → Upsert Firestore → Sync Algolia
    
    **📦 CÁCH 2: Chạy từng bước thủ công**
    ```powershell
    # Bước 1: Crawl dữ liệu raw từ viecoi.vn (dùng Puppeteer - vượt Cloudflare)
    npm run crawl:viecoi-puppeteer -- --limit 10
    # → Output: server/data/viecoi/raw-jobs.json
    
    # Bước 2: Upsert lên Firestore (script này tự normalize và sync Algolia)
    npm run upsert:viecoi-jobs
    # → Đọc từ: server/data/viecoi/normalized-jobs.json
    # → Lưu vào: Firestore collection "jobs"
    # → Tự động sync: Algolia index
    ```

4.  **Giải thích trong lúc chạy**:
    *   "Hệ thống đang dùng Puppeteer (trình duyệt tự động) để truy cập Viecoi.vn."
    *   "Bóc tách dữ liệu (Title, Salary, Company, Skills)."
    *   "Chuẩn hóa dữ liệu và lưu vào Firestore + đồng bộ sang Algolia để tìm kiếm siêu nhanh."

5.  **Kết quả mong đợi**:
    ```
    ✅ Saved 10 jobs to .../server/data/viecoi/raw-jobs.json
    📊 Summary:
       - URLs found: 10
       - Jobs crawled: 10
       - Success rate: 100.0%
    🔒 Browser closed
    ```

---

### 📁 CẤU TRÚC FILE CRAWLER (GIẢI THÍCH CHI TIẾT)

```
server/src/crawlers/viecoi/
├── puppeteer-crawler.ts      # Crawl raw data (vượt Cloudflare)
├── puppeteer-full-pipeline.ts # ⭐ FULL PIPELINE (Crawl → Normalize → Upsert → Algolia)
├── upsert-jobs.ts            # Lưu vào Firestore (tự động sync Algolia)
├── sync-algolia.ts           # Sync riêng lên Algolia
├── ai-categorizer.ts         # AI phân loại job category
└── README.md                 # Hướng dẫn chi tiết
```

**Luồng dữ liệu:**
```
viecoi.vn → [puppeteer-crawler] → raw-jobs.json
                                       ↓
                              [puppeteer-full-pipeline]
                                       ↓
                              normalized-jobs.json
                                       ↓
                              [upsert-jobs] → Firestore
                                       ↓
                              [sync-algolia] → Algolia
```

---

### ⚠️ XỬ LÝ LỖI THƯỜNG GẶP KHI CRAWL

| Lỗi | Nguyên nhân | Cách khắc phục |
|-----|-------------|----------------|
| `Missing script` | Chưa vào thư mục `server` | Chạy `cd server` trước |
| `Cannot find module 'ts-node'` | Chưa cài dependencies | Chạy `npm install` trong server |
| `ECONNREFUSED` | Không kết nối được website | Kiểm tra kết nối internet |
| `Firebase/Firestore error` | Chưa cấu hình Firebase | Kiểm tra file `serviceAccountKey.json` |
| `403 Forbidden` / `Cloudflare` | Website chặn bot | Đã xử lý bằng Puppeteer |
| `Normalized jobs file not found` | Chưa normalize dữ liệu | Chạy `crawl:viecoi-pipeline` thay vì `crawl:viecoi-puppeteer` |

### 💡 MẸO DEMO NHANH

Nếu muốn demo nhanh nhất, chỉ cần 1 lệnh:
```powershell
cd server
npm run crawl:viecoi-pipeline -- --limit 5
```
Lệnh này sẽ tự động làm tất cả và hiển thị log đẹp mắt!

### 🔹 PHẦN 2: TRẢI NGHIỆM ỨNG DỤNG (USER EXPERIENCE)
**Mục tiêu**: Demo luồng chính của người dùng (Candidate).

1.  **Đăng nhập/Đăng ký**:
    *   Đăng nhập bằng tài khoản demo (ví dụ: `candidate@test.com` / `123456`).
    *   Nhấn mạnh giao diện hiện đại, mượt mà.
2.  **Trang chủ (Job Feed)**:
    *   Lướt xem danh sách việc làm.
    *   Thử tính năng **Search** (Tìm kiếm) -> Gõ "React" hoặc "Marketing" -> Kết quả hiện ra tức thì (nhờ Algolia).

---

### 🔹 PHẦN 3: TÍNH NĂNG AI (THE HIGHLIGHT - 6 TÍNH NĂNG)
**Mục tiêu**: "Show off" công nghệ lõi, điểm sáng tạo nhất của đồ án.

#### 🤖 1. Gợi ý việc làm thông minh (AI Recommendation)
*   **Vị trí**: Trang chủ hoặc Tab "Dành cho bạn".
*   **Demo**: "Dựa trên hồ sơ của em (có skill React, Node.js), hệ thống tự động lọc ra các job phù hợp nhất."
*   **Công nghệ**: Rule-based Matching (So khớp kỹ năng User vs Job).

#### 🤖 2. Trợ lý ảo (Ask AI Chatbot)
*   **Vị trí**: Icon Chat/Robot ở góc màn hình hoặc Tab Chat.
*   **Demo**:
    *   Hỏi: *"Làm sao để deal lương cao cho vị trí Fresher?"*
    *   Hỏi: *"Viết giúp tôi email xin nghỉ việc chuyên nghiệp."*
*   **Công nghệ**: Tích hợp **Google Gemini Pro**.

#### 🤖 3. Phân tích & Chấm điểm CV (CV Analysis)
*   **Vị trí**: Trang Profile -> Upload CV hoặc nút "Phân tích hồ sơ".
*   **Demo**:
    *   Chọn một CV mẫu (hoặc dùng profile hiện tại).
    *   Bấm "Phân tích".
    *   **Kết quả**: Show điểm số (ví dụ: 75/100), Điểm mạnh, Điểm yếu, Gợi ý cải thiện.
*   **Công nghệ**: **Google Gemini** đọc hiểu text và đánh giá theo tiêu chí tuyển dụng.

#### 🤖 4. Tự động phân loại công việc (Auto Categorization)
*   **Vị trí**: (Dành cho Employer) Trang Đăng tuyển dụng (Post Job).
*   **Demo**:
    *   Nhập Tiêu đề: *"Tuyển dụng Senior React Native Developer"*.
    *   Nhập Mô tả ngắn.
    *   Bấm nút (hoặc tự động): Hệ thống tự điền Category là **"IT-Software"**.
*   **Công nghệ**: **Google Gemini** hiểu ngữ nghĩa tiêu đề.

#### 🤖 5. Cải thiện mô tả công việc (Enhance Description)
*   **Vị trí**: Trang Đăng tuyển dụng.
*   **Demo**:
    *   Nhập mô tả sơ sài: *"Cần tìm người code app, lương thỏa thuận, đi làm ngay."*
    *   Bấm nút **"Dùng AI viết lại"** (Enhance).
    *   **Kết quả**: AI viết lại thành một đoạn văn chuyên nghiệp, đầy đủ yêu cầu, quyền lợi.
*   **Công nghệ**: **Google Gemini** (Generative AI).

#### 🤖 6. Dự đoán lương (Salary Prediction)
*   **Vị trí**: Trang Đăng tuyển dụng hoặc Xem chi tiết Job.
*   **Demo**:
    *   Nhập vị trí: "Marketing Intern", Khu vực: "Hồ Chí Minh".
    *   Hệ thống gợi ý mức lương: "3.000.000 - 5.000.000 VNĐ".
*   **Công nghệ**: Rule-based + Dữ liệu thị trường (Market Data).

---

## 🔚 3. KẾT THÚC & HỎI ĐÁP (CONCLUSION)

1.  **Tổng kết công nghệ**:
    *   **Mobile**: React Native (Expo).
    *   **Backend**: Node.js, Express.
    *   **Database**: Firebase Firestore (Realtime), Algolia (Search).
    *   **AI**: Google Gemini (Generative AI).
2.  **Hướng phát triển**:
    *   Cải thiện độ chính xác của AI.
    *   Thêm tính năng phỏng vấn thử với AI.
3.  **Lời cảm ơn**.

---

## ⚠️ LƯU Ý QUAN TRỌNG KHI DEMO
*   **Nếu AI lỗi**: Đừng hoảng, nói rằng "Do kết nối API server đang quá tải, em xin phép demo tính năng khác" và chuyển sang phần Crawl hoặc Search.
*   **Nếu Crawl lỗi**: Show dữ liệu đã crawl sẵn trong Database.
*   **Luôn mở sẵn**: Tab Firestore Console và Algolia Dashboard trên trình duyệt để chứng minh dữ liệu nhảy realtime nếu cần.
