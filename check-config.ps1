# ====================================================
# Script kiểm tra environment variables trước khi build
# ====================================================

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  KIEM TRA CAU HINH TRUOC KHI BUILD" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Kiểm tra file google-services.json
Write-Host "[1/3] Kiem tra google-services.json..." -ForegroundColor Yellow
if (Test-Path "google-services.json") {
    Write-Host "    [OK] File ton tai" -ForegroundColor Green
    
    # Validate JSON
    try {
        $content = Get-Content "google-services.json" -Raw | ConvertFrom-Json
        $projectId = $content.project_info.project_id
        $package = $content.client[0].client_info.android_client_info.package_name
        
        Write-Host "    Project ID: $projectId" -ForegroundColor Cyan
        Write-Host "    Package: $package" -ForegroundColor Cyan
        
        if ($projectId -ne "job4s-app") {
            Write-Host "    [!] Warning: Project ID khong khop!" -ForegroundColor Yellow
        }
        if ($package -ne "com.hoangbao.job4s") {
            Write-Host "    [!] Warning: Package name khong khop!" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "    [X] File khong hop le!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "    [X] File khong ton tai!" -ForegroundColor Red
    Write-Host "    Ban can file nay de upload len EAS." -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Kiểm tra app.json
Write-Host "[2/3] Kiem tra app.json..." -ForegroundColor Yellow
if (Test-Path "app.json") {
    $appJson = Get-Content "app.json" -Raw | ConvertFrom-Json
    
    # Kiểm tra không có googleServicesFile
    if ($appJson.expo.android.googleServicesFile) {
        Write-Host "    [!] Warning: app.json van con 'googleServicesFile'" -ForegroundColor Yellow
        Write-Host "    Nen xoa dong nay de EAS tu xu ly" -ForegroundColor Yellow
    } else {
        Write-Host "    [OK] Khong co googleServicesFile (dung roi)" -ForegroundColor Green
    }
    
    $package = $appJson.expo.android.package
    Write-Host "    Package: $package" -ForegroundColor Cyan
} else {
    Write-Host "    [X] Khong tim thay app.json!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Kiểm tra eas.json
Write-Host "[3/3] Kiem tra eas.json..." -ForegroundColor Yellow
if (Test-Path "eas.json") {
    $easJson = Get-Content "eas.json" -Raw | ConvertFrom-Json
    
    # Kiểm tra preview profile
    $previewEnv = $easJson.build.preview.env
    $requiredVars = @(
        "EXPO_PUBLIC_FIREBASE_API_KEY",
        "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
        "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
        "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
        "EXPO_PUBLIC_FIREBASE_APP_ID",
        "EXPO_PUBLIC_API_URL"
    )
    
    $allPresent = $true
    foreach ($varName in $requiredVars) {
        if ($previewEnv.PSObject.Properties.Name -contains $varName) {
            Write-Host "    [OK] $varName" -ForegroundColor Green
        } else {
            Write-Host "    [X] Thieu: $varName" -ForegroundColor Red
            $allPresent = $false
        }
    }
    
    # Kiểm tra KHÔNG có GOOGLE_SERVICES_JSON trong env
    if ($previewEnv.PSObject.Properties.Name -contains "GOOGLE_SERVICES_JSON") {
        Write-Host "    [!] Warning: GOOGLE_SERVICES_JSON nen la File type, khong phai env" -ForegroundColor Yellow
    }
    
    if (-not $allPresent) {
        Write-Host ""
        Write-Host "    [X] Cau hinh eas.json chua day du!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "    [X] Khong tim thay eas.json!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Tổng kết
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  KET QUA KIEM TRA" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[OK] Cau hinh local hop le!" -ForegroundColor Green
Write-Host ""
Write-Host "BUOC TIEP THEO:" -ForegroundColor Yellow
Write-Host "  1. Chay script setup EAS:" -ForegroundColor White
Write-Host "     .\setup-eas-complete.ps1" -ForegroundColor Cyan
Write-Host ""
Write-Host "  2. Build app:" -ForegroundColor White
Write-Host "     eas build --platform android --profile preview --clear-cache" -ForegroundColor Cyan
Write-Host ""
