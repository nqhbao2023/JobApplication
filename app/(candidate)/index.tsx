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
  Easing
} from 'react-native-reanimated';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  FlatList,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Search from '@/components/Search';
import { router } from 'expo-router';
import { collection, getDocs, getDoc, query, where, doc, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

// ===== TYPES =====
type Job = {
  $id: string;
  title?: string;
  image?: string;
  created_at?: string;
  company?: string | { $id?: string; corp_name?: string; nation?: string };
  jobCategories?: any;
  type?: string;
  salary?: string;
  location?: string;
};

type Company = {
  $id: string;
  corp_name?: string;
  nation?: string;
  image?: string;
  color?: string;
};

type Category = {
  $id: string;
  category_name?: string;
  icon_name?: string;
  color?: string;
};

type QuickFilter = 'all' | 'intern' | 'part-time' | 'remote' | 'nearby';

// ===== CONSTANTS =====
const PLACEHOLDER_JOB_IMG = 'https://via.placeholder.com/80x80.png?text=Job';
const PLACEHOLDER_COMPANY_IMG = 'https://via.placeholder.com/80x80.png?text=Company';
const HEADER_MAX_HEIGHT = 160;
const HEADER_MIN_HEIGHT = 70;
const SCROLL_THRESHOLD = 80;
const { width } = Dimensions.get('window');
const CARD_GAP = 14;
const HORIZONTAL_PADDING = 20;

// ===== UTILS =====
const getContrastColor = (hexColor?: string) => {
  if (!hexColor || !hexColor.startsWith('#') || hexColor.length < 7) return '#1e293b';
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.5 ? '#1e293b' : '#FFFFFF';
};

// ===== SKELETON LOADERS =====
const SkeletonCard = ({ width: w, height }: { width: number; height: number }) => (
  <Animated.View 
    entering={FadeIn.duration(300)}
    style={[styles.skeleton, { width: w, height, borderRadius: 16 }]} 
  />
);

const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#4A80F0" />
    <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
  </View>
);

// ===== MAIN COMPONENT =====
const CandidateHome = () => {
  const [userId, setUserId] = useState<string>('');
  const [dataJob, setDataJob] = useState<Job[]>([]);
  const [dataUser, setDataUser] = useState<any>();
  const [dataCategories, setDataCategories] = useState<Category[]>([]);
  const [dataCompany, setDataCompany] = useState<Company[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<QuickFilter>('all');

  const scrollY = useSharedValue(0);
  const hasTriggeredHaptic = useSharedValue(false);

  useEffect(() => { load_user_id(); }, []);
  useEffect(() => {
    if (!userId) return;
    loadAllData();
  }, [userId]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        load_data_user(),
        load_data_job(),
        load_data_company(),
        load_data_categories(),
        loadUnreadNotifications(),
      ]);
    } catch (e) {
      console.error('loadAllData error:', e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadAllData();
    setRefreshing(false);
  }, [userId]);

  // ===== DATA LOADERS =====
  const load_user_id = async () => {
    try {
      const user = auth.currentUser;
      if (user) setUserId(user.uid);
    } catch (e) { console.log(e); }
  };

  const load_data_user = async () => {
    if (!userId) return;
    try {
      const docRef = doc(db, 'users', userId);
      const snap = await getDoc(docRef);
      if (snap.exists()) setDataUser({ $id: snap.id, ...snap.data() });
    } catch (e) { console.log(e); }
  };

  const load_data_job = async () => {
    try {
      const q = query(collection(db, 'jobs'), limit(30));
      const snap = await getDocs(q);
      let jobs = snap.docs.map(d => ({ $id: d.id, ...d.data() } as Job));
      jobs.sort((a, b) => (Date.parse(b.created_at || '0') || 0) - (Date.parse(a.created_at || '0') || 0));
      setDataJob(jobs);
    } catch (e) { 
      console.log(e);
    }
  };

  const load_data_company = async () => {
    try {
      const q = query(collection(db, 'companies'), limit(12));
      const snap = await getDocs(q);
      const companies = snap.docs.map(d => ({ $id: d.id, ...d.data() } as Company));
      setDataCompany(companies);
    } catch (e) { console.log(e); }
  };

  const load_data_categories = async () => {
    try {
      const q = query(collection(db, 'job_categories'), limit(12));
      const snap = await getDocs(q);
      const categories = snap.docs.map(d => ({ $id: d.id, ...d.data() } as Category));
      setDataCategories(categories);
    } catch (e) { console.log(e); }
  };

  const loadUnreadNotifications = async () => {
    if (!userId) return;
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('read', '==', false),
      );
      const snap = await getDocs(q);
      setUnreadCount(snap.size);
    } catch (e) { console.error('loadUnreadNotifications:', e); }
  };

  // ===== COMPUTED DATA =====
  const companyMap = useMemo(() => {
    const m: Record<string, Company> = {};
    for (const c of dataCompany) m[c.$id] = c;
    return m;
  }, [dataCompany]);

  const getJobCompany = (job: Job): Company | undefined => {
    if (!job.company) return;
    if (typeof job.company === 'string') return companyMap[job.company];
    if (typeof job.company === 'object' && job.company.$id) return companyMap[job.company.$id];
    return;
  };

  const categoryJobCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    dataCategories.forEach(cat => {
      counts[cat.$id] = dataJob.filter(job => {
        const jc = job.jobCategories;
        if (!jc) return false;
        if (typeof jc === 'string') return jc === cat.$id || jc === cat.category_name;
        if (Array.isArray(jc) && typeof jc[0] === 'string') {
          return (jc as string[]).some(x => x === cat.$id || x === cat.category_name);
        }
        if (Array.isArray(jc)) return jc.some((x: any) => x?.$id === cat.$id);
        if (typeof jc === 'object' && jc.$id) return jc.$id === cat.$id;
        return false;
      }).length;
    });
    return counts;
  }, [dataJob, dataCategories]);

  const filteredJobs = useMemo(() => {
    if (selectedFilter === 'all') return dataJob;
    return dataJob.filter(job => {
      const type = job.type?.toLowerCase() || '';
      if (selectedFilter === 'intern') return type.includes('intern') || type.includes('thực tập');
      if (selectedFilter === 'part-time') return type.includes('part') || type.includes('bán thời gian');
      if (selectedFilter === 'remote') return type.includes('remote') || type.includes('từ xa');
      return true;
    });
  }, [dataJob, selectedFilter]);

  const forYouJobs = useMemo(() => filteredJobs.slice(0, 5), [filteredJobs]);
  const latestJobs = useMemo(() => dataJob.slice(0, 6), [dataJob]);
  const trendingCategories = useMemo(() => {
    return dataCategories
      .map(cat => ({ ...cat, jobCount: categoryJobCounts[cat.$id] || 0 }))
      .sort((a, b) => b.jobCount - a.jobCount)
      .slice(0, 6);
  }, [dataCategories, categoryJobCounts]);

  // ===== ANIMATIONS =====
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
        easing: Easing.out(Easing.quad)
      }) 
    };
  });

  const welcomeTextAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, SCROLL_THRESHOLD / 2],
      [1, 0],
      Extrapolate.CLAMP
    );
    const translateY = interpolate(
      scrollY.value,
      [0, SCROLL_THRESHOLD / 2],
      [0, -10],
      Extrapolate.CLAMP
    );
    return { 
      opacity: withTiming(opacity, { duration: 250 }),
      transform: [{ translateY: withTiming(translateY, { duration: 250 }) }]
    };
  });

  const searchAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollY.value,
      [0, SCROLL_THRESHOLD],
      [1, 0.96],
      Extrapolate.CLAMP
    );
    return {
      transform: [{ scale: withTiming(scale, { duration: 250 }) }],
    };
  });

  // ===== UI COMPONENTS =====
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

const QuickFilters = () => (
  <ScrollView 
    horizontal 
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.filterContainer}
  >
    {(['all', 'intern', 'part-time', 'remote', 'nearby'] as QuickFilter[]).map(filter => {
      const labels: Record<QuickFilter, string> = {
        all: 'Tất cả',
        intern: 'Thực tập',
        'part-time': 'Bán thời gian',
        remote: 'Từ xa',
        nearby: 'Gần bạn', // ✅ thêm dòng này
      };

      const icons: Record<QuickFilter, string> = {
        all: 'grid-outline',
        intern: 'school-outline',
        'part-time': 'time-outline',
        remote: 'home-outline',
        nearby: 'location-outline', // ✅ thêm dòng này
      };

      const isActive = selectedFilter === filter;

      return (
        <TouchableOpacity
          key={filter}
          style={[styles.filterChip, isActive && styles.filterChipActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setSelectedFilter(filter);
          }}
        >
          <Ionicons 
            name={icons[filter] as keyof typeof Ionicons.glyphMap} 
            size={16} 
            color={isActive ? '#fff' : '#64748b'} 
          />
          <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
            {labels[filter]}
          </Text>
        </TouchableOpacity>
      );
    })}
  </ScrollView>
);

  const CompanyCard = ({ item }: { item: Company }) => (
    <TouchableOpacity
      style={[styles.companyCard, { backgroundColor: item.color || '#f0f4ff' }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({ pathname: '/(shared)/companyDescription', params: { companyId: item.$id } });
      }}
    >
      <Image 
        style={styles.companyImage} 
        source={{ uri: item.image || PLACEHOLDER_COMPANY_IMG }}
        contentFit="cover"
        transition={200}
      />
      <View style={styles.companyTextContainer}>
        <Text style={[styles.companyTitle, { color: getContrastColor(item.color) }]} numberOfLines={1}>
          {item.corp_name || 'Công ty'}
        </Text>
        <Text style={[styles.companySub, { color: getContrastColor(item.color) }]} numberOfLines={1}>
          {item.nation || 'Việt Nam'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const JobCard = ({ item }: { item: Job }) => {
    const comp = getJobCompany(item);
    return (
      <TouchableOpacity
        style={styles.jobCard}
        activeOpacity={0.7}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push({ pathname: '/jobDescription', params: { jobId: item.$id } });
        }}
      >
        <Image 
          style={styles.jobImage} 
          source={{ uri: item.image || PLACEHOLDER_JOB_IMG }}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.jobTextContainer}>
          <Text style={styles.jobTitle} numberOfLines={2}>{item.title || 'Chưa có tiêu đề'}</Text>
          <View style={styles.jobInfoRow}>
            <Ionicons name="business-outline" size={14} color="#64748b" />
            <Text style={styles.jobCompany} numberOfLines={1}>
              {comp?.corp_name ?? 'Không rõ công ty'}
            </Text>
          </View>
          {item.location && (
            <View style={styles.jobInfoRow}>
              <Ionicons name="location-outline" size={14} color="#64748b" />
              <Text style={styles.jobInfo} numberOfLines={1}>{item.location}</Text>
            </View>
          )}
          {item.salary && (
            <View style={styles.jobInfoRow}>
              <Ionicons name="cash-outline" size={14} color="#10b981" />
              <Text style={[styles.jobInfo, { color: '#10b981', fontWeight: '600' }]} numberOfLines={1}>
                {item.salary}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const CategoryCard = ({ item, jobCount }: { item: Category; jobCount: number }) => (
    <TouchableOpacity
      style={[styles.categoryCard, { backgroundColor: item.color || '#f0f4ff' }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({ pathname: '/(shared)/categoryJobs', params: { id: item.$id, name: item.category_name } });
      }}
    >
      <View style={[styles.categoryIconContainer, { backgroundColor: getContrastColor(item.color) + '15' }]}>
        <Ionicons
          name={(item.icon_name as any) || 'briefcase-outline'}
          size={24}
          color={getContrastColor(item.color)}
        />
      </View>
      <Text style={[styles.categoryTitle, { color: getContrastColor(item.color) }]} numberOfLines={2}>
        {item.category_name || 'Danh mục'}
      </Text>
      <Text style={[styles.categorySub, { color: getContrastColor(item.color) }]}>
        {jobCount} việc làm
      </Text>
    </TouchableOpacity>
  );

  const EmptyState = ({ message, icon }: { message: string; icon?: string }) => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name={(icon as any) || 'folder-open-outline'} size={48} color="#cbd5e1" />
      </View>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );

  const JobAlertCTA = () => (
    <TouchableOpacity
      style={styles.ctaContainer}
      activeOpacity={0.9}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push('/(shared)/Notifications');
      }}
    >
      <LinearGradient 
        colors={['#4A80F0', '#357AE8']} 
        style={styles.ctaGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.ctaIconContainer}>
          <Ionicons name="notifications" size={28} color="#fff" />
        </View>
        <View style={styles.ctaTextContainer}>
          <Text style={styles.ctaTitle}>Nhận thông báo việc làm mới</Text>
          <Text style={styles.ctaSubtitle}>Cập nhật công việc phù hợp mỗi ngày</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#fff" />
      </LinearGradient>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#4A80F0' }} edges={['top']}>
        <View style={[styles.headerContainer, { height: HEADER_MAX_HEIGHT }]}>
          <LinearGradient colors={['#4A80F0', '#357AE8']} style={StyleSheet.absoluteFill} />
        </View>
        <View style={[styles.listContent, { flex: 1 }]}>
          <LoadingScreen />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#4A80F0' }} edges={['top', 'left', 'right']}>
      {/* Animated Header */}
      <Animated.View style={[styles.headerContainer, headerAnimatedStyle]}>
        <LinearGradient 
          colors={['#4A80F0', '#357AE8']} 
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        
        <View style={styles.topView}>
          <Animated.View style={[styles.welcomeTextContainer, welcomeTextAnimatedStyle]}>
            <Text style={styles.hello}>Xin chào 👋</Text>
            {!!dataUser?.displayName && (
              <Text style={styles.hello2}>{dataUser.displayName}</Text>
            )}
          </Animated.View>

          <View style={styles.headerIcons}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setUnreadCount(0);
                router.push('/(shared)/Notifications');
              }}
            >
              <View style={styles.notificationIconContainer}>
                <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/(candidate)/profile');
              }}
            >
              <Image
                style={styles.avatar}
                source={{ uri: dataUser?.photoURL || 'https://randomuser.me/api/portraits/men/1.jpg' }}
                contentFit="cover"
                transition={200}
              />
            </TouchableOpacity>
          </View>
        </View>

        <Animated.View style={[styles.searchContainer, searchAnimatedStyle]}>
          <Search />
        </Animated.View>
      </Animated.View>

      {/* Scrollable Content */}
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        <View style={styles.contentWrapper}>
          {/* Quick Filters */}
          <QuickFilters />

          {/* For You */}
          <SectionHeader 
            title="Dành cho bạn" 
            onPressShowAll={() => router.push('/(shared)/jobList')} 
          />
          {forYouJobs.length > 0 ? (
            forYouJobs.map((item, idx) => (
              <Animated.View key={item.$id} entering={FadeInDown.delay(idx * 50).duration(400)}>
                <JobCard item={item} />
              </Animated.View>
            ))
          ) : (
            <EmptyState message="Chưa có việc làm phù hợp" icon="briefcase-outline" />
          )}

          {/* Trending Categories */}
          <SectionHeader 
            title="Danh mục nổi bật" 
            onPressShowAll={() => router.push('/categoriesList')} 
          />
          {trendingCategories.length > 0 ? (
            <FlatList
              horizontal
              data={trendingCategories}
              keyExtractor={(item) => item.$id}
              renderItem={({ item, index }) => (
                <Animated.View 
                  entering={FadeInDown.delay(index * 50).duration(400)}
                  style={{ marginRight: CARD_GAP }}
                >
                  <CategoryCard item={item} jobCount={item.jobCount} />
                </Animated.View>
              )}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            />
          ) : (
            <EmptyState message="Chưa có danh mục" icon="apps-outline" />
          )}

          {/* Top Companies */}
          <SectionHeader 
            title="Công ty hàng đầu" 
            onPressShowAll={() => router.push('/companyList')} 
          />
          {dataCompany.length > 0 ? (
            <FlatList
              horizontal
              data={dataCompany}
              keyExtractor={(item) => item.$id}
              renderItem={({ item, index }) => (
                <Animated.View 
                  entering={FadeInDown.delay(index * 50).duration(400)}
                  style={{ marginRight: CARD_GAP }}
                >
                  <CompanyCard item={item} />
                </Animated.View>
              )}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            />
          ) : (
            <EmptyState message="Không tìm thấy công ty" icon="business-outline" />
          )}

          {/* Latest Jobs */}
          <SectionHeader 
            title="Việc làm mới nhất" 
            onPressShowAll={() => router.push('/(shared)/jobList')} 
          />
          {latestJobs.length > 0 ? (
            latestJobs.map((item, idx) => (
              <Animated.View key={item.$id + '_latest'} entering={FadeInDown.delay(idx * 50).duration(400)}>
                <JobCard item={item} />
              </Animated.View>
            ))
          ) : (
            <EmptyState message="Chưa có việc mới" icon="time-outline" />
          )}

          {/* Job Alert CTA */}
          <Animated.View entering={FadeInDown.delay(300).duration(400)}>
            <JobAlertCTA />
          </Animated.View>
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

export default CandidateHome;

const styles = StyleSheet.create({
  // Header
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
    marginBottom: 14,
  },
  welcomeTextContainer: { flex: 1 },
  hello: { fontSize: 15, color: '#FFFFFF', opacity: 0.95, fontWeight: '500' },
  hello2: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', marginTop: 4, letterSpacing: 0.3 },
  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconButton: { padding: 4 },
  avatar: { 
    height: 38, 
    width: 38, 
    borderRadius: 19, 
    backgroundColor: '#e2e8f0', 
    borderWidth: 2, 
    borderColor: 'rgba(255,255,255,0.4)' 
  },
  searchContainer: { width: '100%' },
  notificationIconContainer: { position: 'relative' },
  badge: { 
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
  },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },

  // Content
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
    paddingBottom: 40,
  },
  sectionHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 16, 
    marginTop: 20 
  },
  sectionTitle: { fontSize: 19, fontWeight: '700', color: '#0f172a' },
  showAllButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  showAllBtn: { fontSize: 14, color: '#4A80F0', fontWeight: '600' },

  // Quick Filters
  filterContainer: { paddingBottom: 4, gap: 10, paddingRight: 20 },
  filterChip: { 
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 24, 
    backgroundColor: '#fff', 
    borderWidth: 1.5, 
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  filterChipActive: { 
    backgroundColor: '#4A80F0', 
    borderColor: '#4A80F0',
    shadowColor: '#4A80F0',
    shadowOpacity: 0.3,
  },
  filterText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  filterTextActive: { color: '#fff' },

  // Companies (horizontal cards)
  horizontalList: { paddingRight: 20 },
  companyCard: { 
    width: 160,
    padding: 16,
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: '#e5e7eb', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.06, 
    shadowRadius: 4, 
    elevation: 3,
  },
  companyImage: { 
    height: 60, 
    width: 60, 
    borderRadius: 14, 
    backgroundColor: '#fff', 
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  companyTextContainer: { gap: 4 },
  companyTitle: { fontSize: 15, fontWeight: '700' },
  companySub: { fontSize: 12, opacity: 0.8 },

  // Jobs (full width vertical cards)
  jobCard: { 
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
  },
  jobImage: { 
    height: 72, 
    width: 72, 
    borderRadius: 14, 
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  jobTextContainer: { 
    marginLeft: 14, 
    flex: 1,
    justifyContent: 'space-between',
  },
  jobTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#0f172a',
    marginBottom: 6,
    lineHeight: 22,
  },
  jobInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  jobCompany: { 
    fontSize: 13, 
    color: '#475569',
    fontWeight: '500',
    flex: 1,
  },
  jobInfo: { 
    fontSize: 13, 
    color: '#64748b',
    flex: 1,
  },

  // Categories (horizontal cards)
  categoryCard: { 
    width: 140,
    height: 140,
    padding: 16,
    borderRadius: 16, 
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 1, 
    borderColor: '#e5e7eb', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.06, 
    shadowRadius: 4, 
    elevation: 3,
  },
  categoryIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  categoryTitle: { 
    fontWeight: '700', 
    fontSize: 13, 
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 18,
  },
  categorySub: { 
    fontSize: 11, 
    opacity: 0.75,
  },

  // Empty State
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

  // CTA
  ctaContainer: { 
    marginTop: 24,
    marginBottom: 16,
  },
  ctaGradient: { 
    borderRadius: 20, 
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#4A80F0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  ctaIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  ctaTextContainer: {
    flex: 1,
  },
  ctaTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#fff',
    marginBottom: 4,
  },
  ctaSubtitle: { 
    fontSize: 13, 
    color: '#fff', 
    opacity: 0.9,
  },

  // Loading & Skeleton
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
  skeleton: { 
    backgroundColor: '#e2e8f0',
    opacity: 0.5,
  },
});