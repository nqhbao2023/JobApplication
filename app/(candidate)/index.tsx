import Animated, {
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  Extrapolate,
  withTiming,
  useAnimatedScrollHandler,
  runOnJS,
  Easing,
  FadeInDown,
} from 'react-native-reanimated';
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, Button } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Search from '@/components/Search';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useCandidateHome } from '@/hooks/useCandidateHome';
import { useStudentFilters } from '@/hooks/useStudentFilters';
import { useJobNotifications } from '@/hooks/useJobNotifications';
import {
  LoadingScreen,
  ErrorView,
  SectionHeader,
  QuickFilters,
  CompanyCard,
  JobCard,
  CategoryCard,
  EmptyState,
  JobAlertCTA,
} from '@/components/candidate/HomeComponents';
import { StudentAdvancedFilters } from '@/components/candidate/StudentAdvancedFilters';
import { DrawerMenuButton } from '@/components/candidate/DrawerMenu';
import { SCROLL_BOTTOM_PADDING } from '@/utils/layout.utils';
import {
  HEADER_MAX_HEIGHT,
  HEADER_MIN_HEIGHT,
  SCROLL_THRESHOLD,
  HORIZONTAL_PADDING,
  CARD_GAP,
} from '@/constants/candidate_Home.constants';

const CandidateHome = () => {
  const { 
    data,
    loading,
    error,
    selectedFilter,
    forYouJobs,
    latestJobs,
    trendingCategories,
    getJobCompany,
    onRefresh,
    handleFilterChange,
    resetUnreadCount,
  } = useCandidateHome();
  
  // Student filters for advanced filtering
  const {
    filters: studentFilters,
    filteredJobs,
    handleFiltersChange,
  } = useStudentFilters(
    forYouJobs,
    data?.user?.studentProfile
  );

  // ✅ Setup job notifications (only works on physical device with EAS project ID)
  useJobNotifications({
    jobs: forYouJobs,
    studentProfile: data?.user?.studentProfile,
    enabled: true,
  });

  const displayName = useMemo(
    () => data?.user?.displayName || data?.user?.name || '',
    [data?.user?.displayName, data?.user?.name]
  );
  const scrollY = useSharedValue(0);
  const hasTriggeredHaptic = useSharedValue(false);

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
    const opacity = interpolate(scrollY.value, [0, SCROLL_THRESHOLD / 2], [1, 0], Extrapolate.CLAMP);
    const translateY = interpolate(scrollY.value, [0, SCROLL_THRESHOLD / 2], [0, -10], Extrapolate.CLAMP);
    return {
      opacity: withTiming(opacity, { duration: 250 }),
      transform: [{ translateY: withTiming(translateY, { duration: 250 }) }],
    };
  });

  const searchAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(scrollY.value, [0, SCROLL_THRESHOLD], [1, 0.96], Extrapolate.CLAMP);
    return {
      transform: [{ scale: withTiming(scale, { duration: 250 }) }],
    };
  });

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

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
        <ErrorView message={error} onRetry={onRefresh} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#4A80F0' }} edges={['top', 'left', 'right']}>
      <Animated.View style={[styles.headerContainer, headerAnimatedStyle]}>
        <LinearGradient
          colors={['#4A80F0', '#357AE8']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />

        <View style={styles.topView}>
          {/* Drawer Menu Button */}
          <View style={styles.drawerButtonContainer}>
            <DrawerMenuButton />
          </View>

          <Animated.View style={[styles.welcomeTextContainer, welcomeTextAnimatedStyle]}>
            <Text style={styles.hello}>Xin chào</Text>
            <Text style={styles.hello2}>
              {data?.user?.displayName || displayName || 'Bạn'}
            </Text>
          </Animated.View>

          <View style={styles.headerIcons}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/(shared)/quickPost');
              }}
            >
              <Ionicons name="add-circle-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                resetUnreadCount();
                router.push('/(shared)/Notifications');
              }}
            >
              <View style={styles.notificationIconContainer}>
                <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
                {data?.unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{data.unreadCount > 9 ? '9+' : data.unreadCount}</Text>
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
                source={{ uri: data?.user?.photoURL || 'https://randomuser.me/api/portraits/men/1.jpg' }}
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

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        <View style={styles.contentWrapper}>
          <QuickFilters selectedFilter={selectedFilter} onFilterChange={handleFilterChange} />
          
          {/* Student Advanced Filters */}
          <View style={styles.advancedFiltersContainer}>
            <StudentAdvancedFilters
              filters={studentFilters}
              onFiltersChange={handleFiltersChange}
            />
          </View>

          {/* Application Tracker Quick Access */}
          <TouchableOpacity
            style={styles.trackerWidget}
            activeOpacity={0.8}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/(candidate)/applicationTracker' as any);
            }}
          >
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.trackerGradient}
            >
              <View style={styles.trackerLeft}>
                <Ionicons name="stats-chart" size={28} color="#fff" />
                <View style={styles.trackerTextContainer}>
                  <Text style={styles.trackerTitle}>Theo dõi ứng tuyển</Text>
                  <Text style={styles.trackerSubtitle}>Xem thống kê & lịch sử apply</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>

          <SectionHeader 
            title={studentFilters.isActive ? "Kết quả lọc" : "Dành cho bạn"} 
            onPressShowAll={() => router.push('/(shared)/jobList')} 
          />
          {filteredJobs.length > 0 ? (
            filteredJobs.map((item, idx) => (
              <Animated.View key={item.$id} entering={FadeInDown.delay(idx * 50).duration(400)}>
                <JobCard 
                  item={item} 
                  company={getJobCompany(item)}
                  matchScore={item.matchScore}
                  isHighMatch={item.isHighMatch}
                />
              </Animated.View>
            ))
          ) : (
            <EmptyState 
              message={studentFilters.isActive ? "Không có công việc phù hợp với bộ lọc" : "Chưa có việc làm phù hợp"} 
              icon="briefcase-outline" 
            />
          )}

          <SectionHeader title="Danh mục nổi bật" onPressShowAll={() => router.push('/categoriesList')} />
          {trendingCategories.length > 0 ? (
            <FlatList
              horizontal
              data={trendingCategories}
              keyExtractor={(item) => item.$id}
              renderItem={({ item, index }) => (
                <Animated.View entering={FadeInDown.delay(index * 50).duration(400)}>
                  <CategoryCard item={item} jobCount={item.jobCount || 0} />
                </Animated.View>
              )}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            />
          ) : (
            <EmptyState message="Chưa có danh mục" icon="apps-outline" />
          )}

          <SectionHeader title="Công ty hàng đầu" onPressShowAll={() => router.push('/companyList')} />
          {data?.companies && data.companies.length > 0 ? (
            <FlatList
              horizontal
              data={data.companies}
              keyExtractor={(item) => item.$id}
              renderItem={({ item, index }) => (
                <Animated.View entering={FadeInDown.delay(index * 50).duration(400)}>
                  <CompanyCard item={item} />
                </Animated.View>
              )}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            />
          ) : (
            <EmptyState message="Không tìm thấy công ty" icon="business-outline" />
          )}

          <SectionHeader title="Việc làm mới nhất" onPressShowAll={() => router.push('/(shared)/jobList')} />
          {latestJobs.length > 0 ? (
            latestJobs.map((item, idx) => (
              <Animated.View key={item.$id + '_latest'} entering={FadeInDown.delay(idx * 50).duration(400)}>
                <JobCard item={item} company={getJobCompany(item)} />
              </Animated.View>
            ))
          ) : (
            <EmptyState message="Chưa có việc mới" icon="time-outline" />
          )}

          <Animated.View entering={FadeInDown.delay(300).duration(400)}>
            <JobAlertCTA />
          </Animated.View>
        </View>
      </Animated.ScrollView>

      {/* Floating AI Assistant Button */}
      <TouchableOpacity
        style={styles.floatingAIButton}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push('/(shared)/ai-assistant' as any);
        }}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#8B5CF6', '#7C3AED']}
          style={styles.floatingAIGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="sparkles" size={24} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default CandidateHome;

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
    marginBottom: 14,
  },
  drawerButtonContainer: {
    marginRight: 8,
    marginTop: -4,
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
    borderColor: 'rgba(255,255,255,0.4)',
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
  advancedFiltersContainer: {
    marginTop: 12,
    marginBottom: 16,
  },
  trackerWidget: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  trackerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
  },
  trackerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  trackerTextContainer: {
    gap: 4,
  },
  trackerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  trackerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
  },
  horizontalList: { paddingRight: 20 },
  floatingAIButton: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    borderRadius: 30,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingAIGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
