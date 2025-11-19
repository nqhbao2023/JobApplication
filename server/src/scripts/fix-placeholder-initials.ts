/**
 * Fix placeholder logos to use better initials
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

function generateBetterInitials(companyName: string | undefined): string {
  if (!companyName) return 'CO';
  
  // Remove common prefixes
  let cleaned = companyName
    .replace(/^(CÔNG TY|CTY|CÔNG TY TNHH|CÔNG TY CỔ PHẦN|CHI NHÁNH)/gi, '')
    .trim();
  
  // Get significant words (not common words)
  const words = cleaned.split(/\s+/).filter(word => 
    word.length > 2 && 
    !['TNHH', 'CP', 'MTV', 'TẠI', 'VÀ', 'CỦA', 'VỚI'].includes(word.toUpperCase())
  );
  
  if (words.length === 0) {
    // Fallback to first 2 chars of original name
    return companyName.substring(0, 2).toUpperCase();
  }
  
  // Take first letter of first 2 significant words
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  
  return (words[0][0] + words[1][0]).toUpperCase();
}

async function fixPlaceholderLogos() {
  console.log('🔧 Fixing placeholder logos with better initials...\n');
  
  const companiesSnap = await db.collection('companies').get();
  let updatedCount = 0;
  
  for (const companyDoc of companiesSnap.docs) {
    const data = companyDoc.data();
    
    // Only update if using placeholder
    if (!data.image || !data.image.includes('placehold.co')) {
      continue;
    }
    
    const companyName = data.corp_name || data.name || 'Company';
    const initials = generateBetterInitials(companyName);
    const color = data.color?.replace('#', '') || '4A90E2';
    const newImage = `https://placehold.co/200x200/${color}/white?text=${encodeURIComponent(initials)}`;
    
    await companyDoc.ref.update({
      image: newImage
    });
    
    console.log(`✅ ${companyName}`);
    console.log(`   Initials: ${initials}`);
    console.log(`   Image: ${newImage}\n`);
    updatedCount++;
  }
  
  console.log(`\n📊 Updated ${updatedCount} companies`);
  process.exit(0);
}

fixPlaceholderLogos().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
