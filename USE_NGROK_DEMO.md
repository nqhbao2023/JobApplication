# 🚀 DÙNG NGROK ĐỂ CHIA SẺ SERVER LOCAL

## Khi nào dùng ngrok?
- ⚡ Cần demo NGAY (không đợi deploy)
- 🔄 Server production chưa sẵn sàng
- 🧪 Test nhanh với người khác

## ⚠️ Hạn chế:
- ❌ Chỉ hoạt động khi máy tính BẬT và chạy server
- ❌ URL thay đổi mỗi lần restart ngrok (free tier)
- ❌ Giới hạn 40 requests/phút (free tier)

---

## BƯỚC 1: Cài đặt ngrok

### 1.1. Download
1. Vào: https://ngrok.com/download
2. Download Windows version
3. Giải nén vào thư mục (ví dụ: `C:\ngrok\`)

### 1.2. Sign up và lấy authtoken
1. Tạo tài khoản tại: https://dashboard.ngrok.com/signup
2. Copy authtoken từ: https://dashboard.ngrok.com/get-started/your-authtoken
3. Kích hoạt:
   ```powershell
   cd C:\ngrok
   .\ngrok config add-authtoken <your-authtoken>
   ```

---

## BƯỚC 2: Chạy server local

```powershell
# Terminal 1: Start server
cd server
npm run dev
```

Server đang chạy tại: `http://localhost:3000`

---

## BƯỚC 3: Tạo public URL với ngrok

```powershell
# Terminal 2: Start ngrok
cd C:\ngrok
.\ngrok http 3000
```

**Output:**
```
Session Status                online
Account                       your-email@gmail.com
Version                       3.x.x
Region                        Asia Pacific (ap)
Forwarding                    https://abc123.ngrok-free.app -> http://localhost:3000

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

**Public URL**: `https://abc123.ngrok-free.app`

---

## BƯỚC 4: Test ngrok URL

```powershell
# Terminal 3: Test
curl https://abc123.ngrok-free.app/health
```

Nếu thấy response → OK!

---

## BƯỚC 5: Build APK với ngrok URL

### 5.1. Tạo profile mới trong eas.json

```json
{
  "build": {
    "ngrok": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://abc123.ngrok-free.app"
      }
    }
  }
}
```

### 5.2. Build APK
```bash
eas build --platform android --profile ngrok
```

### 5.3. Chia sẻ APK
- Download APK
- Gửi cho giảng viên
- **QUAN TRỌNG**: Giữ máy tính BẬT và ngrok chạy khi giảng viên test!

---

## ⚠️ LƯU Ý QUAN TRỌNG

### Free tier ngrok:
- ✅ URL có dạng: `https://random.ngrok-free.app`
- ⚠️ URL thay đổi mỗi lần restart ngrok
- ⚠️ Có banner warning khi truy cập lần đầu
- ⚠️ 40 requests/phút

### Nếu URL thay đổi:
1. Copy URL mới từ ngrok
2. Update `eas.json`
3. Build lại APK
4. Gửi APK mới cho giảng viên

### Ngrok paid ($8/tháng):
- ✅ URL cố định: `https://your-app.ngrok.app`
- ✅ Không có banner warning
- ✅ 120 requests/phút

---

## WORKFLOW DEMO BẰNG NGROK

```
Buổi sáng (trước khi demo):
1. Mở ngrok: .\ngrok http 3000
2. Copy URL ngrok
3. Update eas.json
4. Build APK
5. Gửi APK cho giảng viên

Lúc demo (GIỮ MÁY BẬT):
6. Server đang chạy: npm run dev
7. Ngrok đang chạy
8. Giảng viên test app

Sau demo:
9. Tắt ngrok (Ctrl+C)
10. Tắt server
```

---

## SO SÁNH: NGROK vs RENDER

| Tiêu chí | ngrok (Free) | Render (Free) |
|----------|-------------|---------------|
| Setup | 5 phút | 10 phút |
| Cần máy bật | ✅ Có | ❌ Không |
| URL cố định | ❌ Không | ✅ Có |
| Giới hạn | 40 req/min | Không giới hạn |
| Độ trễ | Thấp | Cao (30s wake up) |
| Dùng lâu dài | ❌ Không | ✅ Có |

**Khuyến nghị:**
- **Demo ngay**: Dùng ngrok
- **Dùng lâu dài**: Deploy Render

---

## SCRIPT TỰ ĐỘNG

### Script start ngrok và update URL

Tạo file `start-ngrok.ps1`:
```powershell
# Start server
Start-Process powershell -ArgumentList "cd server; npm run dev"

# Wait for server to start
Start-Sleep -Seconds 3

# Start ngrok
Start-Process powershell -ArgumentList "cd C:\ngrok; .\ngrok http 3000"

Write-Host "✅ Server and ngrok started!" -ForegroundColor Green
Write-Host "📋 Check ngrok dashboard for public URL" -ForegroundColor Cyan
Write-Host "🌐 Or visit: http://localhost:4040" -ForegroundColor Yellow
```

Chạy:
```powershell
.\start-ngrok.ps1
```

---

## NGROK DASHBOARD

Truy cập: http://localhost:4040

Xem:
- Public URL hiện tại
- Request history
- Response times
- Traffic statistics

---

## TROUBLESHOOTING

### ngrok báo "command not found"?
```powershell
# Add ngrok vào PATH hoặc dùng full path
C:\ngrok\ngrok http 3000
```

### ngrok báo "authentication failed"?
```powershell
# Config lại authtoken
.\ngrok config add-authtoken <your-authtoken>
```

### APK không kết nối được?
1. Check ngrok có đang chạy không
2. Check server có đang chạy không
3. Check URL trong eas.json đúng với URL ngrok
4. Build lại APK

---

## KẾT LUẬN

**Ngrok = Giải pháp tạm thời cho demo nhanh**

Sau khi demo xong → Deploy lên Render cho dài hạn!
