import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  KeyboardAvoidingView, 
  Platform, 
  StyleSheet, 
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/base/Button';
import { authApiService } from '@/services/authApi.service';

const OTP_LENGTH = 6;

export default function VerifyOTPScreen() {
  const params = useLocalSearchParams<{ 
    email: string; 
    purpose: 'password_reset' | 'email_verification';
    name?: string;
    phone?: string;
    password?: string;
    role?: string;
  }>();
  
  const { email, purpose, name, phone, password, role } = params;

  const [otp, setOtp] = useState<string[]>(new Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Start cooldown timer
  useEffect(() => {
    setResendCooldown(60); // 60 seconds cooldown initially
  }, []);

  // Countdown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleOtpChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return; // Only allow digits
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError(null);

    // Auto focus next input
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Handle backspace
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, OTP_LENGTH).split('');
    if (digits.length > 0) {
      const newOtp = [...otp];
      digits.forEach((digit, i) => {
        if (i < OTP_LENGTH) newOtp[i] = digit;
      });
      setOtp(newOtp);
      
      // Focus last filled input or last input
      const lastIndex = Math.min(digits.length - 1, OTP_LENGTH - 1);
      inputRefs.current[lastIndex]?.focus();
    }
  };

  const handleVerifyOTP = async () => {
    const otpCode = otp.join('');
    
    if (otpCode.length !== OTP_LENGTH) {
      setError('Vui lòng nhập đầy đủ mã OTP 6 số');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await authApiService.verifyOTP(email, otpCode, purpose);
      
      if (result.success) {
        if (purpose === 'password_reset') {
          // Navigate to reset password screen
          router.push({
            pathname: '/(auth)/reset-password',
            params: { email },
          });
        } else if (purpose === 'email_verification') {
          // Navigate back to register to complete registration
          router.push({
            pathname: '/(auth)/register-complete' as any,
            params: { email, name, phone, password, role },
          });
        }
      } else {
        setError(result.error || 'Mã OTP không chính xác');
      }
    } catch (err: any) {
      setError(err?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;

    setLoading(true);
    setError(null);

    try {
      const result = await authApiService.sendOTP(email, purpose);
      
      if (result.success) {
        setResendCooldown(60);
        Alert.alert('Thành công', 'Mã OTP mới đã được gửi đến email của bạn');
        // Clear current OTP
        setOtp(new Array(OTP_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
      } else {
        if (result.cooldownRemaining) {
          setResendCooldown(result.cooldownRemaining);
        }
        setError(result.error || 'Không thể gửi lại mã OTP');
      }
    } catch (err: any) {
      setError(err?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const purposeTitle = purpose === 'password_reset' 
    ? 'Đặt lại mật khẩu' 
    : 'Xác thực email';

  const purposeDescription = purpose === 'password_reset'
    ? 'Nhập mã 6 số đã được gửi đến email của bạn để tiếp tục đặt lại mật khẩu'
    : 'Nhập mã 6 số đã được gửi đến email của bạn để hoàn tất đăng ký';

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Back Button */}
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => router.back()}
        disabled={loading}
      >
        <Ionicons name="arrow-back" size={24} color="#0f172a" />
      </TouchableOpacity>

      <Animated.View entering={FadeIn.duration(600)} style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="mail-open-outline" size={48} color="#4A80F0" />
        </View>
        <Text style={styles.title}>{purposeTitle}</Text>
        <Text style={styles.subtitle}>{purposeDescription}</Text>
        <Text style={styles.emailText}>{email}</Text>
      </Animated.View>

      <View style={styles.form}>
        {/* OTP Input Fields */}
        <Animated.View 
          entering={FadeInDown.delay(100).duration(400)} 
          style={styles.otpContainer}
        >
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                inputRefs.current[index] = ref;
              }}
              style={[
                styles.otpInput,
                digit ? styles.otpInputFilled : {},
                error ? styles.otpInputError : {},
              ]}
              value={digit}
              onChangeText={(value) => handleOtpChange(value, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              editable={!loading}
              onFocus={() => setError(null)}
              // Handle paste
              onChange={(e) => {
                const text = e.nativeEvent.text;
                if (text.length > 1) {
                  handlePaste(text);
                }
              }}
            />
          ))}
        </Animated.View>

        {error && (
          <Animated.Text entering={FadeInDown.duration(300)} style={styles.errorText}>
            {error}
          </Animated.Text>
        )}

        <Button
          title="Xác nhận"
          onPress={handleVerifyOTP}
          loading={loading}
          disabled={loading || otp.join('').length !== OTP_LENGTH}
          fullWidth
          size="large"
        />

        {/* Resend OTP */}
        <Animated.View 
          entering={FadeInDown.delay(200).duration(400)} 
          style={styles.resendContainer}
        >
          <Text style={styles.resendText}>Không nhận được mã? </Text>
          {resendCooldown > 0 ? (
            <Text style={styles.cooldownText}>
              Gửi lại sau {resendCooldown}s
            </Text>
          ) : (
            <TouchableOpacity onPress={handleResendOTP} disabled={loading}>
              <Text style={styles.resendLink}>Gửi lại mã</Text>
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View 
          entering={FadeInDown.delay(300).duration(400)} 
          style={styles.actionButtons}
        >
          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={() => router.replace('/(auth)/register')}
            disabled={loading}
          >
            <Ionicons name="arrow-back-outline" size={18} color="#64748b" />
            <Text style={styles.secondaryButtonText}>Quay lại đăng ký</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={() => router.replace('/(auth)/login')}
            disabled={loading}
          >
            <Ionicons name="log-in-outline" size={18} color="#4A80F0" />
            <Text style={[styles.secondaryButtonText, { color: '#4A80F0' }]}>
              Đăng nhập
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    padding: 8,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  emailText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A80F0',
    marginTop: 8,
  },
  form: {
    gap: 16,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    color: '#0f172a',
    backgroundColor: '#fff',
  },
  otpInputFilled: {
    borderColor: '#4A80F0',
    backgroundColor: '#F0F4FF',
  },
  otpInputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    backgroundColor: '#fef2f2',
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    color: '#991b1b',
    textAlign: 'center',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  resendText: {
    fontSize: 15,
    color: '#64748b',
  },
  resendLink: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4A80F0',
  },
  cooldownText: {
    fontSize: 15,
    color: '#94a3b8',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 6,
  },
  secondaryButtonText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
});
