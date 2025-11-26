/**
 * Saved Jobs Screen - Redesigned with better UI/UX
 * Hiển thị các việc làm đã lưu với đầy đủ thông tin
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { db, auth } from '../../src/config/firebase';
import { SCROLL_BOTTOM_PADDING } from '@/utils/layout.utils';
import { DrawerMenuButton } from '@/components/candidate/DrawerMenu';
import { collection, doc, getDocs, getDoc, query, where, deleteDoc } from 'firebase/firestore';
import { formatSalary } from '@/utils/salary.utils';

const SavedJobsScreen = () => {
  const [savedJobs, setSavedJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    const user = auth.currentUser;
    if (user) setUserId(user.uid);
  }, []);

  useEffect(() => {
    if (userId) {
      fetchSavedJobs();
    }
  }, [userId]);

  const fetchSavedJobs = async () => {
    try {
      if (!loading) setRefreshing(true);
      
      const q = query(collection(db, 'saved_jobs'), where('userId', '==', userId));
      const savedSnap = await getDocs(q);
      const savedDocs = savedSnap.docs;
      
      console.log(`📊 Found ${savedDocs.length} saved jobs in DB`);
      
      // Fetch jobs in parallel with batching
      const jobDetails: any[] = [];
      const batchSize = 5;
      
      for (let i = 0; i < savedDocs.length; i += batchSize) {
        const batch = savedDocs.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(async (savedDoc) => {
            const jobId = savedDoc.data().jobId;
            const savedAt = savedDoc.data().created_at || savedDoc.data().savedAt;
            try {
              const jobSnap = await getDoc(doc(db, 'jobs', jobId));
              if (jobSnap.exists()) {
                const jobData = jobSnap.data();
                // Also fetch company if needed
                let companyName = jobData.company_name || '';
                let companyLogo = jobData.company_logo || jobData.image || '';
                
                if (!companyName && jobData.company) {
                  const companyId = typeof jobData.company === 'string' 
                    ? jobData.company 
                    : jobData.company.$id || jobData.company.id;
                  if (companyId) {
                    try {
                      const companySnap = await getDoc(doc(db, 'companies', companyId));
                      if (companySnap.exists()) {
                        companyName = companySnap.data().corp_name || companySnap.data().name || '';
                        companyLogo = companyLogo || companySnap.data().image || '';
                      }
                    } catch {}
                  }
                }
                
                return { 
                  $id: jobId, 
                  savedDocId: savedDoc.id,
                  savedAt,
                  companyName,
                  companyLogo,
                  ...jobData 
                };
              } else {
                // Job không còn tồn tại - trả về placeholder
                console.warn(`⚠️ Job ${jobId} no longer exists`);
                return {
                  $id: jobId,
                  savedDocId: savedDoc.id,
                  savedAt,
                  title: 'Việc làm không còn khả dụng',
                  companyName: 'Đã bị xóa hoặc hết hạn',
                  companyLogo: '',
                  _deleted: true,
                };
              }
            } catch (err: any) {
              console.warn(`Failed to fetch job ${jobId}:`, err?.message);
              // Error fetching - still show with placeholder
              return {
                $id: jobId,
                savedDocId: savedDoc.id,
                savedAt,
                title: 'Không thể tải thông tin',
                companyName: 'Lỗi kết nối',
                companyLogo: '',
                _error: true,
              };
            }
          })
        );
        // Include all results including placeholders
        jobDetails.push(...batchResults.filter(Boolean));
      }
      
      setSavedJobs(jobDetails);
    } catch (error) {
      console.log('Lỗi khi load saved jobs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleUnsaveJob = async (jobId: string, savedDocId?: string) => {
    if (!userId) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      if (savedDocId) {
        await deleteDoc(doc(db, 'saved_jobs', savedDocId));
      } else {
        const q = query(
          collection(db, 'saved_jobs'), 
          where('userId', '==', userId), 
          where('jobId', '==', jobId)
        );
        const res = await getDocs(q);
        if (!res.empty) {
          await deleteDoc(doc(db, 'saved_jobs', res.docs[0].id));
        }
      }
      
      // Optimistic update
      setSavedJobs(prev => prev.filter(job => job.$id !== jobId));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error('Lỗi khi bỏ lưu:', err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const onRefresh = useCallback(() => {
    fetchSavedJobs();
  }, [userId]);

  const getJobImage = (item: any) => {
    if (item.image && item.image.startsWith('http')) return item.image;
    if (item.companyLogo && item.companyLogo.startsWith('http')) return item.companyLogo;
    if (item.company_logo && item.company_logo.startsWith('http')) return item.company_logo;
    
    const name = item.companyName || item.company_name || item.title || 'Job';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=200&background=4A80F0&color=fff&bold=true`;
  };

  const renderJobItem = ({ item, index }: { item: any; index: number }) => {
    const isUnavailable = item._deleted || item._error;
    const companyName = item.companyName || item.company_name || 
      (typeof item.company === 'object' ? item.company.corp_name : '') || 'Công ty';
    
    const jobType = item.type || item.jobTypes?.type_name || '';
    const location = item.location || 
      (typeof item.company === 'object' ? `${item.company.city || ''}, ${item.company.nation || ''}` : '');

    return (
      <Animated.View entering={FadeInDown.delay(index * 50).duration(400)}>
        <TouchableOpacity
          style={[
            styles.jobCard,
            isUnavailable && { opacity: 0.65, borderLeftWidth: 4, borderLeftColor: '#f59e0b' }
          ]}
          activeOpacity={0.7}
          disabled={isUnavailable}
          onPress={() => {
            if (!isUnavailable) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(`/jobDescription?jobId=${item.$id}`);
            }
          }}
        >
          {isUnavailable ? (
            <View style={[styles.jobImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9' }]}>
              <Ionicons name="warning-outline" size={32} color="#f59e0b" />
            </View>
          ) : (
            <Image 
              source={{ uri: getJobImage(item) }} 
              style={styles.jobImage}
              contentFit="cover"
              transition={200}
            />
          )}
          
          <View style={styles.jobContent}>
            <Text style={[styles.jobTitle, isUnavailable && { color: '#9ca3af' }]} numberOfLines={2}>
              {item.title || 'Chưa có tiêu đề'}
            </Text>
            
            <View style={styles.jobInfoRow}>
              <Ionicons name="business-outline" size={14} color={isUnavailable ? '#d1d5db' : '#64748b'} />
              <Text style={[styles.jobInfoText, isUnavailable && { color: '#9ca3af' }]} numberOfLines={1}>
                {companyName}
              </Text>
            </View>
            
            {location && !isUnavailable ? (
              <View style={styles.jobInfoRow}>
                <Ionicons name="location-outline" size={14} color="#64748b" />
                <Text style={styles.jobInfoText} numberOfLines={1}>
                  {location.replace(/^,\s*/, '').replace(/,\s*$/, '')}
                </Text>
              </View>
            ) : null}
            
            {isUnavailable ? (
              <View style={[styles.typeBadge, { backgroundColor: '#fef3c7' }]}>
                <Text style={[styles.typeText, { color: '#d97706' }]}>
                  {item._deleted ? 'Đã bị xóa' : 'Không thể tải'}
                </Text>
              </View>
            ) : (
              <View style={styles.jobFooter}>
                {item.salary ? (
                  <View style={styles.salaryBadge}>
                    <Ionicons name="cash-outline" size={12} color="#10b981" />
                    <Text style={styles.salaryText}>
                      {formatSalary(item.salary)}
                    </Text>
                  </View>
                ) : null}
                
                {jobType ? (
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeText}>{jobType}</Text>
                  </View>
                ) : null}
              </View>
            )}
          </View>
          
          <TouchableOpacity 
            style={styles.heartButton}
            onPress={() => handleUnsaveJob(item.$id, item.savedDocId)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name={isUnavailable ? "trash-outline" : "heart"} size={22} color="#ef4444" />
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="heart-outline" size={64} color="#cbd5e1" />
      </View>
      <Text style={styles.emptyTitle}>Chưa có việc làm đã lưu</Text>
      <Text style={styles.emptySubtitle}>
        Nhấn vào biểu tượng ❤️ trên các công việc để lưu lại và xem sau
      </Text>
      <TouchableOpacity 
        style={styles.exploreButton}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push('/(candidate)');
        }}
      >
        <Text style={styles.exploreButtonText}>Khám phá việc làm</Text>
        <Ionicons name="arrow-forward" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <LinearGradient
        colors={['#4A80F0', '#357AE8']}
        style={styles.header}
      >
        <DrawerMenuButton />
        <Text style={styles.headerText}>Việc làm đã lưu</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Ionicons name="heart" size={18} color="#ef4444" />
          <Text style={styles.statText}>
            <Text style={styles.statNumber}>{savedJobs.length}</Text> việc làm đã lưu
          </Text>
        </View>
      </View>

      {/* Job List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A80F0" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      ) : savedJobs.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={savedJobs}
          renderItem={renderJobItem}
          keyExtractor={(item) => item.$id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={['#4A80F0']}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

export default SavedJobsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    fontSize: 14,
    color: '#64748b',
  },
  statNumber: {
    fontWeight: '700',
    color: '#1e293b',
  },
  listContent: {
    padding: 16,
    paddingBottom: SCROLL_BOTTOM_PADDING,
  },
  jobCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  jobImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  jobContent: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'space-between',
  },
  jobTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    lineHeight: 20,
    marginBottom: 6,
  },
  jobInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  jobInfoText: {
    fontSize: 13,
    color: '#64748b',
    flex: 1,
  },
  jobFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  salaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  salaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
  },
  typeBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3b82f6',
  },
  heartButton: {
    padding: 4,
    alignSelf: 'flex-start',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#4A80F0',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  exploreButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
