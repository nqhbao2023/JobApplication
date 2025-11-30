import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '@/config/firebase';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { LoadingSpinner } from '@/components/base/LoadingSpinner';
import { StatCard } from '@/components/admin/StatCard';
import { useMultipleMetrics } from '@/hooks/useAnalyticsMetrics';

/**
 * Analytics Screen - Enhanced Version
 * Hiển thị thống kê với growth metrics và comparison
 */

interface DetailedStats {
  activeJobs: number;
  pendingJobs: number;
  closedJobs: number;
  totalApplications: number;
  pendingApplications: number;
  acceptedApplications: number;
  rejectedApplications: number;
  candidateCount: number;
  employerCount: number;
  adminCount: number;
  recentJobsToday: number;
  recentUsersToday: number;
}

const AnalyticsScreen = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [detailedStats, setDetailedStats] = useState<DetailedStats>({
    activeJobs: 0,
    pendingJobs: 0,
    closedJobs: 0,
    totalApplications: 0,
    pendingApplications: 0,
    acceptedApplications: 0,
    rejectedApplications: 0,
    candidateCount: 0,
    employerCount: 0,
    adminCount: 0,
    recentJobsToday: 0,
    recentUsersToday: 0,
  });

  // Load metrics với comparison (7 ngày gần nhất vs 7 ngày trước đó)
  const { metricsMap, loading, reload } = useMultipleMetrics(
    ['users', 'jobs', 'companies', 'applications'],
    7
  );

  useEffect(() => {
    loadDetailedStats();
  }, []);

  const loadDetailedStats = async () => {
    try {
      // Load jobs by status
      const jobsSnap = await getDocs(collection(db, 'jobs'));
      let activeJobs = 0, pendingJobs = 0, closedJobs = 0;
      jobsSnap.docs.forEach(doc => {
        const status = doc.data().status;
        if (status === 'active') activeJobs++;
        else if (status === 'pending') pendingJobs++;
        else if (status === 'closed' || status === 'inactive') closedJobs++;
        else activeJobs++; // Default to active
      });

      // Load applications by status
      const appsSnap = await getDocs(collection(db, 'applications'));
      let pendingApps = 0, acceptedApps = 0, rejectedApps = 0;
      appsSnap.docs.forEach(doc => {
        const status = doc.data().status;
        if (status === 'pending') pendingApps++;
        else if (status === 'accepted') acceptedApps++;
        else if (status === 'rejected') rejectedApps++;
        else pendingApps++; // Default to pending
      });

      // Load users by role
      const usersSnap = await getDocs(collection(db, 'users'));
      let candidates = 0, employers = 0, admins = 0;
      usersSnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.isAdmin) admins++;
        else if (data.role === 'employer') employers++;
        else candidates++;
      });

      // Count today's new items
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let jobsToday = 0, usersToday = 0;
      jobsSnap.docs.forEach(doc => {
        const createdAt = doc.data().created_at?.toDate?.() || new Date(doc.data().created_at);
        if (createdAt >= today) jobsToday++;
      });
      usersSnap.docs.forEach(doc => {
        const createdAt = doc.data().created_at?.toDate?.() || new Date(doc.data().created_at);
        if (createdAt >= today) usersToday++;
      });

      setDetailedStats({
        activeJobs,
        pendingJobs,
        closedJobs,
        totalApplications: appsSnap.size,
        pendingApplications: pendingApps,
        acceptedApplications: acceptedApps,
        rejectedApplications: rejectedApps,
        candidateCount: candidates,
        employerCount: employers,
        adminCount: admins,
        recentJobsToday: jobsToday,
        recentUsersToday: usersToday,
      });
    } catch (error) {
      console.error('Error loading detailed stats:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([reload(), loadDetailedStats()]);
    setRefreshing(false);
  };

  if (loading) return <LoadingSpinner text="Đang tải thống kê..." />;

  const usersMetrics = metricsMap['users'] || { total: 0, growth: 0, trend: 'stable', current: 0 };
  const jobsMetrics = metricsMap['jobs'] || { total: 0, growth: 0, trend: 'stable', current: 0 };
  const companiesMetrics = metricsMap['companies'] || { total: 0, growth: 0, trend: 'stable', current: 0 };
  const appsMetrics = metricsMap['applications'] || { total: 0, growth: 0, trend: 'stable', current: 0 };

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.titleRow}>
        <Ionicons name="stats-chart" size={24} color="#1a1a1a" />
        <Text style={styles.sectionTitle}>Tổng quan hệ thống</Text>
      </View>

      {/* Period Info */}
      <View style={styles.periodInfo}>
        <Ionicons name="calendar-outline" size={16} color="#64748b" />
        <Text style={styles.periodText}>
          So sánh 7 ngày gần nhất với 7 ngày trước đó
        </Text>
      </View>

      {/* Today's Stats */}
      <View style={styles.todayBox}>
        <Text style={styles.todayTitle}>📅 Hôm nay</Text>
        <View style={styles.todayRow}>
          <View style={styles.todayItem}>
            <Text style={styles.todayValue}>{detailedStats.recentUsersToday}</Text>
            <Text style={styles.todayLabel}>User mới</Text>
          </View>
          <View style={styles.todayDivider} />
          <View style={styles.todayItem}>
            <Text style={styles.todayValue}>{detailedStats.recentJobsToday}</Text>
            <Text style={styles.todayLabel}>Job mới</Text>
          </View>
          <View style={styles.todayDivider} />
          <View style={styles.todayItem}>
            <Text style={styles.todayValue}>{detailedStats.pendingJobs}</Text>
            <Text style={styles.todayLabel}>Chờ duyệt</Text>
          </View>
        </View>
      </View>

      {/* Main Stats Grid */}
      <Text style={styles.subTitle}>📊 Số liệu tổng hợp</Text>
      <View style={styles.statsGrid}>
        <StatCard 
          title="Users" 
          value={usersMetrics.total} 
          icon="people" 
          color="#3b82f6"
          growth={usersMetrics.growth}
          trend={usersMetrics.trend}
          subtitle={`+${usersMetrics.current} tuần này`}
        />
        <StatCard 
          title="Jobs" 
          value={jobsMetrics.total} 
          icon="briefcase" 
          color="#10b981"
          growth={jobsMetrics.growth}
          trend={jobsMetrics.trend}
          subtitle={`+${jobsMetrics.current} tuần này`}
        />
        <StatCard 
          title="Companies" 
          value={companiesMetrics.total} 
          icon="business" 
          color="#f59e0b"
          growth={companiesMetrics.growth}
          trend={companiesMetrics.trend}
          subtitle={`+${companiesMetrics.current} tuần này`}
        />
        <StatCard 
          title="Applications" 
          value={appsMetrics.total} 
          icon="document-text" 
          color="#8b5cf6"
          growth={appsMetrics.growth}
          trend={appsMetrics.trend}
          subtitle={`+${appsMetrics.current} tuần này`}
        />
      </View>

      {/* Jobs Breakdown */}
      <Text style={styles.subTitle}>💼 Phân loại Jobs</Text>
      <View style={styles.breakdownBox}>
        <View style={styles.breakdownRow}>
          <View style={[styles.breakdownItem, { backgroundColor: '#ECFDF5' }]}>
            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            <Text style={styles.breakdownValue}>{detailedStats.activeJobs}</Text>
            <Text style={styles.breakdownLabel}>Đang tuyển</Text>
          </View>
          <View style={[styles.breakdownItem, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="time" size={24} color="#F59E0B" />
            <Text style={styles.breakdownValue}>{detailedStats.pendingJobs}</Text>
            <Text style={styles.breakdownLabel}>Chờ duyệt</Text>
          </View>
          <View style={[styles.breakdownItem, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="close-circle" size={24} color="#EF4444" />
            <Text style={styles.breakdownValue}>{detailedStats.closedJobs}</Text>
            <Text style={styles.breakdownLabel}>Đã đóng</Text>
          </View>
        </View>
      </View>

      {/* Applications Breakdown */}
      <Text style={styles.subTitle}>📋 Phân loại Applications</Text>
      <View style={styles.breakdownBox}>
        <View style={styles.breakdownRow}>
          <View style={[styles.breakdownItem, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="hourglass" size={24} color="#F59E0B" />
            <Text style={styles.breakdownValue}>{detailedStats.pendingApplications}</Text>
            <Text style={styles.breakdownLabel}>Chờ xử lý</Text>
          </View>
          <View style={[styles.breakdownItem, { backgroundColor: '#ECFDF5' }]}>
            <Ionicons name="checkmark-done" size={24} color="#10B981" />
            <Text style={styles.breakdownValue}>{detailedStats.acceptedApplications}</Text>
            <Text style={styles.breakdownLabel}>Đã nhận</Text>
          </View>
          <View style={[styles.breakdownItem, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="close" size={24} color="#EF4444" />
            <Text style={styles.breakdownValue}>{detailedStats.rejectedApplications}</Text>
            <Text style={styles.breakdownLabel}>Từ chối</Text>
          </View>
        </View>
      </View>

      {/* Users Breakdown */}
      <Text style={styles.subTitle}>👥 Phân loại Users</Text>
      <View style={styles.breakdownBox}>
        <View style={styles.breakdownRow}>
          <View style={[styles.breakdownItem, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="person" size={24} color="#3B82F6" />
            <Text style={styles.breakdownValue}>{detailedStats.candidateCount}</Text>
            <Text style={styles.breakdownLabel}>Ứng viên</Text>
          </View>
          <View style={[styles.breakdownItem, { backgroundColor: '#F3E8FF' }]}>
            <Ionicons name="business" size={24} color="#8B5CF6" />
            <Text style={styles.breakdownValue}>{detailedStats.employerCount}</Text>
            <Text style={styles.breakdownLabel}>Nhà tuyển dụng</Text>
          </View>
          <View style={[styles.breakdownItem, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="shield-checkmark" size={24} color="#EF4444" />
            <Text style={styles.breakdownValue}>{detailedStats.adminCount}</Text>
            <Text style={styles.breakdownLabel}>Admin</Text>
          </View>
        </View>
      </View>

      {/* Growth Summary */}
      <Text style={styles.subTitle}>📈 Tăng trưởng tuần này</Text>
      <View style={styles.growthBox}>
        <View style={styles.growthGrid}>
          <View style={styles.growthItem}>
            <Text style={styles.growthLabel}>Users</Text>
            <Text style={[
              styles.growthValue,
              { color: usersMetrics.trend === 'up' ? '#10b981' : usersMetrics.trend === 'down' ? '#ef4444' : '#64748b' }
            ]}>
              {usersMetrics.growth > 0 ? '+' : ''}{usersMetrics.growth}%
            </Text>
          </View>
          
          <View style={styles.growthItem}>
            <Text style={styles.growthLabel}>Jobs</Text>
            <Text style={[
              styles.growthValue,
              { color: jobsMetrics.trend === 'up' ? '#10b981' : jobsMetrics.trend === 'down' ? '#ef4444' : '#64748b' }
            ]}>
              {jobsMetrics.growth > 0 ? '+' : ''}{jobsMetrics.growth}%
            </Text>
          </View>
          
          <View style={styles.growthItem}>
            <Text style={styles.growthLabel}>Companies</Text>
            <Text style={[
              styles.growthValue,
              { color: companiesMetrics.trend === 'up' ? '#10b981' : companiesMetrics.trend === 'down' ? '#ef4444' : '#64748b' }
            ]}>
              {companiesMetrics.growth > 0 ? '+' : ''}{companiesMetrics.growth}%
            </Text>
          </View>

          <View style={styles.growthItem}>
            <Text style={styles.growthLabel}>Applications</Text>
            <Text style={[
              styles.growthValue,
              { color: appsMetrics.trend === 'up' ? '#10b981' : appsMetrics.trend === 'down' ? '#ef4444' : '#64748b' }
            ]}>
              {appsMetrics.growth > 0 ? '+' : ''}{appsMetrics.growth}%
            </Text>
          </View>
        </View>
      </View>

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={24} color="#3b82f6" />
        <Text style={styles.infoText}>
          Dữ liệu được cập nhật theo thời gian thực từ Firestore. 
          Kéo xuống để làm mới dữ liệu.
        </Text>
      </View>
    </ScrollView>
  );
};

export default AnalyticsScreen;


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 20, paddingBottom: 40 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  subTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: 24,
    marginBottom: 12,
  },
  periodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 8,
  },
  periodText: {
    fontSize: 13,
    color: '#64748b',
  },
  todayBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#4A80F0',
  },
  todayTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  todayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  todayItem: {
    alignItems: 'center',
    flex: 1,
  },
  todayValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#4A80F0',
  },
  todayLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  todayDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E2E8F0',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 8,
  },
  breakdownBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  breakdownRow: {
    flexDirection: 'row',
    gap: 12,
  },
  breakdownItem: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  breakdownValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: 8,
  },
  breakdownLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  growthBox: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  growthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  growthItem: {
    flex: 1,
    minWidth: 70,
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  growthLabel: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 8,
  },
  growthValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
});
