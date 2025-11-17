/**
 * Algolia Search Service - Frontend
 * Sử dụng Search-Only API Key (KHÔNG dùng Admin Key!)
 */

import { algoliasearch, SearchClient } from 'algoliasearch';

// Configuration
const ALGOLIA_APP_ID = '3JGCR12NR5';
const ALGOLIA_SEARCH_KEY = '6011dda6f3a88ab936e3ae448da2efca'; // Search-Only Key

// Index names (phải khớp với backend)
export const INDEX_NAMES = {
  JOBS: 'jobs',
  JOB_TYPES: 'job_types',
  COMPANIES: 'companies',
} as const;

// Initialize Algolia client
let client: SearchClient | null = null;

try {
  client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);
  console.log('✅ Algolia search client initialized');
} catch (error) {
  console.error('❌ Failed to initialize Algolia:', error);
}

/**
 * Search jobs với filters
 */
export async function searchJobs(params: {
  query?: string;
  jobType?: string;
  category?: string;
  companyId?: string;
  location?: string;
  page?: number;
  hitsPerPage?: number;
}) {
  if (!client) {
    throw new Error('Algolia client not initialized');
  }

  const {
    query = '',
    jobType,
    category,
    companyId,
    location,
    page = 0,
    hitsPerPage = 20,
  } = params;

  // Build filters
  const filters: string[] = [];
  
  if (jobType) filters.push(`job_type_id:"${jobType}"`);
  if (category) filters.push(`category:"${category}"`);
  if (companyId) filters.push(`companyId:"${companyId}"`);
  if (location) filters.push(`location:"${location}"`);
  
  // Không filter status vì job crawl có thể là draft
  // filters.push('status:active');

  const filterString = filters.length > 0 ? filters.join(' AND ') : '';

  console.log('🔍 Algolia search:', { query, filters: filterString });

  try {
    const result = await client.search({
      requests: [
        {
          indexName: INDEX_NAMES.JOBS,
          query: query.trim(),
          filters: filterString,
          page,
          hitsPerPage,
          attributesToRetrieve: [
            'objectID',
            'title',
            'company',
            'companyId',
            'location',
            'type',
            'category',
            'salary',
            'skills',
            'description',
            'createdAt',
          ],
          attributesToHighlight: ['title', 'company', 'description'],
        },
      ],
    });

    const searchResult: any = result.results[0];
    const hits = searchResult.hits || [];
    const nbHits = searchResult.nbHits || 0;
    const nbPages = searchResult.nbPages || 0;

    console.log(`✅ Found ${nbHits} jobs (page ${page + 1}/${nbPages})`);

    return {
      jobs: hits.map((hit: any) => ({
        $id: hit.objectID,
        title: hit.title,
        company: hit.company,
        companyId: hit.companyId,
        location: hit.location,
        type: hit.type,
        category: hit.category,
        salary: hit.salary,
        skills: hit.skills || [],
        description: hit.description,
        createdAt: hit.createdAt,
        // Highlight matches
        _highlightResult: hit._highlightResult,
      })),
      total: nbHits,
      page,
      nbPages,
    };
  } catch (error) {
    console.error('❌ Algolia search error:', error);
    throw error;
  }
}

/**
 * Get search suggestions/autocomplete
 */
export async function getJobSuggestions(query: string, limit: number = 5) {
  if (!client || !query.trim()) {
    return [];
  }

  try {
    const result = await client.search({
      requests: [
        {
          indexName: INDEX_NAMES.JOBS,
          query: query.trim(),
          hitsPerPage: limit,
          attributesToRetrieve: ['title', 'company'],
        },
      ],
    });

    const searchResult: any = result.results[0];
    const hits = searchResult.hits || [];

    return hits.map((hit: any) => ({
      title: hit.title,
      company: hit.company,
    }));
  } catch (error) {
    console.error('❌ Suggestions error:', error);
    return [];
  }
}

/**
 * Get facet values (for filter dropdowns)
 */
export async function getFacetValues(facetName: 'jobType' | 'jobCategory' | 'jobLocation') {
  if (!client) {
    throw new Error('Algolia client not initialized');
  }

  try {
    const result = await client.search({
      requests: [
        {
          indexName: INDEX_NAMES.JOBS,
          query: '',
          hitsPerPage: 0,
          facets: [facetName],
        },
      ],
    });

    const searchResult: any = result.results[0];
    const facets = searchResult.facets;
    
    if (!facets || !facets[facetName]) {
      return [];
    }

    // Convert facet object to array
    return Object.entries(facets[facetName]).map(([value, count]) => ({
      value,
      count: count as number,
    }));
  } catch (error) {
    console.error('❌ Facets error:', error);
    return [];
  }
}

/**
 * Check if Algolia is available
 */
export function isAlgoliaAvailable(): boolean {
  return client !== null;
}
