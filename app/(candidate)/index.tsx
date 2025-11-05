import Animated, { 
  FadeInDown, 
  useAnimatedStyle, 
  useSharedValue, 
  interpolate,
  Extrapolate,
  withTiming,
  useAnimatedScrollHandler
} from 'react-native-reanimated';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  RefreshControl,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Search from '@/components/Search';
import { router } from 'expo-router';
import { collection, getDocs, getDoc, query, where, doc } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

type Job = {
  $id: string;
  title?: string;
  image?: string;
  created_at?: string;
  company?: string | { $id?: string; corp_name?: string; nation?: string };
  jobCategories?: any;
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

const PLACEHOLDER_JOB_IMG = 'https://via.placeholder.com/140x140.png?text=Job';
const PLACEHOLDER_COMPANY_IMG = 'https://via.placeholder.com/140x140.png?text=Company';
const HEADER_MAX_HEIGHT = 180;
const HEADER_MIN_HEIGHT = 70;
const SCROLL_THRESHOLD = 100;

const CandidateHome = () => {
  const [userId, setUserId] = useState<string>('');
  const [dataJob, setDataJob] = useState<Job[]>([]);
  const [dataUser, setDataUser] = useState<any>();
  const [dataCategories, setDataCategories] = useState<Category[]>([]);
  const [dataCompany, setDataCompany] = useState<Company[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [refreshing, setRefreshing] = useState(false);

  // ✅ Animation values
  const scrollY = useSharedValue(0);

  useEffect(() => { load_user_id(); }, []);
  useEffect(() => {
    if (!userId) return;
    load_data_user();
    load_data_job();
    load_data_company();
    load_data_categories();
    loadUnreadNotifications();
  }, [userId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([
      load_user_id(),
      load_data_user(),
      load_data_job(),
      load_data_company(),
      load_data_categories(),
      loadUnreadNotifications(),
    ]).finally(() => setRefreshing(false));
  }, []);

  // ===== LOADERS (GIỮ NGUYÊN LOGIC) =====
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
      const q = query(collection(db, 'jobs'));
      const snap = await getDocs(q);
      const jobs = snap.docs.map(d => ({ $id: d.id, ...d.data() } as Job));
      setDataJob(jobs);
    } catch (e) { console.log(e); }
  };

  const load_data_company = async () => {
    try {
      const q = query(collection(db, 'companies'));
      const snap = await getDocs(q);
      const companies = snap.docs.map(d => ({ $id: d.id, ...d.data() } as Company));
      setDataCompany(companies);
    } catch (e) { console.log(e); }
  };

  const load_data_categories = async () => {
    try {
      const q = query(collection(db, 'job_categories'));
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

  // ===== HELPERS (GIỮ NGUYÊN LOGIC) =====
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

  const jobsSorted = useMemo(() => {
    const clone = [...dataJob];
    clone.sort(
      (a, b) =>
        (Date.parse(b.created_at || '0') || 0) -
        (Date.parse(a.created_at || '0') || 0)
    );
    return clone;
  }, [dataJob]);

  const getJobCountByCategory = (categoryId: string) => {
    const cat = dataCategories.find(c => c.$id === categoryId);
    const catName = cat?.category_name;
    return dataJob.filter(job => {
      const jc = job.jobCategories;
      if (!jc) return false;
      if (typeof jc === 'string') return jc === categoryId || jc === catName;
      if (Array.isArray(jc) && typeof jc[0] === 'string') {
        return (jc as string[]).some(x => x === categoryId || x === catName);
      }
      if (Array.isArray(jc)) {
        return jc.some((x: any) => x?.$id === categoryId);
      }
      if (typeof jc === 'object' && jc.$id) {
        return jc.$id === categoryId;
      }
      return false;
    }).length;
  };

  const getContrastColor = (hexColor?: string) => {
    if (!hexColor || !hexColor.startsWith('#') || hexColor.length < 7) return '#1e293b';
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.5 ? '#000000' : '#FFFFFF';
  };

  // ✅ Scroll handler
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // ✅ Header animation styles
  const headerAnimatedStyle = useAnimatedStyle(() => {
    const height = interpolate(
      scrollY.value,
      [0, SCROLL_THRESHOLD],
      [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
      Extrapolate.CLAMP
    );

    return {
      height: withTiming(height, { duration: 150 }),
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
      opacity: withTiming(opacity, { duration: 150 }),
    };
  });

  const searchAnimatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [0, SCROLL_THRESHOLD],
      [0, -10],
      Extrapolate.CLAMP
    );

    return {
      transform: [{ translateY: withTiming(translateY, { duration: 150 }) }],
    };
  });

  // ===== SMALL UI PARTS (GIỮ NGUYÊN) =====
  const SectionHeader = ({
    title,
    onPressShowAll,
  }: {
    title: string;
    onPressShowAll?: () => void;
  }) => (
    <View style={styles.cardsHeaderContainer}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onPressShowAll ? (
        <TouchableOpacity onPress={onPressShowAll}>
          <Text style={styles.showAllBtn}>Show all</Text>
        </TouchableOpacity>
      ) : <View style={{ width: 60 }} />}
    </View>
  );

  const CompanyCard = ({ item }: { item: Company }) => {
    const textColor = getContrastColor(item.color);
    return (
      <TouchableOpacity
        style={[styles.companyCard, { backgroundColor: item.color || '#e2e8f0' }]}
        onPress={() =>
          router.push({
            pathname: '/(shared)/companyDescription',
            params: { companyId: item.$id },
          })
        }
      >
        <Image style={styles.companyImage} source={{ uri: item.image || PLACEHOLDER_COMPANY_IMG }} />
        <Text style={[styles.companyTitle, { color: textColor }]} numberOfLines={1}>
          {item.corp_name || 'Company'}
        </Text>
        <Text style={[styles.companySub, { color: textColor }]} numberOfLines={1}>
          {item.nation || 'Unknown'}
        </Text>
      </TouchableOpacity>
    );
  };

  const JobCard = ({ item }: { item: Job }) => {
    const comp = getJobCompany(item);
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.jobCard}
        onPress={() =>
          router.push({ pathname: '/jobDescription', params: { jobId: item.$id } })
        }
      >
        <Image style={styles.jobImage} source={{ uri: item.image || PLACEHOLDER_JOB_IMG }} />
        <View style={{ marginLeft: 12, maxWidth: 220 }}>
          <Text style={styles.jobTitle} numberOfLines={1}>{item.title || 'Untitled job'}</Text>
          <Text style={styles.jobSub} numberOfLines={1}>Công ty: {comp?.corp_name ?? 'Không rõ'}</Text>
          <Text style={styles.jobSub} numberOfLines={1}>{comp?.nation ?? 'Không rõ'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const CategoryCard = ({ item }: { item: Category }) => {
    const jobCount = getJobCountByCategory(item.$id);
    return (
      <TouchableOpacity
        style={[styles.categoryCard, { backgroundColor: item.color || '#f0f0f0' }]}
        onPress={() =>
          router.push({
            pathname: '/(shared)/categoryJobs',
            params: { id: item.$id, name: item.category_name },
          })
        }
      >
        <Ionicons
          name={(item.icon_name as any) || 'albums-outline'}
          size={28}
          color={getContrastColor(item.color)}
          style={{ marginBottom: 6 }}
        />
        <Text style={[styles.categoryTitle, { color: getContrastColor(item.color) }]} numberOfLines={1}>
          {item.category_name || 'Category'}
        </Text>
        <Text style={[styles.categorySub, { color: getContrastColor(item.color) }]}>{jobCount} Jobs</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#4A80F0' }} edges={['top', 'left', 'right']}>
      {/* ✅ Animated Header */}
      <Animated.View style={[styles.headerContainer, headerAnimatedStyle]}>
        <LinearGradient
          colors={['#4A80F0', '#357AE8']}
          style={StyleSheet.absoluteFill}
        />
        
        {/* Top Row */}
        <View style={styles.topView}>
          {/* Welcome Text (Thu nhỏ khi scroll) */}
          <Animated.View style={[styles.welcomeTextContainer, welcomeTextAnimatedStyle]}>
            <Text style={styles.hello}>Welcome Back!</Text>
            {!!dataUser?.displayName && (
              <Text style={styles.hello2}>{dataUser.displayName}</Text>
            )}
          </Animated.View>

          {/* Icons */}
          <View style={styles.headerIcons}>
            <TouchableOpacity
              onPress={() => {
                setUnreadCount(0);
                router.push('/(shared)/Notifications');
              }}
            >
              <View style={styles.notificationIconContainer}>
                <Ionicons name="notifications-outline" size={26} color="#FFFFFF" />
                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadCount}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/(candidate)/profile')}>
              <Image
                style={styles.avatar}
                source={{
                  uri: dataUser?.photoURL || 'https://randomuser.me/api/portraits/men/1.jpg',
                }}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar (Sticky) */}
        <Animated.View style={[styles.searchContainer, searchAnimatedStyle]}>
          <Search />
        </Animated.View>
      </Animated.View>

      {/* ✅ Content with Scroll Handler */}
      <Animated.FlatList
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        ListHeaderComponent={
          <View style={styles.contentWrapper}>
            {/* Companies */}
            <SectionHeader title="Companies" onPressShowAll={() => router.push('/companyList')} />
            <Animated.FlatList
              entering={FadeInDown.springify().stiffness(90)}
              horizontal
              data={dataCompany}
              keyExtractor={(i) => i.$id}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => <CompanyCard item={item} />}
              contentContainerStyle={styles.horizontalList}
              ListEmptyComponent={<Text style={styles.emptyTxt}>No companies</Text>}
            />

            {/* Recommend Jobs */}
            <SectionHeader title="Recommend Jobs" onPressShowAll={() => router.push('/(shared)/jobList')} />
            <Animated.FlatList
              entering={FadeInDown.delay(100).springify()}
              horizontal
              data={jobsSorted.slice(0, 8)}
              keyExtractor={(i) => i.$id}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => <JobCard item={item} />}
              contentContainerStyle={styles.horizontalList}
              ListEmptyComponent={<Text style={styles.emptyTxt}>No jobs</Text>}
            />

            {/* Categories */}
            <SectionHeader title="Categories" onPressShowAll={() => router.push('/categoriesList')} />
            <Animated.FlatList
              entering={FadeInDown.delay(200).springify()}
              horizontal
              data={dataCategories}
              keyExtractor={(i) => i.$id}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => <CategoryCard item={item} />}
              contentContainerStyle={styles.horizontalList}
              ListEmptyComponent={<Text style={styles.emptyTxt}>No categories</Text>}
            />

            {/* Latest Jobs */}
            <SectionHeader title="Latest Jobs" />
            <Animated.FlatList
              entering={FadeInDown.delay(300).springify()}
              horizontal
              data={jobsSorted.slice(0, 8)}
              keyExtractor={(i) => i.$id}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => <JobCard item={item} />}
              contentContainerStyle={styles.horizontalList}
              ListEmptyComponent={<Text style={styles.emptyTxt}>No jobs</Text>}
            />
          </View>
        }
        data={[]}
        renderItem={null}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4A80F0']}
            tintColor="#4A80F0"
          />
        }
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
};

export default CandidateHome;

const styles = StyleSheet.create({
  // ✅ Animated Header
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  topView: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  welcomeTextContainer: {
    flex: 1,
  },
  hello: {
    fontSize: 15,
    color: '#FFFFFF',
    opacity: 0.95,
    fontWeight: '500',
  },
  hello2: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 4,
    letterSpacing: 0.3,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    height: 40,
    width: 40,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  searchContainer: {
    width: '100%',
    marginTop: 4,
  },

  // Badge
  notificationIconContainer: {
    position: 'relative',
    padding: 4,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4A80F0',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },

  // Main content
  listContent: {
    backgroundColor: '#F9F9FB',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    marginTop: -10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  contentWrapper: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    gap: 10,
  },

  // Section header
  cardsHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: 0.2,
  },
  showAllBtn: {
    fontSize: 14,
    color: '#4A80F0',
    fontWeight: '600',
  },

  // Company card
  companyCard: {
    width: 150,
    height: 150,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  companyImage: {
    height: 64,
    width: 64,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  companyTitle: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  companySub: {
    fontSize: 12,
    opacity: 0.85,
    marginTop: 2,
  },

  // Job card
  jobCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 280,
    height: 110,
    padding: 14,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  jobImage: {
    height: 64,
    width: 64,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    backgroundColor: '#f8fafc',
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  jobSub: {
    color: '#64748b',
    marginTop: 4,
    fontSize: 13,
  },

  // Category card
  categoryCard: {
    width: 130,
    height: 130,
    marginRight: 14,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryTitle: {
    fontWeight: '700',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  categorySub: {
    fontSize: 12,
    opacity: 0.85,
    marginTop: 2,
  },
  // Empty
  emptyTxt: {
    color: '#94a3b8',
    marginLeft: 4,
    fontSize: 14,
  },
  horizontalList: {
    paddingLeft: 4,
    paddingRight: 16,
    gap: 14,
  },
});