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
import { router } from 'expo-router';
import { auth, db } from '@/config/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  updateDoc,
  doc,
  deleteDoc,
} from 'firebase/firestore';

dayjs.extend(relativeTime);

type NotificationDoc = {
  $id: string;
  message: string;
  title?: string;
  jobId?: string;
  read?: boolean;
  type?: string;
  created_at?: any;
};

type NotificationFilter = 'all' | 'job' | 'system' | 'chat';

const NOTIFICATION_THEMES: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; tint: string }> = {
  job: { icon: 'briefcase-outline', color: '#2563EB', tint: 'rgba(37,99,235,0.12)' },
  system: { icon: 'star-outline', color: '#7C3AED', tint: 'rgba(124,58,237,0.12)' },
  chat: { icon: 'chatbubble-ellipses-outline', color: '#10B981', tint: 'rgba(16,185,129,0.12)' },
  default: { icon: 'notifications-outline', color: '#475569', tint: 'rgba(148,163,184,0.12)' },
};

const resolveDate = (value?: any) => {
  if (!value) return new Date();
  if (typeof value === 'string') return new Date(value);
  if (value?.toDate) return value.toDate();
  return new Date(value);
};

const Notifications = () => {
  const [notifications, setNotifications] = useState<NotificationDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all');

  const fetchNotifications = useCallback(
    async (uid: string, mode: 'default' | 'refresh' = 'default') => {
      if (!uid) return;
      mode === 'refresh' ? setRefreshing(true) : setLoading(true);
      try {
        const q = query(
          collection(db, 'notifications'),
          where('userId', '==', uid),
          orderBy('created_at', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const docs = querySnapshot.docs.map((docSnap) => ({ $id: docSnap.id, ...docSnap.data() })) as NotificationDoc[];
        setNotifications(docs);
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      } finally {
        mode === 'refresh' ? setRefreshing(false) : setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }
    setUserId(user.uid);
    fetchNotifications(user.uid);
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), { read: true });
      setNotifications((prev) => prev.map((notif) => (notif.$id === notificationId ? { ...notif, read: true } : notif)));
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
      Alert.alert('Thành công', 'Đã xóa tất cả thông báo');
    } catch (error) {
      console.error('Failed to delete all notifications:', error);
      Alert.alert('Lỗi', 'Không thể xóa thông báo. Vui lòng thử lại.');
    }
  }, [userId]);

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
    const job = notifications.filter((notif) => !!notif.jobId).length;
    const chats = notifications.filter((notif) => notif.type === 'chat').length;
    return { total: notifications.length, unread, job, chats };
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'job') return Boolean(notif.jobId);
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
      if (item.jobId) {
        router.push({ pathname: '/(shared)/jobDescription', params: { jobId: item.jobId, from: '/(shared)/Notifications' } });
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
          <View style={[styles.notificationIcon, { backgroundColor: theme.tint }]}
            >
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
              {item.jobId && (
                <View style={styles.tagPill}>
                  <Ionicons name="briefcase" size={12} color="#2563EB" />
                  <Text style={styles.tagPillText}>Công việc</Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity
            onPress={(event) => {
              event.stopPropagation();
              markAsRead(item.$id);
            }}
            style={styles.markReadButton}
          >
            <Ionicons name={item.read ? 'checkmark-done-outline' : 'checkmark-outline'} size={20} color={item.read ? '#22c55e' : '#94a3b8'} />
          </TouchableOpacity>
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="notifications-off-outline" size={56} color="#cbd5f5" />
      <Text style={styles.emptyTitle}>Không có thông báo</Text>
      <Text style={styles.emptySubtitle}>Chúng tôi sẽ báo cho bạn ngay khi có cập nhật mới.</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.headerIcon} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
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

      <LinearGradient colors={[ '#EDF2FF', '#FFFFFF' ]} style={styles.summaryCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.summaryLabel}>Hôm nay</Text>
          <Text style={styles.summaryValue}>{summary.unread} thông báo chưa đọc</Text>
          <Text style={styles.summarySub}>Bạn có tổng cộng {summary.total} cập nhật gần đây</Text>
        </View>
        <View style={styles.summaryBadges}>
          <View style={styles.summaryBadge}>
            <Ionicons name="briefcase-outline" size={16} color="#2563EB" />
            <Text style={styles.summaryBadgeText}>{summary.job} việc làm</Text>
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
          { key: 'job', label: 'Việc làm' },
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
          <ActivityIndicator size="large" color="#4A80F0" />
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item.$id}
          renderItem={renderNotificationItem}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#4A80F0" />}
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

export default Notifications;

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
    paddingVertical: 8,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  headerTitle: {
    fontSize: 20,
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
    shadowColor: '#4A80F0',
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
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
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
    borderColor: 'rgba(37,99,235,0.2)',
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
    backgroundColor: 'rgba(37,99,235,0.12)',
    borderRadius: 12,
    marginLeft: 6,
  },
  tagPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563EB',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563EB',
  },
  markReadButton: {
    paddingLeft: 10,
    paddingTop: 6,
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