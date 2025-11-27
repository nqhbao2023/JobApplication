/**
 * Migration Script: Add jobType and posterId to existing jobs
 * 
 * This script updates existing jobs in Firestore to include:
 * - jobType: 'employer_seeking' | 'candidate_seeking'
 * - posterId: unified field for poster identification
 * 
 * Run with: npx ts-node src/scripts/migrate-job-types.ts
 */

import { db } from '../config/firebase';

interface MigrationStats {
  total: number;
  updated: number;
  skipped: number;
  errors: number;
}

async function migrateJobTypes(): Promise<void> {
  console.log('🚀 Starting job type migration...\n');
  
  const stats: MigrationStats = {
    total: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
  };

  try {
    const jobsSnapshot = await db.collection('jobs').get();
    stats.total = jobsSnapshot.docs.length;
    
    console.log(`📊 Found ${stats.total} jobs to process\n`);

    // Process in batches of 500 (Firestore limit)
    const batchSize = 500;
    let batch = db.batch();
    let batchCount = 0;

    for (const doc of jobsSnapshot.docs) {
      const data = doc.data();
      const jobId = doc.id;

      // Skip if already has jobType
      if (data.jobType) {
        console.log(`⏭️  Skip ${jobId}: already has jobType=${data.jobType}`);
        stats.skipped++;
        continue;
      }

      try {
        const updates: any = {};

        // Determine jobType based on source
        if (data.source === 'quick-post' || data.jobSource === 'quick-post') {
          updates.jobType = 'candidate_seeking';
          updates.posterId = data.posterId || null; // Quick posts may not have posterId
          console.log(`🔄 ${jobId}: source=quick-post → jobType=candidate_seeking`);
        } else {
          // viecoi, internal, or no source = employer_seeking
          updates.jobType = 'employer_seeking';
          updates.posterId = data.employerId || data.ownerId || null;
          console.log(`🔄 ${jobId}: source=${data.source || 'N/A'} → jobType=employer_seeking, posterId=${updates.posterId || 'null'}`);
        }

        batch.update(doc.ref, updates);
        batchCount++;
        stats.updated++;

        // Commit batch when reaching limit
        if (batchCount >= batchSize) {
          await batch.commit();
          console.log(`\n✅ Committed batch of ${batchCount} updates\n`);
          batch = db.batch();
          batchCount = 0;
        }
      } catch (error: any) {
        console.error(`❌ Error processing ${jobId}:`, error.message);
        stats.errors++;
      }
    }

    // Commit remaining batch
    if (batchCount > 0) {
      await batch.commit();
      console.log(`\n✅ Committed final batch of ${batchCount} updates\n`);
    }

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total jobs:    ${stats.total}`);
    console.log(`Updated:       ${stats.updated}`);
    console.log(`Skipped:       ${stats.skipped}`);
    console.log(`Errors:        ${stats.errors}`);
    console.log('='.repeat(50));

    if (stats.errors === 0) {
      console.log('\n✅ Migration completed successfully!');
    } else {
      console.log(`\n⚠️  Migration completed with ${stats.errors} errors`);
    }

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Dry run mode - just log what would be changed
async function dryRun(): Promise<void> {
  console.log('🔍 DRY RUN MODE - No changes will be made\n');
  
  const jobsSnapshot = await db.collection('jobs').get();
  console.log(`📊 Found ${jobsSnapshot.docs.length} jobs\n`);

  let candidateSeekingCount = 0;
  let employerSeekingCount = 0;
  let alreadyMigratedCount = 0;

  for (const doc of jobsSnapshot.docs) {
    const data = doc.data();
    
    if (data.jobType) {
      alreadyMigratedCount++;
      continue;
    }

    if (data.source === 'quick-post' || data.jobSource === 'quick-post') {
      candidateSeekingCount++;
      console.log(`  ${doc.id}: quick-post → candidate_seeking`);
    } else {
      employerSeekingCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 DRY RUN SUMMARY');
  console.log('='.repeat(50));
  console.log(`Already migrated:    ${alreadyMigratedCount}`);
  console.log(`Would set employer_seeking: ${employerSeekingCount}`);
  console.log(`Would set candidate_seeking: ${candidateSeekingCount}`);
  console.log('='.repeat(50));
}

// Main execution
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run') || args.includes('-d');

if (isDryRun) {
  dryRun()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
} else {
  migrateJobTypes()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
