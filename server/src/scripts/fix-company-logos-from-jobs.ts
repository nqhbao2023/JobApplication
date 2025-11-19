/**
 * Script to fix company logos by getting them from jobs
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

async function fixCompanyLogos() {
  console.log('🔧 Fixing company logos from jobs...\n');
  
  // Get all companies
  const companiesSnap = await db.collection('companies').get();
  let updatedCount = 0;
  let skippedCount = 0;
  
  for (const companyDoc of companiesSnap.docs) {
    const companyId = companyDoc.id;
    const companyData = companyDoc.data();
    
    // Skip if company already has a real logo (not placeholder)
    if (companyData.image && !companyData.image.includes('placehold.co') && !companyData.image.includes('ui-avatars')) {
      console.log(`✓ Skipping ${companyData.name} - already has real logo`);
      skippedCount++;
      continue;
    }
    
    // Find a job from this company that has a logo
    const jobSnap = await db.collection('jobs')
      .where('company', '==', companyId)
      .limit(1)
      .get();
    
    if (jobSnap.empty) {
      console.log(`⚠️  No jobs found for company: ${companyData.name}`);
      continue;
    }
    
    const jobData = jobSnap.docs[0].data();
    const companyLogo = jobData.companyLogo || jobData.company_logo;
    
    if (!companyLogo || companyLogo.includes('no-image.jpg')) {
      console.log(`⚠️  No valid logo for: ${companyData.name}`);
      continue;
    }
    
    // Update company with logo from job
    await companyDoc.ref.update({
      image: companyLogo,
      source: 'from-job'
    });
    
    console.log(`✅ Updated ${companyData.name}`);
    console.log(`   Old: ${companyData.image}`);
    console.log(`   New: ${companyLogo}\n`);
    updatedCount++;
  }
  
  console.log('\n📊 Summary:');
  console.log(`   Updated: ${updatedCount}`);
  console.log(`   Skipped (already has logo): ${skippedCount}`);
  console.log(`   Total companies: ${companiesSnap.size}`);
  
  process.exit(0);
}

fixCompanyLogos().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
