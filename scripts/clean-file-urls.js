/**
 * Migration Script: Clean file:/// URLs from Firestore
 * 
 * This script removes local file:/// URLs from the following collections:
 * - applied_jobs (cv_url field)
 * - applications (cvUrl field - if exists)
 * - cvs (pdfUrl, fileUrl fields)
 * 
 * These local file paths are invalid and cause errors when trying to view CVs.
 * The script will set these fields to null/undefined so the app can handle them gracefully.
 * 
 * Usage:
 * node scripts/clean-file-urls.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function cleanFileUrls() {
  console.log('🧹 Starting cleanup of file:/// URLs...\n');
  
  let totalCleaned = 0;
  
  // 1. Clean applied_jobs collection
  console.log('📄 Checking applied_jobs collection...');
  const appliedJobsSnapshot = await db.collection('applied_jobs').get();
  let appliedJobsCleaned = 0;
  
  for (const doc of appliedJobsSnapshot.docs) {
    const data = doc.data();
    
    if (data.cv_url && data.cv_url.startsWith('file:///')) {
      console.log(`  ❌ Found invalid cv_url in ${doc.id}: ${data.cv_url.substring(0, 50)}...`);
      
      await doc.ref.update({
        cv_url: admin.firestore.FieldValue.delete(), // Remove the field
        cv_path: admin.firestore.FieldValue.delete(), // Also remove cv_path if exists
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
      
      appliedJobsCleaned++;
      totalCleaned++;
    }
  }
  
  console.log(`  ✅ Cleaned ${appliedJobsCleaned} records in applied_jobs\n`);
  
  // 2. Clean applications collection (if exists)
  console.log('📄 Checking applications collection...');
  const applicationsSnapshot = await db.collection('applications').get();
  let applicationsCleaned = 0;
  
  for (const doc of applicationsSnapshot.docs) {
    const data = doc.data();
    
    if (data.cvUrl && data.cvUrl.startsWith('file:///')) {
      console.log(`  ❌ Found invalid cvUrl in ${doc.id}: ${data.cvUrl.substring(0, 50)}...`);
      
      await doc.ref.update({
        cvUrl: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      applicationsCleaned++;
      totalCleaned++;
    }
  }
  
  console.log(`  ✅ Cleaned ${applicationsCleaned} records in applications\n`);
  
  // 3. Clean cvs collection
  console.log('📄 Checking cvs collection...');
  const cvsSnapshot = await db.collection('cvs').get();
  let cvsCleaned = 0;
  
  for (const doc of cvsSnapshot.docs) {
    const data = doc.data();
    let needsUpdate = false;
    const updates = {};
    
    if (data.pdfUrl && data.pdfUrl.startsWith('file:///')) {
      console.log(`  ❌ Found invalid pdfUrl in CV ${doc.id}: ${data.pdfUrl.substring(0, 50)}...`);
      updates.pdfUrl = admin.firestore.FieldValue.delete();
      needsUpdate = true;
    }
    
    if (data.fileUrl && data.fileUrl.startsWith('file:///')) {
      console.log(`  ❌ Found invalid fileUrl in CV ${doc.id}: ${data.fileUrl.substring(0, 50)}...`);
      updates.fileUrl = admin.firestore.FieldValue.delete();
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      updates.updatedAt = new Date().toISOString();
      await doc.ref.update(updates);
      cvsCleaned++;
      totalCleaned++;
    }
  }
  
  console.log(`  ✅ Cleaned ${cvsCleaned} records in cvs\n`);
  
  // Summary
  console.log('═'.repeat(50));
  console.log(`✅ Cleanup completed!`);
  console.log(`   Total records cleaned: ${totalCleaned}`);
  console.log(`   - applied_jobs: ${appliedJobsCleaned}`);
  console.log(`   - applications: ${applicationsCleaned}`);
  console.log(`   - cvs: ${cvsCleaned}`);
  console.log('═'.repeat(50));
}

// Run the cleanup
cleanFileUrls()
  .then(() => {
    console.log('\n✅ Migration complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
