/**
 * Test quick filters
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

async function testQuickFilters() {
  console.log('🧪 Testing Quick Filters...\n');
  
  const jobsSnap = await db.collection('jobs').where('status', '==', 'active').get();
  const jobs = jobsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
  
  console.log(`📊 Total active jobs: ${jobs.length}\n`);
  
  // Test each filter
  const filters = {
    'Tất cả': jobs,
    'Thực tập': jobs.filter(j => {
      const type = (j.type || '').toLowerCase();
      return type.includes('thực tập') || type.includes('intern');
    }),
    'Bán thời gian': jobs.filter(j => {
      const type = (j.type || '').toLowerCase();
      return type.includes('bán thời gian') || type.includes('part');
    }),
    'Từ xa': jobs.filter(j => {
      const type = (j.type || '').toLowerCase();
      const location = (j.location || '').toLowerCase();
      const title = (j.title || '').toLowerCase();
      const description = (j.description || '').toLowerCase();
      return type.includes('từ xa') || type.includes('remote') ||
             location.includes('remote') || location.includes('từ xa') ||
             title.includes('tại nhà') || description.includes('work from home');
    }),
    'Gần bạn (Bình Dương)': jobs.filter(j => {
      const nearbyKeywords = [
        'thủ dầu một', 'tdm', 'bình dương', 'dĩ an', 'thuận an',
        'tân uyên', 'bàu bàng', 'bến cát', 'phú giáo', 'dầu tiếng'
      ];
      const locationText = ((j.location || '') + ' ' + (j.title || '') + ' ' + (j.description || '')).toLowerCase();
      return nearbyKeywords.some(keyword => locationText.includes(keyword));
    }),
  };
  
  Object.entries(filters).forEach(([filterName, filteredJobs]) => {
    console.log(`📌 ${filterName}: ${filteredJobs.length} jobs`);
    
    if (filteredJobs.length > 0 && filteredJobs.length <= 5) {
      filteredJobs.forEach((job: any) => {
        console.log(`   - ${job.title}`);
        console.log(`     Type: ${job.type || 'N/A'}, Location: ${job.location || 'N/A'}`);
      });
    } else if (filteredJobs.length > 5) {
      filteredJobs.slice(0, 3).forEach((job: any) => {
        console.log(`   - ${job.title} (${job.type})`);
      });
      console.log(`   ... và ${filteredJobs.length - 3} jobs khác`);
    }
    console.log('');
  });
  
  process.exit(0);
}

testQuickFilters().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
