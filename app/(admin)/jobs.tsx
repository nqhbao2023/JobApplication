import React from 'react';
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
import { useFilter } from '@/hooks/useFilter';

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
};

type StatusFilter = 'all' | 'active' | 'pending' | 'closed';

const JobsScreen = () => {
  const { data: rawJobs, loading, reload } = useFirestoreCollection<Job>('jobs');
  
  const [jobs, setJobs] = React.useState<Job[]>([]);
  const [loadingOwners, setLoadingOwners] = React.useState(true);

  React.useEffect(() => {
    const loadOwners = async () => {
      if (rawJobs.length === 0) {
        setLoadingOwners(false);
        return;
      }

      const enriched = await Promise.all(
        rawJobs.map(async (job) => {
          if (!job.ownerId) return { ...job, ownerName: 'N/A', ownerEmail: 'N/A' };
          
          try {
            const userSnap = await getDoc(doc(db, 'users', job.ownerId));
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
  
  const { filter: statusFilter, setFilter: setStatusFilter, filtered: filteredJobs } = useFilter<Job, StatusFilter>(
    searchResults,
    (job, filter) => job.status === filter
  );

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

      <FilterTabs
        options={['all', 'active', 'pending', 'closed'] as const}
        active={statusFilter}
        onChange={setStatusFilter}
        labels={{
          all: 'Tất cả',
          active: 'Đang tuyển',
          pending: 'Chờ duyệt',
          closed: 'Đã đóng',
        }}
      />

      <View style={styles.stats}>
        <Text style={styles.statsText}>
          Hiển thị {filteredJobs.length} / {jobs.length} jobs
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
  stats: { paddingHorizontal: 16, paddingVertical: 12 },
  statsText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 },
});