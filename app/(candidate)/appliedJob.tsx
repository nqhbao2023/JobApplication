import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { applicationApiService } from '@/services/applicationApi.service';
import { jobApiService } from '@/services/jobApi.service';
import { Application } from '@/services/applicationApi.service';
import { sequentialFetch } from '@/utils/rateLimit.utils';

export default function AppliedJob() {
  const router = useRouter();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const getCompanyName = useCallback((company: any): string => {
    if (!company) return 'Ẩn danh';
    if (typeof company === 'string') return company;
    return company.corp_name || 'Ẩn danh';
  }, []);

  const getCompanyCity = useCallback((company: any): string | undefined => {
    if (!company || typeof company === 'string') return undefined;
    return company.city;
  }, []);

  /**
   * Fetch with optimistic updates, error recovery & rate limiting
   */
  const fetchApplications = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setRefreshing(true);

        const apps = await applicationApiService.getMyApplications();

        // Fetch job details sequentially with rate limiting using utility
        const applicationsWithJobs = await sequentialFetch(
          apps,
          async (app: Application) => {
            const job = await jobApiService.getJobById(app.jobId);
            return {
              $id: app.id,
              jobId: app.jobId,
              status: app.status,
              applied_at: app.appliedAt,
              jobInfo: {
                title: job.title,
                company: getCompanyName(job.company),
                location: job.location || getCompanyCity(job.company) || 'Không rõ',
                image: job.image,
              },
            };
          },
          200, // 200ms delay between requests
          // Error handler
          (error, app) => {
            console.error(`Failed to fetch job ${app.jobId}:`, error);
            
            // Return from cache if available
            const cached = applications.find((a) => a.jobId === app.jobId);
            if (cached) return cached;

            // Fallback to basic info
            return {
              $id: app.id,
              jobId: app.jobId,
              status: app.status,
              applied_at: app.appliedAt,
              jobInfo: {
                title: 'Đang tải...',
                company: 'Ẩn danh',
                location: 'Không rõ',
                image: undefined,
              },
            };
          }
        );

        if (!mountedRef.current) return;
        setApplications(applicationsWithJobs);
      } catch (error: any) {
        console.error('❌ Fetch applications error:', error);

        // Don't clear data on error - keep showing old data
        if (applications.length === 0) {
          Alert.alert(
            'Lỗi',
            'Không thể tải danh sách ứng tuyển. Vui lòng kiểm tra kết nối.'
          );
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [applications, getCompanyName, getCompanyCity]
  );

  useEffect(() => {
    fetchApplications();
  }, []);

  // Background refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchApplications(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchApplications]);

  if (loading && applications.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTxt}>Công việc đã ứng tuyển</Text>
      </View>

      <FlatList
        data={applications}
        keyExtractor={(it) => it.$id || it.jobId}
        renderItem={({ item }) => <JobRow item={item} onPress={router} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchApplications(false)}
          />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="briefcase-outline" size={64} color="#ccc" />
            <Text style={{ color: '#888', marginTop: 8 }}>
              Bạn chưa ứng tuyển công việc nào
            </Text>
          </View>
        }
        contentContainerStyle={[
          styles.listPad,
          applications.length === 0 && { flex: 1 },
        ]}
      />
    </SafeAreaView>
  );
}

const statusColor = (s?: string) =>
  s === 'accepted' ? '#34C759' : s === 'rejected' ? '#FF3B30' : '#FF9500';

const JobRow = React.memo(({ item, onPress }: { item: any; onPress: any }) => {
  const appliedDate = item.applied_at
    ? typeof item.applied_at === 'string'
      ? new Date(item.applied_at)
      : item.applied_at instanceof Date
      ? item.applied_at
      : new Date(item.applied_at)
    : null;

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() =>
        onPress.navigate({
          pathname: '/(shared)/jobDescription',
          params: { 
            jobId: item.jobId, 
            fromApplied: 'true',
            applicationStatus: item.status, // ✅ Truyền status để disable withdraw
            applicationId: item.$id, // ✅ Truyền application ID
          },
        })
      }
    >
      <Image
        source={{
          uri: item.jobInfo?.image ?? 'https://placehold.co/60x60?text=Job',
        }}
        style={styles.logo}
      />

      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.title} numberOfLines={1}>
          {item.jobInfo?.title ?? 'Không rõ tiêu đề'}
        </Text>
        <Text style={styles.company} numberOfLines={1}>
          {item.jobInfo?.company ?? 'Ẩn danh'}
        </Text>
        <Text style={styles.location} numberOfLines={1}>
          {item.jobInfo?.location ?? 'Không rõ địa điểm'}
        </Text>

        <Text style={[styles.status, { color: statusColor(item.status) }]}>
          {item.status === 'accepted'
            ? 'Đã duyệt'
            : item.status === 'rejected'
            ? 'Từ chối'
            : item.status === 'withdrawn'
            ? 'Đã hủy'
            : 'Đang chờ'}
        </Text>

        {appliedDate && (
          <Text style={styles.date}>
            Ứng tuyển: {appliedDate.toLocaleDateString('vi-VN')}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9F9FB' },
  listPad: { padding: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    elevation: 2,
  },
  back: { position: 'absolute', left: 16, padding: 6 },
  headerTxt: { fontSize: 18, fontWeight: '700', color: '#007AFF' },
  row: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
  },
  logo: { width: 60, height: 60, borderRadius: 8 },
  title: { fontSize: 16, fontWeight: '700', color: '#111827' },
  company: { fontSize: 14, color: '#555' },
  location: { fontSize: 12, color: '#888' },
  status: { marginTop: 4, fontSize: 12, fontWeight: '600' },
  date: { fontSize: 11, color: '#999', marginTop: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});