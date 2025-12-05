import React, { useState, useMemo } from 'react';
import { View, FlatList, StyleSheet, Alert, Text, ActivityIndicator, Modal, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Button } from '@/components/base/Button';
import { SearchBar } from '@/components/base/SearchBar';
import { EmptyState } from '@/components/base/EmptyState';
import { LoadingSpinner } from '@/components/base/LoadingSpinner';
import { JobCard } from '@/components/admin/JobCard';
import { FilterTabs } from '@/components/admin/FilterTabs';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';
import { useSearch } from '@/hooks/useSearch';
import { jobApiService } from '@/services/jobApi.service';
import { Ionicons } from '@expo/vector-icons';

type Salary = {
  currency?: string;
  min?: number;
  max?: number;
};

type Job = {
  $id: string;
  title?: string;
  location?: string;
  salary?: string | Salary;
  status?: string;
  ownerId?: string;
  ownerName?: string;
  ownerEmail?: string;
  created_at?: string;
  // ✅ NEW: Fields for source filtering
  source?: 'viecoi' | 'internal' | 'quick-post';
  jobType?: 'employer_seeking' | 'candidate_seeking';
  employerId?: string;
  posterId?: string;
};

type StatusFilter = 'all' | 'active' | 'pending' | 'closed' | 'inactive';
type SourceFilter = 'all' | 'crawled' | 'employer' | 'quickpost';

// ✅ Helper function to determine job source category
const getJobSourceCategory = (job: Job): 'crawled' | 'employer' | 'quickpost' => {
  // Quick Post: source = 'quick-post' OR jobType = 'candidate_seeking'
  if (job.source === 'quick-post' || job.jobType === 'candidate_seeking') {
    return 'quickpost';
  }
  // Crawled: source = 'viecoi'
  if (job.source === 'viecoi') {
    return 'crawled';
  }
  // Employer Jobs: source = 'internal' OR has employerId OR jobType = 'employer_seeking'
  if (job.source === 'internal' || job.employerId || job.jobType === 'employer_seeking') {
    return 'employer';
  }
  // Default: treat as employer job if has ownerId, otherwise crawled
  return job.ownerId ? 'employer' : 'crawled';
};

const JobsScreen = () => {
  const { data: rawJobs, loading, reload } = useFirestoreCollection<Job>('jobs');
  
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingOwners, setLoadingOwners] = useState(true);
  
  // ✅ NEW: Filter states
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  
  // ✅ NEW: Delete modal states
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletingJob, setDeletingJob] = useState<Job | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  React.useEffect(() => {
    const loadOwners = async () => {
      if (rawJobs.length === 0) {
        setJobs([]);
        setLoadingOwners(false);
        return;
      }

      const enriched = await Promise.all(
        rawJobs.map(async (job) => {
          if (!job.ownerId && !job.employerId && !job.posterId) {
            return { ...job, ownerName: 'N/A', ownerEmail: 'N/A' };
          }
          
          // Try to get owner info from ownerId, employerId, or posterId
          const userId = job.ownerId || job.employerId || job.posterId;
          if (!userId) return { ...job, ownerName: 'N/A', ownerEmail: 'N/A' };
          
          try {
            const userSnap = await getDoc(doc(db, 'users', userId));
            if (userSnap.exists()) {
              const userData = userSnap.data();
              return {
                ...job,
                ownerName: userData.name || 'N/A',
                ownerEmail: userData.email || 'N/A',
              };
            }
          } catch (error) {
            console.error('Error loading owner:', error);
          }
          return { ...job, ownerName: 'N/A', ownerEmail: 'N/A' };
        })
      );
      setJobs(enriched);
      setLoadingOwners(false);
    };

    if (!loading) {
      loadOwners();
    }
  }, [rawJobs, loading]);

  const { query, setQuery, filtered: searchResults } = useSearch(jobs, ['title', 'ownerName', 'ownerEmail', 'location']);
  
  // ✅ NEW: Apply source filter first, then status filter
  const filteredJobs = useMemo(() => {
    let result = searchResults;
    
    // Apply source filter
    if (sourceFilter !== 'all') {
      result = result.filter(job => getJobSourceCategory(job) === sourceFilter);
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(job => job.status === statusFilter);
    }
    
    return result;
  }, [searchResults, sourceFilter, statusFilter]);

  // ✅ NEW: Calculate counts for each source category
  const sourceCounts = useMemo(() => {
    const counts = { all: jobs.length, crawled: 0, employer: 0, quickpost: 0 };
    jobs.forEach(job => {
      const category = getJobSourceCategory(job);
      counts[category]++;
    });
    return counts;
  }, [jobs]);

  const handleEdit = (jobId: string) => {
    router.push({ pathname: '/(admin)/job-detail', params: { jobId } } as any);
  };

  // ✅ UPDATED: Show delete confirmation modal with better UX
  const handleDelete = (jobId: string, title: string) => {
    const job = jobs.find(j => j.$id === jobId);
    if (job) {
      setDeletingJob(job);
      setDeleteModalVisible(true);
    }
  };

  // ✅ NEW: Execute delete with API (auto-sync Firebase + Algolia)
  const executeDelete = async () => {
    if (!deletingJob) return;
    
    setIsDeleting(true);
    try {
      // ✅ Sử dụng API service để xóa - tự động xóa cả Firebase và Algolia
      await jobApiService.deleteJob(deletingJob.$id);
      
      setDeleteModalVisible(false);
      setDeletingJob(null);
      await reload();
      
      Alert.alert(
        '✅ Xóa thành công', 
        `Job "${deletingJob.title}" đã được xóa khỏi hệ thống và tìm kiếm.`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Delete job error:', error);
      Alert.alert(
        '❌ Lỗi xóa job',
        error?.message || 'Không thể xóa job. Vui lòng thử lại.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // ✅ Helper: Get source display info
  const getSourceInfo = (job: Job) => {
    const category = getJobSourceCategory(job);
    switch (category) {
      case 'crawled':
        return { icon: 'globe-outline' as const, label: 'Viecoi (Crawled)', color: '#8b5cf6' };
      case 'quickpost':
        return { icon: 'person-outline' as const, label: 'Ứng viên tìm việc', color: '#10b981' };
      case 'employer':
      default:
        return { icon: 'business-outline' as const, label: 'Employer', color: '#3b82f6' };
    }
  };

  if (loading || loadingOwners) return <LoadingSpinner text="Đang tải danh sách jobs..." />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Button
          title="Tạo Job"
          icon="add-circle"
          variant="success"
          onPress={() => router.push('/(admin)/job-create')}
          fullWidth
        />
      </View>

      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder="Tìm theo tên job, người đăng..."
      />

      {/* ✅ NEW: Source Filter - Phân loại theo nguồn job */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>📂 Nguồn Job:</Text>
        <FilterTabs
          options={['all', 'crawled', 'employer', 'quickpost'] as const}
          active={sourceFilter}
          onChange={setSourceFilter}
          scrollable
          labels={{
            all: `Tất cả (${sourceCounts.all})`,
            crawled: `🌐 Viecoi (${sourceCounts.crawled})`,
            employer: `🏢 Employer (${sourceCounts.employer})`,
            quickpost: `📝 Ứng viên (${sourceCounts.quickpost})`,
          }}
        />
      </View>

      {/* Status Filter - Phân loại theo trạng thái */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>📊 Trạng thái:</Text>
        <FilterTabs
          options={['all', 'active', 'pending', 'inactive', 'closed'] as const}
          active={statusFilter}
          onChange={setStatusFilter}
          scrollable
          labels={{
            all: 'Tất cả',
            active: '✅ Đang tuyển',
            pending: '⏳ Chờ duyệt',
            inactive: '🔒 Chưa duyệt',
            closed: '❌ Đã đóng',
          }}
        />
      </View>

      <View style={styles.stats}>
        <Text style={styles.statsText}>
          Hiển thị {filteredJobs.length} / {jobs.length} jobs
          {sourceFilter !== 'all' && ` • ${
            sourceFilter === 'crawled' ? '🌐 Viecoi' :
            sourceFilter === 'employer' ? '🏢 Employer' :
            '📝 Ứng viên tìm việc'
          }`}
        </Text>
      </View>

      <FlatList
        data={filteredJobs}
        renderItem={({ item }) => (
          <JobCard job={item} onEdit={handleEdit} onDelete={handleDelete} />
        )}
        keyExtractor={(item) => item.$id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState icon="briefcase-outline" message="Không tìm thấy jobs" />
        }
      />

      {/* ✅ DELETE CONFIRMATION MODAL */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !isDeleting && setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalIconContainer}>
                <Ionicons name="trash" size={32} color="#ef4444" />
              </View>
              <Text style={styles.modalTitle}>Xóa Job</Text>
              <Text style={styles.modalSubtitle}>Hành động này không thể hoàn tác</Text>
            </View>

            {/* Job Info */}
            {deletingJob && (
              <View style={styles.jobInfoCard}>
                <Text style={styles.jobInfoTitle} numberOfLines={2}>
                  {deletingJob.title || 'Không có tiêu đề'}
                </Text>
                
                <View style={styles.jobInfoRow}>
                  <Ionicons name={getSourceInfo(deletingJob).icon} size={16} color={getSourceInfo(deletingJob).color} />
                  <Text style={[styles.jobInfoLabel, { color: getSourceInfo(deletingJob).color }]}>
                    {getSourceInfo(deletingJob).label}
                  </Text>
                </View>

                {deletingJob.ownerName && deletingJob.ownerName !== 'N/A' && (
                  <View style={styles.jobInfoRow}>
                    <Ionicons name="person-outline" size={16} color="#64748b" />
                    <Text style={styles.jobInfoValue}>{deletingJob.ownerName}</Text>
                  </View>
                )}

                <View style={styles.jobInfoRow}>
                  <Ionicons name="location-outline" size={16} color="#64748b" />
                  <Text style={styles.jobInfoValue}>{deletingJob.location || 'Không xác định'}</Text>
                </View>
              </View>
            )}

            {/* Warning */}
            <View style={styles.warningBox}>
              <Ionicons name="warning" size={20} color="#f59e0b" />
              <Text style={styles.warningText}>
                Job sẽ bị xóa vĩnh viễn khỏi Firebase và Algolia Search. Tất cả ứng viên đã apply sẽ không còn thấy job này.
              </Text>
            </View>

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setDeleteModalVisible(false)}
                disabled={isDeleting}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton, isDeleting && styles.buttonDisabled]}
                onPress={executeDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="trash" size={18} color="#fff" />
                    <Text style={styles.deleteButtonText}>Xóa vĩnh viễn</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default JobsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  header: { padding: 16, paddingBottom: 0 },
  filterSection: {
    paddingTop: 12,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  stats: { paddingHorizontal: 16, paddingVertical: 12 },
  statsText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 },
  
  // ✅ Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  modalHeader: {
    alignItems: 'center',
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  
  // Job Info Card
  jobInfoCard: {
    backgroundColor: '#f8fafc',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  jobInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  jobInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  jobInfoLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  jobInfoValue: {
    fontSize: 13,
    color: '#64748b',
    flex: 1,
  },

  // Warning Box
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#fffbeb',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    gap: 10,
    alignItems: 'flex-start',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
    lineHeight: 18,
  },

  // Modal Actions
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});