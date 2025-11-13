/**
 * Normalize Runner - Chuẩn hóa dữ liệu từ raw → normalized
 */

import * as fs from 'fs';
import * as path from 'path';
import { normalizeJobs, deduplicateJobs } from './normalizer';
import { JobData } from './job-crawler';

async function main() {
  console.log('🔄 Starting data normalization...\n');

  const dataDir = path.join(__dirname, '../../../data');
  const rawFile = path.join(dataDir, 'viecoi-jobs-raw.json');
  const normalizedFile = path.join(dataDir, 'viecoi-jobs-normalized.json');

  // 1. Load raw data
  console.log('📂 Loading raw data...');
  if (!fs.existsSync(rawFile)) {
    console.error('❌ Raw data file not found:', rawFile);
    process.exit(1);
  }

  const rawData: JobData[] = JSON.parse(fs.readFileSync(rawFile, 'utf-8'));
  console.log(`✅ Loaded ${rawData.length} raw jobs\n`);

  // 2. Normalize
  console.log('🔧 Normalizing data...');
  const normalized = normalizeJobs(rawData);
  console.log(`✅ Normalized ${normalized.length} jobs\n`);

  // 3. Deduplicate
  console.log('🔍 Deduplicating...');
  const unique = deduplicateJobs(normalized);
  console.log(`✅ ${unique.length} unique jobs\n`);

  // 4. Stats
  console.log('📊 Statistics:');
  console.log(`  • Raw jobs: ${rawData.length}`);
  console.log(`  • Normalized: ${normalized.length}`);
  console.log(`  • Unique: ${unique.length}`);
  console.log(`  • Duplicates removed: ${normalized.length - unique.length}`);

  // Job types breakdown
  const jobTypes: Record<string, number> = {};
  unique.forEach(job => {
    jobTypes[job.job_type_id] = (jobTypes[job.job_type_id] || 0) + 1;
  });
  console.log('\n📈 Job Types:');
  Object.entries(jobTypes).forEach(([type, count]) => {
    console.log(`  • ${type}: ${count}`);
  });

  // Salary stats
  const withSalary = unique.filter(j => j.salary_min);
  console.log(`\n💰 Salary Info:`);
  console.log(`  • Jobs with salary: ${withSalary.length}/${unique.length}`);
  if (withSalary.length > 0) {
    const avgMin = withSalary.reduce((sum, j) => sum + (j.salary_min || 0), 0) / withSalary.length;
    console.log(`  • Average min salary: ${(avgMin / 1_000_000).toFixed(1)}M VND`);
  }

  // 5. Save
  console.log(`\n💾 Saving to ${normalizedFile}...`);
  fs.writeFileSync(normalizedFile, JSON.stringify(unique, null, 2), 'utf-8');
  console.log('✅ Saved successfully!');

  console.log('\n✨ Normalization completed!');
  console.log(`📄 Output: ${normalizedFile}`);
}

// Run
if (require.main === module) {
  main().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
}

export { main as normalizeRunner };
