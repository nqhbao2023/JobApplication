// app/(employer)/index.tsx
import Animated, {
  FadeInDown,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  Extrapolate,
  withTiming,
  useAnimatedScrollHandler,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { SCROLL_BOTTOM_PADDING } from '@/utils/layout.utils';
import { db, auth } from "@/config/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { authApiService } from '@/services/authApi.service';
import { jobApiService } from '@/services/jobApi.service';
import { applicationApiService } from '@/services/applicationApi.service';
import { handleApiError } from '@/utils/errorHandler';
type RecentApp = {
  userName: string;
  jobTitle: string;
  id: string;
  candidateId?: string;
  userAvatar?: string;
  appliedAt?: string;
  status?: string;
};

type QuickStat = {
  icon: string;
  label: string;
  value: number;
  color: string;
  bgColor: string;
};

const HEADER_MAX_HEIGHT = 200;
const HEADER_MIN_HEIGHT = 80;
const SCROLL_THRESHOLD = 100;
const { width } = Dimensions.get('window');
const HORIZONTAL_PADDING = 20;

export default function EmployerHome() {
  const router = useRouter();
  const [jobCount, setJobCount] = useState(0);
  const [appCount, setAppCount] = useState(0);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [activeJobCount, setActiveJobCount] = useState(0);
  const [recentApps, setRecentApps] = useState<RecentApp[]>([]);
  const [companyName, setCompanyName] = useState<string>("");
  const [companyAvatar, setCompanyAvatar] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isMountedRef = useRef(true);
  const isFetchingRef = useRef(false);

  const scrollY = useSharedValue(0);
  const hasTriggeredHaptic = useSharedValue(false);

  useEffect(() => {
    const logToken = async () => {
      const token = await auth.currentUser?.getIdToken();
      console.log(" FIREBASE TOKEN : ", token);
    };
    logToken();
  }, []);

  // 🔔 Fetch unread notifications count
  useEffect(() => {
    const fetchUnreadNotifications = async () => {
      const user = auth.currentUser;
      if (!user) return;
      
      try {
        const notifQuery = query(
          collection(db, 'notifications'),
          where('userId', '==', user.uid),
          where('read', '==', false)
        );
        const snapshot = await getDocs(notifQuery);
        console.log(`🔔 Unread notifications: ${snapshot.docs.length}`);
        setUnreadNotificationCount(snapshot.docs.length);
      } catch (error: any) {
        console.warn('⚠️ Could not fetch notifications count:', error.message);
        // Fallback: use appCount as badge
      }
    };
    
    fetchUnreadNotifications();
  }, []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const toDate = useCallback((value: any): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'number') return new Date(value);
    if (typeof value === 'string') {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    if (value.toDate && typeof value.toDate === 'function') {
      try {
        return value.toDate();
      } catch (_e) {
        return null;
      }
    }
    return null;
  }, []);

  const loadStats = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      isFetchingRef.current = false;
      return;
    }

    try {

      const [profileResult, jobsResult, appsResult] = await Promise.allSettled([
        authApiService.getProfile(),
        jobApiService.getMyJobs(),
        applicationApiService.getEmployerApplications(),
      ]);

      if (!isMountedRef.current) return;

      if (profileResult.status === 'fulfilled') {
        const profile = profileResult.value;
        setCompanyName(profile.name || profile.email || '');
        setCompanyAvatar(profile.photoURL || user.photoURL || '');
      } else {
        handleApiError(profileResult.reason, 'update_profile', { silent: true });
        setCompanyName(user.displayName || user.email || '');
        setCompanyAvatar(user.photoURL || '');
      }

      if (jobsResult.status === 'fulfilled') {
        const jobs = jobsResult.value;
        setJobCount(jobs.length);
        setActiveJobCount(jobs.filter(job => job.status !== 'closed').length);

        const jobTitleMap = new Map<string, string>();
        jobs.forEach(job => {
          const jobId = job.id || (job as any).$id;
          if (!jobId) return;
          const title = job.title || (job as any).job_title || 'Không rõ công việc';
          jobTitleMap.set(jobId, title);
        });

        if (appsResult.status === 'fulfilled') {
          const applications = appsResult.value;
          setAppCount(applications.length);

          const sorted = [...applications].sort((a, b) => {
            const aDate = toDate(a.appliedAt)?.getTime() || 0;
            const bDate = toDate(b.appliedAt)?.getTime() || 0;
            return bDate - aDate;
          });

          // Fetch recent applications with rate limiting
          const recent: any[] = [];
          const recentApps = sorted.slice(0, 5);

          for (let i = 0; i < recentApps.length; i++) {
            const app = recentApps[i];

            // Add 200ms delay between requests (except first one)
            if (i > 0) await new Promise(resolve => setTimeout(resolve, 200));

            let userName = 'Không rõ tên';
            let userAvatar: string | undefined;
            try {
              const userSnap = await getDoc(doc(db, 'users', app.candidateId));
              if (userSnap.exists()) {
                const candidate = userSnap.data();
                userName = candidate?.name || candidate?.displayName || userName;
                userAvatar = candidate?.photoURL;
              }
            } catch (candidateError) {
              console.warn('⚠️ loadStats candidate fetch error:', candidateError);
            }

            let jobTitle = jobTitleMap.get(app.jobId);
            if (!jobTitle) {
              try {
                const jobSnap = await getDoc(doc(db, 'jobs', app.jobId));
                if (jobSnap.exists()) {
                  jobTitle = jobSnap.data()?.title || jobTitle;
                }
              } catch (jobError) {
                console.warn('⚠️ loadStats job fallback error:', jobError);
              }
            }

            const appliedAtDate = toDate(app.appliedAt);
            recent.push({
              id: app.id || `${app.jobId}-${app.candidateId}`,
              candidateId: app.candidateId,
              userName,
              userAvatar,
              jobTitle: jobTitle || 'Không rõ công việc',
              appliedAt: appliedAtDate ? appliedAtDate.toLocaleDateString('vi-VN') : '',
              status: app.status || 'pending',
            });
          }

          if (isMountedRef.current) {
            setRecentApps(recent);
          }
        } else {
          handleApiError(appsResult.reason, 'fetch_applications', { silent: true });
          setAppCount(0);
          setRecentApps([]);
        }
      } else {
        handleApiError(jobsResult.reason, 'fetch_jobs', { silent: false });
        setJobCount(0);
        setActiveJobCount(0);
        setRecentApps([]);
        if (appsResult.status === 'rejected') {
          handleApiError(appsResult.reason, 'fetch_applications', { silent: true });
          setAppCount(0);
        }
      }
    } catch (error: any) {
      handleApiError(error, 'fetch_jobs');
    } finally {

      isFetchingRef.current = false;
      if (isMountedRef.current) {
        setLoading(false);
      }
    }

  }, [toDate]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadStats();
    setRefreshing(false);
  }, [loadStats]);

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
      if (scrollY.value > SCROLL_THRESHOLD && !hasTriggeredHaptic.value) {
        hasTriggeredHaptic.value = true;
        runOnJS(triggerHaptic)();
      } else if (scrollY.value <= SCROLL_THRESHOLD / 2) {
        hasTriggeredHaptic.value = false;
      }
    },
  });

  const headerAnimatedStyle = useAnimatedStyle(() => {
    const height = interpolate(
      scrollY.value,
      [0, SCROLL_THRESHOLD],
      [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
      Extrapolate.CLAMP
    );
    return {
      height: withTiming(height, {
        duration: 300,
        easing: Easing.out(Easing.quad),
      }),
    };
  });

  const welcomeTextAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, SCROLL_THRESHOLD / 2],
      [1, 0],
      Extrapolate.CLAMP
    );
    return {
      opacity: withTiming(opacity, { duration: 250 }),
    };
  });

  const quickStats: QuickStat[] = [
    { icon: 'briefcase', label: 'Tổng tin tuyển dụng', value: jobCount, color: '#4A80F0', bgColor: '#EEF2FF' },
    { icon: 'checkmark-circle', label: 'Đang hoạt động', value: activeJobCount, color: '#10b981', bgColor: '#ECFDF5' },
    { icon: 'people', label: 'Ứng viên mới', value: appCount, color: '#f59e0b', bgColor: '#FEF3C7' },
  ];

  const LoadingScreen = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#4A80F0" />
      <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
    </View>
  );

  const SectionHeader = ({ title, onPressShowAll }: { title: string; onPressShowAll?: () => void }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onPressShowAll && (
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPressShowAll();
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={styles.showAllButton}>
            <Text style={styles.showAllBtn}>Xem tất cả</Text>
            <Ionicons name="chevron-forward" size={16} color="#4A80F0" />
          </View>
        </TouchableOpacity>
      )}
    </View>
  );

  const StatCard = ({ stat, index }: { stat: QuickStat; index: number }) => (
    <Animated.View
      entering={FadeInDown.delay(index * 100).duration(400)}
      style={[styles.statCard, { backgroundColor: stat.bgColor }]}
    >
      <View style={styles.statIconContainer}>
        <Ionicons name={stat.icon as any} size={24} color={stat.color} />
      </View>
      <Text style={styles.statValue}>{stat.value}</Text>
      <Text style={styles.statLabel}>{stat.label}</Text>
    </Animated.View>
  );

  const ActionButton = ({ icon, label, onPress, color }: { icon: string; label: string; onPress: () => void; color: string }) => (
    <TouchableOpacity
      style={styles.actionButton}
      activeOpacity={0.7}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
      }}
    >
      <LinearGradient
        colors={[color, color + 'DD']}
        style={styles.actionGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name={icon as any} size={28} color="#fff" />
        <Text style={styles.actionLabel}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'accepted': return '#10b981';
      case 'rejected': return '#ef4444';
      case 'reviewing': return '#f59e0b';
      default: return '#64748b';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'accepted': return 'Đã duyệt';
      case 'rejected': return 'Từ chối';
      case 'reviewing': return 'Đang xem xét';
      default: return 'Chờ duyệt';
    }
  };

  const ApplicantCard = ({ item, index }: { item: RecentApp; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 80).duration(400)}>
      <TouchableOpacity
        style={styles.applicantCard}
        activeOpacity={0.7}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          // ✅ Navigate to application detail screen (best practice)
          if (item.id) {
            router.push({
              pathname: "/(employer)/applicationDetail",
              params: { applicationId: item.id },
            });
          } else {
            // Fallback: Navigate to applications list
            router.push("/(employer)/appliedList");
          }
        }}
      >
        <Image
          style={styles.applicantAvatar}
          source={{ uri: item.userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.userName || 'User')}&size=80&background=4A80F0&color=fff&bold=true` }}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.applicantInfo}>
          <Text style={styles.applicantName}>{item.userName}</Text>
          <Text style={styles.applicantJob} numberOfLines={1}>{item.jobTitle}</Text>
          <Text style={styles.applicantDate}>{item.appliedAt}</Text>
        </View>
        <View style={styles.applicantRight}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94a3b8" style={{ marginLeft: 8 }} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  const EmptyState = ({ message }: { message: string }) => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="people-outline" size={48} color="#cbd5e1" />
      </View>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#6366f1' }} edges={['top']}>
        <View style={[styles.headerContainer, { height: HEADER_MAX_HEIGHT }]}>
          <LinearGradient colors={['#6366f1', '#4f46e5']} style={StyleSheet.absoluteFill} />
        </View>
        <View style={[styles.listContent, { flex: 1 }]}>
          <LoadingScreen />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#6366f1' }} edges={['top', 'left', 'right']}>
      <Animated.View style={[styles.headerContainer, headerAnimatedStyle]}>
        <LinearGradient
          colors={['#6366f1', '#4f46e5']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />

        <View style={styles.topView}>
          <Animated.View style={[styles.welcomeTextContainer, welcomeTextAnimatedStyle]}>
            <Text style={styles.greeting}>👋 Xin chào</Text>
            {!!companyName && (
              <Text style={styles.companyName}>{companyName}</Text>
            )}
          </Animated.View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {/* Notification Icon */}
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/(employer)/notifications');
              }}
              style={{ padding: 8 }}
            >
              <View style={{ position: 'relative' }}>
                <Ionicons name="notifications-outline" size={26} color="#FFFFFF" />
                {(unreadNotificationCount > 0 || appCount > 0) && (
                  <View style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    backgroundColor: '#ef4444',
                    borderRadius: 10,
                    minWidth: 18,
                    height: 18,
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingHorizontal: 4,
                  }}>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
                      {(unreadNotificationCount || appCount) > 9 ? '9+' : (unreadNotificationCount || appCount)}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            {/* Avatar */}
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/(employer)/profile');
              }}
            >
              <Image
                style={styles.avatar}
                source={{ uri: companyAvatar || 'https://via.placeholder.com/80x80.png?text=Company' }}
                contentFit="cover"
                transition={200}
              />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        <View style={styles.contentWrapper}>
          <View style={styles.statsGrid}>
            {quickStats.map((stat, idx) => (
              <StatCard key={stat.label} stat={stat} index={idx} />
            ))}
          </View>

          <View style={styles.actionsGrid}>
            <ActionButton
              icon="add-circle"
              label="Đăng tin tuyển dụng"
              color="#4A80F0"
              onPress={() => router.push("/(employer)/addJob")}
            />
            <ActionButton
              icon="briefcase"
              label="Tin của tôi"
              color="#10b981"
              onPress={() => router.push("/(employer)/myJobs")}
            />
            <ActionButton
              icon="people"
              label="Ứng viên"
              color="#f59e0b"
              onPress={() => router.push("/(employer)/appliedList")}
            />
            <ActionButton
              icon="search"
              label="Tìm ứng viên"
              color="#8b5cf6"
              onPress={() => router.push("/(employer)/findCandidates")}
            />
          </View>

          <SectionHeader
            title="Ứng viên mới nhất"
            onPressShowAll={() => router.push("/(employer)/appliedList")}
          />
          {recentApps.length > 0 ? (
            recentApps.map((item, idx) => (
              <ApplicantCard key={item.id} item={item} index={idx}  />
            ))
          ) : (
            <EmptyState message="Chưa có ứng viên nào ứng tuyển" />
          )}
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 12,
    paddingBottom: 16,
    overflow: 'hidden',
  },
  topView: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  welcomeTextContainer: { flex: 1 },
  greeting: { fontSize: 15, color: '#FFFFFF', opacity: 0.95, fontWeight: '500' },
  companyName: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', marginTop: 4, letterSpacing: 0.3 },
  avatar: {
    height: 42,
    width: 42,
    borderRadius: 21,
    backgroundColor: '#e2e8f0',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },

  listContent: {
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    marginTop: -12,
  },
  contentWrapper: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 20,
    paddingBottom: SCROLL_BOTTOM_PADDING,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: (width - HORIZONTAL_PADDING * 2 - 24) / 3,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '600',
  },

  actionsGrid: {
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    gap: 12,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitle: { fontSize: 19, fontWeight: '700', color: '#0f172a' },
  showAllButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  showAllBtn: { fontSize: 14, color: '#4A80F0', fontWeight: '600' },

  applicantCard: {
    flexDirection: 'row',
    padding: 14,
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
    alignItems: 'center',
  },
  applicantAvatar: {
    height: 56,
    width: 56,
    borderRadius: 28,
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  applicantInfo: {
    marginLeft: 14,
    flex: 1,
  },
  applicantRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  applicantName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  applicantJob: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
  },
  applicantDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },

  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
    textAlign: 'center',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },
});
