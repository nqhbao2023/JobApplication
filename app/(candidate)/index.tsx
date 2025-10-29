// app/screens/CandidateHome.tsx
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

type Job = {
  $id: string;
  title?: string;
  image?: string;
  created_at?: string;
  company?: string | { $id?: string; corp_name?: string; nation?: string };
  jobCategories?: any; // string | string[] | { $id: string } | { $id: string }[]
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

const PLACEHOLDER_JOB_IMG =
  'https://via.placeholder.com/140x140.png?text=Job';
const PLACEHOLDER_COMPANY_IMG =
  'https://via.placeholder.com/140x140.png?text=Company';

const CandidateHome = () => {
  const [userId, setUserId] = useState<string>('');

  const [dataJob, setDataJob] = useState<Job[]>([]);
  const [dataUser, setDataUser] = useState<any>();
  const [dataCategories, setDataCategories] = useState<Category[]>([]);
  const [dataCompany, setDataCompany] = useState<Company[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [refreshing, setRefreshing] = useState(false);

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

  // ===== LOADERS =====
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
      // ĐÚNG collection: job_categories
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

  // ===== HELPERS =====
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

      // string
      if (typeof jc === 'string') return jc === categoryId || jc === catName;

      // array of strings
      if (Array.isArray(jc) && typeof jc[0] === 'string') {
        return (jc as string[]).some(x => x === categoryId || x === catName);
      }

      // object or array of objects { $id }
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

  // ===== SMALL UI PARTS =====
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
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.topView}>
          <View style={styles.welcomeTextContainer}>
            <Text style={styles.hello}>Welcome Back!</Text>
            {!!dataUser?.displayName && <Text style={styles.hello2}>{dataUser.displayName}</Text>}
          </View>

          <View style={styles.headerIcons}>
            <TouchableOpacity
              onPress={() => {
                setUnreadCount(0);
                router.push('/(shared)/Notifications');
              }}
            >
              <View style={styles.notificationIconContainer}>
                <Ionicons name="notifications-outline" size={28} color="#FFFFFF" style={styles.icon} />
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

        <View style={styles.searchContainer}>
          <Search />
        </View>
      </View>

      {/* Content */}
      <FlatList
        ListHeaderComponent={
          <View style={styles.contentWrapper}>
            {/* Companies */}
            <SectionHeader title="Companies" onPressShowAll={() => router.push('/companyList')} />
            <FlatList
              horizontal
              data={dataCompany}
              keyExtractor={(i) => i.$id}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => <CompanyCard item={item} />}
              contentContainerStyle={{ paddingRight: 30 }}
              ListEmptyComponent={<Text style={styles.emptyTxt}>No companies</Text>}
            />

            {/* Recommend Jobs */}
            <SectionHeader title="Recommend Jobs" onPressShowAll={() => router.push('/(shared)/jobList')} />
            <FlatList
              horizontal
              data={jobsSorted.slice(0, 8)}
              keyExtractor={(i) => i.$id}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => <JobCard item={item} />}
              contentContainerStyle={{ paddingRight: 30 }}
              ListEmptyComponent={<Text style={styles.emptyTxt}>No jobs</Text>}
            />

            {/* Categories */}
            <SectionHeader title="Categories" onPressShowAll={() => router.push('/categoriesList')} />
            <FlatList
              horizontal
              data={dataCategories}
              keyExtractor={(i) => i.$id}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => <CategoryCard item={item} />}
              contentContainerStyle={{ paddingRight: 30 }}
              ListEmptyComponent={<Text style={styles.emptyTxt}>No categories</Text>}
            />

            {/* Latest Jobs */}
            <SectionHeader title="Latest Jobs" />
            <FlatList
              horizontal
              data={jobsSorted.slice(0, 8)}
              keyExtractor={(i) => i.$id}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => <JobCard item={item} />}
              contentContainerStyle={{ paddingRight: 30 }}
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

const CARD_RADIUS = 18;

const styles = StyleSheet.create({
  // Header
  headerContainer: { backgroundColor: '#4A80F0', paddingHorizontal: 24, paddingTop: 10, paddingBottom: 14 },
  topView: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  welcomeTextContainer: { flex: 1 },
  hello: { fontSize: 16, color: '#FFFFFF', opacity: 0.9 },
  hello2: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginTop: 4 },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  avatar: { height: 42, width: 42, borderRadius: 21, marginLeft: 10, backgroundColor: '#e2e8f0' },
  icon: { marginRight: 6 },
  searchContainer: { width: '100%' },

  // Badge
  notificationIconContainer: { position: 'relative', padding: 6 },
  badge: {
    position: 'absolute', top: 2, right: 2,
    backgroundColor: '#FF3B30', borderRadius: 10, minWidth: 18, height: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },

  // Main content
  listContent: {
    backgroundColor: '#F9F9FB',
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
  },
  contentWrapper: { paddingHorizontal: 24, paddingTop: 18, paddingBottom: 30, gap: 8 },

  // Section header
  cardsHeaderContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 6 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  showAllBtn: { fontSize: 14, color: '#64748b' },

  // Company card
  companyCard: {
    width: 170, height: 170,
    borderRadius: CARD_RADIUS,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 14, borderWidth: 1, borderColor: '#e5e7eb',
  },
  companyImage: {
    height: 68, width: 68, borderRadius: 16,
    borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#fff', marginBottom: 10,
  },
  companyTitle: { fontSize: 16, fontWeight: '700' },
  companySub: { fontSize: 13, opacity: 0.9 },

  // Job card
  jobCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderRadius: CARD_RADIUS, backgroundColor: '#fff',
    marginRight: 14, borderWidth: 1, borderColor: '#e5e7eb',
  },
  jobImage: {
    height: 68, width: 68, borderRadius: 16,
    borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff',
  },
  jobTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  jobSub: { color: '#64748b', marginTop: 2 },

  // Category card
  categoryCard: {
    width: 140, height: 120, marginRight: 14,
    borderRadius: CARD_RADIUS, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  categoryTitle: { fontWeight: '800', fontSize: 14 },
  categorySub: { fontSize: 12, opacity: 0.9 },

  // empty
  emptyTxt: { color: '#94a3b8', marginLeft: 4 },
});
