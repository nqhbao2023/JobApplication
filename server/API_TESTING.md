# User API Testing Guide

## Setup

1. Start server:
```bash
cd server
npm run dev
```

2. Get Firebase Auth Token:
- Login to your app
- Copy token from DevTools or use this code in app:
```typescript
const token = await auth.currentUser?.getIdToken();
console.log('Token:', token);
```

## API Endpoints

### 1. Get Current User Profile

```http
GET http://localhost:3000/api/users/me
Authorization: Bearer YOUR_FIREBASE_TOKEN
```

**Expected Response:**
```json
{
  "uid": "abc123",
  "email": "user@example.com",
  "displayName": "John Doe",
  "role": "employer",
  "photoURL": "https://...",
  "createdAt": "...",
  "updatedAt": "..."
}
```

### 2. Update Current User Profile

```http
PUT http://localhost:3000/api/users/me
Authorization: Bearer YOUR_FIREBASE_TOKEN
Content-Type: application/json

{
  "displayName": "New Name",
  "phone": "0123456789",
  "bio": "Software Engineer"
}
```

**Expected Response:**
```json
{
  "uid": "abc123",
  "displayName": "New Name",
  "phone": "0123456789",
  "bio": "Software Engineer",
  ...
}
```

### 3. Upload Avatar

```http
POST http://localhost:3000/api/users/me/avatar
Authorization: Bearer YOUR_FIREBASE_TOKEN
Content-Type: multipart/form-data

Form Data:
- avatar: [select image file]
```

**Expected Response:**
```json
{
  "photoURL": "https://storage.googleapis.com/..."
}
```

### 4. Get User by ID (Public)

```http
GET http://localhost:3000/api/users/USER_ID
```

**Expected Response:**
```json
{
  "uid": "USER_ID",
  "displayName": "John Doe",
  "photoURL": "https://...",
  ...
}
```

### 5. Get All Users (Admin Only)

```http
GET http://localhost:3000/api/users?role=employer&page=1&limit=20&search=john
Authorization: Bearer ADMIN_FIREBASE_TOKEN
```

**Expected Response:**
```json
{
  "users": [...],
  "total": 50,
  "page": 1,
  "totalPages": 3
}
```

### 6. Create User (Admin Only)

```http
POST http://localhost:3000/api/users
Authorization: Bearer ADMIN_FIREBASE_TOKEN
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "password123",
  "displayName": "New User",
  "role": "candidate",
  "phone": "0123456789"
}
```

### 7. Update User (Admin Only)

```http
PUT http://localhost:3000/api/users/USER_ID
Authorization: Bearer ADMIN_FIREBASE_TOKEN
Content-Type: application/json

{
  "role": "employer",
  "displayName": "Updated Name"
}
```

### 8. Delete User (Admin Only)

```http
DELETE http://localhost:3000/api/users/USER_ID
Authorization: Bearer ADMIN_FIREBASE_TOKEN
```

## Testing with cURL

### Get Current User
```bash
curl -X GET http://localhost:3000/api/users/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Update Profile
```bash
curl -X PUT http://localhost:3000/api/users/me \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"displayName":"New Name","phone":"0123456789"}'
```

### Upload Avatar
```bash
curl -X POST http://localhost:3000/api/users/me/avatar \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "avatar=@/path/to/image.jpg"
```

## Testing with Postman

1. Create new collection: "User API"
2. Set collection variable: `baseUrl` = `http://localhost:3000/api`
3. Set collection variable: `token` = Your Firebase Token
4. Create requests using above endpoints
5. Use `{{baseUrl}}` and `{{token}}` variables

## Expected Errors

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Missing or invalid authorization header"
}
```

### 403 Forbidden (Admin routes)
```json
{
  "error": "Forbidden",
  "message": "Admin access required"
}
```

### 404 Not Found
```json
{
  "error": "Not Found",
  "message": "User not found"
}
```

### 400 Bad Request (File upload)
```json
{
  "error": "No file uploaded"
}
```

## Next Steps

After testing server APIs:
1. ✅ Verify all endpoints work correctly
2. ✅ Test with different roles (candidate, employer, admin)
3. ✅ Test error cases (invalid token, missing fields)
4. 🎯 Start migrating client code to use these APIs

