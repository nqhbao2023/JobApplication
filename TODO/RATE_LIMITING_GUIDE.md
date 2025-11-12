# Rate Limiting & API Request Best Practices

## 🚨 Vấn đề

Khi gọi nhiều API requests liên tục (ví dụ: `Promise.all()` cho 10-20 jobs), server có thể trả về lỗi **HTTP 429 (Too Many Requests)**.

```
ERROR Failed to fetch job xxx: [AxiosError: Request failed with status code 429]
```

## ✅ Giải pháp

### 1. **Sequential Fetch với Delay** (Đơn giản nhất)

Gọi API **tuần tự** (không song song), có delay giữa mỗi request:

```typescript
import { sequentialFetch } from '@/utils/rateLimit.utils';

const jobs = await sequentialFetch(
  jobIds,
  async (jobId) => await jobApiService.getJobById(jobId),
  200, // 200ms delay giữa mỗi request
  // Error handler (optional)
  (error, jobId) => {
    console.error(`Failed to fetch ${jobId}:`, error);
    return { title: 'Không rõ', image: undefined }; // Fallback data
  }
);
```

**Ưu điểm**: Đơn giản, tránh được 100% rate limit  
**Nhược điểm**: Chậm hơn parallel (10 items = 2 giây)

---

### 2. **Batch Fetch** (Tốt hơn cho nhiều items)

Chia items thành các **batches nhỏ**, mỗi batch xử lý song song:

```typescript
import { batchFetch } from '@/utils/rateLimit.utils';

const jobs = await batchFetch(
  jobIds, // 100 items
  async (jobId) => await jobApiService.getJobById(jobId),
  3,   // Xử lý 3 requests đồng thời
  500  // Delay 500ms giữa các batches
);
```

**Ưu điểm**: Nhanh hơn sequential, vẫn an toàn  
**Nhược điểm**: Phức tạp hơn

---

### 3. **Retry với Exponential Backoff**

Tự động **retry** khi gặp lỗi 429:

```typescript
import { retryWithBackoff } from '@/utils/rateLimit.utils';

const job = await retryWithBackoff(
  () => jobApiService.getJobById('abc123'),
  3,    // Retry tối đa 3 lần
  1000  // Delay ban đầu 1000ms, sau đó x2 mỗi lần
);
```

**Cách hoạt động**:
- Lần 1 fail → Đợi 1 giây → Retry
- Lần 2 fail → Đợi 2 giây → Retry  
- Lần 3 fail → Đợi 4 giây → Retry
- Lần 4 fail → Throw error

---

## 📋 Các file đã fix

### ✅ `app/(candidate)/appliedJob.tsx`
**Trước**: `Promise.all()` → 429 errors  
**Sau**: `sequentialFetch()` với 200ms delay

```typescript
const applicationsWithJobs = await sequentialFetch(
  apps,
  async (app) => {
    const job = await jobApiService.getJobById(app.jobId);
    return { ...app, jobInfo: job };
  },
  200,
  (error, app) => ({ ...app, jobInfo: { title: 'Đang tải...' } })
);
```

---

### ✅ `app/(candidate)/savedJobs.tsx`
**Trước**: `Promise.all()` → 429 errors  
**Sau**: Sequential loop với delay

```typescript
const jobDetails: any[] = [];
for (let i = 0; i < jobIds.length; i++) {
  if (i > 0) await new Promise(resolve => setTimeout(resolve, 200));
  const jobSnap = await getDoc(doc(db, 'jobs', jobIds[i]));
  jobDetails.push({ $id: jobIds[i], ...jobSnap.data() });
}
```

---

### ✅ `app/(employer)/applications.tsx`
**Sau**: Sequential loop với 429 detection

```typescript
for (let i = 0; i < applications.length; i++) {
  try {
    if (i > 0) await delay(200);
    const job = await jobApiService.getJobById(app.jobId);
    // ...
  } catch (error) {
    if (error?.response?.status === 429) {
      await delay(1000); // Tăng delay nếu bị rate limit
    }
  }
}
```

---

### ✅ `app/(employer)/index.tsx`
**Sau**: Sequential loop cho recent applications (5 items)

```typescript
const recent: any[] = [];
for (let i = 0; i < recentApps.length; i++) {
  if (i > 0) await delay(200);
  // Fetch user và job data...
}
```

---

## 🔧 Utility Functions

File: `src/utils/rateLimit.utils.ts`

### `sequentialFetch<T, R>()`
Execute async operations tuần tự với delay

**Parameters**:
- `items: T[]` - Mảng items cần xử lý
- `operation: (item, index) => Promise<R>` - Function async cho mỗi item
- `delayMs: number` - Delay giữa mỗi request (default: 200ms)
- `onError?: (error, item, index) => R` - Error handler (optional)

**Returns**: `Promise<R[]>`

---

### `batchFetch<T, R>()`
Xử lý items theo batches

**Parameters**:
- `items: T[]` - Mảng items
- `operation: (item, index) => Promise<R>` - Function async
- `batchSize: number` - Số requests song song (default: 3)
- `delayBetweenBatches: number` - Delay giữa batches (default: 500ms)

**Returns**: `Promise<R[]>`

---

### `retryWithBackoff<T>()`
Retry với exponential backoff

**Parameters**:
- `operation: () => Promise<T>` - Function cần retry
- `maxRetries: number` - Số lần retry tối đa (default: 3)
- `initialDelay: number` - Delay ban đầu (default: 1000ms)

**Returns**: `Promise<T>`

---

### `delay(ms: number)`
Helper function để tạm dừng execution

```typescript
await delay(1000); // Đợi 1 giây
```

---

## 📊 Performance Comparison

Giả sử fetch 20 jobs:

| Phương pháp | Thời gian | Rate Limit Risk | Complexity |
|-------------|-----------|-----------------|------------|
| `Promise.all()` | ~1s | ❌ Cao | Thấp |
| `sequentialFetch()` (200ms) | ~4s | ✅ An toàn | Thấp |
| `batchFetch(3, 500ms)` | ~3.5s | ✅ An toàn | Trung bình |
| `Promise.all()` + retry | ~1-10s | ⚠️ Có thể | Cao |

---

## 🎯 Best Practices

1. **Luôn dùng sequential/batch** cho list fetching (10+ items)
2. **Thêm error handlers** để app không crash khi 1 item fail
3. **Cache data** để giảm số lần gọi API
4. **Hiển thị loading state** cho user biết đang tải
5. **Fallback to placeholder** khi fetch fail
6. **Monitor logs** để phát hiện rate limit sớm

---

## 🔮 Future Improvements

### Server-side Solution (Tốt nhất)
Thay vì client fetch 20 jobs riêng lẻ, tạo endpoint batch:

```typescript
// ❌ Hiện tại: 20 requests
for (const id of jobIds) {
  await jobApiService.getJobById(id);
}

// ✅ Tương lai: 1 request
const jobs = await jobApiService.getJobsByIds(jobIds);
```

**Server endpoint**: `POST /api/jobs/batch`
```json
{
  "ids": ["job1", "job2", "job3"]
}
```

**Response**:
```json
{
  "jobs": [
    { "id": "job1", "title": "..." },
    { "id": "job2", "title": "..." }
  ]
}
```

---

## 📝 Testing

Để test rate limiting:

```typescript
// Simulate many requests
const jobIds = Array.from({ length: 50 }, (_, i) => `job${i}`);

console.time('sequentialFetch');
const jobs = await sequentialFetch(jobIds, fetchJob, 100);
console.timeEnd('sequentialFetch'); // ~5s

console.time('batchFetch');
const jobs2 = await batchFetch(jobIds, fetchJob, 5, 300);
console.timeEnd('batchFetch'); // ~3s
```

---

## 🆘 Troubleshooting

**Q: Vẫn bị 429 dù đã dùng `sequentialFetch()`?**  
A: Tăng `delayMs` lên 500ms hoặc 1000ms

**Q: Quá chậm với 20+ items?**  
A: Dùng `batchFetch()` với `batchSize: 3-5`

**Q: Cần real-time data?**  
A: Implement WebSocket hoặc Server-Sent Events thay vì polling

**Q: Backend không hỗ trợ batch endpoint?**  
A: Yêu cầu backend team tạo, hoặc dùng GraphQL DataLoader

---

## 📚 References

- [MDN: Retry-After header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Retry-After)
- [HTTP 429 Status Code](https://httpstatuses.com/429)
- [Exponential Backoff Algorithm](https://en.wikipedia.org/wiki/Exponential_backoff)
