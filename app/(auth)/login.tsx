import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet
} from 'react-native';
import { router } from 'expo-router';
import { account } from '../../lib/appwrite';
import { databases_id, collection_user_id, databases } from '../../lib/appwrite';
export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return;
  
    setLoading(true);
    try {
      // Xóa session cũ nếu có
      try {
        await account.deleteSession('current');
      } catch (e) {
        console.log("Không có session để xóa");
      }
  
      // Tạo session mới
      const session = await account.createEmailPasswordSession(email, password);
      
      // Lấy thông tin user từ session hiện tại
      const user = await account.get();
      let userDoc;
      // Kiểm tra xem user đã tồn tại trong database chưa
      try {
      userDoc = await databases.getDocument(
          databases_id,
          collection_user_id,
          user.$id
        );
        
        // Nếu không bị lỗi nghĩa là document đã tồn tại
        console.log("User đã tồn tại trong database");
      } catch (error) {
        // Nếu chưa tồn tại thì tạo mới
        userDoc =await databases.createDocument(
          databases_id,
          collection_user_id,
          user.$id, // Sử dụng user ID làm document ID
          {
            name: user.name,
            email: user.email,
            isAdmin: false,
            isRecruiter: false
          }
        );
      }
  
     if (userDoc.isAdmin) {
        router.replace('/admin'); // Chuyển hướng đến trang admin
      } else {
        router.replace('/(tabs)'); // Chuyển hướng đến trang tabs
      }
    } catch (error: any) {
      alert('Login failed: ' + error.message);
      console.error("Chi tiết lỗi:", error);
    } finally {
      setLoading(false);
    }
  };
  
  

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Đăng nhập</Text>

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
        style={styles.input}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
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
});
