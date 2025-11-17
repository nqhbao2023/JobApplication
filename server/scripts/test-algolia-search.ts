/**
 * Test Algolia Search
 * Kiểm tra xem Algolia có trả về kết quả không
 */

const { algoliasearch } = require('algoliasearch');
const dotenv = require('dotenv');

dotenv.config();

const client = algoliasearch(
  process.env.ALGOLIA_APP_ID || '3JGCR12NR5',
  process.env.ALGOLIA_API_KEY || ''
);

async function testSearch() {
  try {
    console.log('🔍 Testing Algolia search...\n');

    // Test 1: Search all jobs (empty query)
    console.log('Test 1: Search all jobs');
    const result1 = await client.search({
      requests: [{
        indexName: 'jobs',
        query: '',
        hitsPerPage: 10,
      }],
    });
    console.log(`✅ Found ${result1.results[0].nbHits} total jobs\n`);

    // Test 2: Search with keyword
    console.log('Test 2: Search with keyword "NHÂN"');
    const result2 = await client.search({
      requests: [{
        indexName: 'jobs',
        query: 'NHÂN',
        hitsPerPage: 10,
      }],
    });
    const searchResult2: any = result2.results[0];
    console.log(`✅ Found ${searchResult2.nbHits} jobs`);
    if (searchResult2.hits.length > 0) {
      console.log('First result:', searchResult2.hits[0].title);
    }
    console.log();

    // Test 3: Search with keyword "Tuyển"
    console.log('Test 3: Search with keyword "Tuyển"');
    const result3 = await client.search({
      requests: [{
        indexName: 'jobs',
        query: 'Tuyển',
        hitsPerPage: 10,
      }],
    });
    const searchResult3: any = result3.results[0];
    console.log(`✅ Found ${searchResult3.nbHits} jobs`);
    if (searchResult3.hits.length > 0) {
      console.log('First result:', searchResult3.hits[0].title);
    }
    console.log();

    // Test 4: Browse first 5 records
    console.log('Test 4: Browse all records');
    const browseResult = await client.search({
      requests: [{
        indexName: 'jobs',
        query: '',
        hitsPerPage: 100,
      }],
    });
    
    const searchResult4: any = browseResult.results[0];
    const allHits = searchResult4.hits || [];
    
    console.log(`✅ Total records in index: ${allHits.length}`);
    console.log('\nAll job titles:');
    allHits.forEach((hit: any, i: number) => {
      console.log(`${i + 1}. ${hit.title}`);
      console.log(`   Status: ${hit.status}`);
      console.log(`   Fields:`, Object.keys(hit).slice(0, 10).join(', '));
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testSearch();
