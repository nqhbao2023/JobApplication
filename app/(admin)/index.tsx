import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { auth } from '@/config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DashboardCard } from '@/components/admin/DashboardCard';

type AdminCard = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  color: string;
};

const AdminDashboard = () => {
  const adminCards: AdminCard[] = [
    { title: 'Users', icon: 'people-outline', route: '/(admin)/users', color: '#3b82f6' },
    { title: 'Jobs', icon: 'briefcase-outline', route: '/(admin)/jobs', color: '#10b981' },
    { title: 'Companies', icon: 'business-outline', route: '/(admin)/companies', color: '#f59e0b' },
    { title: 'Job_Types', icon: 'layers-outline', route: '/(admin)/job-types', color: '#8b5cf6' },
    { title: 'Categories', icon: 'apps-outline', route: '/(admin)/job-categories', color: '#ec4899' },
    { title: 'Analytics', icon: 'bar-chart-outline', route: '/(admin)/analytics', color: '#06b6d4' },
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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

      <View style={styles.grid}>
        {adminCards.map((card) => (
          <DashboardCard
            key={card.title}
            title={card.title}
            icon={card.icon}
            color={card.color}
            onPress={() => router.push(card.route as any)}
          />
        ))}
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(admin)/user-create')}>
          <Ionicons name="person-add-outline" size={20} color="#007AFF" />
          <Text style={styles.actionText}>Thêm User mới</Text>
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
  welcomeText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
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
    marginBottom: 32,
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
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
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
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
});