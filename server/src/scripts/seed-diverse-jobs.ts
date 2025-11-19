/**
 * Seed more jobs with diverse types and locations for testing filters
 */

import * as admin from 'firebase-admin';
import * as path from 'path';

if (!admin.apps.length) {
  const serviceAccountPath = path.join(__dirname, '../../serviceAccountKey.json');
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// Sample jobs với đa dạng type và location
const SAMPLE_JOBS = [
  // Part-time jobs
  {
    title: 'Tuyển Nhân Viên Phục Vụ Part-time - Cuối Tuần',
    description: 'Cần tuyển nhân viên phục vụ làm thứ 7, chủ nhật. Thời gian: 9h-18h. Không yêu cầu kinh nghiệm.',
    type: 'Bán thời gian',
    location: 'Quận Thủ Đức, TP.HCM',
    salary_text: '25k/giờ',
    workSchedule: 'Thứ 7, CN',
    hourlyRate: 25000,
  },
  {
    title: 'Gia Sư Toán Học Part-time Tại Bình Dương',
    description: 'Tìm gia sư dạy toán cho học sinh cấp 2. Lương 100k/buổi. Thời gian linh hoạt theo lịch học.',
    type: 'Bán thời gian',
    location: 'Thủ Dầu Một, Bình Dương',
    salary_text: '100,000đ/buổi',
    workSchedule: 'Linh hoạt',
    hourlyRate: 50000,
  },
  {
    title: 'Nhân Viên Pha Chế Part-time Tối - Quán Cafe Gần TDMU',
    description: 'Quán cafe gần trường TDMU cần tuyển nhân viên pha chế ca tối 18h-22h, làm thứ 2,4,6.',
    type: 'Bán thời gian',
    location: 'Thủ Dầu Một, Bình Dương',
    salary_text: '20k/giờ + Tips',
    workSchedule: '18h-22h, T2,4,6',
    hourlyRate: 20000,
  },
  
  // Intern jobs
  {
    title: 'Tuyển Thực Tập Sinh Marketing - Nhận Sinh Viên',
    description: 'Công ty cần tuyển thực tập sinh marketing. Sinh viên năm 3,4 đang học. Hỗ trợ 3 triệu/tháng.',
    type: 'Thực tập',
    location: 'Dĩ An, Bình Dương',
    salary_text: '3,000,000 VNĐ/tháng',
    workSchedule: 'Thứ 2-6',
    hourlyRate: 17000,
  },
  {
    title: 'Intern Lập Trình Web - Cho Sinh Viên IT',
    description: 'Startup công nghệ tìm intern lập trình web. Yêu cầu: Biết HTML/CSS/JS. Lương thực tập 4tr/tháng.',
    type: 'Thực tập',
    location: 'Thuận An, Bình Dương',
    salary_text: '4 triệu/tháng',
    workSchedule: 'T2-T6, 8h-17h',
    hourlyRate: 22000,
  },
  
  // Remote jobs
  {
    title: 'Content Writer Remote - Làm Tại Nhà',
    description: 'Viết bài content cho website. Làm việc từ xa hoàn toàn. Lương theo bài: 150k-300k/bài.',
    type: 'Từ xa',
    location: 'Remote - Toàn quốc',
    salary_text: '150k-300k/bài',
    workSchedule: 'Linh hoạt',
    hourlyRate: 30000,
  },
  {
    title: 'Thiết Kế Đồ Họa Freelance - Work From Home',
    description: 'Nhận thiết kế banner, poster, flyer. Làm tại nhà, nhận việc qua Zalo. Giá từ 50k-200k/design.',
    type: 'Từ xa',
    location: 'Remote',
    salary_text: 'Theo sản phẩm',
    workSchedule: 'Tự do',
    hourlyRate: 40000,
  },
  
  // Full-time jobs
  {
    title: 'Nhân Viên Bán Hàng - Cửa Hàng Điện Thoại Dĩ An',
    description: 'Cần tuyển nhân viên bán hàng toàn thời gian. Lương cứng 7 triệu + hoa hồng.',
    type: 'Toàn thời gian',
    location: 'Dĩ An, Bình Dương',
    salary_text: '7,000,000 - 12,000,000 VNĐ',
    workSchedule: 'T2-CN',
    hourlyRate: null,
  },
  {
    title: 'Kế Toán Tổng Hợp - Công Ty Tại Thủ Dầu Một',
    description: 'Tuyển kế toán tổng hợp có kinh nghiệm. Lương 10-15 triệu. Làm việc tại văn phòng.',
    type: 'Toàn thời gian',
    location: 'Thủ Dầu Một, Bình Dương',
    salary_text: '10,000,000 - 15,000,000 VNĐ',
    workSchedule: 'T2-T6, 8h-17h',
    hourlyRate: null,
  },
  
  // More part-time with specific schedules
  {
    title: 'Nhân Viên Bán Hàng Online Part-time Tối',
    description: 'Bán hàng qua Facebook, Zalo. Làm tối 19h-22h. Sinh viên có thể làm tại nhà hoặc shop.',
    type: 'Bán thời gian',
    location: 'Thủ Dầu Một, Bình Dương',
    salary_text: '15k/giờ + hoa hồng',
    workSchedule: '19h-22h',
    hourlyRate: 15000,
  },
];

async function seedDiverseJobs() {
  console.log('🌱 Seeding diverse jobs for filter testing...\n');
  
  // Get categories and companies for reference
  const categoriesSnap = await db.collection('job_categories').get();
  const companiesSnap = await db.collection('companies').get();
  
  const categories = categoriesSnap.docs;
  const companies = companiesSnap.docs;
  
  if (categories.length === 0) {
    console.error('❌ No categories found. Please seed categories first.');
    process.exit(1);
  }
  
  if (companies.length === 0) {
    console.error('❌ No companies found. Please seed companies first.');
    process.exit(1);
  }
  
  const batch = db.batch();
  let count = 0;
  
  for (const jobData of SAMPLE_JOBS) {
    // Random category and company
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    const randomCompany = companies[Math.floor(Math.random() * companies.length)];
    
    const jobRef = db.collection('jobs').doc();
    const job = {
      ...jobData,
      company: randomCompany.id,
      jobCategories: randomCategory.id,
      status: 'active',
      source: 'internal',
      createdAt: new Date().toISOString(),
      applicantCount: 0,
      viewCount: Math.floor(Math.random() * 50),
    };
    
    batch.set(jobRef, job);
    count++;
    
    console.log(`✅ ${jobData.title}`);
    console.log(`   Type: ${jobData.type}`);
    console.log(`   Location: ${jobData.location}`);
    console.log(`   Schedule: ${jobData.workSchedule}`);
    console.log('');
  }
  
  await batch.commit();
  
  console.log(`\n🎉 Successfully seeded ${count} diverse jobs!`);
  console.log(`\nBreakdown:`);
  console.log(`   Part-time: ${SAMPLE_JOBS.filter(j => j.type === 'Bán thời gian').length}`);
  console.log(`   Intern: ${SAMPLE_JOBS.filter(j => j.type === 'Thực tập').length}`);
  console.log(`   Remote: ${SAMPLE_JOBS.filter(j => j.type === 'Từ xa').length}`);
  console.log(`   Full-time: ${SAMPLE_JOBS.filter(j => j.type === 'Toàn thời gian').length}`);
  
  process.exit(0);
}

seedDiverseJobs().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
