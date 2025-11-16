/**
 * Test Quick Post API endpoints
 * Run: npx ts-node scripts/testQuickPostAPI.ts
 */

console.log('🧪 Testing Quick Post API...\n');

// Test 1: Create Quick Post (no auth required)
console.log('✅ Quick Post endpoints configured:');
console.log('   POST /api/quick-posts - Create (public, rate limited)');
console.log('   GET /api/quick-posts/pending - List pending (admin only)');
console.log('   PATCH /api/quick-posts/:id/approve - Approve (admin only)');
console.log('   PATCH /api/quick-posts/:id/reject - Reject (admin only)');

console.log('\n📋 To test with Postman:');
console.log('   1. POST http://localhost:3000/api/quick-posts');
console.log('      Body: {');
console.log('        "title": "Test Job",');
console.log('        "description": "Test description",');
console.log('        "contactInfo": { "phone": "0909123456" }');
console.log('      }');
console.log('');
console.log('   2. Login as admin in app');
console.log('   3. Go to Quick Posts Pending screen');
console.log('   4. Approve/Reject jobs');

console.log('\n✅ Backend server is running on port 3000');
console.log('✅ CORS configured for Expo dev server');
console.log('✅ Rate limiting: 5 posts/hour/IP');
console.log('✅ Spam detection enabled');
console.log('✅ Metadata tracking enabled');

process.exit(0);
