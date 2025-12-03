import React, { useState, useEffect } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { Button } from '@/components/base/Button';
import { AuthInput } from '@/components/auth/AuthInput';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { SocialLogin } from '@/components/auth/SocialLogin';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthValidation } from '@/hooks/auth/useAuthValidation';
import { useAuthRedirect } from '@/hooks/auth/useAuthRedirect';

// Import GoogleSignin conditionally to avoid crashes in Expo Go
let GoogleSignin: any;
try {
  const GoogleSigninPackage = require('@react-native-google-signin/google-signin');
  GoogleSignin = GoogleSigninPackage.GoogleSignin;
} catch (e) {
  console.log('GoogleSignin native module not found (likely running in Expo Go)');
}

WebBrowser.maybeCompleteAuthSession();

// Check if running in Expo Go
const isExpoGo = Constants.appOwnership === 'expo';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { signIn, signInWithGoogle, loading: authLoading, error: authError, clearError } = useAuth();
  const { errors, clearError: clearFieldError, validateLoginForm } = useAuthValidation();

  useAuthRedirect();

  // Google Sign-In configuration (Expo Go)
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: '519470633273-q02bbr05e436b6udjrnp4m9e13aojetc.apps.googleusercontent.com',
    androidClientId: '519470633273-kul7qg3lfvust14aav1fp3u72e4rfprb.apps.googleusercontent.com',
    scopes: ['profile', 'email', 'openid'],
  });

  // Configure Native Google Sign-In
  useEffect(() => {
    if (!isExpoGo && GoogleSignin) {
      try {
        GoogleSignin.configure({
          webClientId: '519470633273-q02bbr05e436b6udjrnp4m9e13aojetc.apps.googleusercontent.com',
          offlineAccess: true,
        });
      } catch (e) {
        console.error('GoogleSignin configure error:', e);
      }
    }
  }, []);

  // Handle Expo Go Auth Response
  useEffect(() => {
    if (!isExpoGo) return; // Skip this effect if not in Expo Go

    console.log('🔗 Google Auth Response:', response?.type);
    
    if (response?.type === 'success') {
      const { authentication, params } = response;
      const idToken = params?.id_token || authentication?.idToken;
      
      if (idToken) {
        signInWithGoogle(idToken);
      } else {
        Alert.alert('Lỗi', 'Không nhận được token từ Google. Vui lòng thử lại.');
      }
    } else if (response?.type === 'error') {
      Alert.alert('Lỗi', 'Đăng nhập Google thất bại. Vui lòng thử lại.');
    }
  }, [response, signInWithGoogle]);

  const handleGoogleSignIn = async () => {
    if (isExpoGo) {
      Alert.alert(
        'Thông báo',
        'Đăng nhập Google trên Expo Go có thể không ổn định.\n\nĐể trải nghiệm tốt nhất, hãy cài đặt bản APK chính thức.',
        [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Tiếp tục', onPress: () => promptAsync() }
        ]
      );
      return;
    }

    // Native Google Sign-In Logic
    try {
      if (!GoogleSignin) {
        Alert.alert('Lỗi', 'Thư viện Google Sign-In chưa được khởi tạo.');
        return;
      }

      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      
      // Support both v12+ and older versions structure
      const idToken = userInfo.data?.idToken || userInfo.idToken;
      
      if (idToken) {
        await signInWithGoogle(idToken);
      } else {
        Alert.alert('Lỗi', 'Không nhận được ID Token từ Google.');
      }
    } catch (error: any) {
      console.error('Native Google Sign-In Error:', error);
      if (error.code === 'SIGN_IN_CANCELLED') {
        // User cancelled the login flow
      } else if (error.code === 'IN_PROGRESS') {
        Alert.alert('Thông báo', 'Đang xử lý đăng nhập...');
      } else if (error.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
        Alert.alert('Lỗi', 'Google Play Services không khả dụng.');
      } else {
        Alert.alert('Lỗi', 'Đăng nhập thất bại: ' + (error.message || 'Lỗi không xác định'));
      }
    }
  };

  const handleLogin = async () => {
    if (!validateLoginForm(email, password)) return;
    await signIn(email, password).catch(() => {});
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Animated.View entering={FadeIn.duration(600)} style={styles.header}>
        <Text style={styles.title}>Chào mừng trở lại!</Text>
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
          onGooglePress={handleGoogleSignIn}
          disabled={authLoading}
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