// Script để seed dữ liệu mẫu vào Firestore
// Chạy: node scripts/seedFirestore.js

const admin = require('firebase-admin');

// Initialize Firebase Admin
// Service account key từ Firebase Console → Project Settings → Service Accounts
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const sampleCompanies = [
  {
    id: 'fpt-software',
    corp_name: 'FPT Software',
    city: 'Hà Nội',
    nation: 'Việt Nam',
    corp_description: 'Công ty phần mềm hàng đầu Việt Nam',
    image: 'https://placehold.co/200x200/0072BC/white?text=FPT',
    color: '#0072BC',
    created_at: new Date().toISOString(),
  },
  {
    id: 'vng-corp',
    corp_name: 'VNG Corporation',
    city: 'Hồ Chí Minh',
    nation: 'Việt Nam',
    corp_description: 'Tập đoàn công nghệ giải trí hàng đầu',
    image: 'https://placehold.co/200x200/FF6B00/white?text=VNG',
    color: '#FF6B00',
    created_at: new Date().toISOString(),
  },
  {
    id: 'tiki',
    corp_name: 'Tiki Corporation',
    city: 'Hồ Chí Minh',
    nation: 'Việt Nam',
    corp_description: 'Sàn thương mại điện tử hàng đầu',
    image: 'https://placehold.co/200x200/1A94FF/white?text=TIKI',
    color: '#1A94FF',
    created_at: new Date().toISOString(),
  },
];

const sampleJobTypes = [
  { id: 'full-time', type_name: 'Full-time', icon: '💼' },
  { id: 'part-time', type_name: 'Part-time', icon: '⏰' },
  { id: 'contract', type_name: 'Contract', icon: '📝' },
  { id: 'internship', type_name: 'Internship', icon: '🎓' },
];

const sampleJobCategories = [
  { id: 'it-software', category_name: 'IT / Phần mềm', icon: '💻' },
  { id: 'marketing', category_name: 'Marketing / Truyền thông', icon: '📢' },
  { id: 'sales', category_name: 'Kinh doanh / Bán hàng', icon: '💰' },
  { id: 'hr', category_name: 'Nhân sự / Hành chính', icon: '👥' },
  { id: 'finance', category_name: 'Tài chính / Kế toán', icon: '💵' },
  { id: 'design', category_name: 'Thiết kế / Sáng tạo', icon: '🎨' },
  { id: 'healthcare', category_name: 'Y tế / Dược', icon: '⚕️' },
];

async function seedData() {
  try {
    console.log('🌱 Starting seed...');

    // Seed companies
    console.log('📦 Seeding companies...');
    for (const company of sampleCompanies) {
      await db.collection('companies').doc(company.id).set(company);
      console.log(`✅ Created company: ${company.corp_name}`);
    }

    // Seed job types
    console.log('💼 Seeding job types...');
    for (const type of sampleJobTypes) {
      await db.collection('job_types').doc(type.id).set(type);
      console.log(`✅ Created job type: ${type.type_name}`);
    }

    // Seed job categories
    console.log('📂 Seeding job categories...');
    for (const category of sampleJobCategories) {
      await db.collection('job_categories').doc(category.id).set(category);
      console.log(`✅ Created job category: ${category.category_name}`);
    }

    console.log('🎉 Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seedData();
