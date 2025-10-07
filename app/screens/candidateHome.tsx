// app/screens/CandidateHome.tsx
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, RefreshControl } from 'react-native';
import React, { useEffect, useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import Search from '@/components/Search';
import { router } from 'expo-router';
import { collection, getDocs, getDoc, query, where, doc } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';

const CandidateHome = () => {
  const [userId, setUserId] = useState<string>('');
  const [dataJob, setDataJob] = useState<any>([]);
  const [dataUser, setDataUser] = useState<any>();
  const [refreshing, setRefreshing] = useState(false);
  const [dataCategories, setDataCategories] = useState<any[]>([]);
  const [dataCompany, setDataCompany] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    load_user_id();
  }, []);

  useEffect(() => {
    if (userId) {
      load_data_job();
      load_data_user();
      load_data_company();
      load_data_categories();
      loadUnreadNotifications();
    }
  }, [userId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([
      load_data_company(),
      load_user_id(),
      load_data_user(),
      load_data_job(),
    ]).finally(() => setRefreshing(false));
  }, []);

  const load_user_id = async () => {
    try {
      const user = auth.currentUser;
      if (user) setUserId(user.uid);
    } catch (error) {
      console.log(error);
    }
  };

  const load_data_user = async () => {
    if (userId) {
      try {
        const docRef = doc(db, 'users', userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setDataUser({ $id: docSnap.id, ...docSnap.data() });
      } catch (error) {
        console.log(error);
      }
    }
  };

  const load_data_job = async () => {
    try {
      const q = query(collection(db, 'jobs'));
      const querySnapshot = await getDocs(q);
      const jobs = querySnapshot.docs.map(doc => ({ $id: doc.id, ...doc.data() }));
      setDataJob(jobs);
    } catch (error) {
      console.log(error);
    }
  };

  const load_data_company = async () => {
    try {
      const q = query(collection(db, 'companies'));
      const querySnapshot = await getDocs(q);
      const companies = querySnapshot.docs.map(doc => ({ $id: doc.id, ...doc.data() }));
      setDataCompany(companies);
    } catch (error) {
      console.log(error);
    }
  };

  const load_data_categories = async () => {
    try {
      const q = query(collection(db, 'categories'));
      const querySnapshot = await getDocs(q);
      const categories = querySnapshot.docs.map(doc => ({ $id: doc.id, ...doc.data() }));
      setDataCategories(categories);
    } catch (error) {
      console.log(error);
    }
  };

  const loadUnreadNotifications = async () => {
    if (!userId) return;
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('read', '==', false)
      );
      const querySnapshot = await getDocs(q);
      setUnreadCount(querySnapshot.size);
    } catch (error) {
      console.error('Failed to load unread notifications:', error);
    }
  };

  const getJobCountByCategory = (categoryId: string) =>
    dataJob.filter((job: any) => {
      if (!job.jobCategories) return false;
      if (Array.isArray(job.jobCategories)) {
        return job.jobCategories.some((cat: any) => cat.$id === categoryId);
      } else {
        return job.jobCategories.$id === categoryId;
      }
    }).length;

  const getContrastColor = (hexColor: string) => {
    if (!hexColor) return '#1e293b';
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#4A80F0' }}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.topView}>
          <View style={styles.welcomeTextContainer}>
            <Text style={styles.hello}>Welcome Back!</Text>
            {dataUser?.displayName && <Text style={styles.hello2}>{dataUser.displayName}</Text>}
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity
              onPress={() => {
                setUnreadCount(0);
                router.push('/(events)/Notifications');
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
            <TouchableOpacity onPress={() => router.push('/(tabs)/person')}>
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

      {/* ScrollView content */}
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 30 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4A80F0']} tintColor="#4A80F0" />
        }
      >
        <View style={styles.cardsContainer}>
          {/* Company Section */}
          <View style={styles.cardsHeaderContainer}>
            <Text style={styles.popularJobs}>Company</Text>
            <TouchableOpacity onPress={() => router.push('/companyList')}>
              <Text style={styles.showAllBtn}>Show all</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {dataCompany.map((item: any) => {
              const textColor = item.color ? getContrastColor(item.color) : '#1e293b';
              return (
                <TouchableOpacity
                  key={item.$id}
                  style={[styles.jobCardsContainer, { backgroundColor: item.color || '#e2e8f0' }]}
                  onPress={() =>
                    router.push({
                      pathname: '/(events)/companyDescription',
                      params: { companyId: item.$id },
                    })
                  }
                >
                  <Image style={styles.jobImages} source={{ uri: item.image }} />
                  <Text style={[styles.jobTitle, { color: textColor }]}>{item.corp_name}</Text>
                  <Text style={[styles.jobNation, { color: textColor }]}>{item.nation}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Recommend Jobs Section */}
          <View style={styles.cardsHeaderContainer}>
            <Text style={styles.popularJobs}>Recommend Jobs</Text>
            <TouchableOpacity onPress={() => router.push('/(events)/jobList')}>
              <Text style={styles.showAllBtn}>Show all</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {dataJob.slice(0, 4).map((item: any) => (
              <TouchableOpacity
                key={item.$id}
                style={styles.jobCardsContainer2}
                onPress={() =>
                  router.push({
                    pathname: '/jobDescription',
                    params: { jobId: item.$id },
                  })
                }
              >
                <Image style={styles.jobImages} source={{ uri: item.image }} />
                <View>
                  <Text style={styles.jobCorp}>Công ty: {item.company?.corp_name ?? 'Không rõ'}</Text>
                  <Text style={styles.jobTitle}>{item.title}</Text>
                  <Text style={styles.jobNation}>{item.company?.nation ?? 'Không rõ'}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

{/* Category Section */}
<View style={styles.cardsHeaderContainer}>
  <Text style={styles.popularJobs}>Category</Text>
  <TouchableOpacity onPress={() => router.push('/categoriesList')}>
    <Text style={styles.showAllBtn}>Show all</Text>
  </TouchableOpacity>
</View>

<View style={styles.categoryGrid}>
  {dataCategories.map((item: any) => {
    const jobCount = getJobCountByCategory(item.$id);
    return (
      <View
        key={item.$id}
        style={[styles.categoryCard, { backgroundColor: item.color || '#f0f0f0' }]}
      >
        <Ionicons name={item.icon_name || 'albums-outline'} size={24} color="#333" />
        <Text style={styles.categoryTitle}>{item.category_name}</Text>
        <Text style={styles.categorySubtitle}>{jobCount} Jobs</Text>
      </View>
    );
  })}
</View>


          {/* Latest Jobs Section */}
          <View style={styles.cardsHeaderContainer}>
            <Text style={styles.popularJobs}>Latest Jobs</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {dataJob.slice(0, 4).map((item: any) => (
              <TouchableOpacity
                key={item.$id}
                style={styles.jobCardsContainer2}
                onPress={() =>
                  router.push({
                    pathname: '/jobDescription',
                    params: { jobId: item.$id },
                  })
                }
              >
                <Image style={styles.jobImages} source={{ uri: item.image }} />
                <View>
                  <Text style={styles.jobCorp}>Công ty: {item.company?.corp_name ?? 'Không rõ'}</Text>
                  <Text style={styles.jobTitle}>{item.title}</Text>
                  <Text style={styles.jobNation}>{item.company?.nation ?? 'Không rõ'}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
};

export default CandidateHome;

// styles giữ nguyên như index cũ
const styles = StyleSheet.create({
  headerContainer: { backgroundColor: '#4A80F0', paddingHorizontal: 30, paddingTop: 50, paddingBottom: 45 },
  topView: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  welcomeTextContainer: { flex: 1 },
  hello: { fontSize: 20, color: '#FFFFFF' },
  hello2: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', marginTop: 5 },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  avatar: { height: 50, width: 50, borderRadius: 25, marginLeft: 15 },
  icon: { marginRight: 15 },
  searchContainer: { width: '100%' },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#F9F9FB',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    marginTop: -25,
  },
  notificationIconContainer: { position: 'relative' },
  badge: {
    position: 'absolute',
    top: -5,
    right: 5,
    backgroundColor: '#FF0000',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  cardsContainer: { paddingHorizontal: 30, paddingTop: 30, gap: 20 },
  cardsHeaderContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  popularJobs: { fontSize: 20, fontWeight: 'bold' },
  showAllBtn: { fontSize: 18, color: '#a9a9a9' },
  jobImages: { height: 70, width: 70, borderRadius: 40, borderWidth: 1, borderColor: '#4A80F0' },
  jobTitle: { fontSize: 19, fontWeight: '700', letterSpacing: 1 },
  jobCorp: { color: '#a9a9a9' },
  jobNation: { color: '#a9a9a9' },
  jobCardsContainer: {
    width: 200, height: 200, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    marginRight: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#4A80F0',
  },
  jobCardsContainer2: {
    flexDirection: 'row', alignItems: 'center',
    padding: 20, borderRadius: 20, backgroundColor: '#fff',
    marginRight: 15, borderWidth: 1, borderColor: '#eee',
  },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 15 },
  categoryCard: { width: '47%', padding: 15, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  categoryTitle: { fontWeight: 'bold', fontSize: 16, marginTop: 5 },
  categorySubtitle: { fontSize: 14, color: '#555' },
});
