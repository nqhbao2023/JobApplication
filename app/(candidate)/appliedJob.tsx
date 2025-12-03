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
import { SCROLL_BOTTOM_PADDING } from '@/utils/layout.utils';
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
        console.log(`📊 Found ${apps.length} applications`);

        // Fetch job details sequentially with rate limiting using utility
        const applicationsWithJobs = await sequentialFetch(
          apps,
          async (app: Application) => {
            try {
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
                  image: job.company_logo || job.image,
                },
              };
            } catch (err: any) {
              // Handle 404 specifically - job was deleted
              if (err?.response?.status === 404) {
                console.warn(`⚠️ Job ${app.jobId} no longer exists (404)`);
                return {
                  $id: app.id,
                  jobId: app.jobId,
                  status: app.status,
                  applied_at: app.appliedAt,
                  _deleted: true,
                  jobInfo: {
                    title: 'Việc làm không còn tồn tại',
                    company: 'Đã bị xóa',
                    location: 'N/A',
                    image: undefined,
                  },
                };
              }
              throw err; // Let error handler deal with other errors
            }
          },
          200, // 200ms delay between requests
          // Error handler for non-404 errors
          (error, app) => {
            console.error(`Failed to fetch job ${app.jobId}:`, error?.message || error);
            
            // Return from cache if available
            const cached = applications.find((a) => a.jobId === app.jobId);
            if (cached) return cached;

            // Fallback to basic info
            return {
              $id: app.id,
              jobId: app.jobId,
              status: app.status,
              applied_at: app.appliedAt,
              _error: true,
              jobInfo: {
                title: 'Không thể tải thông tin',
                company: 'Lỗi kết nối',
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

  // Handle delete application for deleted jobs
  const handleDeleteApplication = useCallback(async (applicationId: string) => {
    try {
      await applicationApiService.withdrawApplication(applicationId);
      // Remove from local state immediately
      setApplications(prev => prev.filter(app => app.$id !== applicationId));
      Alert.alert('Thành công', 'Đã xóa hồ sơ ứng tuyển');
    } catch (error: any) {
      console.error('Delete application error:', error);
      Alert.alert('Lỗi', 'Không thể xóa hồ sơ. Vui lòng thử lại.');
    }
  }, []);

  if (loading && applications.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={applications}
        keyExtractor={(it) => it.$id || it.jobId}
        renderItem={({ item }) => (
          <JobRow 
            item={item} 
            onPress={router} 
            onDeleteApplication={handleDeleteApplication}
          />
        )}
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
          { paddingBottom: SCROLL_BOTTOM_PADDING },
          applications.length === 0 && { flex: 1 },
        ]}
      />
    </SafeAreaView>
  );
}

const statusColor = (s?: string) =>
  s === 'accepted' ? '#34C759' : s === 'rejected' ? '#FF3B30' : s === 'withdrawn' ? '#9E9E9E' : '#FF9500';

const getStatusLabel = (status?: string) => {
  switch (status) {
    case 'accepted': return '✅ Đã được chấp nhận';
    case 'rejected': return '❌ Đã bị từ chối';
    case 'withdrawn': return '🔙 Đã rút hồ sơ';
    case 'reviewing': return '👀 Đang xem xét';
    case 'pending': 
    default: return '⏳ Đang chờ duyệt';
  }
};

const JobRow = React.memo(({ item, onPress, onDeleteApplication }: { item: any; onPress: any; onDeleteApplication?: (id: string) => void }) => {
  const isDeleted = item._deleted === true;
  const isError = item._error === true;
  
  const appliedDate = item.applied_at
    ? typeof item.applied_at === 'string'
      ? new Date(item.applied_at)
      : item.applied_at instanceof Date
      ? item.applied_at
      : new Date(item.applied_at)
    : null;

  // Validate date
  const isValidDate = appliedDate && !isNaN(appliedDate.getTime());

  const handlePress = () => {
    if (isDeleted) {
      Alert.alert(
        'Việc làm không còn tồn tại',
        'Công việc này đã bị nhà tuyển dụng xóa. Bạn có muốn xóa hồ sơ ứng tuyển này không?',
        [
          { text: 'Để sau', style: 'cancel' },
          { 
            text: 'Xóa hồ sơ', 
            style: 'destructive',
            onPress: () => onDeleteApplication?.(item.$id)
          },
        ]
      );
      return;
    }
    
    onPress.navigate({
      pathname: '/(shared)/jobDescription',
      params: { 
        jobId: item.jobId, 
        fromApplied: 'true',
        applicationStatus: item.status,
        applicationId: item.$id,
      },
    });
  };

  return (
    <TouchableOpacity
      style={[styles.row, isDeleted && styles.deletedRow]}
      onPress={handlePress}
    >
      {isDeleted ? (
        <View style={styles.deletedIcon}>
          <Ionicons name="trash-outline" size={28} color="#999" />
        </View>
      ) : (
        <Image
          source={{
            uri: item.jobInfo?.image ?? 'https://placehold.co/60x60?text=Job',
          }}
          style={styles.logo}
        />
      )}

      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={[styles.title, isDeleted && styles.deletedText]} numberOfLines={1}>
          {item.jobInfo?.title ?? 'Không rõ tiêu đề'}
        </Text>
        <Text style={[styles.company, isDeleted && styles.deletedText]} numberOfLines={1}>
          {item.jobInfo?.company ?? 'Ẩn danh'}
        </Text>
        {!isDeleted && (
          <Text style={styles.location} numberOfLines={1}>
            {item.jobInfo?.location ?? 'Không rõ địa điểm'}
          </Text>
        )}

        <Text style={[styles.status, { color: isDeleted ? '#999' : statusColor(item.status) }]}>
          {isDeleted ? '🗑️ Việc làm đã bị xóa' : getStatusLabel(item.status)}
        </Text>

        {isValidDate && (
          <Text style={styles.date}>
            Ứng tuyển: {appliedDate.toLocaleDateString('vi-VN')}
          </Text>
        )}
        
        {isDeleted && (
          <Text style={styles.deleteHint}>Nhấn để xóa hồ sơ này</Text>
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
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    elevation: 2,
  },
  headerTxt: { fontSize: 18, fontWeight: '700', color: '#007AFF', flex: 1, textAlign: 'center' },
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
  deletedRow: {
    backgroundColor: '#f5f5f5',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#ddd',
    opacity: 0.8,
  },
  deletedIcon: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deletedText: {
    color: '#999',
    textDecorationLine: 'line-through',
  },
  deleteHint: {
    fontSize: 11,
    color: '#FF6B6B',
    marginTop: 4,
    fontStyle: 'italic',
  },
  logo: { width: 60, height: 60, borderRadius: 8 },
  title: { fontSize: 16, fontWeight: '700', color: '#111827' },
  company: { fontSize: 14, color: '#555' },
  location: { fontSize: 12, color: '#888' },
  status: { marginTop: 4, fontSize: 12, fontWeight: '600' },
  date: { fontSize: 11, color: '#999', marginTop: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});