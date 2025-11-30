import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  KeyboardAvoidingView, 
  Platform, 
  StyleSheet, 
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/base/Button';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { authApiService } from '@/services/authApi.service';
import { useAuthValidation } from '@/hooks/auth/useAuthValidation';

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ email: string }>();
  const { email } = params;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { errors, clearError: clearFieldError, getPasswordStrength } = useAuthValidation();
  const [passwordError, setPasswordError] = useState<string | undefined>(undefined);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | undefined>(undefined);

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  const validateForm = (): boolean => {
    let isValid = true;

    if (!password) {
      setPasswordError('Vui lòng nhập mật khẩu mới');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Mật khẩu phải có ít nhất 6 ký tự');
      isValid = false;
    } else {
      setPasswordError(undefined);
    }

    if (!confirmPassword) {
      setConfirmPasswordError('Vui lòng xác nhận mật khẩu');
      isValid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError('Mật khẩu xác nhận không khớp');
      isValid = false;
    } else {
      setConfirmPasswordError(undefined);
    }

    return isValid;
  };

  const handleResetPassword = async () => {
    setError(null);
    
    if (!validateForm()) return;

    setLoading(true);

    try {
      const result = await authApiService.resetPassword(email, password);
      
      if (result.success) {
        Alert.alert(
          '🎉 Thành công',
          'Mật khẩu đã được đặt lại thành công! Bạn có thể đăng nhập với mật khẩu mới.',
          [
            {
              text: 'Đăng nhập',
              onPress: () => router.replace('/(auth)/login'),
            },
          ]
        );
      } else {
        setError(result.error || 'Không thể đặt lại mật khẩu');
      }
    } catch (err: any) {
      setError(err?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

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
          <Ionicons name="key-outline" size={48} color="#4A80F0" />
        </View>
        <Text style={styles.title}>Đặt lại mật khẩu</Text>
        <Text style={styles.subtitle}>
          Tạo mật khẩu mới cho tài khoản
        </Text>
        <Text style={styles.emailText}>{email}</Text>
      </Animated.View>

      <View style={styles.form}>
        <PasswordInput
          placeholder="Mật khẩu mới (tối thiểu 6 ký tự)"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setPasswordError(undefined);
            setError(null);
          }}
          error={passwordError}
          showStrength
          strength={passwordStrength}
          editable={!loading}
          returnKeyType="next"
        />

        <PasswordInput
          placeholder="Xác nhận mật khẩu mới"
          value={confirmPassword}
          onChangeText={(text) => {
            setConfirmPassword(text);
            setConfirmPasswordError(undefined);
            setError(null);
          }}
          error={confirmPasswordError}
          editable={!loading}
          returnKeyType="done"
          onSubmitEditing={handleResetPassword}
        />

        {error && (
          <Animated.Text entering={FadeInDown.duration(300)} style={styles.errorText}>
            {error}
          </Animated.Text>
        )}

        <Button
          title="Đặt lại mật khẩu"
          onPress={handleResetPassword}
          loading={loading}
          disabled={loading}
          fullWidth
          size="large"
        />

        {/* Tips */}
        <Animated.View 
          entering={FadeInDown.delay(200).duration(400)} 
          style={styles.tipsContainer}
        >
          <Text style={styles.tipsTitle}>💡 Mẹo tạo mật khẩu an toàn:</Text>
          <Text style={styles.tipItem}>• Sử dụng ít nhất 8 ký tự</Text>
          <Text style={styles.tipItem}>• Kết hợp chữ hoa, chữ thường và số</Text>
          <Text style={styles.tipItem}>• Thêm ký tự đặc biệt (!@#$%)</Text>
          <Text style={styles.tipItem}>• Không sử dụng thông tin cá nhân</Text>
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
  },
  emailText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A80F0',
    marginTop: 8,
  },
  form: {
    gap: 8,
  },
  errorText: {
    backgroundColor: '#fef2f2',
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    fontSize: 14,
    color: '#991b1b',
  },
  tipsContainer: {
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0369a1',
    marginBottom: 8,
  },
  tipItem: {
    fontSize: 13,
    color: '#0c4a6e',
    lineHeight: 20,
  },
});
