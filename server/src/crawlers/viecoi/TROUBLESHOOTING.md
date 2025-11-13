# 🔧 TROUBLESHOOTING & DEBUG GUIDE

## 🎯 Quick Debug Commands

### Check Files Exist
```bash
# Check sitemap cache
ls -la server/data/viecoi-sitemap-cache.json

# Check raw jobs
ls -la server/data/viecoi-jobs-raw.json

# Check Firebase credentials
ls -la server/serviceAccountKey.json
```

### View Data
```bash
# View sitemap cache (PowerShell)
Get-Content server/data/viecoi-sitemap-cache.json | ConvertFrom-Json | Select-Object -First 1

# Count jobs in raw file
(Get-Content server/data/viecoi-jobs-raw.json | ConvertFrom-Json).Count

# View first job
(Get-Content server/data/viecoi-jobs-raw.json | ConvertFrom-Json)[0]
```

---

## 🐛 Common Errors & Solutions

### Error 1: "xml2js not found"
**Full Error**:
```
Could not find a declaration file for module 'xml2js'
```

**Solution**:
```bash
cd server
npm install xml2js @types/xml2js
```

---

### Error 2: "serviceAccountKey.json not found"
**Full Error**:
```
❌ serviceAccountKey.json not found! Place it in server/ directory.
```

**Solution**:
1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project (job4s-app)
3. Project Settings → Service Accounts
4. Click "Generate new private key" → Download JSON
5. Rename to `serviceAccountKey.json`
6. Place in `server/` folder

**Verify**:
```bash
# Should show the file
ls server/serviceAccountKey.json
```

---

### Error 3: "Failed to fetch sitemap"
**Full Error**:
```
❌ Failed to fetch sitemap: Request failed with status code 403
```

**Possible Causes**:
1. Internet connection issue
2. Viecoi.vn blocking crawler
3. robots.txt changed

**Solutions**:

**A. Check internet**:
```bash
curl -I https://viecoi.vn/sitemap.xml
```
Should return `200 OK`

**B. Check robots.txt**:
```bash
curl https://viecoi.vn/robots.txt
```
Verify: `Allow: /*.xml$` exists

**C. Try manual fetch**:
Open browser → https://viecoi.vn/sitemap.xml
If loads OK → Crawler should work

**D. Increase timeout** (if slow connection):
Edit `sitemap-crawler.ts` line 47:
```typescript
timeout: 60000, // 30s → 60s
```

---

### Error 4: "Skipping (missing title or company)"
**Full Error**:
```
[1/10]
🔍 Crawling: https://viecoi.vn/viec-lam/abc-123.html
  ⚠️ Skipping (missing title or company)
```

**Cause**: HTML selectors don't match actual HTML structure

**Solution**:

**Step 1**: Inspect HTML manually
1. Copy URL từ error: `https://viecoi.vn/viec-lam/abc-123.html`
2. Open in browser
3. Right-click → Inspect Element
4. Find job title element:
   - Look for `<h1>`, `<h2>`, or `<div class="title">`
   - Note the selector (e.g., `h1.job-title`)

**Step 2**: Update selectors in `job-crawler.ts`

Find lines 44-75:
```typescript
// Current (may be wrong):
const title = $('h1.job-title, .job-header h1, .title').first().text().trim();
const company = $('.company-name, .employer-name, .company').first().text().trim();

// Update to match actual HTML:
const title = $('div.job-detail h2.title').first().text().trim(); // ← Your selector
const company = $('div.employer-info .name').first().text().trim(); // ← Your selector
```

**Step 3**: Test với 1 URL
Edit `job-crawler.ts`, replace CLI runner (line 190+):
```typescript
if (require.main === module) {
  (async () => {
    try {
      // Test với 1 URL cụ thể
      const testURL = 'https://viecoi.vn/viec-lam/abc-123.html'; // ← Paste URL here
      const job = await crawlJobPage(testURL);
      console.log(JSON.stringify(job, null, 2));
      process.exit(0);
    } catch (error) {
      console.error('❌ Crawl failed:', error);
      process.exit(1);
    }
  })();
}
```

Run:
```bash
npm run crawl:viecoi-jobs
```

Check output có đầy đủ: title, company, location, salary?

---

### Error 5: "Algolia not configured"
**Full Error**:
```
⚠️  Algolia not configured - skipping sync
   To enable: Set ALGOLIA_APP_ID and ALGOLIA_API_KEY in .env
```

**Cause**: Missing Algolia credentials in `.env`

**Solution**:

**Option A - Enable Algolia** (recommended):
1. Get credentials from Algolia Dashboard
2. Edit `server/.env`:
```env
ALGOLIA_APP_ID=3JGCR12NR5
ALGOLIA_API_KEY=your_admin_api_key_here
```

**Option B - Skip Algolia** (for testing):
Just ignore this warning. Jobs still saved to Firestore.
Search will work slower (Firestore query instead of Algolia).

---

### Error 6: "Raw jobs file not found"
**Full Error**:
```
❌ Raw jobs file not found: server/data/viecoi-jobs-raw.json
Run: npm run crawl:viecoi-jobs first
```

**Cause**: Chưa chạy crawler

**Solution**:
```bash
npm run crawl:viecoi-jobs
```

Must see output: `💾 Saved X jobs to server/data/viecoi-jobs-raw.json`

---

### Error 7: "Permission denied" (Firestore)
**Full Error**:
```
❌ Error upserting job: Missing or insufficient permissions
```

**Cause**: Firebase Rules chặn write

**Solution**:

**Check Rules**: Firebase Console → Firestore Database → Rules

Should allow admin write:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /jobs/{jobId} {
      allow read: if true; // Public read
      allow write: if request.auth != null; // Authenticated write
    }
  }
}
```

**OR** for testing only:
```javascript
match /jobs/{jobId} {
  allow read, write: if true; // ⚠️ Testing only!
}
```

---

### Error 8: Salary/Category parse sai
**Example**:
```json
{
  "salary_min": null,
  "salary_max": null,
  "salary_text": "15-20 triệu",
  "category": "Other"
}
```

**Cause**: Normalizer không nhận dạng được format

**Solution**:

Edit `normalizer.ts`, update `parseSalary()` (line 60+):
```typescript
function parseSalary(salaryText: string): {
  min?: number;
  max?: number;
  text: string;
} {
  const text = salaryText.toLowerCase().trim();
  
  // Add more patterns
  const patterns = [
    /(\d+)-(\d+)\s*triệu/i,        // "10-15 triệu"
    /(\d+)-(\d+)\s*tr/i,            // "10-15 tr"
    /(\d+)\s*-\s*(\d+)\s*million/i, // "10 - 15 million"
    // Add your pattern here
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const min = parseFloat(match[1]) * 1_000_000;
      const max = parseFloat(match[2]) * 1_000_000;
      return { min, max, text: salaryText };
    }
  }
  
  return { text: salaryText };
}
```

Test:
```bash
npm run upsert:viecoi-jobs
```

---

## 🧪 Testing Individual Components

### Test Sitemap Crawler Only
```bash
cd server
npm run crawl:viecoi-sitemap -- --limit 3
cat data/viecoi-sitemap-cache.json
```

Expected: File with 3 job URLs

---

### Test Job Crawler with 1 URL
Edit `job-crawler.ts` (line 190+):
```typescript
if (require.main === module) {
  (async () => {
    const testURL = 'https://viecoi.vn/viec-lam/test-job.html';
    const job = await crawlJobPage(testURL);
    console.log(JSON.stringify(job, null, 2));
    process.exit(0);
  })();
}
```

Run:
```bash
npm run crawl:viecoi-jobs
```

---

### Test Normalizer
Create `test-normalizer.ts`:
```typescript
import { normalizeJob } from './normalizer';

const testJob = {
  url: 'https://test.com',
  title: 'Developer React',
  company: 'ABC Corp',
  location: 'Hà Nội',
  salary: '15-20 triệu',
  jobType: 'Full-time',
  category: 'IT',
  description: 'Test description',
  requirements: ['React', 'TypeScript'],
  benefits: ['Insurance'],
  skills: ['React', 'Node.js'],
};

console.log(JSON.stringify(normalizeJob(testJob), null, 2));
```

Run:
```bash
ts-node src/crawlers/viecoi/test-normalizer.ts
```

---

### Test Firestore Write
Create `test-firestore.ts`:
```typescript
import * as admin from 'firebase-admin';

admin.initializeApp({
  credential: admin.credential.cert(require('../../serviceAccountKey.json')),
});

const db = admin.firestore();

async function testWrite() {
  const testJob = {
    title: 'Test Job',
    company_name: 'Test Company',
    source: 'viecoi',
    status: 'draft',
    created_at: admin.firestore.FieldValue.serverTimestamp(),
  };
  
  const docRef = await db.collection('jobs').add(testJob);
  console.log('✅ Written with ID:', docRef.id);
  
  // Delete test doc
  await docRef.delete();
  console.log('✅ Deleted test doc');
}

testWrite();
```

Run:
```bash
ts-node src/crawlers/viecoi/test-firestore.ts
```

---

## 📊 Validate Data Quality

### Check Raw Jobs Quality
```bash
# Count jobs
cat server/data/viecoi-jobs-raw.json | jq 'length'

# Check all have title
cat server/data/viecoi-jobs-raw.json | jq '.[] | select(.title == null or .title == "")'

# Should return nothing (empty)

# Check all have company
cat server/data/viecoi-jobs-raw.json | jq '.[] | select(.company == null or .company == "")'

# Check salary distribution
cat server/data/viecoi-jobs-raw.json | jq '.[].salary' | sort | uniq -c
```

---

### Check Firestore Data
Go to Firebase Console:
1. Firestore Database → `jobs` collection
2. Filter: `source == viecoi`
3. Verify fields:
   - ✅ title (not empty)
   - ✅ company_name (not empty)
   - ✅ external_url (starts with https://viecoi.vn)
   - ✅ status = "draft"
   - ✅ is_verified = false
   - ✅ source = "viecoi"

---

### Check Algolia Index
Go to Algolia Dashboard:
1. Indices → `jobs`
2. Browse tab
3. Search: `source:viecoi`
4. Verify jobs appear

---

## 🚀 Performance Tips

### Speed up crawling
```typescript
// In job-crawler.ts, reduce delay
const jobs = await crawlMultipleJobs(urls, { delay: 500 }); // 1s → 0.5s
```
⚠️ Risk: Có thể bị ban IP nếu quá nhanh

---

### Batch upsert (faster)
Edit `upsert-jobs.ts`, use batch writes:
```typescript
const batch = db.batch();
for (const job of jobs) {
  const ref = db.collection('jobs').doc();
  batch.set(ref, job);
}
await batch.commit();
```

---

### Cache Firestore queries
```typescript
// Before: Query every time
const existing = await db.collection('jobs')
  .where('external_url', '==', url)
  .get();

// After: Cache in memory
const cache = new Map();
// ... (implementation)
```

---

## 📞 Getting Help

### Enable Debug Logs
Add to top of file:
```typescript
const DEBUG = true;

function log(...args: any[]) {
  if (DEBUG) console.log('[DEBUG]', ...args);
}
```

---

### Export Full Error Stack
```typescript
try {
  // ...
} catch (error) {
  console.error('Full error:', error);
  console.error('Stack:', error.stack);
  if (error.response) {
    console.error('Response:', error.response.data);
  }
}
```

---

### Report Issue
If stuck, gather this info:
1. Error message (full)
2. Command run
3. Output file (if any): `cat server/data/...`
4. Screenshot of HTML inspector (for selector issues)
5. Node version: `node --version`

---

## ✅ Success Checklist

Sau khi chạy xong crawler, verify:
- [ ] `server/data/viecoi-sitemap-cache.json` exists (>10KB)
- [ ] `server/data/viecoi-jobs-raw.json` exists với ít nhất 5 jobs
- [ ] Mỗi job có: title, company, description (not empty)
- [ ] Firestore collection `jobs` có jobs với `source: "viecoi"`
- [ ] Algolia index `jobs` có jobs khi search `source:viecoi`
- [ ] No errors trong console output

→ **Nếu tất cả OK → Ready for next step! 🎉**
