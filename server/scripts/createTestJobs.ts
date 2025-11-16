/**
 * Script to create test jobs for 3 job sources:
 * 1. Crawled Job (from external source)
 * 2. Quick Post Job (no-auth submission)
 * 3. Featured Job (premium listing)
 */

import { db } from '../src/config/firebase';
import { FieldValue } from 'firebase-admin/firestore';

async function createTestJobs() {
  console.log('🚀 Creating test jobs...\n');

  // 1. Crawled Job (from viecoi.vn)
  const crawledJob = {
    title: 'Nhân viên phục vụ part-time - Quán Cafe ABC',
    description: 'Cần tuyển nhân viên phục vụ part-time tại quán cafe ABC gần ĐHQG. Làm việc linh hoạt theo ca, lương 25k/giờ.',
    salary: '25,000 VNĐ/giờ',
    location: 'Quận Thủ Đức, TP.HCM',
    jobSource: 'crawled',
    sourceUrl: 'https://viecoi.vn/viec-lam/nhan-vien-phuc-vu-cafe-abc-12345',
    employerId: 'crawled-employer-1',
    companyId: 'cafe-abc',
    company: 'Cafe ABC',
    status: 'active',
    isVerified: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  };

  // 2. Quick Post Job (user submission)
  const quickPostJob = {
    title: 'Gia sư dạy Toán - Lớp 10',
    description: 'Cần tìm gia sư dạy Toán cho học sinh lớp 10, 3 buổi/tuần, mỗi buổi 1.5 giờ. Khu vực gần TDMU.',
    salary: '100,000 VNĐ/buổi',
    location: 'Bình Dương',
    jobSource: 'quick-post',
    contactInfo: {
      phone: '0909123456',
      zalo: '0909123456',
      email: 'parent@example.com',
    },
    workSchedule: 'Thứ 2, 4, 6 - 18h-19h30',
    hourlyRate: 66000, // ~100k/1.5h
    employerId: 'quick-post-user',
    companyId: 'individual',
    company: 'Phụ huynh',
    status: 'active',
    isVerified: true,
    metadata: {
      ip: '192.168.1.100',
      userAgent: 'Mozilla/5.0 Test',
      timestamp: new Date().toISOString(),
    },
    spamScore: 0,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  // 3. Featured Job (premium listing)
  const featuredJob = {
    title: 'Thực tập sinh Marketing - Công ty XYZ',
    description: 'Công ty XYZ tuyển thực tập sinh Marketing. Yêu cầu: Sinh viên năm 3, 4 chuyên ngành Marketing hoặc liên quan. Hỗ trợ 3-5 triệu/tháng + phụ cấp ăn trưa.',
    salary: '3,000,000 - 5,000,000 VNĐ/tháng',
    location: 'Quận 1, TP.HCM',
    jobSource: 'featured',
    isFeatured: true,
    employerId: 'company-xyz-001',
    companyId: 'company-xyz',
    company: 'Công ty TNHH XYZ',
    status: 'active',
    isVerified: true,
    requirements: [
      'Sinh viên năm 3, 4',
      'Chuyên ngành Marketing hoặc liên quan',
      'Thành thạo MS Office',
      'Có kinh nghiệm làm dự án nhóm',
    ],
    benefits: [
      'Hỗ trợ 3-5 triệu/tháng',
      'Phụ cấp ăn trưa',
      'Môi trường chuyên nghiệp',
      'Cơ hội chính thức hóa sau thực tập',
    ],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
  };

  try {
    // Create Crawled Job
    const crawledRef = await db.collection('jobs').add(crawledJob);
    console.log('✅ Created Crawled Job:', crawledRef.id);
    console.log('   Source:', crawledJob.sourceUrl);

    // Create Quick Post Job
    const quickPostRef = await db.collection('jobs').add(quickPostJob);
    console.log('✅ Created Quick Post Job:', quickPostRef.id);
    console.log('   Contact:', quickPostJob.contactInfo.phone);

    // Create Featured Job
    const featuredRef = await db.collection('jobs').add(featuredJob);
    console.log('✅ Created Featured Job:', featuredRef.id);
    console.log('   Company:', featuredJob.company);

    console.log('\n🎉 All test jobs created successfully!');
    console.log('\n📝 Summary:');
    console.log('   - Crawled Job: Will show redirect to external source');
    console.log('   - Quick Post: Will show contact options (Call/Zalo/Email)');
    console.log('   - Featured: Will show standard apply with CV submission');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating test jobs:', error);
    process.exit(1);
  }
}

createTestJobs();
