Vấn đề 1: seedFirestore.js không khởi tạo Firebase Admin nên script seed hỏng
Mô tả vấn đề (ngắn, dễ hiểu)
Script đang require firebase-admin nhưng phần admin.initializeApp bị comment; khi chạy sẽ ném lỗi app/default chưa khởi tạo, khiến bạn không seed được dữ liệu mẫu.

Giải pháp (code + chú thích)

// scripts/seedFirestore.js
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
Hoặc đọc thông tin từ biến môi trường để tránh commit file key.

Bổ sung guard kiểm tra admin.apps.length để chạy nhiều lần an toàn.

Giải thích (vì sao, cách hoạt động)
firebase-admin cần app mặc định để cấp quyền ghi Firestore. Khi không khởi tạo, mọi lệnh admin.firestore() sẽ throw, khiến seed thất bại.
Vị trí chèn mã / cách tích hợp
Ngay đầu file scripts/seedFirestore.js, trước khi gọi admin.firestore().


Vấn đề 2: Taxonomy job_types dùng ID ngẫu nhiên và lệch chuẩn backend
Mô tả vấn đề (ngắn, dễ hiểu)
Script src/scripts/admin/seedJobTypes.js thêm job type tiếng Việt bằng addDoc (ID ngẫu nhiên) trong khi backend Joi vẫn chỉ chấp nhận 4 giá trị tiếng Anh như full-time, part-time. Khi form Expo gửi ID Firestore (ví dụ 8HE4Z...), API /api/jobs trả 400 vì không khớp enum.

Giải pháp (code + chú thích)

// server/data/job-types.vi.json
[
  { "id": "full-time", "type_name": "Toàn thời gian", "slug": "toan-thoi-gian", "icon": "💼" },
  { "id": "part-time", "type_name": "Bán thời gian", "slug": "ban-thoi-gian", "icon": "⏰" },
  ...
]

// server/src/scripts/seed-job-types.ts
const writer = db.bulkWriter();
for (const type of jobTypes) {
  writer.set(db.collection('job_types').doc(type.id), { ...type, isSystem: true });
  algoliaIndex.saveObject({ objectID: type.id, ...type });
}
await writer.close();

// server/src/validators/job.validator.ts
const validJobTypes = await jobTypeService.getAllowedIds(); // cache vào bộ nhớ
type: Joi.string().required().valid(...validJobTypes),
Sử dụng ID cố định giúp backend và client đồng bộ.

Đồng bộ Algolia cùng lúc để search hoạt động.

Giải thích (vì sao, cách hoạt động)
Khi mọi tầng dùng chung ID cố định, form chọn full-time sẽ hợp lệ với Joi, Firestore và Algolia. Seed chạy lại vẫn idempotent nhờ setDoc.