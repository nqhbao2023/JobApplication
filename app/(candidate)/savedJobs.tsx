import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth } from '@/config/firebase';
import { categoryApiService } from '@/services/categoryApi.service';
import { savedJobApiService, SavedJob } from '@/services/savedJobApi.service';
import { Category, Job } from '@/types';

const Job = () => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const loadInitialData = useCallback(async () => {
    if (!auth.currentUser) {
      setSavedJobs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [jobs, cats] = await Promise.all([
        savedJobApiService.getSavedJobs(),
        categoryApiService.getAllCategories(20),
      ]);
      setSavedJobs(jobs);
      setCategories(cats);
    } catch (error) {
      console.error('loadInitialData error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const toggleSaveJob = useCallback(
    async (jobId: string, isSaved: boolean) => {
      if (!auth.currentUser) return;

      setSyncing(true);
      try {
        if (isSaved) {
          await savedJobApiService.removeJob(jobId);
          setSavedJobs((prev) => prev.filter((item) => item.jobId !== jobId));
        } else {
          const saved = await savedJobApiService.saveJob(jobId);
          setSavedJobs((prev) => [saved, ...prev]);
        }
      } catch (error) {
        console.error('toggleSaveJob error:', error);
      } finally {
        setSyncing(false);
      }
    },
    []
  );

  const jobMatchesCategory = useCallback(
    (job: Job | undefined, categoryId: string) => {
      if (!job) return false;
      const normalizedCategoryId = categoryId.toLowerCase();

      const jobCategory = (job as any).category;
      if (typeof jobCategory === 'string') {
        return jobCategory.toLowerCase() === normalizedCategoryId;
      }

      const jobCategories = (job as any).jobCategories;
      if (typeof jobCategories === 'string') {
        return jobCategories.toLowerCase() === normalizedCategoryId;
      }
      if (Array.isArray(jobCategories)) {
        return jobCategories.some((cat: any) => {
          if (typeof cat === 'string') {
            return cat.toLowerCase() === normalizedCategoryId;
          }
          if (cat && typeof cat === 'object') {
            return (
              cat?.$id?.toLowerCase() === normalizedCategoryId ||
              cat?.category_name?.toLowerCase() === normalizedCategoryId
            );
          }
          return false;
        });
      }

      return false;
    },
    []
  );

  const filteredJobs = useMemo(() => {
    if (selectedTab === 0) return savedJobs;
    const category = categories[selectedTab - 1];
    if (!category) return savedJobs;
    return savedJobs.filter((item) => jobMatchesCategory(item.job, category.$id));
  }, [savedJobs, categories, selectedTab, jobMatchesCategory]);

  const renderJobItem = ({ item }: { item: SavedJob }) => {
    const job = item.job;
    const company = job?.company as any;
    const companyName = typeof company === 'string' ? company : company?.corp_name || 'Ẩn danh';
    const city = company?.city || job?.location || 'Không rõ địa điểm';
    const nation = company?.nation ? `, ${company.nation}` : '';
    const imageSource = job?.image || company?.image || 'https://placehold.co/80x80?text=Job';
    const isSaved = savedJobs.some((saved) => saved.jobId === item.jobId);
    const salary = (() => {
      if (!job?.salary) return 'Negotiable';
      if (typeof job.salary === 'string') return job.salary;
      const min = job.salary.min ? job.salary.min.toLocaleString('vi-VN') : '';
      const max = job.salary.max ? job.salary.max.toLocaleString('vi-VN') : '';
      if (min && max) return `${min} - ${max}`;
      if (min) return `Từ ${min}`;
      if (max) return `Đến ${max}`;
      return 'Negotiable';
    })();
    const jobType = (job as any)?.type || (job as any)?.jobTypes?.type_name || 'Unknown';

    return (
      <TouchableOpacity
        style={styles.jobItem}
        onPress={() =>
          router.push({
            pathname: '/(shared)/jobDescription',
            params: { jobId: job?.id || job?.$id || item.jobId },
          })
        }
      >
        <Image source={{ uri: imageSource }} style={styles.jobImage} />
        <View style={styles.jobInfo}>
          <Text style={styles.jobTitle} numberOfLines={1}>
            {job?.title || 'Không rõ tiêu đề'}
          </Text>
          <Text style={styles.jobCompany} numberOfLines={1}>
            {companyName}
          </Text>
          <Text style={styles.jobLocation} numberOfLines={1}>
            {city}
            {nation}
          </Text>
        </View>
        <View style={styles.jobRight}>
          <Text style={styles.jobSalary}>{salary}</Text>
          <Text style={styles.jobType}>{jobType}</Text>
          <TouchableOpacity
            onPress={() => toggleSaveJob(item.jobId, isSaved)}
            style={{ padding: 4 }}
            disabled={syncing}
          >
            <Ionicons
              name={isSaved ? 'heart' : 'heart-outline'}
              size={24}
              color={isSaved ? '#FF3B30' : '#999'}
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Save Job List</Text>
      </View>

      <View style={styles.subHeader}>
        <Text style={styles.savedText}>You Saved {savedJobs.length} Jobs</Text>
        <Image
          source={{ uri: 'https://via.placeholder.com/30' }}
          style={styles.subHeaderIcon}
        />
      </View>

      <View style={styles.tabsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScroll}
        >
          <TouchableOpacity
            style={[styles.tabButton, selectedTab === 0 && styles.tabButtonActive]}
            onPress={() => setSelectedTab(0)}
          >
            <Text style={[styles.tabText, selectedTab === 0 && styles.tabTextActive]}>
              All
            </Text>
          </TouchableOpacity>

          {categories.map((cat, index) => (
            <TouchableOpacity
              key={cat.$id}
              style={[styles.tabButton, selectedTab === index + 1 && styles.tabButtonActive]}
              onPress={() => setSelectedTab(index + 1)}
            >
              <Text style={[styles.tabText, selectedTab === index + 1 && styles.tabTextActive]}>
                {cat.category_name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#34C759" />
        </View>
      ) : filteredJobs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-dislike-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No saved jobs found</Text>
        </View>
      ) : (
        <FlatList
          data={filteredJobs}
          renderItem={renderJobItem}
          keyExtractor={(item) => `${item.id}-${item.jobId}`}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </SafeAreaView>
  );
};

export default Job;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9FB',
  },
  header: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  savedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  subHeaderIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E5E7EB',
  },
  tabsWrapper: {
    paddingVertical: 8,
  },
  tabScroll: {
    paddingHorizontal: 16,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tabButtonActive: {
    backgroundColor: '#34C759',
    borderColor: '#34C759',
  },
  tabText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#9CA3AF',
  },
  jobItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
  },
  jobImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    marginRight: 16,
  },
  jobInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  jobCompany: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 4,
  },
  jobLocation: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  jobRight: {
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  jobSalary: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
  },
  jobType: {
    fontSize: 12,
    color: '#6B7280',
  },
});
