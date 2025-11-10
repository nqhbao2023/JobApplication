import { updatePassword, updateEmail, updateProfile } from 'firebase/auth';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Pressable,
} from 'react-native';
import React, { useState, useEffect, useCallback } from 'react';
import { RelativePathString, Stack } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, storage } from '@/config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { authApiService } from '@/services/authApi.service';
import { useRole } from '@/contexts/RoleContext';
import { handleApiError, handleSuccess } from '@/utils/errorHandler';

const Person = () => {
  const ActionBtn = ({
    icon,
    label,
    onPress,
    color = '#4A90E2',
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
    color?: string;
  }) => (
    <TouchableOpacity
      style={[styles.actionBtn, { backgroundColor: color }]}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <Ionicons name={icon} size={20} color="#fff" />
      <Text style={styles.buttonText}>{label}</Text>
    </TouchableOpacity>
  );

  const [editField, setEditField] = useState<
    null | 'phone' | 'email' | 'password' | 'name'
  >(null);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [userName, setUserName] = useState('');
  const [dataUser, setDataUser] = useState<any>();
  const [loading, setLoading] = useState(false);
  const { role } = useRole();

  /**
   * Handle save with transaction rollback
   */
  const handleSave = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No user logged in');

      setLoading(true);

      let firebaseUpdated = false;
      let apiUpdated = false;
      const originalData = { ...dataUser };

      // PASSWORD UPDATE
      if (editField === 'password') {
        if (passwords.new !== passwords.confirm) {
          Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');
          return;
        }
        if (passwords.new.length < 6) {
          Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự');
          return;
        }

        await updatePassword(user, passwords.new);
        firebaseUpdated = true;
        handleSuccess('Mật khẩu đã được cập nhật');
        setPasswords({ current: '', new: '', confirm: '' });
      }

      // PHONE UPDATE
      if (editField === 'phone') {
        await authApiService.updateProfile({ phone });
        apiUpdated = true;
        handleSuccess('Số điện thoại đã được cập nhật');
        await loadDataUser();
      }

      // EMAIL UPDATE (WITH ROLLBACK)
      if (editField === 'email') {
        const oldEmail = user.email;

        try {
          // Step 1: Update Firebase Auth
          await updateEmail(user, email);
          firebaseUpdated = true;

          // Step 2: Sync to backend
          await authApiService.syncUser({
            uid: user.uid,
            email: email,
            name: dataUser?.name,
            phone: dataUser?.phone,
          });
          apiUpdated = true;

          handleSuccess('Email đã được cập nhật');
          await loadDataUser();
        } catch (emailError: any) {
          console.error('❌ Email update failed:', emailError);

          // Rollback Firebase Auth if backend failed
          if (firebaseUpdated && !apiUpdated && oldEmail) {
            try {
              await updateEmail(user, oldEmail);
              console.log('🔄 Rolled back email change');
              Alert.alert(
                'Lỗi đồng bộ',
                'Email đã được hoàn về giá trị cũ do lỗi đồng bộ dữ liệu.'
              );
            } catch (rollbackErr) {
              console.error('❌ Rollback failed:', rollbackErr);
              Alert.alert(
                'Lỗi nghiêm trọng',
                'Email đã thay đổi nhưng không đồng bộ được. Vui lòng liên hệ hỗ trợ.'
              );
            }
          } else {
            throw emailError;
          }
        }
      }

      // NAME UPDATE
      if (editField === 'name') {
        try {
          await authApiService.updateProfile({ name: userName });
          apiUpdated = true;

          await updateProfile(user, { displayName: userName });
          firebaseUpdated = true;

          handleSuccess('Tên đã được cập nhật');
          await loadDataUser();
        } catch (nameError: any) {
          // Rollback if one succeeded
          if (apiUpdated && !firebaseUpdated) {
            await authApiService.updateProfile({ name: originalData.name });
          }
          throw nameError;
        }
      }
    } catch (error: any) {
      console.error('❌ Update failed:', error);

      const errorMessages: Record<string, string> = {
        'auth/requires-recent-login':
          'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để thay đổi mật khẩu/email.',
        'auth/weak-password': 'Mật khẩu quá yếu. Dùng ít nhất 6 ký tự.',
        'auth/email-already-in-use': 'Email này đã được sử dụng bởi tài khoản khác.',
      };

      Alert.alert(
        'Lỗi',
        errorMessages[error.code] || error.message || 'Không thể cập nhật. Vui lòng thử lại.'
      );
    } finally {
      setLoading(false);
      setEditField(null);
    }
  }, [editField, phone, email, passwords, userName, dataUser]);

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userRole');
      await auth.signOut();
      router.replace('/(auth)/login');
    } catch (error) {
      console.log('Logout Error:', error);
    }
  };

  const loadDataUser = useCallback(async () => {
    try {
      const profile = await authApiService.getProfile();
      setDataUser({ ...profile, role });
      setUserName(profile.name || '');
      setPhone(profile.phone || '');
      setEmail(profile.email || '');
    } catch (error: any) {
      console.error('❌ load_data_user error:', error);
      const user = auth.currentUser;
      if (user) {
        setDataUser({
          name: user.displayName || '',
          email: user.email || '',
          photoURL: user.photoURL || '',
          role: role,
        });
        setUserName(user.displayName || '');
        setEmail(user.email || '');
      }
    }
  }, [role]);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setUserName(user.displayName || '');
      setEmail(user.email || '');
      loadDataUser();
    }
  }, [role]);

  const pickAndUploadAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền bị từ chối', 'Cấp quyền truy cập thư viện ảnh để tiếp tục');
        return;
      }

      // @ts-ignore
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: true,
        aspect: [1, 1],
      });

      if (res.canceled) return;

      const asset = res.assets![0];
      const blob = await (await fetch(asset.uri)).blob();

      const uid = auth.currentUser!.uid;
      const fileRef = ref(storage, `avatars/${uid}/avatar.jpg`);
      await uploadBytes(fileRef, blob, { contentType: asset.mimeType || 'image/jpeg' });

      const url = await getDownloadURL(fileRef);

      await updateProfile(auth.currentUser!, { photoURL: url });
      await authApiService.updateProfile({ photoURL: url });

      setDataUser((prev: any) => ({ ...prev, photoURL: url, id_image: url }));
      handleSuccess('Ảnh đại diện đã được cập nhật!');
    } catch (err: any) {
      handleApiError(err, 'update_profile');
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <View style={styles.avatarSection}>
            <Pressable
              onPress={pickAndUploadAvatar}
              hitSlop={10}
              style={{ alignItems: 'center' }}
            >
              <Image
                style={styles.avatar}
                source={{
                  uri:
                    (dataUser?.photoURL ||
                      dataUser?.id_image ||
                      'https://placehold.co/120x120?text=Avatar') +
                    `?v=${Date.now()}`,
                }}
              />
              <View pointerEvents="none" style={styles.editAvatar}>
                <Feather name="camera" size={20} color="#fff" />
              </View>
            </Pressable>

            <Text style={styles.name}>{dataUser?.name || 'No name'}</Text>
          </View>

          <Text style={styles.editProfile}>Edit Profile</Text>

          <View style={styles.infoBox}>
            <Text style={styles.label}>Name</Text>
            <View style={styles.inputRow}>
              <Text style={styles.input}>{userName}</Text>
              <TouchableOpacity onPress={() => setEditField('name')}>
                <Feather name="edit-2" size={16} color="#333" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.label}>Phone number</Text>
            <View style={styles.inputRow}>
              <Text style={styles.input}>{phone}</Text>
              <TouchableOpacity onPress={() => setEditField('phone')}>
                <Feather name="edit-2" size={16} color="#333" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputRow}>
              <Text style={styles.input}>
                {dataUser?.email || auth.currentUser?.email || 'No email'}
              </Text>
              <TouchableOpacity onPress={() => setEditField('email')}>
                <Feather name="edit-2" size={16} color="#333" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputRow}>
              <Text style={styles.input}>*******</Text>
              <TouchableOpacity onPress={() => setEditField('password')}>
                <Feather name="edit-2" size={16} color="#333" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            {dataUser?.role === 'candidate' && (
              <ActionBtn
                icon="checkmark-done"
                label="Applied Jobs"
                onPress={() => router.push('/(shared)/appliedJob' as RelativePathString)}
              />
            )}

            {dataUser?.role === 'employer' && (
              <>
                <ActionBtn
                  icon="add-circle-outline"
                  label="Thêm công việc"
                  onPress={() => router.push('/(employer)/addJob' as RelativePathString)}
                />
                <ActionBtn
                  icon="receipt-outline"
                  label="Đơn ứng tuyển"
                  onPress={() => router.push('/(employer)/applications' as RelativePathString)}
                />
              </>
            )}

            <ActionBtn icon="log-out-outline" label="Logout" color="#FF4F4F" onPress={handleLogout} />
          </View>
        </ScrollView>
      </SafeAreaView>

      <Modal visible={!!editField} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editField === 'phone'
                ? 'Edit Phone Number'
                : editField === 'email'
                ? 'Edit Email'
                : editField === 'name'
                ? 'Edit Name'
                : 'Change Password'}
            </Text>

            {editField === 'name' && (
              <TextInput
                style={styles.modalInput}
                placeholder="Enter your name"
                value={userName}
                onChangeText={setUserName}
              />
            )}

            {editField === 'phone' && (
              <TextInput
                style={styles.modalInput}
                placeholder="Enter phone number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            )}

            {editField === 'email' && (
              <TextInput
                style={styles.modalInput}
                placeholder="Enter new email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
              />
            )}

            {editField === 'password' && (
              <>
                <TextInput
                  style={styles.modalInput}
                  placeholder="New password"
                  secureTextEntry
                  value={passwords.new}
                  onChangeText={(text) => setPasswords({ ...passwords, new: text })}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Confirm new password"
                  secureTextEntry
                  value={passwords.confirm}
                  onChangeText={(text) => setPasswords({ ...passwords, confirm: text })}
                />
              </>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setEditField(null)}>
                <Text style={{ color: 'red' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} disabled={loading}>
                <Text style={{ color: loading ? '#ccc' : 'blue' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default Person;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F2', paddingHorizontal: 20 },
  avatarSection: { alignItems: 'center', marginTop: 40, marginBottom: 30 },
  avatar: { height: 130, width: 130, borderRadius: 65, borderWidth: 3, borderColor: '#4A90E2' },
  editAvatar: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#4A90E2',
    borderRadius: 24,
    padding: 8,
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 4,
  },
  name: { fontSize: 22, fontWeight: '700', marginTop: 12, color: '#333' },
  editProfile: { fontSize: 18, fontWeight: '600', color: '#4A90E2', alignSelf: 'flex-start', marginBottom: 10 },
  infoBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 14,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  label: { fontSize: 13, color: '#888', marginBottom: 6 },
  inputRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  input: { fontSize: 16, color: '#222', flex: 1 },
  buttonContainer: { marginTop: 24 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 14,
    justifyContent: 'center',
    gap: 8,
    marginBottom: 14,
  },
  buttonText: { fontSize: 16, color: '#fff', fontWeight: '600' },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: { backgroundColor: '#fff', padding: 24, borderRadius: 12, width: '85%', alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 18, color: '#333' },
  modalInput: {
    width: '100%',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10 },
});