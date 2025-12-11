/**
 * Algolia Search Configuration
 * Sử dụng cho tìm kiếm nâng cao jobs, companies, job_types
 * 
 * Note: Sử dụng Algolia v5 API
 */

import { algoliasearch } from 'algoliasearch';

// Kiểm tra environment variables
const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID || '';
const ALGOLIA_API_KEY = process.env.ALGOLIA_API_KEY || '';

if (!ALGOLIA_APP_ID || !ALGOLIA_API_KEY) {
  console.warn('⚠️  Algolia credentials not found. Search features will be disabled.');
  console.warn('   Set ALGOLIA_APP_ID and ALGOLIA_API_KEY in .env file');
}

// Khởi tạo Algolia client
let algoliaClient: ReturnType<typeof algoliasearch> | null = null;

try {
  if (ALGOLIA_APP_ID && ALGOLIA_API_KEY) {
    algoliaClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_API_KEY);
  }
} catch (error) {
  console.error('❌ Failed to initialize Algolia:', error);
}

/**
 * Helper function để kiểm tra Algolia có sẵn sàng không
 */
export function isAlgoliaEnabled(): boolean {
  return algoliaClient !== null;
}

/**
 * Helper function để log warning nếu Algolia bị disabled
 */
export function warnIfAlgoliaDisabled(operation: string): void {
  if (!isAlgoliaEnabled()) {
    console.warn(`⚠️  Algolia disabled: ${operation} skipped`);
  }
}

/**
 * Get Algolia client instance
 */
export function getAlgoliaClient() {
  if (!algoliaClient) {
    throw new Error('Algolia client not initialized. Check your credentials.');
  }
  return algoliaClient;
}

// Index names (constants)
export const INDEX_NAMES = {
  JOBS: 'jobs',
  COMPANIES: 'companies',
  JOB_TYPES: 'job_types',
  JOB_CATEGORIES: 'job_categories',
} as const;

// Export client for advanced usage
export { algoliaClient };

// Debug log khi module được load
if (isAlgoliaEnabled()) {
  console.log(' Algolia initialized successfully');
  console.log('   - App ID:', ALGOLIA_APP_ID);
  console.log('   - Available indices:', Object.values(INDEX_NAMES).join(', '));
} else {
  console.log('  Algolia is disabled (missing credentials)');
}

