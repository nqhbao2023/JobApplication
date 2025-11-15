# Test Create Quick Post
Write-Host "`n🧪 Testing Quick Post Creation..." -ForegroundColor Cyan

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

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/quick-posts" -Method POST -Body $body -ContentType "application/json"
    Write-Host "`n✅ Quick Post Created!" -ForegroundColor Green
    Write-Host "Job ID: $($response.job.id)" -ForegroundColor Yellow
    Write-Host "Status: $($response.job.status)" -ForegroundColor Yellow
    Write-Host "Job Source: $($response.job.jobSource)" -ForegroundColor Yellow
    Write-Host "Is Verified: $($response.job.isVerified)" -ForegroundColor Yellow
    Write-Host "`nMessage: $($response.message)" -ForegroundColor Cyan
    
    # Save job ID for later use
    $jobId = $response.job.id
    Write-Host "`n💾 Saved Job ID: $jobId" -ForegroundColor Magenta
    
    # Test Get All Jobs
    Write-Host "`n🔍 Fetching all jobs..." -ForegroundColor Cyan
    $allJobs = Invoke-RestMethod -Uri "http://localhost:3000/api/jobs"
    Write-Host "Total jobs: $($allJobs.total)" -ForegroundColor Yellow
    
} catch {
    Write-Host "`n❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}
