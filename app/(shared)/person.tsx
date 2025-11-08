import { updatePassword, updateEmail } from 'firebase/auth';
import { StyleSheet, Text, View, TouchableOpacity, Image, Alert, Modal, TextInput, ScrollView } from 'react-native'
import React, { useState, useEffect } from 'react'
import { RelativePathString, Stack } from 'expo-router'
import { Feather, Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { auth, db, storage } from "@/config/firebase";
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import AsyncStorage from "@react-native-async-storage/async-storage"; // 👈 thêm import này ở đầu file
import * as ImagePicker from "expo-image-picker";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateProfile } from "firebase/auth";
import { Pressable } from "react-native"; 

const Person = () => {
  /* ——— nút dùng chung ——— */
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
  const [editField, setEditField] = useState<null | 'phone' | 'email' | 'password' | 'name'>(null);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [userName, setUserName] = useState('');
  const [dataUser, setDataUser] = useState<any>();
  const [userId, setUserId] = useState<string>('');
  const handleSave = async () => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No user logged in');
      if (editField === 'password') {
        if (passwords.new !== passwords.confirm) {
          Alert.alert('Error', 'Password does not match');
          return;
        }
  await updatePassword(user, passwords.new);
        Alert.alert('Success', 'Password updated successfully');
        setPasswords({ current: '', new: '', confirm: '' });
      }
      if (editField === 'phone') {
        await updateDoc(doc(db, 'users', user.uid), { phone });
        Alert.alert('Success', 'Phone number updated successfully');
      }
      if (editField === 'email') {
  await updateEmail(user, email);
        Alert.alert('Success', 'Email updated successfully');
        await updateDoc(doc(db, 'users', user.uid), { email });
      }
      if (editField === 'name') {
        await updateDoc(doc(db, 'users', user.uid), { name: userName });
        Alert.alert('Success', 'Name updated successfully');
        load_data_user();
      }
    } catch (error: any) {
      console.log('Update failed:', error);
      Alert.alert('Error', error.message || 'Something went wrong');
    }
    setEditField(null);
  };

const handleLogout = async () => {
  try {
    // 🧹 Xoá role đã lưu
    await AsyncStorage.removeItem("userRole");

    // 🔒 Đăng xuất Firebase
    await auth.signOut();

    // 🚪 Quay về màn hình login
    router.replace("/(auth)/login");
  } catch (error) {
    console.log("Logout Error:", error);
  }
};

  const load_user_id = async () => {
    const user = auth.currentUser;
    if (user) setUserId(user.uid);
  };

  const load_data_user = async () => {
    if (userId) {
      try {
        const userSnap = await getDoc(doc(db, 'users', userId));
        if (userSnap.exists()) {
          const result = userSnap.data();
          setDataUser(result);
          setUserName(result.name || '');
          setPhone(result.phone || '');
        }
      } catch (error: any) {
        if (error?.code !== 'unavailable' && !error?.message?.includes('offline')) {
          console.error('load_data_user error:', error);
        }
      }
    }
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (user) setUserName(user.displayName || '');
  }, []);

  useEffect(() => {
    load_user_id();
    load_data_user();
  }, [userId]);
const pickAndUploadAvatar = async () => {
  console.log("⚡️ pick avatar pressed");
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Quyền bị từ chối", "Cấp quyền truy cập thư viện ảnh để tiếp tục");
      return;
    }

// Cách an toàn nhất hiện tại cho SDK 54
// @ts-ignore: expo-image-picker type chưa có MediaType (SDK 55 mới có)
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
    // Đúng chuẩn: avatars/<uid>/avatar.jpg
    const fileRef = ref(storage, `avatars/${uid}/avatar.jpg`);
    await uploadBytes(fileRef, blob, { contentType: asset.mimeType || "image/jpeg" });

    const url = await getDownloadURL(fileRef);

    await updateProfile(auth.currentUser!, { photoURL: url });
    await updateDoc(doc(db, "users", uid), { photoURL: url, id_image: url });

    setDataUser((prev: any) => ({ ...prev, photoURL: url, id_image: url }));
    Alert.alert("✅ Thành công", "Ảnh đại diện đã được cập nhật!");
  } catch (err: any) {
    console.log("Avatar change err:", err);
    Alert.alert("Lỗi", err.message || "Không thể cập nhật ảnh");
  }
};

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
          <ScrollView
    showsVerticalScrollIndicator={false}
    contentContainerStyle={{ paddingBottom: 40 }} // đủ chỗ cho nút cuối
  >
      {/* Avatar section */}
      <View style={styles.avatarSection}>
       
          <Pressable onPress={pickAndUploadAvatar} hitSlop={10} style={{ alignItems: 'center' }}>
            <Image
              style={styles.avatar}
              source={{
                uri:
                  (dataUser?.photoURL ||
                  dataUser?.id_image ||
                  'https://placehold.co/120x120?text=Avatar') +
                  `?v=${Date.now()}`,   // 👈 ép React-Native tải lại ảnh mới
              }}
            />
            <View pointerEvents="none" style={styles.editAvatar}>
              <Feather name="camera" size={20} color="#fff" />
            </View>
          </Pressable>

        <Text style={styles.name}>
          {dataUser?.name || "No name"}
        </Text>
      </View>

      <Text style={styles.editProfile}>Edit Profile</Text>

      {/* Info boxes */}
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
          <Text style={styles.label}> Phone number</Text>
          <View style={styles.inputRow}>
            <Text style={styles.input}>{phone}</Text>
            <TouchableOpacity onPress={() => setEditField('phone')}>
              <Feather name="edit-2" size={16} color="#333" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.label}> Email </Text>
          <View style={styles.inputRow}>
            <Text style={styles.input}>{dataUser?.email || auth.currentUser?.email || "No email"}</Text>
            <TouchableOpacity onPress={() => setEditField('email')}>
              <Feather name="edit-2" size={16} color="#333" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.label}> Password </Text>
          <View style={styles.inputRow}>
            <Text style={styles.input}>*******</Text>
            <TouchableOpacity onPress={() => setEditField('password')}>
              <Feather name="edit-2" size={16} color="#333" />
            </TouchableOpacity>
          </View>
        </View>

      {/* Button container */}
<View style={styles.buttonContainer}>
  {/* candidate only */}
  {dataUser?.role === 'candidate' && (
    <ActionBtn
      icon="checkmark-done"
      label="Applied Jobs"
      onPress={() =>
        router.push('/(shared)/appliedJob' as RelativePathString)
      }
    />
  )}

  {/* employer only */}
  {dataUser?.role === 'employer' && (
    <>
      <ActionBtn
        icon="add-circle-outline"
        label="Thêm công việc"
        onPress={() =>
          router.push('/(employer)/addJob' as RelativePathString)
        }
      />
      <ActionBtn
        icon="receipt-outline"
        label="Đơn ứng tuyển"
        onPress={() =>
          router.push('/(employer)/applications' as RelativePathString)
        }
      />
    </>
  )}
  {/* always visible */}
  <ActionBtn
    icon="log-out-outline"
    label="Logout"
    color="#FF4F4F"
    onPress={handleLogout}
  />
</View>
  </ScrollView>
</SafeAreaView>
      {/* Modal */}
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
              <>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter new email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter current password"
                  secureTextEntry
                  value={passwords.current}
                  onChangeText={(text) => setPasswords({ ...passwords, current: text })}
                />
              </>
            )}

            {editField === 'password' && (
              <>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Current password"
                  secureTextEntry
                  value={passwords.current}
                  onChangeText={(text) => setPasswords({ ...passwords, current: text })}
                />
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
              <TouchableOpacity onPress={handleSave}>
                <Text style={{ color: 'blue' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
export default Person;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F2',
    paddingHorizontal: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
    avatar: {
      height: 130,
      width: 130,
      borderRadius: 65,
      borderWidth: 3,
      borderColor: "#4A90E2",
    },
    editAvatar: {
      position: "absolute",
      bottom: 4,
      right: 4,
      backgroundColor: "#4A90E2",
      borderRadius: 24,
      padding: 8,             // tăng từ 6 → 8
      borderWidth: 2,
      borderColor: "#fff",
      elevation: 4,           // đổ bóng Android
    },
  name: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 12,
    color: '#333',
  },
  editProfile: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4A90E2',
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
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
  label: {
    fontSize: 13,
    color: '#888',
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  input: {
    fontSize: 16,
    color: '#222',
    flex: 1,
  },
  buttonContainer: {
    marginTop: 24,
  },
  actionBtn: {          
  flexDirection: 'row',
  alignItems: 'center',
  borderRadius: 10,
  paddingVertical: 14,
  justifyContent: 'center',
  gap: 8,
  marginBottom: 14,
},
  appliedJobsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A90E2',
    paddingVertical: 14,
    borderRadius: 10,
    justifyContent: 'center',
    gap: 8,
    marginBottom: 15,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF4F4F',
    paddingVertical: 14,
    borderRadius: 10,
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    width: '85%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 18,
    color: '#333',
  },
  modalInput: {
    width: '100%',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  
});
