// app/(employer)/myJobs.tsx
// Refactored: Sử dụng jobApiService thay vì Firestore trực tiếp
import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, FlatList, TouchableOpacity, Image, 
  StyleSheet, RefreshControl, Alert, ActivityIndicator 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { jobApiService } from '@/services/jobApi.service';

export default function MyJobs() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  // ✅ Helper: Chuẩn hoá text cho jobTypes / jobCategories
  const textify = (val: any, kind: 'type' | 'category') => {
    if (!val) return '—';
    if (typeof val === 'string') return val; // fallback khi còn dữ liệu cũ
    if (kind === 'type') return val.type_name ?? '—';
    if (kind === 'category') return val.category_name ?? '—';
    return '—';
  };

  /**
   * Fetch jobs từ API
   * Flow: API getMyJobs → Update state
   */
  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      
      // ✅ Lấy jobs từ API
      const myJobs = await jobApiService.getMyJobs();
      setJobs(myJobs);
    } catch (error: any) {
      console.error('❌ Fetch jobs error:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách công việc. Vui lòng thử lại.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  /**
   * Xóa job qua API
   */
  const handleDelete = async (id: string) => {
    Alert.alert(
      'Xác nhận xóa',
      'Bạn có chắc muốn xóa công việc này không?',
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Xóa', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await jobApiService.deleteJob(id);
              setJobs(prev => prev.filter(job => job.id !== id));
              Alert.alert('✅ Đã xóa công việc');
            } catch (err: any) {
              console.error('❌ Delete job error:', err);
              Alert.alert('Lỗi', 'Không thể xóa công việc. Vui lòng thử lại.');
            }
          } 
        }
      ]
    );
  };

  // Làm mới danh sách
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchJobs();
  }, [fetchJobs]);

  // ✅ Dùng helper textify để tránh crash object
  const renderJob = ({ item }: any) => {
    // Convert created_at từ Date/string/timestamp về Date object
    const createdDate = item.created_at || item.createdAt
      ? (typeof (item.created_at || item.createdAt) === 'string' 
          ? new Date(item.created_at || item.createdAt) 
          : (item.created_at || item.createdAt) instanceof Date 
            ? (item.created_at || item.createdAt)
            : new Date(item.created_at || item.createdAt))
      : null;

    // Handle salary (có thể là number hoặc object với min/max)
    const salaryText = item.salary 
      ? (typeof item.salary === 'number' 
          ? item.salary.toLocaleString('vi-VN') + ' đ/tháng'
          : item.salary.min && item.salary.max
            ? `${item.salary.min.toLocaleString('vi-VN')} - ${item.salary.max.toLocaleString('vi-VN')} ${item.salary.currency || 'đ'}/tháng`
            : '—')
      : '—';

    return (
      <TouchableOpacity 
        style={styles.card} 
        onPress={() => router.push({ pathname: '/(shared)/jobDescription', params: { jobId: item.id || item.$id } })}
        activeOpacity={0.8}
      >
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.image} />
        ) : (
          <View style={[styles.image, { backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' }]}>
            <Ionicons name="briefcase-outline" size={30} color="#999" />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.salary}>{salaryText}</Text>

          {/* ✅ Fix crash ở đây */}
          <Text style={styles.category}>
            Danh mục: {textify(item.jobCategories, 'category')}
          </Text>
          <Text style={styles.category}>
            Loại: {textify(item.jobTypes, 'type')}
          </Text>

          {createdDate && (
            <Text style={styles.date}>
              Đăng ngày: {createdDate.toLocaleDateString('vi-VN')}
            </Text>
          )}
        </View>

        <TouchableOpacity onPress={() => handleDelete(item.id || item.$id)} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={22} color="#ff4444" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Công việc của tôi</Text>
        <TouchableOpacity onPress={() => router.push('/(shared)/addJob' as any)}>
          <Ionicons name="add-circle-outline" size={28} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      ) : jobs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="file-tray-outline" size={48} color="#aaa" />
          <Text style={styles.emptyText}>Chưa có công việc nào được đăng</Text>
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id || item.$id} // ✅ fallback key
          renderItem={renderJob}
          contentContainerStyle={{ padding: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderColor: '#eee',
    backgroundColor: '#fff',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#333' },

  card: {
    flexDirection: 'row', backgroundColor: '#fafafa', borderRadius: 10,
    padding: 10, marginBottom: 12, elevation: 2, alignItems: 'center',
  },
  image: { width: 70, height: 70, borderRadius: 8, marginRight: 12 },
  title: { fontSize: 16, fontWeight: '600', color: '#222' },
  salary: { fontSize: 14, color: '#4CAF50', marginVertical: 2 },
  category: { fontSize: 13, color: '#555' },
  date: { fontSize: 12, color: '#999', marginTop: 4 },
  deleteBtn: { padding: 6 },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { marginTop: 8, color: '#777', fontSize: 15 },
});
