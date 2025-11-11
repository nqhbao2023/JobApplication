/**
 * Rate Limiting Utilities
 * 
 * Giúp tránh lỗi HTTP 429 (Too Many Requests) khi gọi API liên tục
 */

/**
 * Delay helper - Tạm dừng execution một khoảng thời gian
 * @param ms - Số milliseconds cần delay
 */
export const delay = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Execute async operations sequentially with delay between each
 * 
 * @param items - Mảng các items cần xử lý
 * @param operation - Function async để thực thi cho mỗi item
 * @param delayMs - Delay giữa mỗi request (mặc định 200ms)
 * @param onError - Callback khi có lỗi (optional)
 * @returns Mảng kết quả từ operation
 * 
 * @example
 * ```ts
 * const jobIds = ['id1', 'id2', 'id3'];
 * const jobs = await sequentialFetch(
 *   jobIds,
 *   async (id) => await jobApiService.getJobById(id),
 *   200
 * );
 * ```
 */
export async function sequentialFetch<T, R>(
  items: T[],
  operation: (item: T, index: number) => Promise<R>,
  delayMs: number = 200,
  onError?: (error: any, item: T, index: number) => R | Promise<R>
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i++) {
    try {
      // Add delay between requests (skip first one)
      if (i > 0) {
        await delay(delayMs);
      }

      const result = await operation(items[i], i);
      results.push(result);
    } catch (error: any) {
      console.error(`Sequential fetch error at index ${i}:`, error);

      // If rate limited (429), increase delay for next request
      if (error?.response?.status === 429) {
        console.warn('⚠️ Rate limit hit, increasing delay...');
        await delay(1000);
      }

      // Call error handler if provided
      if (onError) {
        const fallbackResult = await onError(error, items[i], i);
        results.push(fallbackResult);
      }
    }
  }

  return results;
}

/**
 * Batch process items in chunks with delay between chunks
 * Tốt hơn sequential khi có nhiều items
 * 
 * @param items - Mảng các items cần xử lý
 * @param operation - Function async để thực thi cho mỗi item
 * @param batchSize - Số items xử lý đồng thời trong 1 batch (mặc định 3)
 * @param delayBetweenBatches - Delay giữa các batches (mặc định 500ms)
 * @returns Mảng kết quả từ operation
 * 
 * @example
 * ```ts
 * const jobIds = ['id1', 'id2', ...]; // 100 items
 * const jobs = await batchFetch(
 *   jobIds,
 *   async (id) => await jobApiService.getJobById(id),
 *   3,  // 3 requests đồng thời
 *   500 // Delay 500ms giữa các batch
 * );
 * ```
 */
export async function batchFetch<T, R>(
  items: T[],
  operation: (item: T, index: number) => Promise<R>,
  batchSize: number = 3,
  delayBetweenBatches: number = 500
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    // Add delay between batches (skip first batch)
    if (i > 0) {
      await delay(delayBetweenBatches);
    }

    // Process batch in parallel
    const batchResults = await Promise.allSettled(
      batch.map((item, batchIndex) => operation(item, i + batchIndex))
    );

    // Extract successful results
    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        console.error('Batch item failed:', result.reason);
      }
    }
  }

  return results;
}

/**
 * Retry an async operation with exponential backoff
 * 
 * @param operation - Function async cần retry
 * @param maxRetries - Số lần retry tối đa (mặc định 3)
 * @param initialDelay - Delay ban đầu (mặc định 1000ms)
 * @returns Kết quả từ operation
 * 
 * @example
 * ```ts
 * const job = await retryWithBackoff(
 *   () => jobApiService.getJobById('abc123'),
 *   3,
 *   1000
 * );
 * ```
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // If rate limited, always retry with longer delay
      if (error?.response?.status === 429) {
        const backoffDelay = initialDelay * Math.pow(2, attempt);
        console.warn(`⚠️ Rate limited, retrying in ${backoffDelay}ms... (attempt ${attempt + 1}/${maxRetries})`);
        await delay(backoffDelay);
        continue;
      }

      // For other errors, only retry if we have attempts left
      if (attempt < maxRetries) {
        const backoffDelay = initialDelay * Math.pow(2, attempt);
        console.warn(`⚠️ Request failed, retrying in ${backoffDelay}ms... (attempt ${attempt + 1}/${maxRetries})`);
        await delay(backoffDelay);
      }
    }
  }

  throw lastError;
}
