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
const auth = admin.auth();

// Test employer account
const TEST_EMPLOYER = {
  email: 'employer@test.com',
  password: 'test123456',
  displayName: 'Test Employer',
  role: 'employer',
};

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

async function createTestEmployer() {
  try {
    // Try to get existing user
    let employerUser;
    try {
      employerUser = await auth.getUserByEmail(TEST_EMPLOYER.email);
      console.log('✅ Employer user already exists:', employerUser.uid);
    } catch (error) {
      // Create new employer user
      employerUser = await auth.createUser({
        email: TEST_EMPLOYER.email,
        password: TEST_EMPLOYER.password,
        displayName: TEST_EMPLOYER.displayName,
      });
      console.log('✅ Created employer user:', employerUser.uid);
    }

    // Create/Update user profile in Firestore
    await db.collection('users').doc(employerUser.uid).set({
      uid: employerUser.uid,
      email: TEST_EMPLOYER.email,
      name: TEST_EMPLOYER.displayName,
      role: TEST_EMPLOYER.role,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { merge: true });

    console.log('✅ Employer profile created in Firestore');
    return employerUser.uid;
  } catch (error) {
    console.error('❌ Failed to create employer:', error);
    throw error;
  }
}

async function seedData() {
  try {
    console.log('🌱 Starting seed...');

    // Create test employer first
    console.log('👤 Creating test employer...');
    const employerId = await createTestEmployer();

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

    // Seed sample jobs
    console.log('💼 Seeding sample jobs...');
    const sampleJobs = [
      {
        title: 'Senior React Native Developer',
        company: 'fpt-software',
        employerId: employerId,
        description: 'Tìm kiếm React Native Developer có kinh nghiệm để phát triển ứng dụng mobile.',
        requirements: 'Có ít nhất 2 năm kinh nghiệm với React Native. Thành thạo JavaScript/TypeScript.',
        location: 'Hà Nội',
        salary: { min: 20000000, max: 35000000, currency: 'VND' },
        type: 'Toàn thời gian',
        jobCategories: 'it-software',
        status: 'active',
        source: 'internal',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        title: 'Marketing Executive',
        company: 'vng-corp',
        employerId: employerId,
        description: 'Chuyên viên Marketing có kinh nghiệm trong lĩnh vực digital marketing.',
        requirements: 'Kinh nghiệm 1-2 năm. Thành thạo Facebook Ads, Google Ads.',
        location: 'Hồ Chí Minh',
        salary: { min: 12000000, max: 18000000, currency: 'VND' },
        type: 'Toàn thời gian',
        jobCategories: 'marketing',
        status: 'active',
        source: 'internal',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        title: 'UI/UX Designer Intern',
        company: 'tiki',
        employerId: employerId,
        description: 'Thực tập sinh thiết kế UI/UX cho ứng dụng mobile và web.',
        requirements: 'Sinh viên năm 3-4. Biết sử dụng Figma, Adobe XD.',
        location: 'Hồ Chí Minh',
        salary: { min: 3000000, max: 5000000, currency: 'VND' },
        type: 'Thực tập',
        jobCategories: 'design',
        status: 'active',
        source: 'internal',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    for (const job of sampleJobs) {
      const docRef = await db.collection('jobs').add(job);
      console.log(`✅ Created job: ${job.title} (ID: ${docRef.id})`);
    }

    console.log('🎉 Seed completed successfully!');
    console.log('📧 Test Employer Login:');
    console.log(`   Email: ${TEST_EMPLOYER.email}`);
    console.log(`   Password: ${TEST_EMPLOYER.password}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seedData();
