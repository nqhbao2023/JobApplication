import React, { useState, useMemo } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Button } from '@/components/base/Button';
import { AuthInput } from '@/components/auth/AuthInput';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { RoleSelector } from '@/components/auth/RoleSelector';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthValidation } from '@/hooks/auth/useAuthValidation';
import { authApiService } from '@/services/authApi.service';
import { AppRole } from '@/types';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<Exclude<AppRole, 'admin'>>('candidate');
  const [sendingOTP, setSendingOTP] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  const { signUp, loading: authLoading, error: authError, clearError } = useAuth();
  const { errors, clearError: clearFieldError, validateRegisterForm, getPasswordStrength } = useAuthValidation();

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  const handleRegister = async () => {
    if (!validateRegisterForm(name, phone, email, password, confirmPassword)) return;

    // Clear previous errors
    setRegisterError(null);
    clearError();

    // Send OTP to email for verification
    setSendingOTP(true);
    try {
      const result = await authApiService.sendOTP(email.trim(), 'email_verification');
      
      if (result.success) {
        // Navigate to OTP verification screen with registration data
        router.push({
          pathname: '/(auth)/verify-otp',
          params: {
            email: email.trim(),
            purpose: 'email_verification',
            name: name.trim(),
            phone: phone.trim(),
            password,
            role,
          },
        });
      } else {
        // Show error inline instead of Alert
        setRegisterError(result.error || 'Không thể gửi mã xác thực. Vui lòng thử lại.');
      }
    } catch (err: any) {
      setRegisterError(err?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setSendingOTP(false);
    }
  };

  const isLoading = authLoading || sendingOTP;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        keyboardShouldPersistTaps="handled" 
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(600)} style={styles.header}>
          <Text style={styles.title}>Tạo tài khoản</Text>
          <Text style={styles.subtitle}>Tham gia cộng đồng và mở khóa hàng ngàn cơ hội việc làm</Text>
        </Animated.View>

        <RoleSelector selected={role} onChange={setRole} disabled={isLoading} />

        <View style={styles.form}>
          <AuthInput
            icon="person-outline"
            placeholder="Họ và tên"
            value={name}
            onChangeText={(text) => {
              setName(text);
              clearFieldError('name');
              clearError();
            }}
            error={errors.name}
            editable={!isLoading}
            returnKeyType="next"
          />

          <AuthInput
            icon="call-outline"
            placeholder="Số điện thoại"
            value={phone}
            onChangeText={(text) => {
              setPhone(text);
              clearFieldError('phone');
              clearError();
            }}
            error={errors.phone}
            keyboardType="phone-pad"
            editable={!isLoading}
            returnKeyType="next"
          />

          <AuthInput
            icon="mail-outline"
            placeholder="Email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              clearFieldError('email');
              clearError();
              setRegisterError(null);
            }}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLoading}
            returnKeyType="next"
          />

          <PasswordInput
            placeholder="Mật khẩu (tối thiểu 6 ký tự)"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              clearFieldError('password');
              clearError();
            }}
            error={errors.password}
            showStrength
            strength={passwordStrength}
            editable={!isLoading}
            returnKeyType="next"
          />

          <PasswordInput
            placeholder="Xác nhận mật khẩu"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              clearFieldError('confirmPassword');
              clearError();
            }}
            error={errors.confirmPassword}
            editable={!isLoading}
            returnKeyType="done"
            onSubmitEditing={handleRegister}
          />

          {(authError || registerError) && (
            <Animated.View entering={FadeInDown.duration(300)} style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color="#991b1b" />
              <Text style={styles.errorText}>
                {registerError || authError}
              </Text>
            </Animated.View>
          )}

          <Button
            title={sendingOTP ? 'Đang gửi mã xác thực...' : (role === 'employer' ? 'Tạo tài khoản nhà tuyển dụng' : 'Tạo tài khoản ứng viên')}
            onPress={handleRegister}
            loading={isLoading}
            disabled={isLoading}
            fullWidth
            size="large"
          />

          <Text style={styles.otpNote}>
            📧 Mã xác thực sẽ được gửi đến email của bạn
          </Text>

          <TouchableOpacity 
            onPress={() => router.replace('/(auth)/login')} 
            disabled={isLoading}
            style={styles.linkContainer}
          >
            <Text style={styles.linkText}>Đã có tài khoản? </Text>
            <Text style={styles.linkTextBold}>Đăng nhập</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9FB',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  form: {
    marginTop: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 10,
  },
  errorText: {
    flex: 1,
    color: '#991b1b',
    fontSize: 14,
    lineHeight: 20,
  },
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  linkText: {
    fontSize: 14,
    color: '#64748b',
  },
  linkTextBold: {
    fontSize: 14,
    color: '#4A80F0',
    fontWeight: '700',
  },
  otpNote: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
