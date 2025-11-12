require('dotenv').config();
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('../../serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Load companies data
const companiesData = require('../../data/companies.vi.json');

async function seedCompanies() {
  try {
    console.log('🏢 Starting companies seed...');
    console.log(`📊 Total companies to process: ${companiesData.length}`);

    // Create batch for efficient writes
    const batch = db.batch();
    let processedCount = 0;

    // Process each company
    for (const company of companiesData) {
      const { id, ...companyData } = company;
      
      // Add server timestamp
      const docData = {
        ...companyData,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Use fixed ID for consistent references
      const docRef = db.collection('companies').doc(id);
      batch.set(docRef, docData, { merge: true });
      
      processedCount++;
      console.log(`  ✅ ${processedCount}/${companiesData.length}: ${id} - ${companyData.corp_name}`);
    }

    // Commit batch
    console.log('💾 Committing batch write to Firestore...');
    await batch.commit();
    
    console.log('✅ Companies seeded successfully!');
    console.log(`📈 Statistics:`);
    console.log(`   - Total processed: ${processedCount} companies`);
    console.log(`   - System companies: ${companiesData.filter((c: any) => c.isSystem).length}`);
    console.log(`   - Industries covered: ${[...new Set(companiesData.map((c: any) => c.industry))].length}`);

    // STEP 2: Sync to Algolia (optional, không fail nếu không có credentials)
    console.log('\n🔍 Step 2: Syncing to Algolia...');
    try {
      const { isAlgoliaEnabled, getAlgoliaClient, INDEX_NAMES } = await import('../config/algolia');
      
      if (isAlgoliaEnabled()) {
        const client = getAlgoliaClient();
        
        // Chuẩn bị data cho Algolia
        const algoliaObjects = companiesData.map((company: any) => ({
          objectID: company.id, // Algolia yêu cầu objectID
          corp_name: company.corp_name,
          city: company.city,
          nation: company.nation,
          corp_description: company.corp_description,
          website: company.website,
          industry: company.industry,
          employees: company.employees,
          founded: company.founded,
          image: company.image,
          color: company.color,
          isSystem: company.isSystem,
          // Thêm các field để search/filter
          _tags: ['company', company.isSystem ? 'system' : 'custom', company.industry],
        }));

        // Save objects to Algolia
        await client.saveObjects({
          indexName: INDEX_NAMES.COMPANIES,
          objects: algoliaObjects,
        });

        console.log(`✅ Synced ${algoliaObjects.length} companies to Algolia`);
      } else {
        console.log('⚠️  Algolia not configured - skipping sync');
        console.log('   To enable: Set ALGOLIA_APP_ID and ALGOLIA_API_KEY in .env');
      }
    } catch (algoliaError) {
      console.warn('⚠️  Algolia sync failed (non-critical):', algoliaError instanceof Error ? algoliaError.message : algoliaError);
      console.log('   Firestore data is still saved successfully');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedCompanies();
}