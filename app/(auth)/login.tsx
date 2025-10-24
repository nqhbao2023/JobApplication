import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { auth, db } from '@/config/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const { width, height } = Dimensions.get('window');

const isValidEmail = (v: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

const mapAuthError = (code?: string) => {
  switch (code) {
    case 'auth/invalid-email':
      return 'Địa chỉ email không hợp lệ.';
    case 'auth/user-not-found':
      return 'Không tìm thấy tài khoản. Vui lòng đăng ký.';
    case 'auth/wrong-password':
      return 'Sai mật khẩu. Vui lòng thử lại.';
    case 'auth/too-many-requests':
      return 'Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau.';
    case 'auth/network-request-failed':
      return 'Mất kết nối mạng. Vui lòng kiểm tra Internet và thử lại.';
    default:
      return 'Đăng nhập thất bại. Vui lòng thử lại.';
  }
};

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const [loading, setLoading] = useState(false);

  const [emailErr, setEmailErr] = useState('');
  const [passErr, setPassErr] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const validate = () => {
    let ok = true;
    setEmailErr('');
    setPassErr('');
    setErrorMsg('');

    if (!email.trim()) {
      setEmailErr('Vui lòng nhập email.');
      ok = false;
    } else if (!isValidEmail(email)) {
      setEmailErr('Email không đúng định dạng (ví dụ: name@gmail.com).');
      ok = false;
    }

    if (!password) {
      setPassErr('Vui lòng nhập mật khẩu.');
      ok = false;
    } else if (password.length < 6) {
      setPassErr('Mật khẩu tối thiểu 6 ký tự.');
      ok = false;
    }

    return ok;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setLoading(true);
    setErrorMsg('');

    try {
      // ✅ Đăng nhập qua Firebase Auth
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
      const user = userCredential.user;

      // 🔍 Kiểm tra user trong Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        throw new Error('deleted-user');
      }

      // ✅ Lấy thông tin user
      const userData = userDocSnap.data();
      console.log('🔥 User data from Firestore:', userData);

      // ✅ Điều hướng theo role duy nhất
      switch (userData?.role) {
        case 'admin':
          router.replace('/admin');
          break;
        case 'recruiter':
          router.replace('/(employer)');
          break;
        default:
          router.replace('/(tabs)');
          break;
      }
    } catch (error: any) {
      if (error.message === 'deleted-user') {
        setErrorMsg(
          'Tài khoản của bạn đã bị xóa khỏi hệ thống. Vui lòng liên hệ quản trị viên.'
        );
        await auth.signOut();
        setLoading(false);
        return;
      }

      __DEV__ && console.log('Auth error:', error?.code, error?.message);
      setErrorMsg(mapAuthError(error?.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2', '#f093fb']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBackground}
      >
        {/* Decorative circles */}
        <View style={[styles.circle, styles.circle1]} />
        <View style={[styles.circle, styles.circle2]} />
        <View style={[styles.circle, styles.circle3]} />

        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View
              style={[
                styles.contentContainer,
                {
                  opacity: fadeAnim,
                  transform: [
                    { translateY: slideAnim },
                    { scale: scaleAnim },
                  ],
                },
              ]}
            >
              {/* Logo/Icon Section */}
              <View style={styles.logoContainer}>
                <View style={styles.logoCircle}>
                  <Ionicons name="briefcase" size={48} color="#fff" />
                </View>
                <Text style={styles.appName}>JobHub</Text>
              </View>

              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>Welcome Back! 👋</Text>
                <Text style={styles.subtitle}>
                  Đăng nhập để khám phá hàng nghìn cơ hội việc làm
                </Text>
              </View>

              {/* Form Card with Blur Effect */}
              <BlurView intensity={20} tint="light" style={styles.formCard}>
                <View style={styles.formCardInner}>
                  {/* Email Input */}
                  <View style={styles.inputWrapper}>
                    <View
                      style={[
                        styles.inputContainer,
                        !!emailErr && styles.inputContainerError,
                      ]}
                    >
                      <View style={styles.iconWrapper}>
                        <Ionicons
                          name="mail"
                          size={20}
                          color={emailErr ? '#ef4444' : '#667eea'}
                        />
                      </View>
                      <TextInput
                        placeholder="Email của bạn"
                        placeholderTextColor="rgba(0,0,0,0.4)"
                        value={email}
                        onChangeText={(t) => {
                          setEmail(t);
                          if (emailErr) setEmailErr('');
                          if (errorMsg) setErrorMsg('');
                        }}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={styles.input}
                        returnKeyType="next"
                      />
                    </View>
                    {!!emailErr && (
                      <View style={styles.errorContainer}>
                        <Ionicons name="alert-circle" size={14} color="#ef4444" />
                        <Text style={styles.fieldError}>{emailErr}</Text>
                      </View>
                    )}
                  </View>

                  {/* Password Input */}
                  <View style={styles.inputWrapper}>
                    <View
                      style={[
                        styles.inputContainer,
                        !!passErr && styles.inputContainerError,
                      ]}
                    >
                      <View style={styles.iconWrapper}>
                        <Ionicons
                          name="lock-closed"
                          size={20}
                          color={passErr ? '#ef4444' : '#667eea'}
                        />
                      </View>
                      <TextInput
                        placeholder="Mật khẩu"
                        placeholderTextColor="rgba(0,0,0,0.4)"
                        value={password}
                        onChangeText={(t) => {
                          setPassword(t);
                          if (passErr) setPassErr('');
                          if (errorMsg) setErrorMsg('');
                        }}
                        secureTextEntry={secure}
                        style={styles.input}
                        returnKeyType="done"
                        onSubmitEditing={handleLogin}
                      />
                      <TouchableOpacity
                        onPress={() => setSecure((s) => !s)}
                        style={styles.eyeButton}
                      >
                        <Ionicons
                          name={secure ? 'eye-off' : 'eye'}
                          size={20}
                          color="rgba(0,0,0,0.5)"
                        />
                      </TouchableOpacity>
                    </View>
                    {!!passErr && (
                      <View style={styles.errorContainer}>
                        <Ionicons name="alert-circle" size={14} color="#ef4444" />
                        <Text style={styles.fieldError}>{passErr}</Text>
                      </View>
                    )}
                  </View>

                  {/* General Error */}
                  {!!errorMsg && (
                    <View style={styles.generalErrorContainer}>
                      <Ionicons name="warning" size={18} color="#ef4444" />
                      <Text style={styles.errorText}>{errorMsg}</Text>
                    </View>
                  )}

                  {/* Login Button */}
                  <TouchableOpacity
                    style={[styles.button, loading && { opacity: 0.7 }]}
                    onPress={handleLogin}
                    disabled={loading}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#667eea', '#764ba2']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.buttonGradient}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <>
                          <Text style={styles.buttonText}>Đăng nhập</Text>
                          <Ionicons
                            name="arrow-forward"
                            size={20}
                            color="#fff"
                            style={{ marginLeft: 8 }}
                          />
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Divider */}
                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>HOẶC</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  {/* Register Link */}
                  <TouchableOpacity
                    onPress={() => router.push('/(auth)/register')}
                    style={styles.registerButton}
                  >
                    <Text style={styles.registerText}>
                      Chưa có tài khoản?{' '}
                      <Text style={styles.registerTextBold}>Đăng ký ngay</Text>
                    </Text>
                  </TouchableOpacity>
                </View>
              </BlurView>

              {/* Footer */}
              <Text style={styles.footer}>
                Bằng việc đăng nhập, bạn đồng ý với{' \n'}
                <Text style={styles.footerLink}>Điều khoản</Text> và{' '}
                <Text style={styles.footerLink}>Chính sách bảo mật</Text>
              </Text>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
  },
  // Decorative circles
  circle: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 1000,
  },
  circle1: {
    width: 300,
    height: 300,
    top: -100,
    right: -100,
  },
  circle2: {
    width: 200,
    height: 200,
    bottom: -50,
    left: -50,
  },
  circle3: {
    width: 150,
    height: 150,
    top: height * 0.3,
    left: -75,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  contentContainer: {
    paddingHorizontal: 24,
  },
  // Logo Section
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  appName: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1,
  },
  // Header
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  // Form Card
  formCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  formCardInner: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 24,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(102,126,234,0.2)',
    paddingHorizontal: 16,
    height: 56,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  inputContainerError: {
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239,68,68,0.05)',
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(102,126,234,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
  },
  eyeButton: {
    padding: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginLeft: 4,
  },
  fieldError: {
    color: '#ef4444',
    fontSize: 13,
    marginLeft: 6,
    fontWeight: '500',
  },
  generalErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.1)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  // Button
  button: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  buttonGradient: {
    flexDirection: 'row',
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 17,
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 12,
    color: 'rgba(0,0,0,0.4)',
    fontWeight: '600',
  },
  // Register
  registerButton: {
    paddingVertical: 12,
  },
  registerText: {
    fontSize: 15,
    color: 'rgba(0,0,0,0.6)',
    textAlign: 'center',
    fontWeight: '500',
  },
  registerTextBold: {
    color: '#667eea',
    fontWeight: '700',
  },
  // Footer
  footer: {
    marginTop: 24,
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 18,
  },
  footerLink: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
