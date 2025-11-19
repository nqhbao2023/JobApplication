/**
 * FIX Script for Categories & Companies Issues
 * 
 * ISSUE 1: All jobs have jobCategories='other' (string ID) instead of real category document IDs
 * ISSUE 2: Company logos from ui-avatars.com might not load
 * 
 * SOLUTION:
 * 1. Map jobs from 'other' → real category IDs based on job title/description keywords
 * 2. Simplify company image URLs
 */

import * as admin from 'firebase-admin';
import * as path from 'path';

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccountPath = path.join(__dirname, '../../serviceAccountKey.json');
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

/**
 * Category mapping based on keywords in job title/description
 */
const CATEGORY_KEYWORDS_MAP: Record<string, string[]> = {
  // IT / Software
  'EMhKn29MGICMq8hqNVwW': [
    'lập trình', 'developer', 'software', 'it ', 'công nghệ thông tin',
    'blockchain', 'phần mềm', 'web', 'mobile', 'backend', 'frontend'
  ],
  
  // Marketing / Truyền thông
  'dowxcUxpVJlxPYSxqa6T': [
    'marketing', 'quảng cáo', 'facebook ads', 'truyền thông', 'media'
  ],
  
  // Bán hàng / Kinh doanh
  'kNQd5RSgUPyqWOvNxD4p': [
    'bán hàng', 'sale', 'kinh doanh', 'cộng tác viên', 'bất động sản'
  ],
  
  // Kế toán / Kiểm toán
  'zatbunT04VBkjLdXhMGC': [
    'kế toán', 'kiểm toán', 'accounting', 'admin kế toán'
  ],
  
  // Nhân sự
  'tVEmulsKd8gB6DJiNWCF': [
    'nhân sự', 'hr', 'tuyển dụng'
  ],
  
  // Dịch vụ khách hàng
  'ctjK4UXvuKqehg6xJ6cW': [
    'chăm sóc khách hàng', 'cskh', 'customer service', 'trực đơn'
  ],
  
  // Sản xuất / Vận hành
  'GMp6xZxIz0OyUIH0dhEv': [
    'sản xuất', 'lao động', 'vận hành', 'công nhân'
  ],
  
  // Cơ khí / Ô tô
  'lj0wfDHtNEkNRrsdgwwg': [
    'cơ khí', 'kỹ sư', 'engineer', 'ô tô', 'thợ hàn', 'tiện'
  ],
  
  // Logistics / Vận tải
  'z7BG2jFoFYHu8gRhMBul': [
    'logistics', 'kho', 'warehouse', 'giao hàng', 'shipper', 'vận tải'
  ],
  
  // Bảo vệ (categorized as Khác for now)
  'H5gFgAlVHtYeWtLXKIEm': [
    'bảo vệ', 'security', 'giám sát'
  ],
  
  // Y tế / Dược
  'E2IYDdftmE7e0W1QV2mB': [
    'y tế', 'dược', 'healthcare', 'medical'
  ],
  
  // Xây dựng / Kiến trúc
  'hMlfIlq1scCAauCV7NUS': [
    'xây dựng', 'công trình', 'kiến trúc', 'chỉ huy'
  ],
  
  // Ẩm thực / F&B
  'x6HFK3zxq0amLQ115u6I': [
    'đầu bếp', 'bếp', 'nhà hàng', 'f&b', 'ẩm thực'
  ],
  
  // Giáo dục / Đào tạo
  '6kRqEjt22GeTi42epswC': [
    'giáo viên', 'giảng dạy', 'đào tạo', 'giáo dục', 'tiếng anh'
  ],
  
  // Điện / Điện tử
  'Yw6piIZIzR5duNIsHrxx': [
    'điện', 'điện tử', 'lắp đặt', 'bảo trì', 'sửa chữa thiết bị'
  ],
  
  // Thiết kế
  'VofmuR3reWuvTyS7d4My': [
    'thiết kế', 'design', 'trang trí'
  ],
};

/**
 * Match job to category based on title/description
 */
function matchJobToCategory(job: any): string {
  const searchText = `${job.title} ${job.description || ''}`.toLowerCase();
  
  for (const [categoryId, keywords] of Object.entries(CATEGORY_KEYWORDS_MAP)) {
    for (const keyword of keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        return categoryId;
      }
    }
  }
  
  // Default: Khác (Other)
  return 'H5gFgAlVHtYeWtLXKIEm';
}

/**
 * Fix company image URLs
 */
async function fixCompanyImages() {
  console.log('\n🖼️  Fixing company images...\n');
  
  const companiesSnap = await db.collection('companies').get();
  let updated = 0;
  
  for (const doc of companiesSnap.docs) {
    const data = doc.data();
    
    // Only fix auto-generated companies with ui-avatars.com URLs
    if (data.source === 'auto-generated' && data.image?.includes('ui-avatars.com')) {
      const companyName = data.corp_name || 'Company';
      
      // Use simpler placeholder
      const newImage = `https://placehold.co/200x200/${data.color?.replace('#', '') || '4A80F0'}/white?text=${encodeURIComponent(companyName.substring(0, 2).toUpperCase())}`;
      
      await db.collection('companies').doc(doc.id).update({
        image: newImage
      });
      
      console.log(`✅ Updated: ${companyName}`);
      console.log(`   Old: ${data.image.substring(0, 80)}...`);
      console.log(`   New: ${newImage}`);
      console.log('');
      
      updated++;
    }
  }
  
  console.log(`📊 Updated ${updated} company images\n`);
}

/**
 * Fix job categories
 */
async function fixJobCategories() {
  console.log('\n📁 Fixing job categories...\n');
  
  const jobsSnap = await db.collection('jobs')
    .where('jobCategories', '==', 'other')
    .get();
  
  console.log(`Found ${jobsSnap.size} jobs with category='other'\n`);
  
  let updated = 0;
  const categoryCount: Record<string, number> = {};
  
  for (const doc of jobsSnap.docs) {
    const jobData = doc.data();
    const newCategoryId = matchJobToCategory(jobData);
    
    await db.collection('jobs').doc(doc.id).update({
      jobCategories: newCategoryId
    });
    
    categoryCount[newCategoryId] = (categoryCount[newCategoryId] || 0) + 1;
    
    console.log(`✅ ${jobData.title}`);
    console.log(`   Category ID: ${newCategoryId}`);
    console.log('');
    
    updated++;
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Total updated: ${updated}`);
  console.log(`\n   Distribution:`);
  
  for (const [catId, count] of Object.entries(categoryCount)) {
    // Get category name
    const catDoc = await db.collection('job_categories').doc(catId).get();
    const catName = catDoc.exists ? catDoc.data()?.category_name : 'Unknown';
    console.log(`   ${catName}: ${count} jobs`);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting fix process...\n');
  
  try {
    // Fix company images
    await fixCompanyImages();
    
    // Fix job categories
    await fixJobCategories();
    
    console.log('\n✅ All fixes completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run
if (require.main === module) {
  main();
}
