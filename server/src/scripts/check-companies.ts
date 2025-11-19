/**
 * Script to check companies data in Firestore
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

async function checkCompanies() {
  console.log('🔍 Checking companies in Firestore...\n');
  
  const snapshot = await db.collection('companies').limit(10).get();
  
  console.log(`📊 Total companies found: ${snapshot.size}\n`);
  
  snapshot.docs.forEach((doc, index) => {
    const data = doc.data();
    console.log(`[${index + 1}] ${doc.id}`);
    console.log(`   Name: ${data.corp_name || 'N/A'}`);
    console.log(`   Image: ${data.image || 'MISSING'}`);
    console.log(`   Color: ${data.color || 'N/A'}`);
    console.log(`   Source: ${data.source || 'N/A'}`);
    console.log('');
  });
  
  process.exit(0);
}

checkCompanies().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
