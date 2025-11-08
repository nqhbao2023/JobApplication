import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, Text } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Button } from '@/components/base/Button';
import { LoadingSpinner } from '@/components/base/LoadingSpinner';
import { FormInput } from '@/components/admin/FormInput';

type User = {
  name?: string;
  email?: string;
  role?: string;
  isAdmin?: boolean;
  phone?: string;
};

const UserDetailScreen = () => {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [user, setUser] = useState<User>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const snap = await getDoc(doc(db, 'users', userId));
      if (snap.exists()) {
        setUser(snap.data() as User);
      }
    } catch (error) {
      console.error('Error loading user:', error);
      Alert.alert('Lỗi', 'Không thể tải user');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user.name?.trim() || !user.email?.trim()) {
      Alert.alert('Lỗi', 'Tên và email không được để trống');
      return;
    }

    try {
      setSaving(true);
      await updateDoc(doc(db, 'users', userId), {
        name: user.name,
        phone: user.phone || '',
        role: user.role || 'candidate',
        isAdmin: user.isAdmin || false,
      });
      Alert.alert('Thành công', 'Đã cập nhật user', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Error saving:', error);
      Alert.alert('Lỗi', 'Không thể lưu');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

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
       label="Email (không thể sửa)"
       value={user.email}
       editable={false}
       style={styles.disabled}
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
      title="Lưu thay đổi"
      icon="checkmark"
      variant="success"
      onPress={handleSave}
      loading={saving}
      fullWidth
    />
  </View>
</ScrollView>
);
};
export default UserDetailScreen;
const styles = StyleSheet.create({
container: { flex: 1, backgroundColor: '#f8f9fa' },
content: { padding: 16, paddingBottom: 40 },
disabled: { backgroundColor: '#f1f5f9', color: '#64748b' },
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