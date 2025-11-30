import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, Text } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/base/Button';
import { LoadingSpinner } from '@/components/base/LoadingSpinner';
import { FormInput } from '@/components/admin/FormInput';

type User = {
  name?: string;
  email?: string;
  role?: string;
  isAdmin?: boolean;
  phone?: string;
  created_at?: string;
  disabled?: boolean;
  disabledAt?: string;
  disabledReason?: string;
};

const UserDetailScreen = () => {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [user, setUser] = useState<User>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const currentUserId = auth.currentUser?.uid;
  const isSelf = userId === currentUserId;

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
      Alert.alert('Lỗi', 'Không thể tải thông tin user');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRole = async () => {
    if (isSelf) {
      Alert.alert('Không thể thực hiện', 'Bạn không thể thay đổi role của chính mình!');
      return;
    }

    try {
      setSaving(true);
      await updateDoc(doc(db, 'users', userId), {
        role: user.role || 'candidate',
        isAdmin: user.isAdmin || false,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUserId,
      });
      Alert.alert('Thành công', 'Đã cập nhật role user', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Error saving:', error);
      Alert.alert('Lỗi', 'Không thể lưu thay đổi');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleDisable = async () => {
    if (isSelf) {
      Alert.alert('Không thể thực hiện', 'Bạn không thể vô hiệu hóa chính tài khoản của mình!');
      return;
    }

    const isCurrentlyDisabled = user.disabled === true;
    const action = isCurrentlyDisabled ? 'kích hoạt lại' : 'vô hiệu hóa';

    Alert.alert(
      isCurrentlyDisabled ? 'Kích hoạt tài khoản' : 'Vô hiệu hóa tài khoản',
      `Bạn có chắc muốn ${action} tài khoản này?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: isCurrentlyDisabled ? 'Kích hoạt' : 'Vô hiệu hóa',
          style: isCurrentlyDisabled ? 'default' : 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              if (isCurrentlyDisabled) {
                await updateDoc(doc(db, 'users', userId), {
                  disabled: false,
                  disabledAt: null,
                  disabledReason: null,
                  enabledAt: new Date().toISOString(),
                  enabledBy: currentUserId,
                });
              } else {
                await updateDoc(doc(db, 'users', userId), {
                  disabled: true,
                  disabledAt: new Date().toISOString(),
                  disabledBy: currentUserId,
                  disabledReason: 'Bị vô hiệu hóa bởi admin',
                });
              }
              await loadUser();
              Alert.alert('Thành công', `Đã ${action} tài khoản`);
            } catch (error) {
              Alert.alert('Lỗi', `Không thể ${action} tài khoản`);
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  if (loading) return <LoadingSpinner />;

  const isDisabled = user.disabled === true;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Status Banner */}
        {isDisabled && (
          <View style={styles.disabledBanner}>
            <Ionicons name="ban" size={20} color="#DC2626" />
            <View style={styles.disabledInfo}>
              <Text style={styles.disabledTitle}>Tài khoản đã bị vô hiệu hóa</Text>
              {user.disabledAt && (
                <Text style={styles.disabledDate}>
                  Từ: {new Date(user.disabledAt).toLocaleString('vi-VN')}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Self Warning */}
        {isSelf && (
          <View style={styles.selfWarning}>
            <Ionicons name="information-circle" size={20} color="#1E40AF" />
            <Text style={styles.selfWarningText}>
              Đây là tài khoản của bạn. Bạn không thể thay đổi role hoặc vô hiệu hóa tài khoản này.
            </Text>
          </View>
        )}

        {/* User Info - Read Only */}
        <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>
        
        <FormInput
          label="Tên"
          value={user.name}
          editable={false}
          style={styles.readOnly}
        />
        
        <FormInput
          label="Email"
          value={user.email}
          editable={false}
          style={styles.readOnly}
        />
        
        <FormInput
          label="Số điện thoại"
          value={user.phone || 'Chưa cập nhật'}
          editable={false}
          style={styles.readOnly}
        />

        {user.created_at && (
          <FormInput
            label="Ngày tạo"
            value={new Date(user.created_at).toLocaleString('vi-VN')}
            editable={false}
            style={styles.readOnly}
          />
        )}

        {/* Role Management */}
        <Text style={styles.sectionTitle}>Quản lý quyền</Text>
        
        <Text style={styles.label}>Role</Text>
        <View style={styles.roleButtons}>
          {['candidate', 'employer'].map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.roleBtn, user.role === r && styles.roleBtnActive]}
              onPress={() => !isSelf && setUser({ ...user, role: r })}
              disabled={isSelf}
            >
              <Text style={[styles.roleBtnText, user.role === r && styles.roleBtnTextActive]}>
                {r === 'candidate' ? 'Ứng viên' : 'Nhà tuyển dụng'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.adminToggle}>
          <View>
            <Text style={styles.label}>Quyền Admin</Text>
            <Text style={styles.hint}>Cho phép truy cập trang quản trị</Text>
          </View>
          <TouchableOpacity
            style={[styles.toggle, user.isAdmin && styles.toggleActive]}
            onPress={() => !isSelf && setUser({ ...user, isAdmin: !user.isAdmin })}
            disabled={isSelf}
          >
            <View style={[styles.toggleThumb, user.isAdmin && styles.toggleThumbActive]} />
          </TouchableOpacity>
        </View>

        {!isSelf && (
          <Button
            title="Lưu thay đổi quyền"
            icon="checkmark"
            variant="success"
            onPress={handleSaveRole}
            loading={saving}
            fullWidth
          />
        )}

        {/* Account Status */}
        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Trạng thái tài khoản</Text>
        
        {!isSelf && (
          <Button
            title={isDisabled ? "Kích hoạt tài khoản" : "Vô hiệu hóa tài khoản"}
            icon={isDisabled ? "checkmark-circle" : "ban"}
            variant={isDisabled ? "success" : "danger"}
            onPress={handleToggleDisable}
            loading={saving}
            fullWidth
          />
        )}

        <Text style={styles.noteText}>
          {isDisabled 
            ? "⚠️ User đã bị vô hiệu hóa và không thể đăng nhập vào hệ thống."
            : "ℹ️ Vô hiệu hóa sẽ ngăn user đăng nhập nhưng không xóa dữ liệu."}
        </Text>
      </View>
    </ScrollView>
  );
};

export default UserDetailScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  readOnly: { 
    backgroundColor: '#F1F5F9', 
    color: '#64748B',
  },
  disabledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 12,
  },
  disabledInfo: { flex: 1 },
  disabledTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  disabledDate: {
    fontSize: 12,
    color: '#991B1B',
    marginTop: 2,
  },
  selfWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 12,
  },
  selfWarningText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  label: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#1a1a1a', 
    marginBottom: 8, 
    marginTop: 16,
  },
  hint: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
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
    marginBottom: 24,
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
  noteText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 12,
    lineHeight: 18,
    fontStyle: 'italic',
  },
});