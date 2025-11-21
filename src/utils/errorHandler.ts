/**
 * Unified Error Handler for Client-Side
 * 
 * Xử lý tất cả errors một cách thống nhất với:
 * - Context-based error messages
 * - Haptic feedback
 * - User-friendly Vietnamese messages
 * - Integration with API client and Firebase Auth errors
 */

import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { mapAuthError } from './validation/auth';

/**
 * Error contexts for different operations
 */
export type ErrorContext =
  | 'fetch_applications'
  | 'fetch_jobs'
  | 'fetch_job'
  | 'apply_job'
  | 'cancel_application'
  | 'delete_job'
  | 'create_job'
  | 'update_job'
  | 'update_profile'
  | 'upload_cv'
  | 'auth_signin'
  | 'auth_signup'
  | 'auth_signout'
  | 'get_role'
  | 'sync_user'
  | 'generic';

/**
 * Error handling options
 */
export interface ErrorOptions {
  silent?: boolean;        // Không hiển thị Alert
  haptic?: boolean;        // Bật/tắt haptic feedback
  callback?: () => void;   // Callback sau khi user bấm OK
  fallbackMessage?: string; // Message fallback nếu không tìm thấy
}

/**
 * Context-specific error titles
 */
const CONTEXT_TITLES: Record<ErrorContext, string> = {
  fetch_applications: 'Lỗi tải danh sách ứng tuyển',
  fetch_jobs: 'Lỗi tải danh sách công việc',
  fetch_job: 'Lỗi tải thông tin công việc',
  apply_job: 'Lỗi ứng tuyển',
  cancel_application: 'Lỗi hủy ứng tuyển',
  delete_job: 'Lỗi xóa công việc',
  create_job: 'Lỗi tạo công việc',
  update_job: 'Lỗi cập nhật công việc',
  update_profile: 'Lỗi cập nhật hồ sơ',
  upload_cv: 'Lỗi upload CV',
  auth_signin: 'Lỗi đăng nhập',
  auth_signup: 'Lỗi đăng ký',
  auth_signout: 'Lỗi đăng xuất',
  get_role: 'Lỗi lấy thông tin quyền',
  sync_user: 'Lỗi đồng bộ thông tin',
  generic: 'Lỗi',
};

/**
 * Error message mappings
 * Priority: Firebase Auth > API Errors > Network Errors > Generic
 */
const ERROR_MESSAGES: Record<string, string> = {
  // Network errors
  'network-request-failed': 'Không có kết nối internet. Vui lòng kiểm tra mạng và thử lại',
  'ECONNABORTED': 'Yêu cầu quá lâu. Vui lòng thử lại',
  'timeout': 'Yêu cầu quá lâu. Vui lòng thử lại',
  'ENOTFOUND': 'Không thể kết nối đến server. Vui lòng thử lại sau',
  'ECONNREFUSED': 'Không thể kết nối đến server. Vui lòng thử lại sau',

  // API errors (from backend AppError)
  'permission-denied': 'Bạn không có quyền thực hiện thao tác này',
  'not-found': 'Dữ liệu không tồn tại hoặc đã bị xóa',
  'already-exists': 'Dữ liệu đã tồn tại',
  'resource-exhausted': 'Đã đạt giới hạn. Vui lòng thử lại sau',
  'unauthenticated': 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại',
  'bad-request': 'Yêu cầu không hợp lệ. Vui lòng kiểm tra lại thông tin',
  'validation-error': 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại',
  'server-error': 'Lỗi server. Vui lòng thử lại sau',

  // Custom application errors
  'deleted-user': 'Tài khoản của bạn đã bị xóa. Vui lòng liên hệ quản trị viên',
  'session-expired': 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại',
  'job-not-found': 'Công việc không tồn tại hoặc đã bị xóa',
  'application-exists': 'Bạn đã ứng tuyển công việc này rồi',
};

/**
 * Extract error message from various error formats
 * 
 * Priority:
 * 1. Firebase Auth errors (via mapAuthError)
 * 2. Backend API errors (error.response.data.message/error)
 * 3. HTTP status codes
 * 4. Error code mappings
 * 5. Error message
 * 6. Fallback
 */
export function extractErrorMessage(
  error: any,
  fallbackMessage: string = 'Có lỗi xảy ra. Vui lòng thử lại'
): string {
  // Firebase Auth errors (có code bắt đầu bằng 'auth/')
  if (error?.code && error.code.startsWith('auth/')) {
    return mapAuthError(error.code);
  }

  // Backend API errors (Axios response)
  if (error?.response) {
    const status = error.response.status;
    const data = error.response.data;

    // HTTP status code mappings
    if (status === 401) {
      return ERROR_MESSAGES['unauthenticated'] || 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại';
    }
    if (status === 403) {
      return ERROR_MESSAGES['permission-denied'] || 'Bạn không có quyền thực hiện thao tác này';
    }
    if (status === 404) {
      return ERROR_MESSAGES['not-found'] || 'Dữ liệu không tồn tại hoặc đã bị xóa';
    }
    if (status === 400) {
      // Backend trả về error message trong data
      if (data?.message) return data.message;
      if (data?.error) return data.error;
      return ERROR_MESSAGES['bad-request'] || 'Yêu cầu không hợp lệ';
    }
    if (status >= 500) {
      return ERROR_MESSAGES['server-error'] || 'Lỗi server. Vui lòng thử lại sau';
    }

    // Backend AppError format: { error: string, message: string }
    if (data?.message) return data.message;
    if (data?.error) {
      // Check if error is a mapped error code
      return ERROR_MESSAGES[data.error] || data.error;
    }
  }

  // Network errors (no response)
  if (error?.code) {
    const mappedMessage = ERROR_MESSAGES[error.code];
    if (mappedMessage) return mappedMessage;
  }

  // Error message from error object
  if (error?.message) {
    // Check if message is a mapped error code
    if (ERROR_MESSAGES[error.message]) {
      return ERROR_MESSAGES[error.message];
    }
    return error.message;
  }

  // Fallback
  return fallbackMessage;
}

/**
 * Handle API errors with unified UX
 * 
 * @param error - Error object from API call
 * @param context - Error context for contextual messages
 * @param options - Error handling options
 * @returns Extracted error message
 */
export function handleApiError(
  error: any,
  context: ErrorContext = 'generic',
  options: ErrorOptions = {}
): string {
  const { silent = false, haptic = true, callback, fallbackMessage } = options;

  // Log error for debugging with validation details
  console.error(`❌ [${context}]`, {
    error,
    message: error?.message,
    code: error?.code,
    status: error?.response?.status,
    data: error?.response?.data,
  });

  // ✅ Extract and log validation details if available
  const validationDetails = error?.response?.data?.details;
  if (validationDetails && Array.isArray(validationDetails)) {
    console.error(`❌ [${context}] Validation Errors:`);
    validationDetails.forEach((detail: any) => {
      console.error(`  - ${detail.field}: ${detail.message}`);
    });
  }

  // Haptic feedback
  if (haptic) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {
      // Ignore haptic errors (device might not support)
    });
  }

  // Extract error message
  const message = extractErrorMessage(error, fallbackMessage || 'Có lỗi xảy ra. Vui lòng thử lại');

  // Show Alert if not silent
  if (!silent) {
    const title = CONTEXT_TITLES[context];
    Alert.alert(title, message, [
      {
        text: 'OK',
        onPress: callback,
      },
    ]);
  }

  return message;
}

/**
 * Handle success with haptic feedback
 * 
 * @param message - Success message
 * @param options - Options for success handling
 */
export function handleSuccess(
  message: string,
  options: { haptic?: boolean; callback?: () => void; title?: string } = {}
): void {
  const { haptic = true, callback, title = '✅ Thành công' } = options;

  if (haptic) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {
      // Ignore haptic errors
    });
  }

  Alert.alert(title, message, [
    {
      text: 'OK',
      onPress: callback,
    },
  ]);
}

/**
 * Retry wrapper for async operations
 * 
 * @param fn - Async function to retry
 * @param options - Retry options
 * @returns Promise with result
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    delay?: number;
    onRetry?: (attempt: number, error: any) => void;
    retryable?: (error: any) => boolean; // Check if error is retryable
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delay = 1000,
    onRetry,
    retryable = (error: any) => {
      // Retry on network errors and 5xx server errors
      if (!error.response) return true; // Network error
      if (error.response.status >= 500) return true; // Server error
      return false;
    },
  } = options;

  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry if error is not retryable
      if (!retryable(error)) {
        throw error;
      }

      // Last attempt - throw error
      if (attempt === maxRetries) {
        throw error;
      }

      // Call onRetry callback
      onRetry?.(attempt, error);

      // Exponential backoff: delay * attempt
      await new Promise((resolve) => setTimeout(resolve, delay * attempt));
    }
  }

  throw lastError || new Error('Retry failed');
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: any): boolean {
  if (!error) return false;
  
  // No response means network error
  if (!error.response) return true;
  
  // Check error codes
  const code = error.code || error.response?.data?.code;
  return (
    code === 'ECONNABORTED' ||
    code === 'ENOTFOUND' ||
    code === 'ECONNREFUSED' ||
    code === 'network-request-failed' ||
    error.message?.includes('Network Error') ||
    error.message?.includes('timeout')
  );
}

/**
 * Check if error is authentication error (401)
 */
export function isAuthError(error: any): boolean {
  return error?.response?.status === 401 || error?.code === 'unauthenticated';
}

/**
 * Check if error is permission error (403)
 */
export function isPermissionError(error: any): boolean {
  return error?.response?.status === 403 || error?.code === 'permission-denied';
}

export default {
  handleApiError,
  handleSuccess,
  withRetry,
  extractErrorMessage,
  isNetworkError,
  isAuthError,
  isPermissionError,
};

