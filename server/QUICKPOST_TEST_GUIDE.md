# Quick Post API Test Guide

## 🚀 Server Status
Server đang chạy tại: `http://localhost:3000`

---

## ✅ TEST 1: Create Quick Post (No Authentication)

### Request
```bash
curl -X POST http://localhost:3000/api/quick-posts \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Phục vụ quán cafe gần TDMU",
    "description": "Tuyển sinh viên làm part-time phục vụ quán cafe. Làm việc nhẹ nhàng, thân thiện. Lương theo giờ 25k.",
    "company": "Cafe Highlands",
    "location": "Bình Dương, gần Đại học Thủ Dầu Một",
    "workSchedule": "Thứ 2, 4, 6 tối (6h-9h)",
    "hourlyRate": 25000,
    "type": "part-time",
    "category": "Dịch vụ",
    "contactInfo": {
      "phone": "0909123456",
      "zalo": "0909123456"
    }
  }'
```

### PowerShell Version
```powershell
$body = @{
    title = "Phục vụ quán cafe gần TDMU"
    description = "Tuyển sinh viên làm part-time phục vụ quán cafe. Làm việc nhẹ nhàng, thân thiện. Lương theo giờ 25k."
    company = "Cafe Highlands"
    location = "Bình Dương, gần Đại học Thủ Dầu Một"
    workSchedule = "Thứ 2, 4, 6 tối (6h-9h)"
    hourlyRate = 25000
    type = "part-time"
    category = "Dịch vụ"
    contactInfo = @{
        phone = "0909123456"
        zalo = "0909123456"
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/quick-posts" -Method POST -Body $body -ContentType "application/json"
```

### Expected Response
```json
{
  "message": "Job submitted successfully! Waiting for admin approval.",
  "job": {
    "id": "abc123",
    "title": "Phục vụ quán cafe gần TDMU",
    "jobSource": "quick-post",
    "isVerified": false,
    "status": "inactive",
    ...
  }
}
```

---

## 📋 TEST 2: Get All Jobs (Should include Quick Post with status inactive)

### Request
```bash
curl http://localhost:3000/api/jobs
```

### PowerShell
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/jobs"
```

---

## 🔐 TEST 3: Admin Approve (Requires Admin Token)

### Step 1: Get Admin Firebase Token
1. Login to app as admin user
2. Get Firebase ID token from client
3. Copy token

### Step 2: Approve Quick Post
```bash
curl -X PATCH http://localhost:3000/api/quick-posts/{JOB_ID}/approve \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### PowerShell
```powershell
$headers = @{
    "Authorization" = "Bearer YOUR_ADMIN_TOKEN"
}

Invoke-RestMethod -Uri "http://localhost:3000/api/quick-posts/JOB_ID/approve" -Method PATCH -Headers $headers
```

---

## ❌ TEST 4: Admin Reject

```bash
curl -X PATCH http://localhost:3000/api/quick-posts/{JOB_ID}/reject \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Thông tin không đầy đủ"}'
```

---

## 🧪 Quick Test Script (PowerShell)

Save as `test-quickpost.ps1`:

```powershell
# Test Create Quick Post
Write-Host "🧪 Testing Quick Post Creation..." -ForegroundColor Cyan

$body = @{
    title = "Phục vụ quán cafe gần TDMU"
    description = "Tuyển sinh viên làm part-time phục vụ quán cafe. Làm việc nhẹ nhàng, thân thiện. Lương theo giờ 25k."
    company = "Cafe Highlands"
    location = "Bình Dương, gần Đại học Thủ Dầu Một"
    workSchedule = "Thứ 2, 4, 6 tối (6h-9h)"
    hourlyRate = 25000
    type = "part-time"
    category = "Dịch vụ"
    contactInfo = @{
        phone = "0909123456"
        zalo = "0909123456"
    }
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/quick-posts" -Method POST -Body $body -ContentType "application/json"
    Write-Host "✅ Quick Post Created!" -ForegroundColor Green
    Write-Host "Job ID: $($response.job.id)" -ForegroundColor Yellow
    Write-Host "Status: $($response.job.status)" -ForegroundColor Yellow
    Write-Host "Message: $($response.message)" -ForegroundColor Yellow
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}
```

Run:
```powershell
.\test-quickpost.ps1
```

---

## 📊 Verify in Firestore

1. Go to Firebase Console
2. Navigate to Firestore Database
3. Check `jobs` collection
4. Look for job with:
   - `jobSource: "quick-post"`
   - `isVerified: false`
   - `status: "inactive"`

---

## 🎯 Next Steps After Testing

1. ✅ Verify Quick Post created in Firestore
2. ✅ Test Admin approve workflow
3. ✅ Check job status changes to "active"
4. 📱 Implement Frontend Job List to display these jobs
5. 🎨 Create Apply button with different behaviors per jobSource
