import React, { useState, useEffect } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { Button } from '@/components/base/Button';
import { AuthInput } from '@/components/auth/AuthInput';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { SocialLogin } from '@/components/auth/SocialLogin';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthValidation } from '@/hooks/auth/useAuthValidation';
import { useAuthRedirect } from '@/hooks/auth/useAuthRedirect';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { signIn, signInWithGoogle, loading: authLoading, error: authError, clearError } = useAuth();
  const { errors, clearError: clearFieldError, validateLoginForm } = useAuthValidation();

  useAuthRedirect();

  // Google Sign-In
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: '519470633273-q02bbr05e436b6udjrnp4m9e13aojetc.apps.googleusercontent.com', // Replace with your Google Client ID
    //iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com', // Optional
    //androidClientId: 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com', // Optional
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      if (id_token) {
        signInWithGoogle(id_token);
      }
    }
  }, [response]);

  const handleLogin = async () => {
    if (!validateLoginForm(email, password)) return;

    // ✅ Error được handle trong AuthContext, không cần catch lại
    // AuthContext sẽ set error state và hiển thị trên UI
    await signIn(email, password).catch(() => {
      // Silently handle - error already shown in UI via authError state
    });
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Animated.View entering={FadeIn.duration(600)} style={styles.header}>
        <Text style={styles.title}>Chào mừng trở lại! 👋</Text>
        <Text style={styles.subtitle}>Đăng nhập để tiếp tục hành trình tìm việc của bạn</Text>
      </Animated.View>

      <View style={styles.form}>
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
          placeholder="Mật khẩu"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            clearFieldError('password');
            clearError();
          }}
          error={errors.password}
          editable={!authLoading}
          returnKeyType="done"
          onSubmitEditing={handleLogin}
        />

        {authError && (
          <Animated.Text entering={FadeInDown.duration(300)} style={styles.globalError}>
            {authError}
          </Animated.Text>
        )}

        <Button title="Đăng nhập" onPress={handleLogin} loading={authLoading} disabled={authLoading} fullWidth size="large" />

        {/* Forgot Password Link */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.forgotPasswordContainer}>
          <Text 
            style={styles.forgotPasswordLink} 
            onPress={() => !authLoading && router.push('/(auth)/forgot-password')}
          >
            Quên mật khẩu?
          </Text>
        </Animated.View>

        <SocialLogin 
          onGooglePress={() => promptAsync()}
          disabled={authLoading || !request}
        />

        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.footer}>
          <Text style={styles.footerText}>Chưa có tài khoản? </Text>
          <Text style={styles.link} onPress={() => !authLoading && router.push('/(auth)/register')}>
            Đăng ký ngay
          </Text>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', justifyContent: 'center', paddingHorizontal: 24 },
  header: { marginBottom: 32 },
  title: { fontSize: 32, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#64748b', lineHeight: 24 },
  form: { gap: 4 },
  globalError: {
    backgroundColor: '#fef2f2',
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    fontSize: 14,
    color: '#991b1b',
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginTop: 8,
    marginBottom: 8,
  },
  forgotPasswordLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A80F0',
  },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  footerText: { fontSize: 15, color: '#64748b' },
  link: { fontSize: 15, fontWeight: '700', color: '#4A80F0' },
});