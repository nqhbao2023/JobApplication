import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

const Message = () => {
  const router = useRouter();

  const users = [
    {
      id: '1',
      name: 'Hoang Bao 1',
      role: 'Recruiter',
      status: 'Online',
      lastSeen: '3 days ago',
      lastMessage: 'Thanks for applying!',
      avatar: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTwCYWaXQINJSSPbM3FsZc03r2w5pUoQFExpw&s', // Avatar tạm
    },
    {
      id: '2',
      name: 'Hoang Bao 2',
      role: 'Candidate',
      status: 'Offline',
      lastSeen: '12 min ago',
      lastMessage: 'Can we reschedule?',
      avatar: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSV192g7_uoLkZ28Eq6n9Um3t3wRxl_1LdIbw&s',
    },
    {
      id: '3',
      name: 'Hoang Bao 3',
      role: 'Recruiter',
      status: 'Online',
      lastSeen: '11 days ago',
      lastMessage: 'Thanks for applying!',
      avatar: 'https://i.scdn.co/image/ab67616d0000b273d133f1ded1b1c6df4c31e83e',
    },
    {
      id: '4',
      name: 'Hoang Bao 4',
      role: 'Candidate',
      status: 'Offline',
      lastSeen: '30 min ago',
      lastMessage: 'Can we reschedule?',
      avatar: 'https://avatar-ex-swe.nixcdn.com/mv/2013/07/18/4/c/4/a/1374121444580_640.jpg',
    },
  ];

  const handleUserPress = (userId: string, userName: string) => {
    router.push({
      pathname: "/chat",
      params: { userId, userName },
    });
  };

  return (
    <SafeAreaView style={styles.mainContainer}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerText}>Message</Text>
      </View>


      <ScrollView style={styles.contentContainer}>
        {users.map((user) => (
          <TouchableOpacity
            key={user.id}
            style={styles.userItem}
            onPress={() => handleUserPress(user.id, user.name)}
            activeOpacity={0.7}
          >
            <View style={styles.avatarContainer}>
              <Image
                source={{ uri: user.avatar }}
                style={styles.avatar}
              />
              <View
                style={[
                  styles.statusDot,
                  user.status === 'Online' ? styles.onlineDot : styles.offlineDot,
                ]}
              />
            </View>

            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user.name}</Text>
            </View>

            {user.lastSeen ? <Text style={styles.lastSeen}>{user.lastSeen}</Text> : null}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  headerContainer: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  header: {
    fontSize: 22,
    fontWeight: '700',
    color: '#007AFF',
    textAlign: 'center',
    flex: 1,
  },
  
  contentContainer: {
    flex: 1,
    padding: 15,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E0E0E0',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    position: 'absolute',
    bottom: 2,
    right: 2,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  onlineDot: {
    backgroundColor: '#4CAF50',
  },
  offlineDot: {
    backgroundColor: '#9E9E9E',
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  lastSeen: {
    fontSize: 12,
    color: '#888',
    position: 'absolute',
    right: 15,
  },
});

export default Message;
