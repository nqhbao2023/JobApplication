// app/(employer)/notifications.tsx
// Trang thông báo cho employer - hiển thị các thông báo quan trọng như ứng viên mới

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
import { router } from 'expo-router';
import { auth, db } from '@/config/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  deleteDoc,
} from 'firebase/firestore';
import { eventBus, EVENTS } from '@/utils/eventBus';

dayjs.extend(relativeTime);
dayjs.locale('vi');

type NotificationDoc = {
  $id: string;
  message: string;
  title?: string;
  jobId?: string;
  applicationId?: string;
  candidateId?: string;
  read?: boolean;
  type?: string;
  created_at?: any;
};

type NotificationFilter = 'all' | 'application' | 'system' | 'chat';

const NOTIFICATION_THEMES: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; tint: string }> = {
  application: { icon: 'person-add-outline', color: '#10b981', tint: 'rgba(16,185,129,0.12)' },
  job: { icon: 'briefcase-outline', color: '#2563EB', tint: 'rgba(37,99,235,0.12)' },
  system: { icon: 'star-outline', color: '#7C3AED', tint: 'rgba(124,58,237,0.12)' },
  chat: { icon: 'chatbubble-ellipses-outline', color: '#f59e0b', tint: 'rgba(245,158,11,0.12)' },
  default: { icon: 'notifications-outline', color: '#475569', tint: 'rgba(148,163,184,0.12)' },
};

const resolveDate = (value?: any) => {
  if (!value) return new Date();
  if (typeof value === 'string') return new Date(value);
  if (value?.toDate) return value.toDate();
  return new Date(value);
};

const EmployerNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all');

  const fetchNotifications = useCallback(
    async (uid: string, mode: 'default' | 'refresh' = 'default') => {
      if (!uid) {
        console.log('❌ [Notifications] No UID provided');
        return;
      }
      console.log(`🔔 [Notifications] Fetching for employer UID: ${uid}`);
      mode === 'refresh' ? setRefreshing(true) : setLoading(true);
      try {
        // ✅ Query without orderBy first to avoid composite index requirement
        const q = query(
          collection(db, 'notifications'),
          where('userId', '==', uid)
        );
        const querySnapshot = await getDocs(q);
        console.log(`📬 [Notifications] Found ${querySnapshot.docs.length} notifications`);
        
        // ✅ Sort in memory by created_at descending
        const docs = querySnapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          console.log(`📋 Notification: ${docSnap.id}`, { 
            title: data.title, 
            type: data.type,
            userId: data.userId,
            read: data.read 
          });
          return { $id: docSnap.id, ...data };
        }) as NotificationDoc[];
        
        // Sort by created_at descending (most recent first)
        docs.sort((a, b) => {
          const aDate = resolveDate(a.created_at).getTime();
          const bDate = resolveDate(b.created_at).getTime();
          return bDate - aDate;
        });
        
        setNotifications(docs);
        // Emit event with actual unread count to sync badge
        const unreadCount = docs.filter((n) => !n.read).length;
        eventBus.emit(EVENTS.NOTIFICATIONS_READ, { unreadCount });
      } catch (error: any) {
        console.error('❌ [Notifications] Failed to fetch:', error);
      } finally {
        mode === 'refresh' ? setRefreshing(false) : setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const user = auth.currentUser;
    console.log('🔐 [Notifications] Current user:', user?.uid, user?.email);
    if (!user) {
      console.log('❌ [Notifications] No authenticated user');
      setLoading(false);
      return;
    }
    setUserId(user.uid);
    fetchNotifications(user.uid);
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), { read: true });
      setNotifications((prev) => {
        const updated = prev.map((notif) => (notif.$id === notificationId ? { ...notif, read: true } : notif));
        // Emit event with new unread count
        const newUnreadCount = updated.filter((n) => !n.read).length;
        eventBus.emit(EVENTS.NOTIFICATIONS_READ, { unreadCount: newUnreadCount });
        return updated;
      });
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const unread = notifications.filter((notif) => !notif.read);
    if (unread.length === 0) return;
    try {
      await Promise.all(unread.map((notif) => updateDoc(doc(db, 'notifications', notif.$id), { read: true })));
      setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));
      // Emit event with unread count = 0
      eventBus.emit(EVENTS.NOTIFICATIONS_READ, { unreadCount: 0 });
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  }, [notifications]);

  const deleteAllNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      const q = query(collection(db, 'notifications'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      await Promise.all(querySnapshot.docs.map((notif) => deleteDoc(doc(db, 'notifications', notif.id))));
      setNotifications([]);
      // Emit event with unread count = 0
      eventBus.emit(EVENTS.NOTIFICATIONS_READ, { unreadCount: 0 });
      Alert.alert('Thành công', 'Đã xóa tất cả thông báo');
    } catch (error) {
      console.error('Failed to delete all notifications:', error);
      Alert.alert('Lỗi', 'Không thể xóa thông báo. Vui lòng thử lại.');
    }
  }, [userId]);

  // ✅ Delete single notification
  const deleteSingleNotification = useCallback(async (notificationId: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
      setNotifications((prev) => {
        const updated = prev.filter((notif) => notif.$id !== notificationId);
        // Emit event with new unread count
        const newUnreadCount = updated.filter((n) => !n.read).length;
        eventBus.emit(EVENTS.NOTIFICATIONS_READ, { unreadCount: newUnreadCount });
        return updated;
      });
    } catch (error) {
      console.error('Failed to delete notification:', error);
      Alert.alert('Lỗi', 'Không thể xóa thông báo.');
    }
  }, []);

  const handleDeleteSingle = useCallback((notificationId: string) => {
    Alert.alert('Xóa thông báo', 'Bạn có chắc chắn muốn xóa thông báo này?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', onPress: () => deleteSingleNotification(notificationId), style: 'destructive' },
    ]);
  }, [deleteSingleNotification]);

  const handleDeleteAll = useCallback(() => {
    Alert.alert('Xóa tất cả thông báo', 'Bạn có chắc chắn muốn xóa tất cả thông báo không?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', onPress: deleteAllNotifications, style: 'destructive' },
    ]);
  }, [deleteAllNotifications]);

  const handleRefresh = useCallback(() => {
    if (userId) fetchNotifications(userId, 'refresh');
  }, [fetchNotifications, userId]);

  const summary = useMemo(() => {
    const unread = notifications.filter((notif) => !notif.read).length;
    const applications = notifications.filter((notif) => notif.type === 'application' || !!notif.applicationId).length;
    const chats = notifications.filter((notif) => notif.type === 'chat').length;
    return { total: notifications.length, unread, applications, chats };
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'application') return notif.type === 'application' || Boolean(notif.applicationId);
      if (activeFilter === 'system') return notif.type === 'system';
      if (activeFilter === 'chat') return notif.type === 'chat';
      return true;
    });
  }, [notifications, activeFilter]);

  const handleNotificationPress = useCallback(
    (item: NotificationDoc) => {
      if (!item.read) {
        markAsRead(item.$id);
      }
      // Điều hướng tới ứng viên nếu có applicationId
      if (item.applicationId) {
        router.push({
          pathname: '/(employer)/applicationDetail',
          params: { applicationId: item.applicationId },
        });
      } else if (item.jobId) {
        router.push({
          pathname: '/(shared)/jobDescription',
          params: { jobId: item.jobId, from: '/(employer)/notifications' },
        });
      }
    },
    [markAsRead]
  );

  const renderNotificationItem = ({ item, index }: { item: NotificationDoc; index: number }) => {
    const prev = filteredNotifications[index - 1];
    const showDivider = !prev || dayjs(resolveDate(prev.created_at)).format('YYYY-MM-DD') !== dayjs(resolveDate(item.created_at)).format('YYYY-MM-DD');
    const theme = NOTIFICATION_THEMES[item.type || 'default'] || NOTIFICATION_THEMES.default;

    return (
      <View>
        {showDivider && (
          <Text style={styles.dateDivider}>{dayjs(resolveDate(item.created_at)).format('DD MMM, YYYY')}</Text>
        )}
        <TouchableOpacity
          style={[styles.notificationCard, !item.read && styles.notificationCardUnread]}
          activeOpacity={0.9}
          onPress={() => handleNotificationPress(item)}
        >
          <View style={[styles.notificationIcon, { backgroundColor: theme.tint }]}>
            <Ionicons name={theme.icon} size={22} color={theme.color} />
          </View>
          <View style={styles.notificationContent}>
            <View style={styles.notificationTitleRow}>
              <Text style={styles.notificationTitle} numberOfLines={1}>
                {item.title || 'Thông báo mới'}
              </Text>
              {!item.read && <View style={styles.unreadDot} />}
            </View>
            <Text style={styles.notificationMessage} numberOfLines={2}>
              {item.message}
            </Text>
            <View style={styles.notificationMeta}>
              <Ionicons name="time-outline" size={14} color="#94a3b8" />
              <Text style={styles.notificationTime}>{dayjs(resolveDate(item.created_at)).fromNow()}</Text>
              {(item.type === 'application' || item.applicationId) && (
                <View style={styles.tagPill}>
                  <Ionicons name="person-add" size={12} color="#10b981" />
                  <Text style={[styles.tagPillText, { color: '#10b981' }]}>Ứng viên</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              onPress={(event) => {
                event.stopPropagation();
                markAsRead(item.$id);
              }}
              style={styles.markReadButton}
            >
              <Ionicons name={item.read ? 'checkmark-done-outline' : 'checkmark-outline'} size={20} color={item.read ? '#22c55e' : '#94a3b8'} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={(event) => {
                event.stopPropagation();
                handleDeleteSingle(item.$id);
              }}
              style={styles.deleteButton}
            >
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="notifications-off-outline" size={56} color="#cbd5f5" />
      <Text style={styles.emptyTitle}>Không có thông báo</Text>
      <Text style={styles.emptySubtitle}>Chúng tôi sẽ báo cho bạn ngay khi có ứng viên mới.</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Thông báo</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.actionCircle} onPress={markAllAsRead}>
            <Ionicons name="checkmark-done-outline" size={18} color="#0f172a" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCircle} onPress={handleDeleteAll}>
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      <LinearGradient colors={['#E8F5E9', '#FFFFFF']} style={styles.summaryCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.summaryLabel}>Hôm nay</Text>
          <Text style={styles.summaryValue}>{summary.unread} thông báo chưa đọc</Text>
          <Text style={styles.summarySub}>Bạn có tổng cộng {summary.total} cập nhật gần đây</Text>
        </View>
        <View style={styles.summaryBadges}>
          <View style={styles.summaryBadge}>
            <Ionicons name="person-add-outline" size={16} color="#10b981" />
            <Text style={styles.summaryBadgeText}>{summary.applications} ứng viên</Text>
          </View>
          <View style={styles.summaryBadge}>
            <Ionicons name="chatbubble-ellipses-outline" size={16} color="#0f172a" />
            <Text style={styles.summaryBadgeText}>{summary.chats} tin nhắn</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.filterRow}>
        {[
          { key: 'all', label: 'Tất cả' },
          { key: 'application', label: 'Ứng viên' },
          { key: 'chat', label: 'Tin nhắn' },
          { key: 'system', label: 'Hệ thống' },
        ].map((chip) => (
          <TouchableOpacity
            key={chip.key}
            style={[styles.filterChip, activeFilter === chip.key && styles.filterChipActive]}
            onPress={() => setActiveFilter(chip.key as NotificationFilter)}
          >
            <Text style={[styles.filterChipText, activeFilter === chip.key && styles.filterChipTextActive]}>
              {chip.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item.$id}
          renderItem={renderNotificationItem}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#10b981" />}
          contentContainerStyle={[
            styles.listContent,
            filteredNotifications.length === 0 && { flexGrow: 1, justifyContent: 'center' },
          ]}
          ListEmptyComponent={!loading && renderEmptyState()}
        />
      )}
    </SafeAreaView>
  );
};

export default EmployerNotifications;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFF',
    paddingHorizontal: 16,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  summaryCard: {
    borderRadius: 20,
    padding: 18,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
    color: '#0f172a',
  },
  summarySub: {
    fontSize: 13,
    marginTop: 4,
    color: '#475569',
  },
  summaryBadges: {
    gap: 8,
  },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  summaryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingTop: 10,
    paddingBottom: 32,
  },
  dateDivider: {
    marginTop: 18,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#fff',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  notificationCardUnread: {
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.2)',
  },
  notificationIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#475569',
    marginTop: 4,
  },
  notificationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: '#94a3b8',
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderRadius: 12,
    marginLeft: 6,
  },
  tagPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10b981',
  },
  actionButtons: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 8,
  },
  markReadButton: {
    padding: 6,
  },
  deleteButton: {
    padding: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 6,
    textAlign: 'center',
  },
});
