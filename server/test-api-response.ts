/**
 * Test API Response - Check if company_logo is returned
 */
import axios from 'axios';

async function testAPI() {
  try {
    console.log('🧪 Testing API response...\n');
    
    const response = await axios.get('http://localhost:3000/api/jobs?limit=5');
    const jobs = response.data.jobs;
    
    console.log(`✅ Fetched ${jobs.length} jobs\n`);
    
    jobs.forEach((job: any, index: number) => {
      console.log(`Job #${index + 1}:`);
      console.log(`  Title: ${job.title}`);
      console.log(`  Source: ${job.source || 'internal'}`);
      console.log(`  Company Name: ${job.company_name || job.company || 'N/A'}`);
      console.log(`  Company Logo: ${job.company_logo || 'N/A'}`);
      console.log(`  Image: ${job.image || 'N/A'}`);
      console.log('');
    });
    
    // Check if viecoi jobs have company_logo
    const viecoiJobs = jobs.filter((j: any) => j.source === 'viecoi');
    if (viecoiJobs.length > 0) {
      console.log(`✅ Found ${viecoiJobs.length} viecoi jobs`);
      const withLogos = viecoiJobs.filter((j: any) => j.company_logo);
      console.log(`✅ ${withLogos.length}/${viecoiJobs.length} viecoi jobs have company_logo`);
      
      if (withLogos.length === 0) {
        console.log('❌ WARNING: No viecoi jobs have company_logo!');
      }
    } else {
      console.log('⚠️  No viecoi jobs found in response');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testAPI();
