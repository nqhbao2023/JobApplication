import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '@/config/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { LoadingSpinner } from '@/components/base/LoadingSpinner';
import { StatCard } from '@/components/admin/StatCard';
import { useMultipleMetrics } from '@/hooks/useAnalyticsMetrics';

/**
 * Analytics Screen - Enhanced Version
 * Hiển thị thống kê với growth metrics và comparison
 */

const AnalyticsScreen = () => {
  // Load metrics với comparison (7 ngày gần nhất vs 7 ngày trước đó)
  const { metricsMap, loading } = useMultipleMetrics(
    ['users', 'jobs', 'companies', 'job_categories'],
    7
  );

  if (loading) return <LoadingSpinner text="Đang tải thống kê..." />;

  const usersMetrics = metricsMap['users'] || { total: 0, growth: 0, trend: 'stable', current: 0 };
  const jobsMetrics = metricsMap['jobs'] || { total: 0, growth: 0, trend: 'stable', current: 0 };
  const companiesMetrics = metricsMap['companies'] || { total: 0, growth: 0, trend: 'stable', current: 0 };
  const categoriesMetrics = metricsMap['job_categories'] || { total: 0, growth: 0, trend: 'stable', current: 0 };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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

      {/* Stats Grid với Growth Metrics */}
      <View style={styles.statsGrid}>
        <StatCard 
          title="Users" 
          value={usersMetrics.total} 
          icon="people" 
          color="#3b82f6"
          growth={usersMetrics.growth}
          trend={usersMetrics.trend}
          subtitle={`${usersMetrics.current} tuần này`}
        />
        <StatCard 
          title="Jobs" 
          value={jobsMetrics.total} 
          icon="briefcase" 
          color="#10b981"
          growth={jobsMetrics.growth}
          trend={jobsMetrics.trend}
          subtitle={`${jobsMetrics.current} tuần này`}
        />
        <StatCard 
          title="Companies" 
          value={companiesMetrics.total} 
          icon="business" 
          color="#f59e0b"
          growth={companiesMetrics.growth}
          trend={companiesMetrics.trend}
          subtitle={`${companiesMetrics.current} tuần này`}
        />
        <StatCard 
          title="Categories" 
          value={categoriesMetrics.total} 
          icon="apps" 
          color="#8b5cf6"
          growth={categoriesMetrics.growth}
          trend={categoriesMetrics.trend}
          subtitle={`${categoriesMetrics.current} tuần này`}
        />
      </View>

      {/* Growth Summary */}
      <View style={styles.summaryBox}>
        <View style={styles.summaryHeader}>
          <Ionicons name="trending-up" size={20} color="#10b981" />
          <Text style={styles.summaryTitle}>Tăng trưởng tuần này</Text>
        </View>
        
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Users</Text>
            <Text style={[
              styles.summaryValue,
              { color: usersMetrics.trend === 'up' ? '#10b981' : usersMetrics.trend === 'down' ? '#ef4444' : '#64748b' }
            ]}>
              {usersMetrics.growth > 0 ? '+' : ''}{usersMetrics.growth}%
            </Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Jobs</Text>
            <Text style={[
              styles.summaryValue,
              { color: jobsMetrics.trend === 'up' ? '#10b981' : jobsMetrics.trend === 'down' ? '#ef4444' : '#64748b' }
            ]}>
              {jobsMetrics.growth > 0 ? '+' : ''}{jobsMetrics.growth}%
            </Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Companies</Text>
            <Text style={[
              styles.summaryValue,
              { color: companiesMetrics.trend === 'up' ? '#10b981' : companiesMetrics.trend === 'down' ? '#ef4444' : '#64748b' }
            ]}>
              {companiesMetrics.growth > 0 ? '+' : ''}{companiesMetrics.growth}%
            </Text>
          </View>
        </View>
      </View>

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={24} color="#3b82f6" />
        <Text style={styles.infoText}>
          Dữ liệu được cập nhật theo thời gian thực từ Firestore. 
          Growth rate được tính dựa trên so sánh với cùng kỳ trước.
        </Text>
      </View>
    </ScrollView>
  );
};

export default AnalyticsScreen;


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 20 },
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  summaryBox: {
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
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  summaryItem: {
    flex: 1,
    minWidth: 100,
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 20,
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
