# Test Application API
# Script PowerShell để test luồng ứng tuyển

Write-Host "Testing Application API" -ForegroundColor Cyan
Write-Host ""

# Configuration
$BASE_URL = "http://localhost:3000/api"
$CANDIDATE_EMAIL = "candidate@test.com"
$CANDIDATE_PASSWORD = "password123"

# Colors
function Write-Success { param($msg) Write-Host "SUCCESS: $msg" -ForegroundColor Green }
function Write-Error { param($msg) Write-Host "ERROR: $msg" -ForegroundColor Red }
function Write-Info { param($msg) Write-Host "INFO: $msg" -ForegroundColor Cyan }
function Write-Info {
    param($msg)
    Write-Host "INFO: $msg" -ForegroundColor Cyan
}

# Step 1: Login as Candidate
Write-Info "Step 1: Login as Candidate..."

$loginBody = @{
    email = $CANDIDATE_EMAIL
    password = $CANDIDATE_PASSWORD
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$BASE_URL/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody

    $TOKEN = $loginResponse.token
    $CANDIDATE_ID = $loginResponse.user.uid
    
    Write-Success "Logged in successfully"
    Write-Host "   Candidate ID: $CANDIDATE_ID" -ForegroundColor Gray
} catch {
    Write-Error "Login failed: $_"
    exit 1
}

# Step 2: Get available jobs
Write-Host ""
Write-Info "Step 2: Fetching available jobs..."

try {
    $jobsResponse = Invoke-RestMethod -Uri "$BASE_URL/jobs?limit=5" `
        -Method GET `
        -Headers @{ "Authorization" = "Bearer $TOKEN" }

    $jobs = $jobsResponse.jobs
    Write-Success "Found $($jobs.Count) jobs"
    
    if ($jobs.Count -eq 0) {
        Write-Error "No jobs available to test"
        exit 1
    }
    
    # Select first job
    $testJob = $jobs[0]
    $JOB_ID = $testJob.id
    $EMPLOYER_ID = $testJob.employerId
    
    Write-Host "   Selected Job: $($testJob.title)" -ForegroundColor Gray
    Write-Host "   Job ID: $JOB_ID" -ForegroundColor Gray
    Write-Host "   Employer ID: $EMPLOYER_ID" -ForegroundColor Gray
} catch {
    Write-Error "Failed to fetch jobs: $_"
    exit 1
}

# Step 3: Check if already applied
Write-Host ""
Write-Info "Step 3: Checking existing applications..."

try {
    $myAppsResponse = Invoke-RestMethod -Uri "$BASE_URL/applications/my-applications" `
        -Method GET `
        -Headers @{ "Authorization" = "Bearer $TOKEN" }

    $existingApp = $myAppsResponse | Where-Object { $_.jobId -eq $JOB_ID }
    
    if ($existingApp) {
        Write-Info "Already applied to this job. Using existing application."
        $APPLICATION_ID = $existingApp.id
    } else {
        Write-Success "No existing application found"
        $APPLICATION_ID = $null
    }
} catch {
    Write-Error "Failed to check applications: $_"
    exit 1
}

# Step 4: Create application (if not exists)
if (-not $APPLICATION_ID) {
    Write-Host ""
    Write-Info "Step 4: Creating new application..."

    $applicationBody = @{
        jobId = $JOB_ID
        employerId = $EMPLOYER_ID
        cvUrl = "https://example.com/cv/test-candidate.pdf"
        coverLetter = "Tôi rất quan tâm đến vị trí này và tin rằng kỹ năng của tôi phù hợp."
    } | ConvertTo-Json

    try {
        $appResponse = Invoke-RestMethod -Uri "$BASE_URL/applications" `
            -Method POST `
            -ContentType "application/json" `
            -Headers @{ "Authorization" = "Bearer $TOKEN" } `
            -Body $applicationBody

        $APPLICATION_ID = $appResponse.id
        Write-Success "Application created successfully"
        Write-Host "   Application ID: $APPLICATION_ID" -ForegroundColor Gray
        Write-Host "   Status: $($appResponse.status)" -ForegroundColor Gray
    } catch {
        Write-Error "Failed to create application: $_"
        Write-Host $_.Exception.Message -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host ""
    Write-Info "Step 4: Skipped (application already exists)"
}

# Step 5: Verify application was created
Write-Host ""
Write-Info "Step 5: Verifying application..."

try {
    $myAppsResponse = Invoke-RestMethod -Uri "$BASE_URL/applications/my-applications" `
        -Method GET `
        -Headers @{ "Authorization" = "Bearer $TOKEN" }

    $createdApp = $myAppsResponse | Where-Object { $_.id -eq $APPLICATION_ID }
    
    if ($createdApp) {
        Write-Success "Application verified"
        Write-Host "   Status: $($createdApp.status)" -ForegroundColor Gray
        Write-Host "   Applied At: $($createdApp.appliedAt)" -ForegroundColor Gray
    } else {
        Write-Error "Application not found in database"
        exit 1
    }
} catch {
    Write-Error "Failed to verify application: $_"
    exit 1
}

# Step 6: Check job applicant count
Write-Host ""
Write-Info "Step 6: Checking job applicant count..."

try {
    $jobDetailResponse = Invoke-RestMethod -Uri "$BASE_URL/jobs/$JOB_ID" `
        -Method GET `
        -Headers @{ "Authorization" = "Bearer $TOKEN" }

    Write-Success "Job applicant count: $($jobDetailResponse.applicantCount)"
} catch {
    Write-Error "Failed to fetch job details: $_"
}

# Summary
Write-Host ""
Write-Host "═══════════════════════════════════════" -ForegroundColor Yellow
Write-Host "TEST SUMMARY" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════" -ForegroundColor Yellow
Write-Host "Candidate ID:    $CANDIDATE_ID" -ForegroundColor White
Write-Host "Job ID:          $JOB_ID" -ForegroundColor White
Write-Host "Employer ID:     $EMPLOYER_ID" -ForegroundColor White
Write-Host "Application ID:  $APPLICATION_ID" -ForegroundColor White
Write-Host "Status:          $($createdApp.status)" -ForegroundColor Green
Write-Host ""
Write-Success "All tests passed!"
Write-Host ""
Write-Info "Next steps:"
Write-Host "  1. Check employer email for notification" -ForegroundColor Gray
Write-Host "  2. Login as employer to view applications" -ForegroundColor Gray
Write-Host "  3. Update application status from employer side" -ForegroundColor Gray
# End of script
