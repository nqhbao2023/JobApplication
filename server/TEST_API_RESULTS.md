# Quick Post API Test Results

## ✅ Test Commands

### 1. Test Create Quick Post (PowerShell)

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
} | ConvertTo-Json -Depth 3

Invoke-RestMethod -Uri "http://localhost:3000/api/quick-posts" -Method POST -Body $body -ContentType "application/json"
```

### 2. Test Get All Jobs

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/jobs"
```

### 3. Test Get Job by ID

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/jobs/YOUR_JOB_ID"
```

## 📊 Next: Import Postman Collection

File: `QUICKPOST_API.postman_collection.json`

Import vào Postman và test các endpoints.
