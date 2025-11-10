# Refactoring Notes - Priority 1 Implementation

## ✅ Completed

### 1. Fixed TypeScript Errors in auth.routes.ts
- Fixed `userDoc.exists()` → `userDoc.exists` (property, not method)
- Added explicit return types `Promise<void>` to all async route handlers
- All TypeScript errors resolved

### 2. Refactored RoleContext
- ✅ Replaced Firestore direct calls with `authApiService.getCurrentRole()`
- ✅ Maintains AsyncStorage cache for offline support
- ✅ Proper error handling with fallback to cache

### 3. Refactored utils/roles.ts
- ✅ Updated `getCurrentUserRole()` to use `authApiService.getCurrentRole()`
- ✅ Marked as deprecated with note to use RoleContext or API service
- ✅ Kept utility functions (normalizeRole, isCandidate, etc.) for validation

### 4. Refactored Candidate Screens
- ✅ **AppliedJob**: Now uses `applicationApiService.getMyApplications()`
  - Fetches applications from API
  - Populates job details using `jobApiService.getJobById()`
  - Proper error handling and loading states

### 5. Refactored Employer Screens
- ✅ **Applications**: Uses `applicationApiService.getEmployerApplications()`
- ✅ **MyJobs**: Uses `jobApiService.getMyJobs()` and `jobApiService.deleteJob()`
- ✅ **AppliedList**: Uses `applicationApiService.getEmployerApplications()` and `applicationApiService.updateApplicationStatus()`

### 6. Refactored useJobDescription Hook
- ✅ Loads job data via `jobApiService.getJobById()`
- ✅ Checks application status via `applicationApiService.getMyApplications()`
- ✅ Creates applications via `applicationApiService.createApplication()`
- ✅ Withdraws applications via `applicationApiService.withdrawApplication()`
- ✅ Deletes jobs via `jobApiService.deleteJob()`

## ⚠️ Pending (Requires Backend Support)

### 1. Saved Jobs Functionality
**Status**: Needs API endpoints

**Required Endpoints**:
- `GET /api/jobs/saved` - Get saved jobs for current user
- `POST /api/jobs/:jobId/save` - Save a job
- `DELETE /api/jobs/:jobId/save` - Unsave a job

**Files Affected**:
- `app/(candidate)/savedJobs.tsx` - Currently uses Firestore `saved_jobs` collection
- `src/hooks/useJobStatus.ts` - Currently uses Firestore for saved jobs

**Note**: Backend uses `savedJobIds?: string[]` in User type, but frontend uses separate `saved_jobs` collection. Need to decide on data model.

### 2. User Profile Endpoints
**Status**: Needs API endpoints

**Required Endpoints**:
- `GET /api/auth/profile` - Get current user profile
- `PATCH /api/auth/profile` - Update user profile (name, phone, photoURL)
- Note: Email/password updates should remain client-side (Firebase Auth)

**Files Affected**:
- `app/(shared)/person.tsx` - Currently reads/updates Firestore directly
- Can use `authApiService.syncUser()` for updates, but needs GET endpoint for reading

### 3. Application Details Population
**Status**: Partially implemented

**Current**: Applications API returns basic application data. Job and user details are fetched separately on frontend.

**Improvement**: Backend could populate job/user details in application responses to reduce API calls.

## 📋 Implementation Details

### API Service Layer
All API calls go through:
- `src/services/apiClient.ts` - Axios client with auth token injection
- Service-specific files: `authApiService`, `applicationApiService`, `jobApiService`, `notificationApiService`

### Error Handling
- All API calls have try-catch blocks
- User-friendly error messages via Alert
- Console logging for debugging
- Fallback to cache when API fails (for role, etc.)

### Data Mapping
- API responses are mapped to match existing component expectations
- Date fields are normalized (string/Date/timestamp → Date object)
- Field names are normalized (appliedAt vs applied_at, etc.)

## 🔄 Migration Strategy

1. **Phase 1** (Completed): Core flows (applications, jobs, roles)
2. **Phase 2** (Pending): Saved jobs API endpoints
3. **Phase 3** (Pending): User profile API endpoints
4. **Phase 4** (Future): Optimize with populated responses

## 📝 Notes

- All refactored code maintains backward compatibility where possible
- Firebase Auth remains client-side (for token management)
- Firebase Storage remains client-side (for file uploads)
- Firestore is now only used for:
  - Chat functionality (not in scope)
  - Saved jobs (pending API endpoints)
  - User profile reads (pending API endpoint)

## 🚀 Next Steps

1. Create saved jobs API endpoints in backend
2. Create user profile GET endpoint in backend
3. Refactor saved jobs screens and hooks
4. Refactor Person profile screen
5. Test all flows end-to-end
6. Remove unused Firestore imports

