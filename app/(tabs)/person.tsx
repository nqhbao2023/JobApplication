import { StyleSheet, Text, View, TouchableOpacity, Image, Alert, Modal, TextInput } from 'react-native'
import React, { useState, useEffect } from 'react'
import { RelativePathString, Stack } from 'expo-router'
import { Feather, Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { account } from '@/lib/appwrite';
import { collection_user_id, databases, databases_id } from '@/lib/appwrite'

const Person = () => {
  const [editField, setEditField] = useState<null | 'phone' | 'email' | 'password' | 'name'>(null);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [userName, setUserName] = useState('');
  const [dataUser, setDataUser] = useState<any>();
  const [userId, setUserId] = useState<string>('');

  const handleSave = async () => {
    try {
      if (editField === 'password') {
        if (passwords.new !== passwords.confirm) {
          Alert.alert('Error', 'Password does not match');
          return;
        }

        await account.updatePassword(passwords.new, passwords.current);
        Alert.alert('Success', 'Password updated successfully');
        setPasswords({ current: '', new: '', confirm: '' });
      }

      if (editField === 'phone') {
        await databases.updateDocument(
          databases_id,
          collection_user_id,
          userId,
          { phone: phone }
        );
        Alert.alert('Success', 'Phone number updated successfully');
      }

      if (editField === 'email') {
        await account.updateEmail(email, passwords.current);
        Alert.alert('Success', 'Email updated successfully');
        await databases.updateDocument(
          databases_id,
          collection_user_id,
          userId,
          { email: email }
        );

      }

      if (editField === 'name') {

        await databases.updateDocument(
          databases_id,
          collection_user_id,
          userId,
          { name: userName }
        );
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
      await account.deleteSession('current');
      router.push('/login');
    } catch (error) {
      console.log('Logout Error:', error);
    }
  };

  const load_user_id = async () => {
    try {
      const result = await account.get();
      setUserId(result.$id);
    } catch (error) {
      console.log(error);
    }
  };

  const load_data_user = async () => {
    if (userId) {
      try {
        const result = await databases.getDocument(
          databases_id,
          collection_user_id,
          userId
        );
        setDataUser(result);
        setUserName(result.name || '');
        setPhone(result.phone || '');
      } catch (error) {
        console.log(error);
      }
    }
  };




  useEffect(() => {
    const getAuthUser = async () => {
      try {
        const user = await account.get();
       
        setUserName(user.name);
      } catch (error) {
        console.error("Không lấy được thông tin user:", error);
      }
    };

    getAuthUser();
  }, []);

  useEffect(() => {
    load_user_id();
    load_data_user();
  }, [userId]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <View style={styles.avatarSection}>
          <View>
            <Image style={styles.avatar} source={{ uri: dataUser?.id_image ? dataUser.id_image : 'https://randomuser.me/api/portraits/men/1.jpg' }} />
            <TouchableOpacity style={styles.editAvatar}>
              <Feather name="camera" size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          <Text style={styles.name}>{dataUser?.name || 'No name'}</Text>
        </View>

        <Text style={styles.editProfile}> Edit Profile</Text>

        <View style={styles.infoBox}>
          <Text style={styles.label}> Name </Text>
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
            <Text style={styles.input}>*******</Text>
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

        <View style={styles.buttonContainer}>

          <TouchableOpacity style={styles.appliedJobsButton} onPress={() => router.push('/(events)/appliedJob')}>
            <Text style={styles.buttonText}>Applied Jobs</Text>
            <Ionicons name="checkmark-done" size={18} color="#fff" />
          </TouchableOpacity>
          {dataUser?.isRecruiter && (
            <View>
              <TouchableOpacity
                style={
                  styles.appliedJobsButton

                }
                onPress={() => router.push('/(events)/addJob')}
              >
                
                <Text style={{ color: '#fff', fontWeight: '600', marginLeft: 8 }}>
                  Thêm công việc
                </Text>
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={
                  styles.appliedJobsButton

                }
                onPress={() => router.push('/(events)/appliedList')}
              >
               
                <Text style={{ color: '#fff', fontWeight: '600', marginLeft: 8 }}>
                  Đơn ứng tuyển
                </Text>
                <Ionicons name='receipt-outline' size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.buttonText}>Logout</Text>
            <Ionicons name="log-out-outline" size={18} color="#fff" />
          </TouchableOpacity>

        </View>

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

      </SafeAreaView>
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
    height: 120,
    width: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#4A90E2',
  },
  editAvatar: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#4A90E2',
    borderRadius: 20,
    padding: 6,
    borderWidth: 2,
    borderColor: '#fff',
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
    marginTop: 30,
    gap: 15,
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
