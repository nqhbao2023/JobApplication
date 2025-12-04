// app/(employer)/myJobs.tsx
// Refactored: Sử dụng jobApiService thay vì Firestore trực tiếp
import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, FlatList, TouchableOpacity, Image, 
  StyleSheet, RefreshControl, Alert, ActivityIndicator 
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { SCROLL_BOTTOM_PADDING } from '@/utils/layout.utils';
import { formatSalary } from '@/utils/salary.utils';

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

  // ✅ Load jobs khi component mount
  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // ✅ Chỉ fetch khi cần (không fetch lại khi back từ jobDescription)
  useFocusEffect(
    useCallback(() => {
      // Chỉ fetch lại nếu chưa có data
      if (jobs.length === 0 && !loading) {
        fetchJobs();
      }
    }, [jobs.length, loading])
  );

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
    const salaryText = formatSalary(item.salary) || 'Thỏa thuận';

    const jobType = textify(item.jobTypes, 'type');
    const jobCategory = textify(item.jobCategories, 'category');

    return (
      <TouchableOpacity 
        style={styles.card} 
        onPress={() => router.push({ 
          pathname: '/(shared)/jobDescription', 
          params: { 
            jobId: item.id || item.$id,
            from: '/(employer)/myJobs' // ✅ Track where user came from
          } 
        })}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          {/* Job Image */}
          <View style={styles.imageContainer}>
            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.image} />
            ) : (
              <LinearGradient
                colors={['#4A80F0', '#7C3AED']}
                style={styles.imagePlaceholder}
              >
                <Ionicons name="briefcase" size={28} color="#fff" />
              </LinearGradient>
            )}
          </View>

          {/* Job Info */}
          <View style={styles.jobInfo}>
            <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
            
            <View style={styles.infoRow}>
              <Ionicons name="cash-outline" size={14} color="#10b981" />
              <Text style={styles.salary}>{salaryText}</Text>
            </View>

            <View style={styles.tagsRow}>
              {jobCategory !== '—' && (
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{jobCategory}</Text>
                </View>
              )}
              {jobType !== '—' && (
                <View style={[styles.tag, styles.tagSecondary]}>
                  <Text style={styles.tagText}>{jobType}</Text>
                </View>
              )}
            </View>

            {createdDate && (
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={12} color="#94a3b8" />
                <Text style={styles.date}>
                  {createdDate.toLocaleDateString('vi-VN')}
                </Text>
              </View>
            )}
          </View>

          {/* Delete Button */}
          <TouchableOpacity 
            onPress={() => handleDelete(item.id || item.$id)} 
            style={styles.deleteBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Công việc của tôi</Text>
          <Text style={styles.headerSubtitle}>{jobs.length} công việc đang đăng</Text>
        </View>
        <TouchableOpacity 
          onPress={() => router.push('/(employer)/addJob' as any)}
          style={styles.addButton}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A80F0" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      ) : jobs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <LinearGradient
            colors={['#E0E7FF', '#F3E8FF']}
            style={styles.emptyIconBg}
          >
            <Ionicons name="briefcase-outline" size={48} color="#7C3AED" />
          </LinearGradient>
          <Text style={styles.emptyTitle}>Chưa có công việc nào</Text>
          <Text style={styles.emptyText}>Tạo công việc đầu tiên để tìm ứng viên phù hợp</Text>
          <TouchableOpacity 
            onPress={() => router.push('/(shared)/addJob' as any)}
            style={styles.createButton}
          >
            <Ionicons name="add-circle" size={20} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.createButtonText}>Tạo công việc mới</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id || item.$id}
          renderItem={renderJob}
          contentContainerStyle={[styles.list, { paddingBottom: SCROLL_BOTTOM_PADDING }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8FAFC' 
  },
  header: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingHorizontal: 16, 
    paddingVertical: 16, 
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: { 
    fontSize: 22, 
    fontWeight: '700', 
    color: '#0f172a' 
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4A80F0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4A80F0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },

  list: {
    padding: 16,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'flex-start',
  },
  imageContainer: {
    marginRight: 12,
  },
  image: { 
    width: 64, 
    height: 64, 
    borderRadius: 10,
  },
  imagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  jobInfo: {
    flex: 1,
    gap: 6,
  },
  title: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#0f172a',
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  salary: { 
    fontSize: 14, 
    color: '#10b981', 
    fontWeight: '600',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#E0E7FF',
    borderRadius: 6,
  },
  tagSecondary: {
    backgroundColor: '#F3E8FF',
  },
  tagText: {
    fontSize: 11,
    color: '#5b21b6',
    fontWeight: '500',
  },
  date: { 
    fontSize: 11, 
    color: '#94a3b8',
  },
  deleteBtn: { 
    padding: 8,
    marginLeft: 4,
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
    paddingHorizontal: 32,
  },
  emptyIconBg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  emptyText: { 
    fontSize: 14, 
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A80F0',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#4A80F0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
