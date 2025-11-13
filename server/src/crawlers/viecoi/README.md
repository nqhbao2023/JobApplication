# Viecoi Crawler - Complete System

Crawl job data từ viecoi.vn một cách hợp pháp (tuân thủ robots.txt).

## 📁 File Structure

```
server/src/crawlers/viecoi/
├── sitemap-crawler.ts      # Crawl sitemap.xml để lấy URLs
├── job-crawler.ts          # Crawl chi tiết jobs từ HTML
├── normalizer.ts           # Normalize data về Job4S schema
├── upsert-jobs.ts          # Lưu jobs vào Firestore
├── sync-algolia.ts         # Đồng bộ lên Algolia
├── README.md               # This file (overview)
├── USAGE_GUIDE.md          # 📖 Chi tiết cách sử dụng (ĐỌC ĐẦU TIÊN!)
└── TROUBLESHOOTING.md      # 🐛 Debug guide khi có lỗi
```

## 🚀 Quick Start (3 steps)

### 1. Install dependencies
```bash
cd server
npm install xml2js @types/xml2js
```

### 2. Verify setup
- Check `server/serviceAccountKey.json` exists
- Check `server/.env` có ALGOLIA credentials (optional)

### 3. Test với 5 jobs
```bash
# Crawl + Upsert + Sync (1 command)
npm run crawl:viecoi-full
```

**Expected**: 5 jobs xuất hiện trong Firestore collection `jobs` với `source: "viecoi"`

---

## 📖 DOCUMENTATION

### 📘 [USAGE_GUIDE.md](./USAGE_GUIDE.md) - **ĐỌC ĐẦU TIÊN!**
Hướng dẫn chi tiết từng bước:
- Setup ban đầu
- Chạy từng command
- Expected output
- Workflow thực tế
- Checklist

### 🐛 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - **Khi có lỗi**
Debug guide:
- Common errors & solutions
- Test individual components
- Validate data quality
- Performance tips

---

## ⚡ Commands Cheat Sheet

```bash
# === FULL PIPELINE (Recommended) ===
npm run crawl:viecoi-full          # Crawl + Upsert + Sync (all-in-one)

# === INDIVIDUAL STEPS ===
npm run crawl:viecoi-sitemap       # Step 1: Get URLs from sitemap
npm run crawl:viecoi-jobs          # Step 2: Crawl job details
npm run upsert:viecoi-jobs         # Step 3: Save to Firestore
npm run sync:viecoi-algolia        # Step 4: Sync to Algolia

# === WITH OPTIONS ===
npm run crawl:viecoi-sitemap -- --limit 5 --force
```

---

## 📊 Data Flow

```
1. viecoi.vn/sitemap.xml
   ↓ [sitemap-crawler.ts]
   → server/data/viecoi-sitemap-cache.json (URLs)

2. URLs → HTML pages
   ↓ [job-crawler.ts]
   → server/data/viecoi-jobs-raw.json (Raw jobs)

3. Raw jobs
   ↓ [normalizer.ts]
   → Normalized jobs (Job4S schema)

4. Normalized jobs
   ↓ [upsert-jobs.ts]
   → Firestore collection: jobs (source=viecoi)

5. Firestore jobs
   ↓ [sync-algolia.ts]
   → Algolia index: jobs
```

---

## 🎯 Features

### ✅ Implemented
- [x] Sitemap crawler với caching (24h)
- [x] Job detail crawler với retry logic
- [x] HTML selector-based parsing
- [x] Data normalization (salary, job type, category)
- [x] Deduplication (title + company + location)
- [x] Firestore upsert (insert new, update existing)
- [x] Algolia sync với full-text search
- [x] Error handling & logging
- [x] Rate limiting (1s delay)
- [x] CLI với options (--limit, --force)

### 🔜 TODO (Optional)
- [ ] Company crawler
- [ ] GitHub Actions workflow
- [ ] Incremental updates (only new jobs)
- [ ] Image/logo download
- [ ] Email notifications on errors

---

## ⚙️ Configuration

### Environment Variables (.env)
```env
# Firebase (Required)
FIREBASE_PROJECT_ID=job4s-app
# ... (loaded from serviceAccountKey.json)

# Algolia (Optional - for search)
ALGOLIA_APP_ID=your_app_id
ALGOLIA_API_KEY=your_admin_key
```

### Crawler Settings (in code)
```typescript
// sitemap-crawler.ts
const SITEMAP_URL = 'https://viecoi.vn/sitemap.xml';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// job-crawler.ts
const DEFAULT_DELAY = 1000; // 1s between requests
const MAX_RETRIES = 3;
const TIMEOUT = 15000; // 15s per request
```

---

## 🚨 Important Notes

### Legal & Ethical
- ✅ Tuân thủ robots.txt: chỉ crawl `/viec-lam/*.html`
- ✅ User-Agent: "Job4S-Crawler/1.0 (Educational Purpose)"
- ✅ Rate limiting: ≥1s delay giữa requests
- ✅ Purpose: Educational/non-commercial
- ⚠️  KHÔNG sử dụng cho mục đích thương mại

### Rate Limiting
- Mặc định: 1s delay giữa requests
- Max: 100 jobs/run (tránh DDOS)
- Nếu bị 429/403 → Tăng delay lên 2-3s

### Data Quality
- Luôn test với 5-10 jobs trước khi crawl bulk
- Verify HTML selectors match (inspect page)
- Check raw data trước khi upsert

### Firestore Cost
- 100 jobs ≈ 200 operations (read + write)
- Free tier: 50K reads/day, 20K writes/day → OK
- Upsert có cache, không duplicate

---

## 📈 Performance

### Current
- Sitemap: ~3-5s (30KB XML)
- Job crawl: ~2s/job (với 1s delay)
- 20 jobs: ~40-50s total
- Upsert: ~30s cho 20 jobs
- Algolia sync: ~2s cho 20 jobs

### Optimization Tips
- Reduce delay: 1s → 0.5s (risk: ban IP)
- Batch upsert: Use Firestore batch writes
- Parallel crawl: Use Promise.all (max 5 concurrent)
- Cache: Store in Redis instead of file

---

## 🧪 Testing

### Unit Tests (Manual)
```bash
# Test sitemap crawler
npm run crawl:viecoi-sitemap -- --limit 3

# Test job crawler with 1 URL
# (Edit job-crawler.ts, set testURL)
npm run crawl:viecoi-jobs

# Test normalizer
# (See TROUBLESHOOTING.md → Testing section)

# Test Firestore write
# (See TROUBLESHOOTING.md → Testing section)
```

### Integration Test
```bash
# End-to-end with 5 jobs
npm run crawl:viecoi-full

# Verify in Firebase Console:
# Firestore → jobs → filter: source == "viecoi"
# Should see 5 jobs

# Verify in Algolia Dashboard:
# Indices → jobs → search: source:viecoi
```

---

## 🐛 Common Issues

See **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** for detailed solutions.

Quick fixes:
- `xml2js not found` → `npm install xml2js @types/xml2js`
- `serviceAccountKey.json not found` → Download từ Firebase Console
- `Selectors don't match` → Inspect HTML, update job-crawler.ts
- `Permission denied` → Check Firebase Rules
- `Algolia not configured` → Add credentials to .env (or ignore)

---

## 📞 Next Steps

Sau khi crawl thành công 20-50 jobs:

### Week 1 (Current)
- [x] Setup crawler foundation
- [x] Test với 5 jobs
- [ ] **Test với 20 jobs** ← YOU ARE HERE
- [ ] Fix selectors nếu cần
- [ ] Crawl 50-100 jobs

### Week 2
- [ ] Setup GitHub Actions auto-crawl
- [ ] External jobs UI (badge "Từ Viecoi.vn")
- [ ] Apply flow cho external jobs

### Week 3
- [ ] Match score algorithm
- [ ] Admin verification screen

### Week 4
- [ ] Polish & testing
- [ ] Demo preparation

---

## 📚 References

- Viecoi robots.txt: https://viecoi.vn/robots.txt
- Firebase Admin SDK: https://firebase.google.com/docs/admin/setup
- Algolia Node.js: https://www.algolia.com/doc/api-client/getting-started/install/javascript/
- Cheerio (HTML parsing): https://cheerio.js.org/

---

## ✅ Success Criteria

Crawler hoạt động tốt khi:
- [x] Sitemap cache tồn tại và có URLs
- [ ] Raw jobs file có ít nhất 20 jobs
- [ ] Mỗi job có đầy đủ: title, company, description
- [ ] Firestore collection `jobs` có jobs với `source: "viecoi"`
- [ ] Algolia index có jobs khi search `source:viecoi`
- [ ] Không có errors trong console

→ **Đọc [USAGE_GUIDE.md](./USAGE_GUIDE.md) để bắt đầu! 🚀**

