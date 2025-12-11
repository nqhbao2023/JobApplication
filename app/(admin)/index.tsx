import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { auth } from '@/config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DashboardCard } from '@/components/admin/DashboardCard';
import { LoadingSpinner } from '@/components/base/LoadingSpinner';
import { useMultipleMetrics, usePendingCounts } from '@/hooks/useAnalyticsMetrics';

type AdminCard = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  color: string;
  collectionKey?: string; // Key để map với metrics
};

const AdminDashboard = () => {
  // Load metrics cho các collections
  const { metricsMap, loading: metricsLoading, reload: reloadMetrics } = useMultipleMetrics(
    ['users', 'jobs', 'companies', 'job_categories'],
    7 // So sánh với 7 ngày trước
  );

  // Load pending counts
  const { counts: pendingCounts, loading: countsLoading, reload: reloadCounts } = usePendingCounts();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([reloadMetrics(), reloadCounts()]);
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
    } finally {
      setRefreshing(false);
    }
  }, [reloadMetrics, reloadCounts]);

  const adminCards: AdminCard[] = [
    { 
      title: 'Users', 
      icon: 'people-outline', 
      route: '/(admin)/users', 
      color: '#3b82f6',
      collectionKey: 'users' 
    },
    { 
      title: 'Quản lý Jobs', 
      icon: 'briefcase-outline', 
      route: '/(admin)/jobs', 
      color: '#10b981',
      collectionKey: 'jobs'
    },
    { 
      title: 'Duyệt Quick Posts', 
      icon: 'flash-outline', 
      route: '/(admin)/quick-posts-pending', 
      color: '#f97316' 
    },
    { 
      title: 'Companies', 
      icon: 'business-outline', 
      route: '/(admin)/companies', 
      color: '#f59e0b',
      collectionKey: 'companies'
    },
    { 
      title: 'Job Types', 
      icon: 'layers-outline', 
      route: '/(admin)/job-types', 
      color: '#8b5cf6' 
    },
    { 
      title: 'Categories', 
      icon: 'apps-outline', 
      route: '/(admin)/job-categories', 
      color: '#ec4899',
      collectionKey: 'job_categories'
    },
    { 
      title: 'Analytics', 
      icon: 'bar-chart-outline', 
      route: '/(admin)/analytics', 
      color: '#06b6d4' 
    },
  ];

  const handleLogout = async () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          try {
            await AsyncStorage.removeItem('userRole');
            await auth.signOut();
            router.replace('/(auth)/login');
          } catch (error) {
            console.error('Logout error:', error);
            Alert.alert('Lỗi', 'Không thể đăng xuất');
          }
        },
      },
    ]);
  };

  // Hiển thị loading khi đang tải dữ liệu
  if (metricsLoading || countsLoading) {
    return <LoadingSpinner text="Đang tải dashboard..." />;
  }

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <View>
          <View style={styles.welcomeRow}>
            <Ionicons name="hand-left" size={24} color="#1a1a1a" />
            <Text style={styles.welcomeText}>Xin chào Admin</Text>
          </View>          
          <Text style={styles.subtitle}>Quản lý hệ thống Job4S</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* Grid Dashboard Cards với Metrics */}
      <View style={styles.grid}>
        {adminCards.map((card) => {
          // Lấy metrics nếu có collectionKey
          const metrics = card.collectionKey ? metricsMap[card.collectionKey] : null;
          
          // Thêm subtitle cho Quick Posts (fix: match đúng tên card)
          let subtitle = undefined;
          if (card.title === 'Duyệt Quick Posts' && pendingCounts.pendingQuickPosts > 0) {
            subtitle = `${pendingCounts.pendingQuickPosts} chờ duyệt`;
          } else if (metrics && metrics.current > 0) {
            subtitle = `+${metrics.current} tuần này`;
          }

          return (
            <DashboardCard
              key={card.title}
              title={card.title}
              icon={card.icon}
              color={card.color}
              onPress={() => router.push(card.route as any)}
              value={metrics?.total}
              subtitle={subtitle}
              trend={metrics?.trend}
              change={metrics?.growth}
            />
          );
        })}
      </View>

      {/* Pending Actions Section */}
      {(pendingCounts.pendingJobs > 0 || pendingCounts.pendingQuickPosts > 0) && (
        <View style={styles.pendingSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="notifications" size={20} color="#f97316" />
            <Text style={styles.sectionTitle}>Cần xử lý</Text>
          </View>

          {pendingCounts.pendingQuickPosts > 0 && (
            <TouchableOpacity
              style={styles.pendingCard}
              onPress={() => router.push('/(admin)/quick-posts-pending')}
            >
              <View style={styles.pendingLeft}>
                <Ionicons name="flash" size={24} color="#f97316" />
                <Text style={styles.pendingText}>
                  {pendingCounts.pendingQuickPosts} Quick Posts chờ duyệt
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#64748b" />
            </TouchableOpacity>
          )}

          {pendingCounts.pendingJobs > 0 && (
            <TouchableOpacity
              style={styles.pendingCard}
              onPress={() => router.push('/(admin)/jobs')}
            >
              <View style={styles.pendingLeft}>
                <Ionicons name="briefcase" size={24} color="#10b981" />
                <Text style={styles.pendingText}>
                  {pendingCounts.pendingJobs} Jobs chờ duyệt
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(admin)/users')}>
          <Ionicons name="people-outline" size={20} color="#007AFF" />
          <Text style={styles.actionText}>Quản lý Users</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(admin)/job-create')}>
          <Ionicons name="add-circle-outline" size={20} color="#007AFF" />
          <Text style={styles.actionText}>Thêm Job mới</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default AdminDashboard;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  subtitle: { fontSize: 15, color: '#64748b' },
  logoutBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  pendingSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f97316',
  },
  pendingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  pendingText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  quickActions: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 20,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    marginBottom: 12,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
});