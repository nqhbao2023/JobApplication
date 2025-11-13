# GitHub Actions Setup Guide

## 📋 Prerequisites

1. GitHub repository với admin access
2. Firebase service account key
3. Repository secrets configured

---

## 🔐 Configure Secrets

### 1. Get Firebase Service Account Key

```bash
# File đã có sẵn
server/serviceAccountKey.json
```

### 2. Add to GitHub Secrets

1. Vào GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `FIREBASE_SERVICE_ACCOUNT`
4. Value: Copy toàn bộ nội dung file `serviceAccountKey.json`
5. Click **Add secret**

---

## ⚙️ Workflow Configuration

### File Location
```
.github/workflows/daily-crawler.yml
```

### Schedule
- **Cron**: `0 2 * * *` (2 AM UTC = 9 AM Vietnam)
- **Frequency**: Daily
- **Manual Trigger**: Available via "Actions" tab

### What It Does

1. ✅ Checkout code
2. ✅ Setup Node.js 18
3. ✅ Install dependencies
4. ✅ Setup Firebase credentials
5. ✅ Crawl 100 jobs from viecoi.vn
6. ✅ Normalize data
7. ✅ Upsert to Firestore
8. ✅ Archive results (7 days)
9. ✅ Cleanup credentials
10. ✅ Notify on failure (create GitHub issue)

---

## 🚀 Manual Trigger

### Via GitHub UI
1. Go to **Actions** tab
2. Select **Daily Job Crawler**
3. Click **Run workflow**
4. Choose branch (usually `main`)
5. Click **Run workflow**

### Via GitHub CLI
```bash
gh workflow run daily-crawler.yml
```

---

## 📊 Monitor Results

### Check Workflow Status
```
https://github.com/YOUR_USERNAME/JobApplication/actions
```

### View Artifacts
- Go to completed workflow run
- Scroll to **Artifacts** section
- Download `crawl-data-{run_number}.zip`

### Check Logs
- Click on workflow run
- Click on `crawl-viecoi` job
- Expand steps to view logs

---

## 🐛 Troubleshooting

### Workflow Fails on "Setup Firebase credentials"
**Problem**: Secret not configured  
**Solution**: Add `FIREBASE_SERVICE_ACCOUNT` secret (see above)

### Crawl succeeds but upsert fails
**Problem**: Firestore permissions  
**Solution**: Check Firebase service account has Firestore write access

### No jobs crawled
**Problem**: Website structure changed  
**Solution**: 
1. Run inspect-html.ts locally
2. Update selectors in job-crawler.ts
3. Push changes
4. Re-run workflow

### Rate limiting errors
**Problem**: Too many requests  
**Solution**: 
- Reduce `--limit` in workflow
- Increase delay in crawler
- Run less frequently

---

## 📈 Optimization Tips

### Adjust Crawl Limit
Edit `.github/workflows/daily-crawler.yml`:
```yaml
run: npm run crawl:viecoi-jobs -- --limit 200  # Change from 100
```

### Change Schedule
Edit cron expression:
```yaml
schedule:
  - cron: '0 2 * * *'  # Daily at 2 AM UTC
  # Examples:
  # - cron: '0 */6 * * *'  # Every 6 hours
  # - cron: '0 2 * * 1'    # Every Monday at 2 AM
  # - cron: '0 2 1 * *'    # First day of month at 2 AM
```

### Add Email Notifications
Add to workflow:
```yaml
- name: Send email on completion
  uses: dawidd6/action-send-mail@v3
  with:
    server_address: smtp.gmail.com
    server_port: 465
    username: ${{ secrets.EMAIL_USERNAME }}
    password: ${{ secrets.EMAIL_PASSWORD }}
    subject: Job Crawler Completed
    to: your-email@example.com
    from: GitHub Actions
    body: Crawl completed successfully!
```

---

## 🔒 Security Best Practices

1. ✅ **Never commit serviceAccountKey.json**
   - Already in `.gitignore`
   - Use GitHub Secrets only

2. ✅ **Rotate credentials regularly**
   - Generate new service account every 90 days
   - Update GitHub secret

3. ✅ **Limit permissions**
   - Service account should only have Firestore write access
   - No other Firebase permissions needed

4. ✅ **Monitor usage**
   - Check Firestore usage in Firebase Console
   - Set up billing alerts

---

## 📝 Testing Workflow Locally

### Using Act (GitHub Actions locally)
```bash
# Install act
npm install -g act

# Run workflow
act -s FIREBASE_SERVICE_ACCOUNT="$(cat server/serviceAccountKey.json)"
```

### Manual Test
```bash
cd server

# Crawl
npm run crawl:viecoi-jobs -- --limit 10

# Normalize
npm run normalize:viecoi

# Upsert
npm run upsert:viecoi-jobs
```

---

## ✅ Verification Checklist

- [ ] `FIREBASE_SERVICE_ACCOUNT` secret configured
- [ ] Workflow file committed to `.github/workflows/`
- [ ] Manual trigger works
- [ ] Scheduled trigger enabled
- [ ] Artifacts upload successfully
- [ ] Firestore receives data
- [ ] No sensitive data in logs

---

## 📞 Support

If workflow fails consistently:
1. Check GitHub Actions logs
2. Review Firestore quota limits
3. Verify service account permissions
4. Test crawler locally first

**Ready to automate! 🚀**
