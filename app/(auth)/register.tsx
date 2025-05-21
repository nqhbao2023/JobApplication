import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Alert
} from 'react-native';
import { account, collection_user_id, databases, databases_id, ID } from '../../lib/appwrite';
import { useRouter } from 'expo-router';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [isRecruiter, setIsRecruiter] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(true);
  const [name, setName] = useState('');

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ thông tin.');
      return;
    }
    

    if (password !== confirmPassword) {
      Alert.alert('Thông báo', 'Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);
    const user_id = ID.unique();
    try {
     
      await account.create(user_id, email, password);
      await databases.createDocument(
        databases_id,
        collection_user_id,
        user_id,
        {
          isAdmin: false,
          id_image: null,
          isRecruiter: isRecruiter,
          name: name,
        }
      );
      Alert.alert('Thành công', 'Đăng ký thành công, vui lòng đăng nhập.');
      router.replace('/(auth)/login');
    } catch (error: any) {
      await account.deleteSession('current');
      Alert.alert('Lỗi đăng ký', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Popup chọn vai trò */}
      {showRoleModal && (
        <View style={styles.modalContainer}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Bạn là ai?</Text>
  
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setIsRecruiter(false);
                setShowRoleModal(false);
              }}
            >
              <Text style={styles.modalButtonText}>Người tìm việc</Text>
            </TouchableOpacity>
  
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setIsRecruiter(true);
                setShowRoleModal(false);
              }}
            >
              <Text style={styles.modalButtonText}>Nhà tuyển dụng</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
  
      {/* Giao diện chính đăng ký */}
      <Text style={styles.title}>Đăng ký</Text>
      <TextInput
  placeholder="Họ và tên"
  value={name}
  onChangeText={setName}
  style={styles.input}
/>

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        placeholder="Mật khẩu"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />
      <TextInput
        placeholder="Xác nhận mật khẩu"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        style={styles.input}
      />
  
      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Đăng ký</Text>
        )}
      </TouchableOpacity>
  
      <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
        <Text style={styles.link}>Đã có tài khoản? Đăng nhập</Text>
      </TouchableOpacity>
    </View>
  );
  
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 30, textAlign: 'center' },
  input: {
    borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 10,
    marginBottom: 15, fontSize: 16
  },
  button: {
    backgroundColor: '#007AFF', padding: 15, borderRadius: 10,
    alignItems: 'center', marginBottom: 10
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  link: { color: '#007AFF', textAlign: 'center', marginTop: 10 },
  modalContainer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  modalBox: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    marginVertical: 10,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  
});
