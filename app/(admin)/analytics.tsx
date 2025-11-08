import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '@/config/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { LoadingSpinner } from '@/components/base/LoadingSpinner';
import { StatCard } from '@/components/admin/StatCard';

type Stats = {
  totalUsers: number;
  totalJobs: number;
  totalCompanies: number;
  totalCategories: number;
};

const AnalyticsScreen = () => {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalJobs: 0,
    totalCompanies: 0,
    totalCategories: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [usersSnap, jobsSnap, companiesSnap, categoriesSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'jobs')),
        getDocs(collection(db, 'companies')),
        getDocs(collection(db, 'job_categories')),
      ]);

      setStats({
        totalUsers: usersSnap.size,
        totalJobs: jobsSnap.size,
        totalCompanies: companiesSnap.size,
        totalCategories: categoriesSnap.size,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner text="Đang tải thống kê..." />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.titleRow}>
  <Ionicons name="stats-chart" size={24} color="#1a1a1a" />
  <Text style={styles.sectionTitle}>Tổng quan hệ thống</Text>
</View>

      <View style={styles.statsGrid}>
        <StatCard title="Users" value={stats.totalUsers} icon="people" color="#3b82f6" />
        <StatCard title="Jobs" value={stats.totalJobs} icon="briefcase" color="#10b981" />
        <StatCard title="Companies" value={stats.totalCompanies} icon="business" color="#f59e0b" />
        <StatCard title="Categories" value={stats.totalCategories} icon="apps" color="#8b5cf6" />
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={24} color="#3b82f6" />
        <Text style={styles.infoText}>
          Dữ liệu được cập nhật theo thời gian thực từ Firestore
        </Text>
      </View>
    </ScrollView>
  );
};

export default AnalyticsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 20 },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
});