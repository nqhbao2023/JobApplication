# 🚀 Migration Plan: Firestore Client SDK → REST API

## Mục tiêu
Chuyển đổi toàn bộ ứng dụng từ việc gọi trực tiếp Firestore Client SDK sang sử dụng REST API thông qua Express backend.

## Nguyên tắc thực hiện
1. ✅ **Incremental Migration**: Chuyển từng module một, không phá vỡ chức năng hiện tại
2. ✅ **Backward Compatible**: Giữ interface cũ, chỉ thay đổi implementation
3. ✅ **Test After Each Step**: Test kỹ sau mỗi bước migration
4. ✅ **Feature Flags**: Có thể rollback nếu cần
5. ✅ **Logging**: Log mọi thay đổi để dễ debug

---

## Phase 1: Foundation (CRITICAL - Làm trước tiên)

### 1.1. Chuẩn bị API Services ✅
- [x] `authApi.service.ts` - Authentication
- [x] `jobApi.service.ts` - Jobs CRUD
- [x] `applicationApi.service.ts` - Applications
- [x] `notificationApi.service.ts` - Notifications
- [x] `categoryApi.service.ts` - Categories
- [x] `companyApi.service.ts` - Companies

### 1.2. Tạo User API Service (CẦN BỔ SUNG)
```typescript
// src/services/userApi.service.ts
export const userApiService = {
  getCurrentUser: () => GET('/api/users/me'),
  updateProfile: (data) => PUT('/api/users/me', data),
  uploadAvatar: (file) => POST('/api/users/me/avatar', formData),
}
```

### 1.3. Bổ sung Server Endpoints (CẦN BỔ SUNG)
```
POST   /api/users/register
POST   /api/users/login
GET    /api/users/me
PUT    /api/users/me
POST   /api/users/me/avatar
GET    /api/users/:id
PUT    /api/users/:id (admin only)
DELETE /api/users/:id (admin only)
```

---

## Phase 2: Auth Layer (PRIORITY 1) 🔥

### 2.1. Migrate AuthContext
**File**: `src/contexts/AuthContext.tsx`

**Current**:
```typescript
// Gọi trực tiếp Firebase Auth + Firestore
const user = auth.currentUser;
await setDoc(doc(db, 'users', uid), {...});
```

**Target**:
```typescript
// Gọi API
const { data } = await authApiService.login(email, password);
// Server trả về: { user, token, role }
```

**Steps**:
1. ✅ Giữ Firebase Auth cho authentication (sign in/out)
2. ✅ Thay thế Firestore operations bằng API calls
3. ✅ Lưu token vào AsyncStorage/SecureStore
4. ✅ Auto refresh token khi hết hạn

### 2.2. Migrate RoleContext
**File**: `src/contexts/RoleContext.tsx`

**Current**:
```typescript
// Đọc role từ Firestore
const userDoc = await getDoc(doc(db, 'users', uid));
```

**Target**:
```typescript
// Đọc role từ API
const { role } = await userApiService.getCurrentUser();
```

---

## Phase 3: Candidate Flows (PRIORITY 1) 🎯

### 3.1. Applied Jobs Screen
**File**: `app/(candidate)/appliedJob.tsx`

**Migration**:
- [ ] Replace Firestore queries with `applicationApiService.getMyApplications()`
- [ ] Use `applicationApiService.withdraw(id)` for cancel application
- [ ] Use `applicationApiService.getById(id)` for detail view

### 3.2. Saved Jobs Screen
**File**: `app/(candidate)/savedJobs.tsx`

**Migration**:
- [ ] Replace `collection(db, 'saved_jobs')` with `jobApiService.getSavedJobs()`
- [ ] Use `jobApiService.saveJob(id)` / `unsaveJob(id)`

### 3.3. Profile Screen
**File**: `app/(shared)/person.tsx`

**Migration**:
- [ ] Replace Firebase Storage upload with `userApiService.uploadAvatar()`
- [ ] Replace `updateDoc(doc(db, 'users', uid))` with `userApiService.updateProfile()`
- [ ] Use `userApiService.getCurrentUser()` for profile data

### 3.4. Job Description Hook
**File**: `src/hooks/useJobDescription.ts`

**Migration**:
- [ ] Replace Firestore queries with `jobApiService.getById(id)`
- [ ] Use `applicationApiService.checkApplied(jobId)` for status
- [ ] Use `applicationApiService.create()` for applying

---

## Phase 4: Employer Flows (PRIORITY 1) 💼

### 4.1. Applications Management
**File**: `app/(employer)/applications.tsx`

**Migration**:
- [ ] Replace Firestore queries with `applicationApiService.getEmployerApplications()`
- [ ] Use `applicationApiService.updateStatus(id, status)` for approve/reject

### 4.2. My Jobs Management
**File**: `app/(employer)/myJobs.tsx`

**Migration**:
- [ ] Replace Firestore queries with `jobApiService.getMyJobs()`
- [ ] Use `jobApiService.update(id, data)` for editing
- [ ] Use `jobApiService.delete(id)` for deletion

### 4.3. Add Job Form
**File**: `src/hooks/addJob/useAddJobForm.ts`

**Status**: ✅ PARTIALLY DONE (đã dùng `jobApiService.createJob`)

**Remaining**:
- [ ] Replace company/category Firestore queries with API
- [ ] Use API for image upload instead of Firebase Storage
- [ ] Remove draft localStorage, use API draft endpoint

---

## Phase 5: Shared Components (PRIORITY 1) 📦

### 5.1. Job List
**File**: `app/(shared)/jobList.tsx`

**Migration**:
- [ ] Replace Firestore queries with `jobApiService.getAll(params)`

### 5.2. Company List
**File**: `app/(shared)/companyList.tsx`

**Migration**:
- [ ] Replace Firestore queries with `companyApiService.getAll()`

### 5.3. Categories List
**File**: `app/(shared)/categoriesList.tsx`

**Migration**:
- [ ] Replace Firestore queries with `categoryApiService.getAll()`

### 5.4. Search Screen
**File**: `app/(shared)/search.tsx`

**Migration**:
- [ ] Replace Firestore queries with `jobApiService.search(query)`

### 5.5. Notifications
**File**: `app/(shared)/Notifications.tsx`

**Status**: ✅ DONE (đã dùng `notificationApiService`)

---

## Phase 6: Admin Portal (PRIORITY 2) 👑

### 6.1. Users Management
**Files**: 
- `app/(admin)/users.tsx`
- `app/(admin)/user-detail.tsx`
- `app/(admin)/user-create.tsx`

**Migration**:
- [ ] Create `userApiService.getAll()` (admin only)
- [ ] Create `userApiService.create()` (admin only)
- [ ] Create `userApiService.update(id)` (admin only)
- [ ] Create `userApiService.delete(id)` (admin only)

### 6.2. Jobs Management
**Files**:
- `app/(admin)/jobs.tsx`
- `app/(admin)/job-detail.tsx`
- `app/(admin)/job-create.tsx`

**Migration**:
- [ ] Use `jobApiService.getAll({ admin: true })`
- [ ] Use `jobApiService.update(id)` (admin approval)

### 6.3. Categories & Types Management
**Files**:
- `app/(admin)/job-categories.tsx`
- `app/(admin)/job-types.tsx`

**Migration**:
- [ ] Create `categoryApiService.create/update/delete()`
- [ ] Create admin endpoints for job types

### 6.4. Companies Management
**File**: `app/(admin)/companies.tsx`

**Migration**:
- [ ] Use `companyApiService.getAll()`
- [ ] Use `companyApiService.delete(id)` (admin only)

### 6.5. Analytics Dashboard
**File**: `app/(admin)/analytics.tsx`

**Migration**:
- [ ] Create `analyticsApiService.getDashboard()`
- [ ] Server aggregates data from Firestore

---

## Phase 7: Hooks & Utilities (PRIORITY 2) 🔧

### 7.1. useFirestoreCollection Hook
**File**: `src/hooks/useFirestoreCollection.ts`

**Migration**:
- [ ] Replace with generic `useApiCollection(endpoint)` hook
- [ ] Support pagination, filtering, sorting via query params

### 7.2. useJobStatus Hook
**File**: `src/hooks/useJobStatus.ts`

**Migration**:
- [ ] Use `jobApiService.getSavedStatus(id)`
- [ ] Use `jobApiService.saveJob(id)` / `unsaveJob(id)`

### 7.3. Navigation Utils
**File**: `src/utils/navigation.ts`

**Migration**:
- [ ] Replace Firestore role check with API

---

## Phase 8: Background Tasks (PRIORITY 3) ⚙️

### 8.1. Seeding Scripts
**File**: `scripts/seedFirestore.js`

**Migration**:
- [ ] Move to server-side
- [ ] Create API endpoint `POST /api/admin/seed`
- [ ] Run via cron job or manual trigger

### 8.2. Notification Cleanup
**Migration**:
- [ ] Move to server-side Cloud Function/cron
- [ ] Auto cleanup old notifications

---

## Implementation Checklist

### Before Starting
- [ ] Backup Firestore data
- [ ] Setup staging environment
- [ ] Create feature flags in code
- [ ] Document current API contracts

### During Migration
- [ ] Create branch: `feat/migrate-to-api`
- [ ] One PR per phase
- [ ] Test each screen after migration
- [ ] Update E2E tests
- [ ] Monitor error logs

### After Migration
- [ ] Remove unused Firestore client code
- [ ] Update security rules (restrict client access)
- [ ] Performance testing
- [ ] Update documentation

---

## Testing Strategy

### Unit Tests
```typescript
// Test API service
describe('jobApiService', () => {
  it('should fetch jobs', async () => {
    const jobs = await jobApiService.getAll();
    expect(jobs).toBeDefined();
  });
});
```

### Integration Tests
```typescript
// Test screen with mocked API
const mockJobApi = {
  getAll: jest.fn().mockResolvedValue([...]),
};
```

### E2E Tests
- Test complete user flows
- Test offline scenarios
- Test error handling

---

## Rollback Plan

### If Issues Found
1. Revert to previous commit
2. Keep Firebase Auth, only rollback Firestore queries
3. Use feature flags to enable/disable API calls

### Feature Flag Example
```typescript
const USE_API = __DEV__ ? false : true;

const getJobs = async () => {
  if (USE_API) {
    return await jobApiService.getAll();
  } else {
    return await getDocs(collection(db, 'jobs'));
  }
};
```

---

## Success Metrics

- [ ] 0 direct Firestore calls from client app
- [ ] All API endpoints have proper auth/validation
- [ ] Response time < 500ms for most APIs
- [ ] Error rate < 1%
- [ ] 100% feature parity with old implementation

---

## Timeline Estimate

- **Phase 1-2 (Auth)**: 2-3 days
- **Phase 3 (Candidate)**: 3-4 days
- **Phase 4 (Employer)**: 2-3 days
- **Phase 5 (Shared)**: 2-3 days
- **Phase 6 (Admin)**: 3-4 days
- **Phase 7-8 (Utils)**: 1-2 days

**Total**: ~2-3 weeks (depending on team size)

---

## Next Steps

1. **Start with Phase 1**: Bổ sung User API Service
2. **Then Phase 2**: Migrate AuthContext & RoleContext
3. **Monitor closely**: Check logs, error rates after each phase
4. **Iterate**: Fix issues before moving to next phase

