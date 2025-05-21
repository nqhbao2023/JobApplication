import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, RefreshControl } from 'react-native';
import React, { useEffect, useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import Search from '@/components/Search';
import { router } from 'expo-router';
import { account, collection_company_id, collection_job_id, collection_user_id, collection_jobcategory_id, collection_notifications_id, databases, databases_id, Query } from '@/lib/appwrite';

const Index = () => {
  const [userId, setUserId] = useState<string>('');
  const [dataJob, setDataJob] = useState<any>([]);
  const [dataUser, setDataUser] = useState<any>();
  const [refreshing, setRefreshing] = useState(false);
  const [dataCategories, setDataCategories] = useState<any[]>([]);
  const [dataCompany, setDataCompany] = useState<any[]>([]);
 const [unreadCount, setUnreadCount] = useState<number>(0);
  useEffect(() => {
    load_data_job();
    load_user_id();
    load_data_user();
    load_data_company();
    load_data_categories();
     loadUnreadNotifications(); 
    
  }, [userId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);

    Promise.all([
      load_data_company(),
      load_user_id(),
      load_data_user(),
      load_data_job(),
    ]).finally(() => {
      setRefreshing(false);
    });
  }, []);

  const load_user_id = async () => {
    try {
      const result = await account.get();
      setUserId(result.$id);
    } catch (error) {
      console.log(error);
    }
  };

  const load_data_user = async () => {
    if (userId) {
      try {
        const result = await databases.getDocument(
          databases_id,
          collection_user_id,
          userId
        );
        setDataUser(result);
      } catch (error) {
        console.log(error);
      }
    }
  };

  const load_data_job = async () => {
    try {
      const result = await databases.listDocuments(
        databases_id,
        collection_job_id
      );
      setDataJob(result.documents);
    } catch (error) {
      console.log(error);
    }
  };

  const load_data_company = async () => {
    try {
      const result = await databases.listDocuments(
        databases_id,
        collection_company_id
      );
      setDataCompany(result.documents);
    } catch (error) {
      console.log(error);
    }
  };

  const load_data_categories = async () => {
    try {
      const result = await databases.listDocuments(
        databases_id,
        collection_jobcategory_id
      );
      setDataCategories(result.documents);
    } catch (error) {
      console.log(error);
    }
  };
const loadUnreadNotifications = async () => {
    if (!userId) return;
    try {
      const res = await databases.listDocuments(
        databases_id,
        collection_notifications_id,
        [
          Query.equal('userId', userId),
          Query.equal('read', false), // Chỉ lấy thông báo chưa đọc
        ]
      );
      setUnreadCount(res.documents.length);
    } catch (error) {
      console.error('Failed to load unread notifications:', error);
    }
  };

  const getJobCountByCategory = (categoryId: string) => {
    return dataJob.filter((job: any) => {
      if (!job.jobCategories) return false;

      if (Array.isArray(job.jobCategories)) {
        return job.jobCategories.some((cat: any) => cat.$id === categoryId);
      } else {
        return job.jobCategories.$id === categoryId;
      }
    }).length;
  };

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
      {/* Header cố định */}
      <View style={styles.headerContainer}>
        <View style={styles.topView}>
          <View style={styles.welcomeTextContainer}>
            <Text style={styles.hello}>Welcome Back!</Text>
            {dataUser?.name && <Text style={styles.hello2}>{dataUser.name}</Text>}
          </View>
          <View style={styles.headerIcons}>
           <TouchableOpacity
              onPress={() => {
                setUnreadCount(0); // Đặt lại số lượng thông báo chưa đọc về 0
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
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Image
                style={styles.avatar}
                source={{
                  uri: dataUser?.id_image
                    ? dataUser.id_image
                    : 'https://randomuser.me/api/portraits/men/1.jpg',
                }}
              />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.searchContainer}>
          <Search />
        </View>
      </View>
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 30 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4A80F0']}
            tintColor="#4A80F0"
          />
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
          <View style={styles.horizontalScrollContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingLeft: 30, paddingRight: 10 }}
            >
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
                    <View style={[styles.imageContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                      <Image style={styles.jobImages} source={{ uri: item.image }} />
                    </View>
                    <View style={styles.jobCardsDescription}>
                      <Text
                        style={[styles.jobTitle, { color: textColor }]}
                        numberOfLines={2}
                        ellipsizeMode="tail"
                      >
                        {item.corp_name}
                      </Text>
                      <Text style={[styles.jobNation, { color: textColor }]}>
                        {item.nation}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Recommend Jobs Section */}
          <View style={[styles.cardsHeaderContainer, { marginTop: 20 }]}>
            <Text style={styles.popularJobs}>Recommend Jobs</Text>
            <TouchableOpacity onPress={() => router.push('/(events)/jobList')}>
              <Text style={styles.showAllBtn}>Show all</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.horizontalScrollContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingLeft: 30, paddingRight: 10 }}
            >
              {dataJob.slice(0, 4).map((item: any) => (
                <TouchableOpacity
                  key={item.$id}
                  style={[
                    styles.jobCardsContainer2,
                    styles.horizontalJobCard,
                    { backgroundColor: item.jobCategories?.color || '#f0f0f0' },
                  ]}
                  onPress={() =>
                    router.push({
                      pathname: '/jobDescription',
                      params: { jobId: item.$id },
                    })
                  }
                >
                  <Image style={styles.jobImages} source={{ uri: item.image }} />
                  <View style={styles.jobCardsDescription2}>
                    <Text style={styles.jobCorp}>
                      Công ty: {item.company?.corp_name ?? 'Không rõ'}
                    </Text>
                    <View style={styles.jobCardsDescription}>
                      <Text
                        style={styles.jobTitle}
                        numberOfLines={2}
                        ellipsizeMode="tail"
                      >
                        {item.title}
                      </Text>
                      <Text style={styles.jobNation}>
                        {item.company?.nation ?? 'Không rõ'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Category Section */}
          <View style={{ marginBottom: 20 }}>
            <View style={styles.cardsHeaderContainer}>
              <Text style={styles.popularJobs}>Category</Text>
              <TouchableOpacity onPress={() => router.push({ pathname: '/(events)/companyDescription' })}>
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
                    <View style={styles.categoryIcon}>
                      <Ionicons name={item.icon_name || 'albums-outline'} size={24} color="#333" />
                    </View>
                    <Text style={styles.categoryTitle}>{item.category_name}</Text>
                    <Text style={styles.categorySubtitle}>{jobCount} Jobs</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Latest Jobs Section */}
          <View style={[styles.cardsHeaderContainer, { marginTop: 20 }]}>
            <Text style={styles.popularJobs}>Latest Jobs</Text>
            <TouchableOpacity>
              <Text style={styles.showAllBtn}>Show all</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.horizontalScrollContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingLeft: 30, paddingRight: 10 }}
            >
              {dataJob.slice(0, 4).map((item: any) => (
                <TouchableOpacity
                  key={item.$id}
                  style={[
                    styles.jobCardsContainer2,
                    styles.horizontalJobCard,
                    { backgroundColor: item.jobCategories?.color || '#f0f0f0' },
                  ]}
                  onPress={() =>
                    router.push({
                      pathname: '/jobDescription',
                      params: { jobId: item.$id },
                    })
                  }
                >
                  <Image style={styles.jobImages} source={{ uri: item.image }} />
                  <View style={styles.jobCardsDescription2}>
                    <Text style={styles.jobCorp}>
                      Công ty: {item.company?.corp_name ?? 'Không rõ'}
                    </Text>
                    <View style={styles.jobCardsDescription}>
                      <Text
                        style={styles.jobTitle}
                        numberOfLines={2}
                        ellipsizeMode="tail"
                      >
                        {item.title}
                      </Text>
                      <Text style={styles.jobNation}>
                        {item.company?.nation ?? 'Không rõ'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default Index;

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#4A80F0',
    paddingHorizontal: 30,
    paddingTop: 50,
    paddingBottom: 45,
  },
  topView: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  welcomeTextContainer: {
    flex: 1,
  },
  hello: {
    fontFamily: 'Arial',
    fontSize: 20,
    color: '#FFFFFF',
  },
  hello2: {
    fontFamily: 'Arial',
    fontWeight: '800',
    fontSize: 28,
    color: '#FFFFFF',
    marginTop: 5,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    height: 50,
    width: 50,
    borderRadius: 25,
    marginLeft: 15,
  },
  icon: {
    marginRight: 15,
  },
  searchContainer: {
    width: '100%',
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#F9F9FB',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    marginTop: -25,
  },
  cardsContainer: {
    paddingHorizontal: 30,
    paddingTop: 30,
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: 20,
  },
  cardsHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  popularJobs: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  showAllBtn: {
    fontSize: 18,
    color: '#a9a9a9',
  },
  horizontalScrollContainer: {
    marginHorizontal: -30,
    marginBottom: 20,
  },
  horizontalJobCard: {
    width: 300,
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#F1F2F6',
  },
  jobTitle: {
    fontFamily: 'serif',
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: 1,
  },
  jobImages: {
    height: 70,
    width: 70,
    alignItems: 'center',
    borderRadius: 40,
    borderWidth: 1,
    borderColor: '#4A80F0',
  },
  jobCorp: {
    color: '#a9a9a9',
    letterSpacing: 1,
  },
  jobNation: {
    color: '#a9a9a9',
  },
  jobCardsContainer: {
    width: 200,
    height: 200,
    borderRadius: 20,
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
    marginRight: 20,
    borderWidth: 1,
    borderColor: '#4A80F0',
    backgroundColor: '#FFFFFF',
  },
  jobCardsContainer2: {
    width: '100%',
    borderRadius: 20,
    gap: 10,
    padding: 20,
    marginBottom: 15,
    borderWidth: 14,
    borderColor: '#F1F2F6',
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
  },
  jobCardsDescription: {
    gap: 5,
  },
  jobCardsDescription2: {
    flexDirection: 'column',
    marginLeft: 15,
    flex: 1,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 15,
  },
  categoryCard: {
    width: '47%',
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIcon: {
    height: 40,
    width: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
  },
  categorySubtitle: {
    fontSize: 14,
    color: '#555',
  },
  imageContainer: {
    width: 70,
    height: 70,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 10,
  },
   notificationIconContainer: {
    position: 'relative',
  },
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
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});