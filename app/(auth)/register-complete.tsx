import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { authApiService } from '@/services/authApi.service';
import { AppRole } from '@/types';
import { Button } from '@/components/base/Button';

export default function RegisterCompleteScreen() {
  const params = useLocalSearchParams<{ 
    email: string;
    name: string;
    phone: string;
    password: string;
    role: string;
  }>();
  
  const { email, name, phone, password, role } = params;
  
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    completeRegistration();
  }, []);

  const completeRegistration = async () => {
    try {
      // Consume the OTP first
      await authApiService.consumeOTP(email, 'email_verification');

      // Step 1: Create Firebase account (NOT using signUp from AuthContext to avoid auto-login)
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      // Step 2: Update display name
      await updateProfile(userCredential.user, {
        displayName: name.trim(),
      });

      // Step 3: Sync with backend - ensure name and phone are saved
      await authApiService.syncUser({
        uid: userCredential.user.uid,
        email: userCredential.user.email!,
        name: name.trim(),
        phone: phone.trim(),
        role: role as AppRole,
      });

      // Step 4: Sign out immediately so user needs to login manually
      await auth.signOut();

      setStatus('success');

    } catch (err: any) {
      console.error('❌ Registration error:', err);
      setStatus('error');
      
      // Map Firebase error codes to Vietnamese messages
      const errorCode = err?.code || '';
      if (errorCode === 'auth/email-already-in-use') {
        setError('Email này đã được sử dụng. Vui lòng dùng email khác.');
      } else if (errorCode === 'auth/weak-password') {
        setError('Mật khẩu quá yếu. Vui lòng chọn mật khẩu mạnh hơn.');
      } else {
        setError(err?.message || 'Đã xảy ra lỗi khi tạo tài khoản');
      }
    }
  };

  const handleGoToLogin = () => {
    router.replace('/(auth)/login');
  };

  const handleRetry = () => {
    router.replace('/(auth)/register');
  };

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeIn.duration(600)} style={styles.content}>
        {status === 'processing' && (
          <>
            <ActivityIndicator size="large" color="#4A80F0" />
            <Text style={styles.title}>Đang tạo tài khoản...</Text>
            <Text style={styles.subtitle}>Vui lòng chờ trong giây lát</Text>
          </>
        )}

        {status === 'success' && (
          <>
            <View style={styles.iconContainer}>
              <Ionicons name="checkmark-circle" size={80} color="#10B981" />
            </View>
            <Text style={styles.title}>Đăng ký thành công! 🎉</Text>
            <Text style={styles.subtitle}>
              Tài khoản của bạn đã được tạo thành công.{'\n'}
              Vui lòng đăng nhập để tiếp tục.
            </Text>
            
            <Animated.View 
              entering={FadeInDown.delay(300).duration(400)} 
              style={styles.buttonContainer}
            >
              <Button
                title="Đăng nhập ngay"
                onPress={handleGoToLogin}
                fullWidth
                size="large"
              />
            </Animated.View>
          </>
        )}

        {status === 'error' && (
          <>
            <View style={styles.iconContainerError}>
              <Ionicons name="close-circle" size={80} color="#EF4444" />
            </View>
            <Text style={styles.titleError}>Đăng ký thất bại</Text>
            <Text style={styles.subtitle}>{error}</Text>
            
            <Animated.View 
              entering={FadeInDown.delay(300).duration(400)} 
              style={styles.buttonContainer}
            >
              <Button
                title="Thử lại"
                onPress={handleRetry}
                fullWidth
                size="large"
              />
              <TouchableOpacity 
                style={styles.secondaryButton}
                onPress={handleGoToLogin}
              >
                <Text style={styles.secondaryButtonText}>
                  Đã có tài khoản? Đăng nhập
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconContainerError: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  titleError: {
    fontSize: 24,
    fontWeight: '700',
    color: '#EF4444',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  buttonContainer: {
    width: '100%',
    marginTop: 32,
    gap: 12,
  },
  secondaryButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    color: '#4A80F0',
    fontWeight: '600',
  },
});
