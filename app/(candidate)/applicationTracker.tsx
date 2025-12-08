/**
 * Application Tracker Screen
 * 
 * Theo dõi:
 * - Thống kê đơn ứng tuyển (pending, accepted, rejected)
 * - Tỷ lệ thành công
 * - Quick links đến các trang liên quan
 */

import React, { useState, useEffect, useCallback } from 'react';
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
import { DrawerMenuButton } from '@/components/candidate/DrawerMenu';
import { applicationApiService, Application } from '@/services/applicationApi.service';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface ApplicationStats {
  totalApplied: number;
  pending: number;
  accepted: number;
  rejected: number;
  reviewing: number;
  successRate: number;
  totalSaved: number;
}

const ApplicationTracker = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [stats, setStats] = useState<ApplicationStats>({
    totalApplied: 0,
    pending: 0,
    accepted: 0,
    rejected: 0,
    reviewing: 0,
    successRate: 0,
    totalSaved: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch applications using API service (same as appliedJob.tsx)
      const apps = await applicationApiService.getMyApplications();
      console.log(`📊 Fetched ${apps.length} applications via API`);
      
      // Count by status
      let pending = 0, accepted = 0, rejected = 0, reviewing = 0;
      
      apps.forEach((app: Application) => {
        const status = app.status || 'pending';
        if (status === 'pending' || status === 'draft') pending++;
        else if (status === 'accepted') accepted++;
        else if (status === 'rejected') rejected++;
        else if (status === 'reviewing') reviewing++;
      });

      const total = apps.length;
      const successRate = total > 0 ? Math.round((accepted / total) * 100) : 0;

      // Fetch saved jobs count from Firestore
      let savedCount = 0;
      const userId = auth.currentUser?.uid;
      if (userId) {
        try {
          const savedQuery = query(
            collection(db, 'saved_jobs'),
            where('userId', '==', userId)
          );
          const savedSnap = await getDocs(savedQuery);
          savedCount = savedSnap.size;
        } catch (err) {
          console.log('Error fetching saved count:', err);
        }
      }

      console.log(`📊 Stats: total=${total}, pending=${pending}, accepted=${accepted}, rejected=${rejected}, reviewing=${reviewing}, saved=${savedCount}`);

      setStats({
        totalApplied: total,
        pending,
        accepted,
        rejected,
        reviewing,
        successRate,
        totalSaved: savedCount,
      });

    } catch (err) {
      console.error('Error fetching tracker data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with DrawerMenu */}
      <View style={styles.header}>
        <DrawerMenuButton />
        <Text style={styles.headerTitle}>Theo dõi ứng tuyển</Text>
        <View style={{ width: 26 }} />
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A80F0" />
          <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
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
              <Text style={styles.statValue}>{stats.pending + stats.reviewing}</Text>
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
                  { 
                    width: `${Math.min(stats.successRate, 100)}%`, 
                    backgroundColor: stats.successRate > 50 ? '#10b981' : stats.successRate > 0 ? '#f59e0b' : '#e2e8f0' 
                  }
                ]} 
              />
            </View>
            <Text style={[styles.successRateValue, { color: stats.successRate > 50 ? '#10b981' : '#f59e0b' }]}>
              {stats.successRate}%
            </Text>
            <Text style={styles.successRateSubtext}>
              {stats.accepted} thành công / {stats.totalApplied} ứng tuyển
            </Text>
          </Animated.View>

          {/* Quick Navigation */}
          <Animated.View entering={FadeInDown.delay(600)} style={styles.quickNavCard}>
            <Text style={styles.quickNavTitle}>Truy cập nhanh</Text>
            
            <TouchableOpacity 
              style={styles.quickNavRow}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/(candidate)/appliedJob' as any);
              }}
            >
              <View style={styles.quickNavLeft}>
                <View style={[styles.quickNavIcon, { backgroundColor: '#eff6ff' }]}>
                  <Ionicons name="document-text" size={20} color="#3b82f6" />
                </View>
                <View>
                  <Text style={styles.quickNavLabel}>Hồ sơ ứng tuyển</Text>
                  <Text style={styles.quickNavSubtext}>Xem chi tiết các đơn đã nộp</Text>
                </View>
              </View>
              <View style={styles.quickNavBadge}>
                <Text style={styles.quickNavBadgeText}>{stats.totalApplied}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickNavRow}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/(candidate)/savedJobs' as any);
              }}
            >
              <View style={styles.quickNavLeft}>
                <View style={[styles.quickNavIcon, { backgroundColor: '#fef2f2' }]}>
                  <Ionicons name="heart" size={20} color="#ef4444" />
                </View>
                <View>
                  <Text style={styles.quickNavLabel}>Việc đã lưu</Text>
                  <Text style={styles.quickNavSubtext}>Công việc yêu thích của bạn</Text>
                </View>
              </View>
              <View style={[styles.quickNavBadge, { backgroundColor: '#fef2f2' }]}>
                <Text style={[styles.quickNavBadgeText, { color: '#ef4444' }]}>{stats.totalSaved}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.quickNavRow, { borderBottomWidth: 0 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/(candidate)/cvManagement' as any);
              }}
            >
              <View style={styles.quickNavLeft}>
                <View style={[styles.quickNavIcon, { backgroundColor: '#f0fdf4' }]}>
                  <Ionicons name="documents" size={20} color="#10b981" />
                </View>
                <View>
                  <Text style={styles.quickNavLabel}>Quản lý CV</Text>
                  <Text style={styles.quickNavSubtext}>Cập nhật hồ sơ của bạn</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </TouchableOpacity>
          </Animated.View>

          {/* Tips Card */}
          {stats.totalApplied === 0 && (
            <Animated.View entering={FadeInDown.delay(700)} style={styles.tipsCard}>
              <View style={styles.tipsHeader}>
                <Ionicons name="bulb" size={24} color="#f59e0b" />
                <Text style={styles.tipsTitle}>Mẹo tìm việc</Text>
              </View>
              <Text style={styles.tipsText}>
                • Cập nhật CV thường xuyên{'\n'}
                • Lưu các việc làm phù hợp{'\n'}
                • Ứng tuyển nhiều vị trí khác nhau{'\n'}
                • Theo dõi trạng thái đơn ứng tuyển
              </Text>
              <TouchableOpacity 
                style={styles.tipsButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/(candidate)' as any);
                }}
              >
                <Text style={styles.tipsButtonText}>Khám phá việc làm</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
            </Animated.View>
          )}

          <View style={{ height: 30 }} />
        </ScrollView>
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
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  content: {
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
    height: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    borderRadius: 5,
  },
  successRateValue: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  successRateSubtext: {
    fontSize: 13,
    color: '#64748b',
  },
  quickNavCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  quickNavTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  quickNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  quickNavLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  quickNavIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickNavLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  quickNavSubtext: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  quickNavBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  quickNavBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3b82f6',
  },
  tipsCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400e',
  },
  tipsText: {
    fontSize: 14,
    color: '#78350f',
    lineHeight: 22,
    marginBottom: 16,
  },
  tipsButton: {
    backgroundColor: '#f59e0b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  tipsButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});
