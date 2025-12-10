// app/(candidate)/myJobPosts.tsx
// ✅ NEW: Trang hiển thị các tin tìm việc (Quick Post) mà candidate đã đăng
import Animated, { FadeInDown } from 'react-native-reanimated';
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeBack } from '@/hooks/useSafeBack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { db, auth } from '@/config/firebase';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore';
import type { Job } from '@/types';

const HORIZONTAL_PADDING = 20;

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'active':
        return { label: 'Đã duyệt', color: '#10b981', bgColor: '#d1fae5', icon: 'checkmark-circle' };
      case 'inactive':
        return { label: 'Chờ duyệt', color: '#f59e0b', bgColor: '#fef3c7', icon: 'time' };
      case 'rejected':
        return { label: 'Bị từ chối', color: '#ef4444', bgColor: '#fee2e2', icon: 'close-circle' };
      default:
        return { label: 'Không rõ', color: '#6b7280', bgColor: '#f3f4f6', icon: 'help-circle' };
    }
  };

  const config = getStatusConfig();
  return (
    <View style={[styles.statusBadge, { backgroundColor: config.bgColor }]}>
      <Ionicons name={config.icon as any} size={12} color={config.color} />
      <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
};

export default function MyJobPosts() {
  const router = useRouter();
  const { goBack } = useSafeBack({ fallback: '/(candidate)' });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [posts, setPosts] = useState<Job[]>([]);

  const loadMyPosts = useCallback(async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('Lỗi', 'Vui lòng đăng nhập để xem tin đã đăng');
        return;
      }

      console.log('🔍 Loading my posts for user:', currentUser.uid);

      // Query quick-posts của user hiện tại (candidate_seeking jobs)
      const q = query(
        collection(db, 'jobs'),
        where('posterId', '==', currentUser.uid),
        where('jobType', '==', 'candidate_seeking')
      );
      
      const snapshot = await getDocs(q);
      console.log('📊 Found', snapshot.size, 'posts');
      
      const results: Job[] = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('📄 Post:', doc.id, {
          title: data.title,
          jobType: data.jobType,
          posterId: data.posterId,
          status: data.status,
        });
        return {
          $id: doc.id,
          ...data,
        } as Job;
      });
      
      // Sort by createdAt descending
      results.sort((a, b) => {
        const aTime = (a.createdAt as any)?.toDate?.()?.getTime?.() || 
                      new Date(a.created_at || 0).getTime();
        const bTime = (b.createdAt as any)?.toDate?.()?.getTime?.() || 
                      new Date(b.created_at || 0).getTime();
        return bTime - aTime;
      });
      
      console.log('✅ Loaded', results.length, 'posts after sorting');
      setPosts(results);
    } catch (error: any) {
      console.error('❌ Error loading my posts:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách tin đã đăng: ' + error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMyPosts();
  }, [loadMyPosts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadMyPosts();
  }, [loadMyPosts]);

  const handleDeletePost = useCallback((post: Job) => {
    Alert.alert(
      'Xóa tin đăng',
      `Bạn có chắc muốn xóa tin "${post.title}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'jobs', post.$id));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Thành công', 'Đã xóa tin đăng');
              loadMyPosts();
            } catch (error: any) {
              Alert.alert('Lỗi', 'Không thể xóa tin. Vui lòng thử lại.');
            }
          },
        },
      ]
    );
  }, [loadMyPosts]);

  const PostCard = ({ item, index }: { item: Job; index: number }) => {
    const createdAt = (item.createdAt as any)?.toDate?.() || 
                      new Date(item.created_at || Date.now());
    const daysAgo = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const timeText = daysAgo === 0 ? 'Hôm nay' : 
                     daysAgo === 1 ? 'Hôm qua' : 
                     `${daysAgo} ngày trước`;

    return (
      <Animated.View entering={FadeInDown.delay(index * 80).duration(400)}>
        <View style={styles.postCard}>
          {/* Header with status */}
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              <Ionicons name="document-text" size={24} color="#6366f1" />
            </View>
            <StatusBadge status={item.status || 'inactive'} />
          </View>

          {/* Title */}
          <Text style={styles.postTitle} numberOfLines={2}>
            {item.title || 'Đang tìm việc'}
          </Text>

          {/* Location */}
          {item.location && (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={14} color="#64748b" />
              <Text style={styles.infoText} numberOfLines={1}>{item.location}</Text>
            </View>
          )}

          {/* Expected Salary */}
          {(item as any).expectedSalary && (
            <View style={styles.infoRow}>
              <Ionicons name="cash-outline" size={14} color="#059669" />
              <Text style={styles.salaryText}>
                {(item as any).expectedSalary === 'negotiable' 
                  ? 'Thỏa thuận' 
                  : `${parseInt((item as any).expectedSalary).toLocaleString('vi-VN')}đ/giờ`}
              </Text>
            </View>
          )}

          {/* Contact Info */}
          <View style={styles.contactInfo}>
            {item.contactInfo?.phone && (
              <View style={styles.contactBadge}>
                <Ionicons name="call-outline" size={12} color="#10b981" />
                <Text style={styles.contactText}>{item.contactInfo.phone}</Text>
              </View>
            )}
            {item.contactInfo?.email && (
              <View style={styles.contactBadge}>
                <Ionicons name="mail-outline" size={12} color="#3b82f6" />
                <Text style={styles.contactText} numberOfLines={1}>{item.contactInfo.email}</Text>
              </View>
            )}
          </View>

          {/* Footer */}
          <View style={styles.cardFooter}>
            <Text style={styles.timeText}>📅 {timeText}</Text>
            
            <View style={styles.actionButtons}>
              {/* View Detail Button */}
              <TouchableOpacity
                style={styles.viewButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({
                    pathname: '/(shared)/candidateProfile',
                    params: { jobId: item.$id },
                  } as any);
                }}
              >
                <Ionicons name="eye-outline" size={16} color="#6366f1" />
              </TouchableOpacity>
              
              {/* Delete Button */}
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  handleDeletePost(item);
                }}
              >
                <Ionicons name="trash-outline" size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Pending notice */}
          {item.status === 'inactive' && (
            <View style={styles.pendingNotice}>
              <Ionicons name="information-circle" size={14} color="#f59e0b" />
              <Text style={styles.pendingText}>
                Tin của bạn đang chờ admin duyệt. Thường trong vòng 24h.
              </Text>
            </View>
          )}
        </View>
      </Animated.View>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="document-text-outline" size={64} color="#cbd5e1" />
      </View>
      <Text style={styles.emptyTitle}>Chưa có tin tìm việc</Text>
      <Text style={styles.emptySubtitle}>
        Bạn chưa đăng tin tìm việc nào. Hãy đăng tin để nhà tuyển dụng tìm thấy bạn!
      </Text>
      
      {/* Debug info */}
      {__DEV__ && (
        <View style={styles.debugBox}>
          <Text style={styles.debugText}>
            🔍 Debug: User ID = {auth.currentUser?.uid?.substring(0, 8)}...
          </Text>
          <Text style={styles.debugText}>
            📊 Query: jobType=candidate_seeking, posterId={auth.currentUser?.uid?.substring(0, 8)}...
          </Text>
          <Text style={styles.debugText}>
            💡 Tip: Kiểm tra console logs để xem query results
          </Text>
        </View>
      )}
      
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push('/(shared)/quickPost?mode=candidate_seeking');
        }}
      >
        <LinearGradient
          colors={['#10b981', '#059669']}
          style={styles.createGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="flash" size={20} color="#fff" />
          <Text style={styles.createText}>Đăng tin tìm việc</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={goBack}
          >
            <Ionicons name="arrow-back" size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tin đã đăng</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            goBack();
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tin đã đăng</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{posts.length}</Text>
        </View>
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle-outline" size={20} color="#10b981" />
        <Text style={styles.bannerText}>
          Đây là danh sách tin tìm việc bạn đã đăng. Tin chờ duyệt sẽ được admin xử lý trong 24h.
        </Text>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.$id}
        renderItem={({ item, index }) => (
          <PostCard item={item} index={index} />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#10b981']}
          />
        }
        ListEmptyComponent={EmptyState}
      />

      {/* Floating Add Button */}
      {posts.length > 0 && (
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/(shared)/quickPost?mode=candidate_seeking');
          }}
        >
          <LinearGradient
            colors={['#10b981', '#059669']}
            style={styles.floatingGradient}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  countBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 40,
    alignItems: 'center',
  },
  countText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingVertical: 12,
    gap: 10,
  },
  bannerText: {
    flex: 1,
    fontSize: 13,
    color: '#059669',
    lineHeight: 18,
  },
  listContent: {
    padding: HORIZONTAL_PADDING,
    paddingBottom: 100,
  },
  postCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  postTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#64748b',
    flex: 1,
  },
  salaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
  },
  contactInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  contactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  contactText: {
    fontSize: 11,
    color: '#64748b',
    maxWidth: 120,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  timeText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  viewButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 12,
    padding: 10,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
  },
  pendingText: {
    flex: 1,
    fontSize: 12,
    color: '#92400e',
    lineHeight: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  debugBox: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    alignSelf: 'stretch',
  },
  debugText: {
    fontSize: 11,
    color: '#1e40af',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  createButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  createGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  createText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    borderRadius: 28,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },
});
