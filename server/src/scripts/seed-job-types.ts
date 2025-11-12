/**
 * Script để seed job types vào Firestore với ID cố định
 * Và đồng bộ lên Algolia search index
 * 
 * Chạy: ts-node server/src/scripts/seed-job-types.ts
 */

import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Khởi tạo Firebase Admin
if (!admin.apps.length) {
  const serviceAccountPath = path.join(__dirname, '../../serviceAccountKey.json');
  
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('✅ Firebase Admin initialized with service account');
  } else {
    // Fallback: sử dụng biến môi trường
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
    console.log('✅ Firebase Admin initialized with default credentials');
  }
}

const db = admin.firestore();

async function seedJobTypes() {
  try {
    console.log('🌱 Starting job types seed with fixed IDs...\n');

    // Đọc data từ JSON
    const dataPath = path.join(__dirname, '../../data/job-types.vi.json');
    const jobTypes = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

    console.log(`📋 Found ${jobTypes.length} job types to seed`);

    // STEP 1: Seed to Firestore
    console.log('\n📤 Step 1: Seeding to Firestore...');
    const batch = db.batch();
    
    for (const type of jobTypes) {
      const docRef = db.collection('job_types').doc(type.id); // Dùng ID cố định
      
      batch.set(docRef, {
        type_name: type.type_name,
        slug: type.slug,
        icon: type.icon,
        color: type.color,
        description: type.description,
        isSystem: type.isSystem,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true }); // merge: true để không xóa data cũ nếu có
      
      console.log(`  ✓ ${type.id} -> ${type.type_name}`);
    }

    await batch.commit();
    console.log('✅ Firestore seed completed!');

    // STEP 2: Sync to Algolia (optional, không fail nếu không có credentials)
    console.log('\n🔍 Step 2: Syncing to Algolia...');
    try {
      const { isAlgoliaEnabled, getAlgoliaClient, INDEX_NAMES } = await import('../config/algolia');
      
      if (isAlgoliaEnabled()) {
        const client = getAlgoliaClient();
        
        // Chuẩn bị data cho Algolia
        const algoliaObjects = jobTypes.map((type: any) => ({
          objectID: type.id, // Algolia yêu cầu objectID
          type_name: type.type_name,
          slug: type.slug,
          icon: type.icon,
          color: type.color,
          description: type.description,
          isSystem: type.isSystem,
          // Thêm các field để search/filter
          _tags: ['job-type', type.isSystem ? 'system' : 'custom'],
        }));

        // Save objects to Algolia
        await client.saveObjects({
          indexName: INDEX_NAMES.JOB_TYPES,
          objects: algoliaObjects,
        });

        console.log(`✅ Synced ${algoliaObjects.length} job types to Algolia`);
      } else {
        console.log('⚠️  Algolia not configured - skipping sync');
        console.log('   To enable: Set ALGOLIA_APP_ID and ALGOLIA_API_KEY in .env');
      }
    } catch (algoliaError) {
      console.warn('⚠️  Algolia sync failed (non-critical):', algoliaError instanceof Error ? algoliaError.message : algoliaError);
      console.log('   Firestore data is still saved successfully');
    }
    
    console.log('\n✅ Job types seeded successfully!');
    console.log('📊 Summary:');
    console.log(`   - Total: ${jobTypes.length} types`);
    console.log(`   - System types: ${jobTypes.filter((t: any) => t.isSystem).length}`);
    console.log(`   - Firestore: ✅ Done`);
    console.log(`   - Algolia: ${process.env.ALGOLIA_APP_ID ? '✅ Synced' : '⚠️  Skipped'}`);
    console.log('\n💡 Tip: Các type này có ID cố định và đồng bộ với backend validator');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seed failed:', error);
    process.exit(1);
  }
}

// Chạy script
seedJobTypes();
