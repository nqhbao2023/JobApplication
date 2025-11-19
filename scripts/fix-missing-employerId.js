// Script để fix các job thiếu employerId
// Chạy: node scripts/fix-missing-employerId.js

const admin = require('firebase-admin');

// Initialize Firebase Admin
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

async function getOrCreateTestEmployer() {
  try {
    // Try to get existing user
    let employerUser;
    try {
      employerUser = await auth.getUserByEmail(TEST_EMPLOYER.email);
      console.log('✅ Found employer user:', employerUser.uid);
    } catch (error) {
      // Create new employer user
      employerUser = await auth.createUser({
        email: TEST_EMPLOYER.email,
        password: TEST_EMPLOYER.password,
        displayName: TEST_EMPLOYER.displayName,
      });
      console.log('✅ Created new employer user:', employerUser.uid);

      // Create user profile in Firestore
      await db.collection('users').doc(employerUser.uid).set({
        uid: employerUser.uid,
        email: TEST_EMPLOYER.email,
        name: TEST_EMPLOYER.displayName,
        role: TEST_EMPLOYER.role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      console.log('✅ Created employer profile in Firestore');
    }

    return employerUser.uid;
  } catch (error) {
    console.error('❌ Failed to get/create employer:', error);
    throw error;
  }
}

async function fixMissingEmployerId() {
  try {
    console.log('🔧 Starting fix for jobs missing employerId...\n');

    // Get test employer
    const employerId = await getOrCreateTestEmployer();
    console.log(`📋 Using employerId: ${employerId}\n`);

    // Get all jobs
    const jobsSnapshot = await db.collection('jobs').get();
    console.log(`📦 Found ${jobsSnapshot.size} total jobs\n`);

    let fixedCount = 0;
    let skippedCount = 0;

    for (const doc of jobsSnapshot.docs) {
      const jobData = doc.data();
      const jobId = doc.id;

      // Check if employerId is missing or empty
      if (!jobData.employerId || jobData.employerId === '') {
        console.log(`🔄 Fixing job: ${jobData.title || 'Untitled'} (${jobId})`);
        
        // Update with test employer ID
        await db.collection('jobs').doc(jobId).update({
          employerId: employerId,
          updated_at: new Date().toISOString(),
        });

        fixedCount++;
        console.log(`   ✅ Updated employerId\n`);
      } else {
        skippedCount++;
        console.log(`   ⏭️  Skipped: ${jobData.title || 'Untitled'} (already has employerId)\n`);
      }
    }

    console.log('\n🎉 Fix completed!');
    console.log(`   ✅ Fixed: ${fixedCount} jobs`);
    console.log(`   ⏭️  Skipped: ${skippedCount} jobs (already valid)`);
    console.log(`\n📧 Test Employer Account:`);
    console.log(`   Email: ${TEST_EMPLOYER.email}`);
    console.log(`   Password: ${TEST_EMPLOYER.password}`);
    console.log(`   EmployerId: ${employerId}`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fix failed:', error);
    process.exit(1);
  }
}

fixMissingEmployerId();
