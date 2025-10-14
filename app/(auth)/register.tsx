import { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { auth, db } from '@/config/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const isValidPhone = (v: string) => /^[0-9]{9,11}$/.test(v.trim()); // 9–11 số

const mapAuthError = (code?: string) => {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Email đã được sử dụng. Vui lòng dùng email khác.';
    case 'auth/invalid-email':
      return 'Địa chỉ email không hợp lệ.';
    case 'auth/weak-password':
      return 'Mật khẩu quá yếu (tối thiểu 6 ký tự).';
    case 'auth/network-request-failed':
      return 'Mất kết nối mạng. Vui lòng kiểm tra Internet và thử lại.';
    case 'auth/operation-not-allowed':
      return 'Phương thức đăng ký đang bị tắt. Vui lòng liên hệ hỗ trợ.';
    default:
      return 'Đăng ký thất bại. Vui lòng thử lại.';
  }
};

export default function RegisterScreen() {
  const router = useRouter();

  // form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const [secure2, setSecure2] = useState(true);
  const [isRecruiter, setIsRecruiter] = useState(false);

  // ui states
  const [loading, setLoading] = useState(false);
  const [emailErr, setEmailErr] = useState('');
  const [nameErr, setNameErr] = useState('');
  const [phoneErr, setPhoneErr] = useState('');
  const [passErr, setPassErr] = useState('');
  const [confirmErr, setConfirmErr] = useState('');
  const [formErr, setFormErr] = useState('');

  const passStrength = useMemo(() => {
    if (!password) return '';
    if (password.length < 6) return 'Yếu';
    if (password.length < 10) return 'Khá';
    return 'Mạnh';
  }, [password]);

  const validate = () => {
    let ok = true;
    setFormErr('');
    setEmailErr('');
    setNameErr('');
    setPhoneErr('');
    setPassErr('');
    setConfirmErr('');

    if (!name.trim()) {
      setNameErr('Vui lòng nhập họ và tên.');
      ok = false;
    }
    if (!phone.trim()) {
      setPhoneErr('Vui lòng nhập số điện thoại.');
      ok = false;
    } else if (!isValidPhone(phone)) {
      setPhoneErr('Số điện thoại không hợp lệ (9–11 số).');
      ok = false;
    }
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
    if (!confirmPassword) {
      setConfirmErr('Vui lòng xác nhận mật khẩu.');
      ok = false;
    } else if (confirmPassword !== password) {
      setConfirmErr('Mật khẩu xác nhận không khớp.');
      ok = false;
    }
    return ok;
  };

  const writeUserDocWithTimeout = async (uid: string, payload: any) => {
    const writeUserDoc = setDoc(doc(db, 'users', uid), payload);
    const timeout = new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 15000)
    );
    await Promise.race([writeUserDoc, timeout]);
  };

  const handleRegister = async () => {
    if (!validate()) return;

    setLoading(true);
    setFormErr('');

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
      const user = userCredential.user;

      // ✅ Cập nhật displayName vào Auth profile
      await updateProfile(user, { displayName: name.trim() });

      // ✅ Dữ liệu lưu Firestore
      const payload = {
        uid: user.uid,
        email: user.email,
        name: name.trim(),
        phone: phone.trim(),
        role: isRecruiter ? 'employer' : 'candidate',
        skills: [],
        savedJobIds: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await writeUserDocWithTimeout(user.uid, payload);

      setLoading(false);
      Alert.alert('🎉 Thành công', 'Tạo tài khoản thành công!');
      router.replace('/(auth)/login');
    } catch (err: any) {
      console.log('Register error:', err?.code || err?.message || err);
      setLoading(false);

      if (err?.message === 'timeout') {
        setFormErr('Ghi dữ liệu quá lâu (timeout 15s). Kiểm tra mạng và thử lại.');
        return;
      }
      if (err?.code === 'permission-denied') {
        setFormErr('Không có quyền ghi dữ liệu. Vui lòng liên hệ hỗ trợ.');
        return;
      }
      setFormErr(mapAuthError(err?.code));
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Tạo tài khoản ✨</Text>
        <Text style={styles.subtitle}>
          Tham gia cộng đồng và mở khóa hàng ngàn cơ hội việc làm
        </Text>
      </View>

      {/* Role segmented */}
      <View style={styles.roleSeg}>
        <TouchableOpacity
          style={[styles.roleBtn, !isRecruiter && styles.roleBtnActive]}
          onPress={() => setIsRecruiter(false)}
          disabled={loading}
        >
          <Ionicons
            name="person-outline"
            size={18}
            color={!isRecruiter ? '#fff' : '#64748b'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.roleText, !isRecruiter && styles.roleTextActive]}>
            Người tìm việc
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.roleBtn, isRecruiter && styles.roleBtnActive]}
          onPress={() => setIsRecruiter(true)}
          disabled={loading}
        >
          <Ionicons
            name="briefcase-outline"
            size={18}
            color={isRecruiter ? '#fff' : '#64748b'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.roleText, isRecruiter && styles.roleTextActive]}>
            Nhà tuyển dụng
          </Text>
        </TouchableOpacity>
      </View>

      {/* Form */}
      <View style={styles.form}>
        {/* Name */}
        <View style={[styles.inputContainer, !!nameErr && styles.inputError]}>
          <Ionicons
            name="person-outline"
            size={22}
            color={nameErr ? '#ef4444' : '#64748b'}
            style={styles.icon}
          />
          <TextInput
            placeholder="Họ và tên"
            placeholderTextColor="#94a3b8"
            value={name}
            onChangeText={(t) => {
              setName(t);
              if (nameErr) setNameErr('');
              if (formErr) setFormErr('');
            }}
            style={styles.input}
            returnKeyType="next"
          />
        </View>
        {!!nameErr && <Text style={styles.fieldError}>{nameErr}</Text>}

        {/* Phone */}
        <View style={[styles.inputContainer, !!phoneErr && styles.inputError]}>
          <Ionicons
            name="call-outline"
            size={22}
            color={phoneErr ? '#ef4444' : '#64748b'}
            style={styles.icon}
          />
          <TextInput
            placeholder="Số điện thoại"
            placeholderTextColor="#94a3b8"
            value={phone}
            onChangeText={(t) => {
              setPhone(t);
              if (phoneErr) setPhoneErr('');
              if (formErr) setFormErr('');
            }}
            keyboardType="phone-pad"
            style={styles.input}
            returnKeyType="next"
          />
        </View>
        {!!phoneErr && <Text style={styles.fieldError}>{phoneErr}</Text>}

        {/* Email */}
        <View style={[styles.inputContainer, !!emailErr && styles.inputError]}>
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
              if (formErr) setFormErr('');
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
        <View style={[styles.inputContainer, !!passErr && styles.inputError]}>
          <Ionicons
            name="lock-closed-outline"
            size={22}
            color={passErr ? '#ef4444' : '#64748b'}
            style={styles.icon}
          />
          <TextInput
            placeholder="Mật khẩu (≥ 6 ký tự)"
            placeholderTextColor="#94a3b8"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              if (passErr) setPassErr('');
              if (formErr) setFormErr('');
            }}
            secureTextEntry={secure}
            style={styles.input}
            returnKeyType="next"
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

        {/* Confirm password */}
        <View style={[styles.inputContainer, !!confirmErr && styles.inputError]}>
          <Ionicons
            name="shield-checkmark-outline"
            size={22}
            color={confirmErr ? '#ef4444' : '#64748b'}
            style={styles.icon}
          />
          <TextInput
            placeholder="Xác nhận mật khẩu"
            placeholderTextColor="#94a3b8"
            value={confirmPassword}
            onChangeText={(t) => {
              setConfirmPassword(t);
              if (confirmErr) setConfirmErr('');
              if (formErr) setFormErr('');
            }}
            secureTextEntry={secure2}
            style={styles.input}
            returnKeyType="done"
            onSubmitEditing={handleRegister}
          />
          <TouchableOpacity onPress={() => setSecure2((s) => !s)}>
            <Ionicons
              name={secure2 ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color="#64748b"
            />
          </TouchableOpacity>
        </View>
        {!!confirmErr && <Text style={styles.fieldError}>{confirmErr}</Text>}

        {!!formErr && <Text style={styles.formError}>{formErr}</Text>}

        {/* Button */}
        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.85 }]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {isRecruiter
                ? 'Tạo tài khoản nhà tuyển dụng'
                : 'Tạo tài khoản ứng viên'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
          <Text style={styles.link}>Đã có tài khoản? Đăng nhập</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9FB', paddingHorizontal: 28, paddingTop: 24 },
  header: { alignItems: 'center', marginBottom: 22, marginTop: 12 },
  title: { fontSize: 28, fontWeight: '800', color: '#1e293b' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 6, textAlign: 'center' },

  roleSeg: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    padding: 4,
    borderRadius: 14,
    marginBottom: 14,
    alignSelf: 'center',
  },
  roleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  roleBtnActive: { backgroundColor: '#4A80F0' },
  roleText: { color: '#64748b', fontWeight: '600' },
  roleTextActive: { color: '#fff' },

  form: { gap: 10 },

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
  inputError: { borderColor: '#ef4444' },
  icon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: '#0f172a' },

  fieldError: { color: '#ef4444', fontSize: 12, marginTop: -6, marginBottom: 4, marginLeft: 6 },
  formError: {
    color: '#ef4444',
    textAlign: 'center',
    fontSize: 14,
    marginTop: 2,
    marginBottom: 4,
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
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  link: { color: '#4A80F0', textAlign: 'center', fontWeight: '600', marginTop: 14, marginBottom: 10 },
});
