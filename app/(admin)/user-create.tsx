import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, Text } from 'react-native';
import { router } from 'expo-router';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { Button } from '@/components/base/Button';
import { FormInput } from '@/components/admin/FormInput';

type User = {
  name: string;
  email: string;
  password: string;
  role: string;
  isAdmin: boolean;
  phone: string;
};

const UserCreateScreen = () => {
  const [user, setUser] = useState<User>({
    name: '',
    email: '',
    password: '',
    role: 'candidate',
    isAdmin: false,
    phone: '',
  });
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!user.name?.trim() || !user.email?.trim() || !user.password?.trim()) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    if (user.password.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    try {
      setSaving(true);

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        user.email.trim(),
        user.password
      );

      await setDoc(doc(db, 'users', userCredential.user.uid), {
        name: user.name.trim(),
        email: user.email.trim(),
        phone: user.phone.trim() || '',
        role: user.role,
        isAdmin: user.isAdmin,
        created_at: new Date().toISOString(),
      });

      Alert.alert('Thành công', 'Đã tạo user mới', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('Error creating user:', error);
      let errorMessage = 'Không thể tạo user';

      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Email đã được sử dụng';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Email không hợp lệ';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Mật khẩu quá yếu';
      }

      Alert.alert('Lỗi', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <FormInput
          label="Tên"
          required
          value={user.name}
          onChangeText={(text) => setUser({ ...user, name: text })}
          placeholder="Nhập tên"
        />

        <FormInput
          label="Email"
          required
          value={user.email}
          onChangeText={(text) => setUser({ ...user, email: text })}
          placeholder="Nhập email"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <FormInput
          label="Mật khẩu (tối thiểu 6 ký tự)"
          required
          value={user.password}
          onChangeText={(text) => setUser({ ...user, password: text })}
          placeholder="Nhập mật khẩu"
          secureTextEntry
        />

        <FormInput
          label="Số điện thoại"
          value={user.phone}
          onChangeText={(text) => setUser({ ...user, phone: text })}
          placeholder="Nhập số điện thoại"
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Role</Text>
        <View style={styles.roleButtons}>
          {['candidate', 'employer', 'admin'].map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.roleBtn, user.role === r && styles.roleBtnActive]}
              onPress={() => setUser({ ...user, role: r })}
            >
              <Text style={[styles.roleBtnText, user.role === r && styles.roleBtnTextActive]}>
                {r}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.adminToggle}>
          <Text style={styles.label}>Admin</Text>
          <TouchableOpacity
            style={[styles.toggle, user.isAdmin && styles.toggleActive]}
            onPress={() => setUser({ ...user, isAdmin: !user.isAdmin })}
          >
            <View style={[styles.toggleThumb, user.isAdmin && styles.toggleThumbActive]} />
          </TouchableOpacity>
        </View>

        <Button
          title="Tạo User"
          icon="add"
          variant="success"
          onPress={handleCreate}
          loading={saving}
          fullWidth
        />
      </View>
    </ScrollView>
  );
};

export default UserCreateScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 14, fontWeight: '600', color: '#1a1a1a', marginBottom: 8, marginTop: 16 },
  roleButtons: { flexDirection: 'row', gap: 8 },
  roleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  roleBtnActive: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  roleBtnText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  roleBtnTextActive: { color: '#3b82f6' },
  adminToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  toggle: {
    width: 52,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#cbd5e1',
    justifyContent: 'center',
    padding: 2,
  },
  toggleActive: { backgroundColor: '#3b82f6' },
  toggleThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff' },
  toggleThumbActive: { alignSelf: 'flex-end' },
});