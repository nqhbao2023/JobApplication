import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/base/Button';
import { AuthInput } from '@/components/auth/AuthInput';
import { authApiService } from '@/services/authApi.service';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | undefined>(undefined);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setEmailError('Vui lòng nhập email');
      return false;
    }
    if (!emailRegex.test(email)) {
      setEmailError('Email không hợp lệ');
      return false;
    }
    setEmailError(undefined);
    return true;
  };

  const handleSendOTP = async () => {
    setError(null);
    
    if (!validateEmail(email)) return;

    setLoading(true);
    try {
      const result = await authApiService.sendOTP(email.trim(), 'password_reset');
      
      if (result.success) {
        // Navigate to OTP verification screen
        router.push({
          pathname: '/(auth)/verify-otp',
          params: {
            email: email.trim(),
            purpose: 'password_reset',
          },
        });
      } else {
        setError(result.error || 'Không thể gửi mã OTP');
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
          <Ionicons name="lock-closed-outline" size={48} color="#4A80F0" />
        </View>
        <Text style={styles.title}>Quên mật khẩu?</Text>
        <Text style={styles.subtitle}>
          Nhập email của bạn và chúng tôi sẽ gửi mã xác nhận để đặt lại mật khẩu
        </Text>
      </Animated.View>

      <View style={styles.form}>
        <AuthInput
          icon="mail-outline"
          placeholder="Email"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setEmailError(undefined);
            setError(null);
          }}
          error={emailError}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
          returnKeyType="done"
          onSubmitEditing={handleSendOTP}
        />

        {error && (
          <Animated.Text entering={FadeInDown.duration(300)} style={styles.errorText}>
            {error}
          </Animated.Text>
        )}

        <Button
          title="Gửi mã xác nhận"
          onPress={handleSendOTP}
          loading={loading}
          disabled={loading}
          fullWidth
          size="large"
        />

        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.footer}>
          <Text style={styles.footerText}>Đã nhớ mật khẩu? </Text>
          <Text 
            style={styles.link} 
            onPress={() => !loading && router.push('/(auth)/login')}
          >
            Đăng nhập
          </Text>
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
    paddingHorizontal: 20,
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 15,
    color: '#64748b',
  },
  link: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4A80F0',
  },
});
