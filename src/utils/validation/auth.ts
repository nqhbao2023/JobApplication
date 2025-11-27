export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const phoneRegex = /^[0-9]{9,11}$/;

export const validateEmail = (email: string): string => {
  if (!email.trim()) return 'Vui lòng nhập email';
  if (!emailRegex.test(email.trim())) return 'Email không đúng định dạng';
  return '';
};

export const validatePassword = (password: string): string => {
  if (!password) return 'Vui lòng nhập mật khẩu';
  if (password.length < 6) return 'Mật khẩu tối thiểu 6 ký tự';
  return '';
};

export const validateName = (name: string): string => {
  if (!name.trim()) return 'Vui lòng nhập họ và tên';
  if (name.trim().length < 2) return 'Tên quá ngắn';
  return '';
};

export const validatePhone = (phone: string): string => {
  if (!phone.trim()) return 'Vui lòng nhập số điện thoại';
  if (!phoneRegex.test(phone.trim())) return 'Số điện thoại không hợp lệ (9-11 số)';
  return '';
};

export const validateConfirmPassword = (password: string, confirm: string): string => {
  if (!confirm) return 'Vui lòng xác nhận mật khẩu';
  if (confirm !== password) return 'Mật khẩu xác nhận không khớp';
  return '';
};

export const getPasswordStrength = (password: string): { label: string; color: string; progress: number } => {
  if (!password) return { label: '', color: '#e2e8f0', progress: 0 };
  if (password.length < 6) return { label: 'Yếu', color: '#ef4444', progress: 0.33 };
  if (password.length < 10) return { label: 'Khá', color: '#f59e0b', progress: 0.66 };
  return { label: 'Mạnh', color: '#10b981', progress: 1 };
};

export const mapAuthError = (code?: string): string => {
  const errorMap: Record<string, string> = {
    'auth/invalid-email': 'Địa chỉ email không hợp lệ',
    'auth/user-not-found': 'Không tìm thấy tài khoản',
    'auth/wrong-password': 'Sai mật khẩu',
    'auth/invalid-credential': 'Email hoặc mật khẩu không đúng',
    'auth/user-disabled': 'Tài khoản đã bị vô hiệu hóa',
    'auth/too-many-requests': 'Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau.',
    'auth/network-request-failed': 'Không thể kết nối. Kiểm tra WiFi/Internet và thử lại.',
    'auth/email-already-in-use': 'Email đã được sử dụng',
    'auth/weak-password': 'Mật khẩu quá yếu',
    'auth/operation-not-allowed': 'Phương thức đăng nhập bị tắt',
    // Additional network errors
    'NETWORK_ERROR': 'Không thể kết nối server. Kiểm tra kết nối mạng.',
    'ERR_NETWORK': 'Lỗi kết nối mạng. Vui lòng thử lại.',
  };
  return errorMap[code || ''] || 'Đã xảy ra lỗi. Vui lòng thử lại';
};