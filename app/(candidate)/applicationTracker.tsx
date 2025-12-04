/**
 * Application Tracker Screen
 * 
 * Theo dõi:
 * - Jobs đã apply
 * - Jobs đã xem (từ external/crawled sources)
 * - Jobs đã lưu
 * - Thống kê tỷ lệ thành công
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { db, auth } from '@/config/firebase';
import { collection, query, where, getDocs, doc, getDoc, orderBy, limit } from 'firebase/firestore';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface ApplicationStats {
  totalApplied: number;
  pending: number;
  accepted: number;
  rejected: number;
  successRate: number;
  totalViewed: number; // External jobs viewed
  totalSaved: number;
}

interface ApplicationItem {
  id: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  appliedAt: Date;
  status: 'pending' | 'accepted' | 'rejected';
  jobSource?: 'crawled' | 'quick-post' | 'featured' | 'internal';
}

interface ViewedJob {
  jobId: string;
  jobTitle: string;
  viewedAt: Date;
  source: string;
}

const ApplicationTracker = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'applied' | 'viewed' | 'saved'>('stats');
  
  const [stats, setStats] = useState<ApplicationStats>({
    totalApplied: 0,
    pending: 0,
    accepted: 0,
    rejected: 0,
    successRate: 0,
    totalViewed: 0,
    totalSaved: 0,
  });
  
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [viewedJobs, setViewedJobs] = useState<ViewedJob[]>([]);
  const [savedJobs, setSavedJobs] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    try {
      setLoading(true);

      // Fetch applications
      const appsQuery = query(
        collection(db, 'applications'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const appsSnap = await getDocs(appsQuery);
      
      const appsData: ApplicationItem[] = [];
      let pending = 0, accepted = 0, rejected = 0;

      for (const appDoc of appsSnap.docs) {
        const appData = appDoc.data();
        const status = appData.status || 'pending';
        
        // Count by status
        if (status === 'pending') pending++;
        if (status === 'accepted') accepted++;
        if (status === 'rejected') rejected++;

        // Fetch job details
        let jobTitle = 'Không rõ';
        let companyName = 'Ẩn danh';
        let jobSource: any = undefined;

        if (appData.jobId) {
          try {
            const jobSnap = await getDoc(doc(db, 'jobs', appData.jobId));
            if (jobSnap.exists()) {
              const jobData = jobSnap.data();
              jobTitle = jobData.title || 'Không rõ';
              jobSource = jobData.source || jobData.jobSource;
              
              // Get company name
              if (jobData.company_name) {
                companyName = jobData.company_name;
              } else if (jobData.company) {
                const companyId = typeof jobData.company === 'string' 
                  ? jobData.company 
                  : jobData.company.id || jobData.company.$id;
                
                if (companyId) {
                  const companySnap = await getDoc(doc(db, 'companies', companyId));
                  if (companySnap.exists()) {
                    companyName = companySnap.data().corp_name || companySnap.data().name || 'Ẩn danh';
                  }
                }
              }
            }
          } catch (err) {
            console.warn('Error fetching job:', err);
          }
        }

        appsData.push({
          id: appDoc.id,
          jobId: appData.jobId,
          jobTitle,
          companyName,
          appliedAt: appData.createdAt?.toDate() || new Date(),
          status,
          jobSource,
        });
      }

      setApplications(appsData);

      // Fetch viewed jobs (external jobs)
      const viewedQuery = query(
        collection(db, 'user_activities'),
        where('userId', '==', userId),
        where('action', '==', 'view_external_job'),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
      
      try {
        const viewedSnap = await getDocs(viewedQuery);
        const viewedData: ViewedJob[] = viewedSnap.docs.map(d => {
          const data = d.data();
          return {
            jobId: data.jobId || '',
            jobTitle: data.jobTitle || 'Công việc bên ngoài',
            viewedAt: data.timestamp?.toDate() || new Date(),
            source: data.source || 'viecoi.vn',
          };
        });
        setViewedJobs(viewedData);
      } catch (err) {
        console.log('No viewed jobs collection yet');
        setViewedJobs([]);
      }

      // Fetch saved jobs
      let savedCount = 0;
      const savedQuery = query(
        collection(db, 'saved_jobs'),
        where('userId', '==', userId)
      );
      
      try {
        const savedSnap = await getDocs(savedQuery);
        // Count total saved regardless of job existence
        savedCount = savedSnap.size;
        console.log(`📊 Saved jobs count from DB: ${savedCount}`);
        
        const savedData: any[] = [];
        
        for (const savedDoc of savedSnap.docs) {
          const savedJobData = savedDoc.data();
          const jobId = savedJobData.jobId;
          
          try {
            const jobSnap = await getDoc(doc(db, 'jobs', jobId));
            
            if (jobSnap.exists()) {
              savedData.push({
                id: savedDoc.id,
                jobId: jobId,
                savedAt: savedJobData.savedAt?.toDate() || savedJobData.created_at?.toDate() || new Date(),
                ...jobSnap.data(),
              });
            } else {
              // Job doesn't exist anymore - still show basic info
              console.log(`⚠️ Saved job ${jobId} no longer exists`);
              savedData.push({
                id: savedDoc.id,
                jobId: jobId,
                savedAt: savedJobData.savedAt?.toDate() || savedJobData.created_at?.toDate() || new Date(),
                title: 'Việc làm không còn khả dụng',
                company_name: 'Đã bị xóa',
                _deleted: true,
              });
            }
          } catch (jobErr: any) {
            console.warn(`Error fetching saved job ${jobId}:`, jobErr?.message);
            // Still add to list with placeholder info
            savedData.push({
              id: savedDoc.id,
              jobId: jobId,
              savedAt: savedJobData.savedAt?.toDate() || savedJobData.created_at?.toDate() || new Date(),
              title: 'Không thể tải thông tin',
              company_name: 'Lỗi kết nối',
              _error: true,
            });
          }
        }
        
        setSavedJobs(savedData);
      } catch (err) {
        console.log('Error fetching saved jobs:', err);
        setSavedJobs([]);
      }

      // Calculate stats - use the fetched data directly, not state (which hasn't updated yet)
      const total = appsData.length;
      const successRate = total > 0 ? Math.round((accepted / total) * 100) : 0;

      console.log(`📊 Applications stats: total=${total}, pending=${pending}, accepted=${accepted}, rejected=${rejected}`);

      // Get viewed count from the data we just fetched
      let viewedCount = 0;
      try {
        const viewedQuery2 = query(
          collection(db, 'user_activities'),
          where('userId', '==', userId),
          where('action', '==', 'view_external_job'),
          limit(100)
        );
        const viewedSnap2 = await getDocs(viewedQuery2);
        viewedCount = viewedSnap2.size;
        console.log(`📊 Viewed jobs (user_activities): ${viewedCount}`);
      } catch (err: any) {
        console.log('user_activities query failed:', err?.message);
        viewedCount = 0;
      }

      // Also try job_views collection as alternative
      try {
        const viewsQuery = query(
          collection(db, 'job_views'),
          where('userId', '==', userId),
          limit(100)
        );
        const viewsSnap = await getDocs(viewsQuery);
        const jobViewsCount = viewsSnap.size;
        console.log(`📊 Viewed jobs (job_views): ${jobViewsCount}`);
        viewedCount = Math.max(viewedCount, jobViewsCount);
      } catch (err: any) {
        // Ignore if collection doesn't exist
        console.log('job_views query failed (normal if collection not exists):', err?.message);
      }

      console.log(`📊 Final stats: totalApplied=${total}, totalViewed=${viewedCount}, totalSaved=${savedCount}`);

      setStats({
        totalApplied: total,
        pending,
        accepted,
        rejected,
        successRate,
        totalViewed: viewedCount,
        totalSaved: savedCount,
      });

    } catch (err) {
      console.error('Error fetching tracker data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return '#10b981';
      case 'rejected': return '#ef4444';
      default: return '#f59e0b';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted': return 'checkmark-circle';
      case 'rejected': return 'close-circle';
      default: return 'time';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'accepted': return 'Đã chấp nhận';
      case 'rejected': return 'Đã từ chối';
      default: return 'Đang chờ';
    }
  };

  const renderStatsTab = () => (
    <ScrollView 
      style={styles.tabContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <Animated.View entering={FadeInDown.delay(100)} style={styles.statCard}>
          <View style={[styles.statIconContainer, { backgroundColor: '#eff6ff' }]}>
            <Ionicons name="briefcase" size={24} color="#3b82f6" />
          </View>
          <Text style={styles.statValue}>{stats.totalApplied}</Text>
          <Text style={styles.statLabel}>Đã ứng tuyển</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200)} style={styles.statCard}>
          <View style={[styles.statIconContainer, { backgroundColor: '#f0fdf4' }]}>
            <Ionicons name="checkmark-circle" size={24} color="#10b981" />
          </View>
          <Text style={styles.statValue}>{stats.accepted}</Text>
          <Text style={styles.statLabel}>Được chấp nhận</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300)} style={styles.statCard}>
          <View style={[styles.statIconContainer, { backgroundColor: '#fef2f2' }]}>
            <Ionicons name="close-circle" size={24} color="#ef4444" />
          </View>
          <Text style={styles.statValue}>{stats.rejected}</Text>
          <Text style={styles.statLabel}>Bị từ chối</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400)} style={styles.statCard}>
          <View style={[styles.statIconContainer, { backgroundColor: '#fffbeb' }]}>
            <Ionicons name="time" size={24} color="#f59e0b" />
          </View>
          <Text style={styles.statValue}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Đang chờ</Text>
        </Animated.View>
      </View>

      {/* Success Rate */}
      <Animated.View entering={FadeInDown.delay(500)} style={styles.successRateCard}>
        <Text style={styles.successRateTitle}>Tỷ lệ thành công</Text>
        <View style={styles.progressBarContainer}>
          <View 
            style={[
              styles.progressBar, 
              { width: `${stats.successRate}%`, backgroundColor: stats.successRate > 50 ? '#10b981' : '#f59e0b' }
            ]} 
          />
        </View>
        <Text style={styles.successRateValue}>{stats.successRate}%</Text>
        <Text style={styles.successRateSubtext}>
          {stats.accepted} thành công / {stats.totalApplied} ứng tuyển
        </Text>
      </Animated.View>

      {/* Activity Stats */}
      <Animated.View entering={FadeInDown.delay(600)} style={styles.activityCard}>
        <Text style={styles.activityTitle}>Hoạt động của bạn</Text>
        
        <View style={styles.activityRow}>
          <Ionicons name="eye-outline" size={20} color="#64748b" />
          <Text style={styles.activityLabel}>Đã xem (từ nguồn ngoài)</Text>
          <Text style={styles.activityValue}>{stats.totalViewed}</Text>
        </View>

        <View style={styles.activityRow}>
          <Ionicons name="heart-outline" size={20} color="#64748b" />
          <Text style={styles.activityLabel}>Đã lưu</Text>
          <Text style={styles.activityValue}>{stats.totalSaved}</Text>
        </View>

        <View style={styles.activityRow}>
          <Ionicons name="paper-plane-outline" size={20} color="#64748b" />
          <Text style={styles.activityLabel}>Đã ứng tuyển</Text>
          <Text style={styles.activityValue}>{stats.totalApplied}</Text>
        </View>
      </Animated.View>
    </ScrollView>
  );

  const renderAppliedTab = () => (
    <ScrollView 
      style={styles.tabContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {applications.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="briefcase-outline" size={48} color="#94a3b8" />
          <Text style={styles.emptyText}>Chưa có đơn ứng tuyển nào</Text>
        </View>
      ) : (
        applications.map((app, index) => (
          <Animated.View key={app.id} entering={FadeInDown.delay(index * 50)}>
            <TouchableOpacity
              style={styles.applicationCard}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({
                  pathname: '/(shared)/jobDescription',
                  params: { 
                    jobId: app.jobId,
                    applicationStatus: app.status,
                    applicationId: app.id,
                    from: '/(candidate)/applicationTracker'
                  }
                });
              }}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.jobTitle} numberOfLines={2}>{app.jobTitle}</Text>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(app.status)}20` }]}>
                  <Ionicons name={getStatusIcon(app.status)} size={14} color={getStatusColor(app.status)} />
                  <Text style={[styles.statusText, { color: getStatusColor(app.status) }]}>
                    {getStatusLabel(app.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                  <Ionicons name="business-outline" size={14} color="#64748b" />
                  <Text style={styles.infoText}>{app.companyName}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Ionicons name="calendar-outline" size={14} color="#64748b" />
                  <Text style={styles.infoText}>
                    Ứng tuyển: {app.appliedAt.toLocaleDateString('vi-VN')}
                  </Text>
                </View>

                {app.jobSource && (
                  <View style={styles.sourceBadge}>
                    <Text style={styles.sourceText}>
                      {app.jobSource === 'crawled' ? '📱 viecoi.vn' : 
                       app.jobSource === 'quick-post' ? '⚡ Quick Post' : 
                       app.jobSource === 'featured' ? '⭐ Nổi bật' : '🏢 Nội bộ'}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </Animated.View>
        ))
      )}
    </ScrollView>
  );

  const renderViewedTab = () => (
    <ScrollView 
      style={styles.tabContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {viewedJobs.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="eye-outline" size={48} color="#94a3b8" />
          <Text style={styles.emptyText}>Chưa xem công việc nào từ nguồn ngoài</Text>
        </View>
      ) : (
        viewedJobs.map((job, index) => (
          <Animated.View key={`${job.jobId}-${index}`} entering={FadeInDown.delay(index * 50)}>
            <View style={styles.viewedCard}>
              <View style={styles.viewedHeader}>
                <Ionicons name="eye" size={20} color="#3b82f6" />
                <Text style={styles.viewedTitle} numberOfLines={2}>{job.jobTitle}</Text>
              </View>
              
              <View style={styles.viewedBody}>
                <Text style={styles.viewedSource}>📱 {job.source}</Text>
                <Text style={styles.viewedTime}>
                  {job.viewedAt.toLocaleDateString('vi-VN')} {job.viewedAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          </Animated.View>
        ))
      )}
    </ScrollView>
  );

  const renderSavedTab = () => (
    <ScrollView 
      style={styles.tabContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {savedJobs.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="heart-outline" size={48} color="#94a3b8" />
          <Text style={styles.emptyText}>Chưa có công việc đã lưu</Text>
        </View>
      ) : (
        savedJobs.map((job, index) => (
          <Animated.View key={job.id} entering={FadeInDown.delay(index * 50)}>
            <TouchableOpacity
              style={[
                styles.savedCard,
                (job._deleted || job._error) && { opacity: 0.6, borderLeftWidth: 3, borderLeftColor: '#f59e0b' }
              ]}
              disabled={job._deleted || job._error}
              onPress={() => {
                if (!job._deleted && !job._error) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({ pathname: '/(shared)/jobDescription', params: { jobId: job.jobId, from: '/(candidate)/applicationTracker' } });
                }
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {(job._deleted || job._error) && (
                  <Ionicons name="warning" size={16} color="#f59e0b" />
                )}
                <Text 
                  style={[
                    styles.savedTitle, 
                    (job._deleted || job._error) && { color: '#9ca3af' }
                  ]} 
                  numberOfLines={2}
                >
                  {job.title}
                </Text>
              </View>
              <Text style={[
                styles.savedCompany,
                (job._deleted || job._error) && { color: '#9ca3af' }
              ]}>
                {job.company_name || 'Ẩn danh'}
              </Text>
              <Text style={styles.savedTime}>
                Lưu: {job.savedAt?.toLocaleDateString?.('vi-VN') || 'Không rõ'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        ))
      )}
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Theo dõi ứng tuyển</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'stats' && styles.tabActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('stats');
          }}
        >
          <Ionicons name="stats-chart" size={20} color={activeTab === 'stats' ? '#4A80F0' : '#94a3b8'} />
          <Text style={[styles.tabText, activeTab === 'stats' && styles.tabTextActive]}>
            Thống kê
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'applied' && styles.tabActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('applied');
          }}
        >
          <Ionicons name="paper-plane" size={20} color={activeTab === 'applied' ? '#4A80F0' : '#94a3b8'} />
          <Text style={[styles.tabText, activeTab === 'applied' && styles.tabTextActive]}>
            Đã ứng tuyển
          </Text>
          {stats.totalApplied > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{stats.totalApplied}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'viewed' && styles.tabActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('viewed');
          }}
        >
          <Ionicons name="eye" size={20} color={activeTab === 'viewed' ? '#4A80F0' : '#94a3b8'} />
          <Text style={[styles.tabText, activeTab === 'viewed' && styles.tabTextActive]}>
            Đã xem
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'saved' && styles.tabActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('saved');
          }}
        >
          <Ionicons name="heart" size={20} color={activeTab === 'saved' ? '#4A80F0' : '#94a3b8'} />
          <Text style={[styles.tabText, activeTab === 'saved' && styles.tabTextActive]}>
            Đã lưu
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A80F0" />
          <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
        </View>
      ) : (
        <>
          {activeTab === 'stats' && renderStatsTab()}
          {activeTab === 'applied' && renderAppliedTab()}
          {activeTab === 'viewed' && renderViewedTab()}
          {activeTab === 'saved' && renderSavedTab()}
        </>
      )}
    </SafeAreaView>
  );
};

export default ApplicationTracker;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9FB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#4A80F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#4A80F0',
  },
  tabText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#4A80F0',
  },
  tabBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748b',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
  successRateCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  successRateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  successRateValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#10b981',
    marginBottom: 4,
  },
  successRateSubtext: {
    fontSize: 13,
    color: '#64748b',
  },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  activityLabel: {
    flex: 1,
    fontSize: 14,
    color: '#64748b',
  },
  activityValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  applicationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  jobTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginRight: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardBody: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#64748b',
  },
  sourceBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  sourceText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 12,
  },
  viewedCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  viewedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  viewedTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  viewedBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewedSource: {
    fontSize: 12,
    color: '#64748b',
  },
  viewedTime: {
    fontSize: 11,
    color: '#94a3b8',
  },
  savedCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  savedTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
  },
  savedCompany: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
  },
  savedTime: {
    fontSize: 11,
    color: '#94a3b8',
  },
});
