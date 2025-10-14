import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { auth, db } from '@/config/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Welcome Back 👋</Text>
        <Text style={styles.subtitle}>
          Đăng nhập để tiếp tục hành trình tìm việc của bạn
        </Text>
      </View>

      <View style={styles.form}>
        {/* Email */}
        <View
          style={[
            styles.inputContainer,
            !!emailErr && styles.inputContainerError,
          ]}
        >
          <Ionicons
            name="mail-outline"
            size={22}
            color={emailErr ? '#ef4444' : '#64748b'}
            style={styles.icon}
          />
          <TextInput
            placeholder="Email"
            placeholderTextColor="#94a3b8"
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
        {!!emailErr && <Text style={styles.fieldError}>{emailErr}</Text>}

        {/* Password */}
        <View
          style={[
            styles.inputContainer,
            !!passErr && styles.inputContainerError,
          ]}
        >
          <Ionicons
            name="lock-closed-outline"
            size={22}
            color={passErr ? '#ef4444' : '#64748b'}
            style={styles.icon}
          />
          <TextInput
            placeholder="Mật khẩu"
            placeholderTextColor="#94a3b8"
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
          <TouchableOpacity onPress={() => setSecure((s) => !s)}>
            <Ionicons
              name={secure ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color="#64748b"
            />
          </TouchableOpacity>
        </View>
        {!!passErr && <Text style={styles.fieldError}>{passErr}</Text>}

        {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.8 }]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Đăng nhập</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
          <Text style={styles.link}>Chưa có tài khoản? Đăng ký ngay</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9FB',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  header: { alignItems: 'center', marginBottom: 30 },
  title: { fontSize: 30, fontWeight: '800', color: '#1e293b' },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    marginTop: 6,
    textAlign: 'center',
  },
  form: { gap: 12 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    height: 54,
  },
  inputContainerError: {
    borderColor: '#ef4444',
  },
  input: { flex: 1, fontSize: 16, color: '#0f172a' },
  icon: { marginRight: 10 },
  fieldError: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: -6,
    marginBottom: 4,
    marginLeft: 6,
  },
  button: {
    backgroundColor: '#4A80F0',
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    elevation: 2,
  },
  buttonText: { fontSize: 17, color: '#fff', fontWeight: '700' },
  link: {
    color: '#4A80F0',
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 15,
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    fontSize: 14,
    marginTop: 2,
  },
});
