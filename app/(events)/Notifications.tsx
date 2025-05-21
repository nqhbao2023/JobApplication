import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { databases, databases_id, collection_notifications_id, account, Query } from '@/lib/appwrite';

const Notifications = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    const fetchUserAndNotifications = async () => {
      try {
        const user = await account.get();
        setUserId(user.$id);

        const res = await databases.listDocuments(
          databases_id,
          collection_notifications_id,
          [Query.equal('userId', user.$id), Query.orderDesc('created_at')]
        );
        setNotifications(res.documents);

        // Đánh dấu tất cả thông báo là đã đọc
        const unreadNotifications = res.documents.filter((notif: any) => !notif.read);
        if (unreadNotifications.length > 0) {
          await Promise.all(
            unreadNotifications.map((notif: any) =>
              databases.updateDocument(
                databases_id,
                collection_notifications_id,
                notif.$id,
                { read: true }
              )
            )
          );
          setNotifications((prev) =>
            prev.map((notif) => ({ ...notif, read: true }))
          );
        }

        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
        setLoading(false);
      }
    };

    fetchUserAndNotifications();
  }, []);

  const markAsRead = async (notificationId: string) => {
    try {
      await databases.updateDocument(
        databases_id,
        collection_notifications_id,
        notificationId,
        { read: true }
      );
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.$id === notificationId ? { ...notif, read: true } : notif
        )
      );
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const deleteAllNotifications = async () => {
    try {
      const res = await databases.listDocuments(
        databases_id,
        collection_notifications_id,
        [Query.equal('userId', userId)]
      );
      await Promise.all(
        res.documents.map((notif: any) =>
          databases.deleteDocument(
            databases_id,
            collection_notifications_id,
            notif.$id
          )
        )
      );
      setNotifications([]);
      Alert.alert('Thành công', 'Đã xóa tất cả thông báo');
    } catch (error) {
      console.error('Failed to delete all notifications:', error);
      Alert.alert('Lỗi', 'Không thể xóa thông báo. Vui lòng thử lại.');
    }
  };

  const handleDeleteAll = () => {
    Alert.alert(
      'Xóa tất cả thông báo',
      'Bạn có chắc chắn muốn xóa tất cả thông báo không?',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa', onPress: deleteAllNotifications, style: 'destructive' },
      ]
    );
  };

  const renderNotification = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.notificationContainer, !item.read && styles.unreadNotification]}
      onPress={() => {
        markAsRead(item.$id);
        router.push(`/jobDescription?jobId=${item.jobId}`);
      }}
    >
      <Text style={styles.notificationText}>{item.message}</Text>
      <Text style={styles.notificationTime}>
        {new Date(item.created_at).toLocaleString()}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Đang tải thông báo...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thông báo</Text>
        {notifications.length > 0 && (
          <TouchableOpacity onPress={handleDeleteAll} style={styles.deleteAllButton}>
            <Text style={styles.deleteAllText}>Xóa tất cả</Text>
          </TouchableOpacity>
        )}
      </View>
      {notifications.length === 0 ? (
        <Text style={styles.emptyText}>Không có thông báo nào</Text>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.$id}
        />
      )}
    </View>
  );
};

export default Notifications;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f2f2f2',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 10,
    flex: 1,
  },
  deleteAllButton: {
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  deleteAllText: {
    color: '#FF0000',
    fontSize: 16,
    fontWeight: '600',
  },
  notificationContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  unreadNotification: {
    backgroundColor: '#e6f0fa',
  },
  notificationText: {
    fontSize: 16,
    color: '#333',
  },
  notificationTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
});