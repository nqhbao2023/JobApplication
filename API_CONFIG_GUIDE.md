# 🌐 API Configuration Guide

## Problem Solved

**Before:** API URL was hardcoded, couldn't test on physical devices or configure different environments.

**After:** Flexible configuration via environment variables or app.json.

---

## Configuration Priority

The app checks for API URL in this order:

1. **`EXPO_PUBLIC_API_URL`** environment variable (.env file)
2. **`extra.apiUrl`** in app.json
3. **Production URL** (if NODE_ENV !== 'development')
4. **Platform-specific fallback** (emulator/simulator URLs)

---

## Setup for Different Scenarios

### 📱 **Testing on Physical Device (Wi-Fi)**

1. Find your computer's local IP:
   ```bash
   # Windows
   ipconfig | findstr IPv4
   
   # Mac/Linux
   ifconfig | grep "inet "
   ```

2. Create `.env` file:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env`:
   ```env
   EXPO_PUBLIC_API_URL=http://192.168.1.100:3000
   ```
   ⚠️ Replace `192.168.1.100` with YOUR IP

4. Restart Expo:
   ```bash
   npm start --clear
   ```

5. Scan QR code on Expo Go app

---

### 🖥️ **Testing on Android Emulator**

No configuration needed! Uses `http://10.0.2.2:3000` by default.

---

### 📲 **Testing on iOS Simulator**

No configuration needed! Uses `http://localhost:3000` by default.

---

### 🚀 **Staging Environment**

#### Option A: Environment Variable
```env
EXPO_PUBLIC_API_URL=https://job4s-api-staging.onrender.com
```

#### Option B: app.json
```json
{
  "expo": {
    "extra": {
      "apiUrl": "https://job4s-api-staging.onrender.com"
    }
  }
}
```

---

### 🌍 **Production Build**

No configuration needed! Uses `https://job4s-api.onrender.com` when `NODE_ENV !== 'development'`.

---

## How to Change Default LAN IP

Edit `src/config/api.ts`:

```typescript
const devUrl = Platform.select({
  android: 'http://10.0.2.2:3000',
  ios: 'http://localhost:3000',
  default: 'http://192.168.1.100:3000', // ⚠️ Change this to your IP
}) as string;
```

---

## Verification

Check console logs when app starts:

```
🌐 Using API URL from environment: http://192.168.1.100:3000
```

or

```
🌐 Using development API URL: http://10.0.2.2:3000
```

---

## Troubleshooting

### ❌ "Network request failed" on physical device

1. Check your computer and phone are on **same Wi-Fi network**
2. Verify IP address is correct: `ipconfig` or `ifconfig`
3. Make sure backend server is running: `cd server && npm run dev`
4. Check firewall isn't blocking port 3000
5. Restart Expo: `npm start --clear`

### ❌ Environment variable not working

1. Make sure `.env` file exists in project root
2. Restart Expo completely: `Ctrl+C` then `npm start --clear`
3. Check variable name: must start with `EXPO_PUBLIC_`

### ❌ Still using wrong URL

Check priority:
1. `.env` file overrides everything
2. `app.json` extra.apiUrl is second priority
3. Platform fallback is last resort

---

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Build Android
  env:
    EXPO_PUBLIC_API_URL: https://job4s-api.onrender.com
  run: eas build --platform android
```

### EAS Build Example

In `eas.json`:
```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://job4s-api.onrender.com"
      }
    },
    "staging": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://job4s-api-staging.onrender.com"
      }
    }
  }
}
```

---

## Summary

| **Scenario** | **Configuration** | **URL Used** |
|--------------|-------------------|--------------|
| Android Emulator | None | `http://10.0.2.2:3000` |
| iOS Simulator | None | `http://localhost:3000` |
| Physical Device (Wi-Fi) | `.env` with your IP | `http://192.168.x.x:3000` |
| Staging Build | `.env` or `app.json` | Custom staging URL |
| Production Build | None (auto) | `https://job4s-api.onrender.com` |

---

**✅ Now you can test on any device without changing code!**
