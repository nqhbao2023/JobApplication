import React, { useState, useMemo } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, StyleSheet, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Button } from '@/components/base/Button';
import { AuthInput } from '@/components/auth/AuthInput';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { RoleSelector } from '@/components/auth/RoleSelector';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthValidation } from '@/hooks/auth/useAuthValidation';
import { AppRole } from '@/types';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<Exclude<AppRole, 'admin'>>('candidate');

  const { signUp, loading: authLoading, error: authError, clearError } = useAuth();
  const { errors, clearError: clearFieldError, validateRegisterForm, getPasswordStrength } = useAuthValidation();

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  const handleRegister = async () => {
    if (!validateRegisterForm(name, phone, email, password, confirmPassword)) return;

    try {
      await signUp(name, phone, email, password, role);
      Alert.alert('🎉 Thành công', 'Tạo tài khoản thành công!', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (err) {
      // Error handled by AuthContext
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        keyboardShouldPersistTaps="handled" 
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(600)} style={styles.header}>
          <Text style={styles.title}>Tạo tài khoản ✨</Text>
          <Text style={styles.subtitle}>Tham gia cộng đồng và mở khóa hàng ngàn cơ hội việc làm</Text>
        </Animated.View>

        <RoleSelector selected={role} onChange={setRole} disabled={authLoading} />

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
            editable={!authLoading}
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
            editable={!authLoading}
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
            }}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!authLoading}
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
            editable={!authLoading}
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
            editable={!authLoading}
            returnKeyType="done"
            onSubmitEditing={handleRegister}
          />

          {authError && (
            <Animated.Text entering={FadeInDown.duration(300)} style={styles.errorText}>
              {authError}
            </Animated.Text>
          )}

          <Button
            title={role === 'employer' ? 'Tạo tài khoản nhà tuyển dụng' : 'Tạo tài khoản ứng viên'}
            onPress={handleRegister}
            loading={authLoading}
            disabled={authLoading}
            fullWidth
            size="large"
          />

          <TouchableOpacity 
            onPress={() => router.replace('/(auth)/login')} 
            disabled={authLoading}
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
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
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
});
