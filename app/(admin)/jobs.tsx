import React, { useState, useMemo } from 'react';
import { View, FlatList, StyleSheet, Alert, Text } from 'react-native';
import { router } from 'expo-router';
import { deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Button } from '@/components/base/Button';
import { SearchBar } from '@/components/base/SearchBar';
import { EmptyState } from '@/components/base/EmptyState';
import { LoadingSpinner } from '@/components/base/LoadingSpinner';
import { JobCard } from '@/components/admin/JobCard';
import { FilterTabs } from '@/components/admin/FilterTabs';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';
import { useSearch } from '@/hooks/useSearch';

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

  const handleDelete = (jobId: string, title: string) => {
    Alert.alert('Xác nhận', `Bạn có chắc muốn xóa job "${title}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'jobs', jobId));
            await reload();
            Alert.alert('Thành công', 'Đã xóa job');
          } catch (error) {
            Alert.alert('Lỗi', 'Không thể xóa job');
          }
        },
      },
    ]);
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
});