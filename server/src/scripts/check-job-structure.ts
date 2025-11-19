/**
 * Check job data structure for filters
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

async function checkJobStructure() {
  console.log('🔍 Checking job structure for filters...\n');
  
  const jobsSnap = await db.collection('jobs').limit(10).get();
  
  console.log(`📊 Total jobs sampled: ${jobsSnap.size}\n`);
  
  // Analysis
  let hasType = 0;
  let hasWorkSchedule = 0;
  let hasHourlyRate = 0;
  let hasLocation = 0;
  let hasSalaryText = 0;
  
  const types: Set<string> = new Set();
  const locations: Set<string> = new Set();
  
  jobsSnap.docs.forEach((doc, index) => {
    const data = doc.data();
    
    if (index < 3) {
      console.log(`[${index + 1}] ${data.title}`);
      console.log(`   Type: ${data.type || 'N/A'}`);
      console.log(`   Location: ${data.location || 'N/A'}`);
      console.log(`   Work Schedule: ${data.workSchedule || 'N/A'}`);
      console.log(`   Salary: ${data.salary || data.salary_text || 'N/A'}`);
      console.log(`   Hourly Rate: ${data.hourlyRate || 'N/A'}`);
      console.log('');
    }
    
    if (data.type) {
      hasType++;
      types.add(data.type);
    }
    if (data.workSchedule) hasWorkSchedule++;
    if (data.hourlyRate) hasHourlyRate++;
    if (data.location) {
      hasLocation++;
      locations.add(data.location);
    }
    if (data.salary_text) hasSalaryText++;
  });
  
  console.log('\n📈 Statistics:');
  console.log(`   Jobs with type: ${hasType}/${jobsSnap.size} (${(hasType/jobsSnap.size*100).toFixed(0)}%)`);
  console.log(`   Jobs with location: ${hasLocation}/${jobsSnap.size} (${(hasLocation/jobsSnap.size*100).toFixed(0)}%)`);
  console.log(`   Jobs with workSchedule: ${hasWorkSchedule}/${jobsSnap.size} (${(hasWorkSchedule/jobsSnap.size*100).toFixed(0)}%)`);
  console.log(`   Jobs with hourlyRate: ${hasHourlyRate}/${jobsSnap.size} (${(hasHourlyRate/jobsSnap.size*100).toFixed(0)}%)`);
  console.log(`   Jobs with salary_text: ${hasSalaryText}/${jobsSnap.size} (${(hasSalaryText/jobsSnap.size*100).toFixed(0)}%)`);
  
  console.log('\n📝 Unique Types:');
  types.forEach(t => console.log(`   - ${t}`));
  
  console.log('\n📍 Sample Locations:');
  Array.from(locations).slice(0, 5).forEach(l => console.log(`   - ${l}`));
  
  process.exit(0);
}

checkJobStructure().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
