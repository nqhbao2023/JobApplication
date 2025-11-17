/**
 * Test file để kiểm tra jobContent.utils
 * Chạy: node -r @babel/register test-job-parser.ts
 */

import { parseJobDescription, getJobContent } from '../src/utils/jobContent.utils';

// Sample raw description từ viecoi
const sampleViecoiDescription = `Mô tả công việc CHI TIẾT CÔNG VIỆC Xây dựng và triển khai chiến lược SEO phù hợp theo từng giai đoạn, tăng trưởng lưu lượng truy cập và tối ưu hiệu quả SEO.&nbsp; Nghiên cứu, phân tích dữ liệu SEO, theo dõi chỉ số quan trọng, xác định nguyên nhân và đề xuất giải pháp tối ưu.&nbsp; Cập nhật, điều chỉnh chiến lược theo thay đổi thuật toán Google; phối hợp technical, UX/UI để giải quyết vấn đề website.&nbsp; Quản lý, phân công công việc, theo dõi tiến độ, đánh giá hiệu suất nhóm định kỳ. YÊU CẦU NamNữ từ 21 tuổi. Tốt nghiệp Trung cấpCao đẳngĐại học chuyên ngành Dược, Kinh tế, QTKD hoặc liên quan. Kỹ năng giao tiếp, đàm phán tốt, yêu thích kinh doanh. Ưu tiên có kinh nghiệm trong ngành dượcbán hàng. QUYỀN LỢI Thu nhập cạnh tranh &amp; không giới hạn: Lương cứng + Thưởng doanh số + Phụ cấp. Thưởng nóng, thưởng quý, thưởng 6 tháng, thưởng năm. Hoa hồng hấp dẫn, chính sách bán hàng linh hoạt.`;

console.log('=== TEST PARSE JOB DESCRIPTION ===\n');

const parsed = parseJobDescription(sampleViecoiDescription);

console.log('📝 MÔ TẢ CÔNG VIỆC:');
console.log(parsed.description);
console.log('\n---\n');

console.log('✅ YÊU CẦU:');
console.log(parsed.requirements);
console.log('\n---\n');

console.log('💰 QUYỀN LỢI:');
console.log(parsed.benefits);
console.log('\n---\n');

// Test với job object
const sampleJob = {
  source: 'viecoi',
  description: sampleViecoiDescription,
  external_url: 'https://viecoi.vn/viec-lam/test-123.html'
};

console.log('=== TEST GET JOB CONTENT ===\n');
console.log('Description:', getJobContent(sampleJob, 'description').substring(0, 100) + '...');
console.log('Requirements:', getJobContent(sampleJob, 'requirements').substring(0, 100) + '...');
console.log('Benefits:', getJobContent(sampleJob, 'benefits').substring(0, 100) + '...');
