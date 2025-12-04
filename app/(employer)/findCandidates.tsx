// app/(employer)/findCandidates.tsx
// ✅ NEW: Employer "Tìm ứng viên" page - hiển thị quick-post jobs (candidate_seeking)
import Animated, { FadeInDown } from 'react-native-reanimated';
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeBack } from '@/hooks/useSafeBack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { db } from '@/config/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import type { Job } from '@/types';

const { width } = Dimensions.get('window');
const HORIZONTAL_PADDING = 20;

export default function FindCandidates() {
  const router = useRouter();
  const { goBack } = useSafeBack({ fallback: '/(employer)' });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [candidates, setCandidates] = useState<Job[]>([]);

  const loadCandidates = useCallback(async () => {
    try {
      // Query jobs where jobType = 'candidate_seeking' (quick-post từ candidate tìm việc)
      // Chỉ lấy jobs đã được duyệt (status = 'active')
      const q = query(
        collection(db, 'jobs'),
        where('jobType', '==', 'candidate_seeking'),
        where('status', '==', 'active')
      );
      
      const snapshot = await getDocs(q);
      const results: Job[] = snapshot.docs.map(doc => ({
        $id: doc.id,
        ...doc.data(),
      } as Job));
      
      // Sort by createdAt descending
      results.sort((a, b) => {
        const aTime = (a.createdAt as any)?.toDate?.()?.getTime?.() || 
                      new Date(a.created_at || 0).getTime();
        const bTime = (b.createdAt as any)?.toDate?.()?.getTime?.() || 
                      new Date(b.created_at || 0).getTime();
        return bTime - aTime;
      });
      
      setCandidates(results);
    } catch (error: any) {
      console.error('Error loading candidates:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách ứng viên');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadCandidates();
  }, [loadCandidates]);

  const handleContact = useCallback((candidate: Job) => {
    const contact = candidate.contactInfo;
    if (!contact) {
      Alert.alert('Không có thông tin liên hệ', 'Ứng viên chưa cung cấp thông tin liên hệ');
      return;
    }

    const options: { text: string; onPress: () => void }[] = [];

    if (contact.phone) {
      options.push({
        text: `📞 Gọi điện: ${contact.phone}`,
        onPress: () => Linking.openURL(`tel:${contact.phone}`),
      });
    }

    if (contact.zalo) {
      options.push({
        text: `💬 Zalo: ${contact.zalo}`,
        onPress: () => Linking.openURL(`https://zalo.me/${contact.zalo}`),
      });
    }

    if (contact.email) {
      options.push({
        text: `📧 Email: ${contact.email}`,
        onPress: () => Linking.openURL(`mailto:${contact.email}`),
      });
    }

    if (contact.facebook) {
      options.push({
        text: '📘 Facebook',
        onPress: () => Linking.openURL(contact.facebook!),
      });
    }

    if (options.length === 0) {
      Alert.alert('Không có thông tin liên hệ', 'Ứng viên chưa cung cấp thông tin liên hệ');
      return;
    }

    Alert.alert(
      'Liên hệ ứng viên',
      candidate.title || 'Ứng viên',
      [
        ...options,
        { text: 'Hủy', style: 'cancel' },
      ]
    );
  }, []);

  const CandidateCard = ({ item, index }: { item: Job; index: number }) => {
    const createdAt = (item.createdAt as any)?.toDate?.() || 
                      new Date(item.created_at || Date.now());
    const daysAgo = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const timeText = daysAgo === 0 ? 'Hôm nay' : 
                     daysAgo === 1 ? 'Hôm qua' : 
                     `${daysAgo} ngày trước`;

    return (
      <Animated.View entering={FadeInDown.delay(index * 80).duration(400)}>
        <TouchableOpacity
          style={styles.candidateCard}
          activeOpacity={0.7}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            // Navigate to candidate profile (not jobDescription)
            router.push({
              pathname: '/(shared)/candidateProfile',
              params: { jobId: item.$id },
            } as any);
          }}
        >
          {/* Avatar/Image */}
          <View style={styles.avatarContainer}>
            {item.image ? (
              <Image
                style={styles.candidateAvatar}
                source={{ uri: item.image }}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={[styles.candidateAvatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={32} color="#94a3b8" />
              </View>
            )}
            {/* Badge: Đang tìm việc */}
            <View style={styles.seekingBadge}>
              <Ionicons name="search" size={10} color="#fff" />
            </View>
          </View>

          <View style={styles.candidateInfo}>
            {/* Title (position looking for) */}
            <Text style={styles.candidateTitle} numberOfLines={2}>
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
              <View style={styles.salaryRow}>
                <Ionicons name="cash-outline" size={14} color="#059669" />
                <Text style={styles.salaryText}>
                  {(item as any).expectedSalary === 'negotiable' 
                    ? 'Thỏa thuận' 
                    : `${parseInt((item as any).expectedSalary).toLocaleString('vi-VN')}đ/giờ`}
                </Text>
              </View>
            )}

            {/* Contact method indicator + CV badge */}
            <View style={styles.contactMethods}>
              {(item as any).cvUrl && (
                <View style={[styles.contactBadge, styles.cvBadge]}>
                  <Ionicons name="document-text" size={12} color="#3b82f6" />
                  <Text style={styles.cvBadgeText}>CV</Text>
                </View>
              )}
              {item.contactInfo?.phone && (
                <View style={styles.contactBadge}>
                  <Ionicons name="call-outline" size={12} color="#10b981" />
                </View>
              )}
              {item.contactInfo?.zalo && (
                <View style={styles.contactBadge}>
                  <Text style={styles.zaloText}>Zalo</Text>
                </View>
              )}
              {item.contactInfo?.email && (
                <View style={styles.contactBadge}>
                  <Ionicons name="mail-outline" size={12} color="#3b82f6" />
                </View>
              )}
            </View>

            {/* Time posted */}
            <Text style={styles.timeText}>{timeText}</Text>
          </View>

          {/* Contact Button */}
          <TouchableOpacity
            style={styles.contactButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              handleContact(item);
            }}
          >
            <LinearGradient
              colors={['#10b981', '#059669']}
              style={styles.contactGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
              <Text style={styles.contactText}>Liên hệ</Text>
            </LinearGradient>
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="people-outline" size={64} color="#cbd5e1" />
      </View>
      <Text style={styles.emptyTitle}>Chưa có ứng viên nào</Text>
      <Text style={styles.emptySubtitle}>
        Các ứng viên đăng tin tìm việc qua Quick Post sẽ xuất hiện ở đây
      </Text>
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
          <Text style={styles.headerTitle}>Tìm ứng viên</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Đang tải danh sách ứng viên...</Text>
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
        <Text style={styles.headerTitle}>Tìm ứng viên</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{candidates.length}</Text>
        </View>
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle-outline" size={20} color="#6366f1" />
        <Text style={styles.infoText}>
          Đây là danh sách ứng viên đang tìm việc. Bấm "Liên hệ" để kết nối trực tiếp.
        </Text>
      </View>

      <FlatList
        data={candidates}
        keyExtractor={(item) => item.$id}
        renderItem={({ item, index }) => (
          <CandidateCard item={item} index={index} />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#6366f1']}
          />
        }
        ListEmptyComponent={EmptyState}
      />
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
    backgroundColor: '#6366f1',
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
    backgroundColor: '#eef2ff',
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingVertical: 12,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#4f46e5',
    lineHeight: 18,
  },
  listContent: {
    padding: HORIZONTAL_PADDING,
    paddingBottom: 40,
  },
  candidateCard: {
    flexDirection: 'row',
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
    alignItems: 'flex-start',
  },
  avatarContainer: {
    position: 'relative',
  },
  candidateAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  seekingBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#f59e0b',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  candidateInfo: {
    flex: 1,
    marginLeft: 14,
  },
  candidateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  contactMethods: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  contactBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  cvBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    gap: 3,
  },
  cvBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3b82f6',
  },
  salaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  salaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
  },
  zaloText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#0068ff',
  },
  timeText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  contactButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginLeft: 8,
  },
  contactGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  contactText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
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
