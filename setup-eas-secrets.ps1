# ====================================================
# Script tu dong them Environment Variables len EAS
# ====================================================

Write-Host "Bat dau cau hinh EAS Secrets cho JobApplication..." -ForegroundColor Cyan
Write-Host ""

# Kiem tra EAS CLI da cai dat chua
if (-not (Get-Command eas -ErrorAction SilentlyContinue)) {
    Write-Host "EAS CLI chua duoc cai dat!" -ForegroundColor Red
    Write-Host "Chay: npm install -g eas-cli" -ForegroundColor Yellow
    exit 1
}

# Kiem tra da dang nhap chua
Write-Host "Kiem tra dang nhap EAS..." -ForegroundColor Yellow
$loginCheck = eas whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Ban chua dang nhap EAS!" -ForegroundColor Red
    Write-Host "Chay: eas login" -ForegroundColor Yellow
    exit 1
}

Write-Host "Da dang nhap: $loginCheck" -ForegroundColor Green
Write-Host ""

# Danh sach secrets can tao
$secrets = @(
    @{
        Name = "EXPO_PUBLIC_FIREBASE_API_KEY"
        Value = "AIzaSyDWOpfdH_wDYHzdRgQBW1DEEvUrBQuUkdo"
    },
    @{
        Name = "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN"
        Value = "job4s-app.firebaseapp.com"
    },
    @{
        Name = "EXPO_PUBLIC_FIREBASE_PROJECT_ID"
        Value = "job4s-app"
    },
    @{
        Name = "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
        Value = "519470633273"
    },
    @{
        Name = "EXPO_PUBLIC_FIREBASE_APP_ID"
        Value = "1:519470633273:android:ba73e62a82896f3e6598e8"
    },
    @{
        Name = "EXPO_PUBLIC_API_URL"
        Value = "https://job4s-server.onrender.com"
    }
)

Write-Host "Se tao $($secrets.Count) secrets..." -ForegroundColor Cyan
Write-Host ""

# Tao tung secret
$successCount = 0
$errorCount = 0

foreach ($secret in $secrets) {
    Write-Host "Dang tao: $($secret.Name)..." -ForegroundColor Yellow
    
    # Thuc thi lenh EAS
    $output = eas secret:create --scope project --name $secret.Name --value $secret.Value --type string 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   Thanh cong!" -ForegroundColor Green
        $successCount++
    } else {
        # Kiem tra xem co phai loi "already exists" khong
        if ($output -like "*already exists*") {
            Write-Host "   Da ton tai - bo qua" -ForegroundColor DarkYellow
            $successCount++
        } else {
            Write-Host "   Loi: $output" -ForegroundColor Red
            $errorCount++
        }
    }
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Hoan thanh: $successCount/$($secrets.Count) secrets" -ForegroundColor Green
if ($errorCount -gt 0) {
    Write-Host "Loi: $errorCount secrets" -ForegroundColor Red
}
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Hien thi danh sach secrets hien tai
Write-Host "Danh sach secrets hien tai:" -ForegroundColor Cyan
eas secret:list

Write-Host ""
Write-Host "XONG! Bay gio ban co the build lai app:" -ForegroundColor Green
Write-Host "   eas build --platform android --profile preview" -ForegroundColor Yellow
Write-Host ""
