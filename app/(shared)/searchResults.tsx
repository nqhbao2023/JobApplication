/**
 * Trang kết quả tìm kiếm việc làm
 * Với filters: Khu vực, Bán kính, Kinh nghiệm
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { searchJobs, isAlgoliaAvailable } from '@/services/algoliaSearch.service';
import { db } from '@/config/firebase';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { VIETNAM_CITIES, SEARCH_RADIUS, EXPERIENCE_LEVELS } from '@/constants/locations';

interface Job {
  $id: string;
  id?: string;
  title?: string;
  company?: string;
  location?: string;
  salary?: string;
  image?: string;
  company_logo?: string;
  company_name?: string;
  salary_text?: string;
  description?: string;
  job_Description?: string;
  requirements?: string;
  skills_required?: string;
  _highlightResult?: any;
}

export default function SearchResultsPage() {
  const params = useLocalSearchParams<{ position?: string; location?: string }>();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalResults, setTotalResults] = useState(0);

  // Filters
  const [selectedLocation, setSelectedLocation] = useState(params.location || 'Hà Nội');
  const [selectedRadius, setSelectedRadius] = useState(10); // Default 10km
  const [selectedExperience, setSelectedExperience] = useState<string | null>(null);

  // Modal states
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showRadiusModal, setShowRadiusModal] = useState(false);
  const [showExperienceModal, setShowExperienceModal] = useState(false);

  const useAlgolia = isAlgoliaAvailable();

  useEffect(() => {
    fetchJobs();
  }, [params.position, selectedLocation, selectedRadius, selectedExperience]);

  const fetchJobs = async () => {
    try {
      setLoading(true);

      // Try Algolia first
      if (useAlgolia && params.position) {
        try {
          const result = await searchJobs({
            query: params.position,
            location: selectedLocation !== 'Toàn quốc' ? selectedLocation : undefined,
            radius: selectedRadius !== 9999 ? selectedRadius : undefined,
            experience: selectedExperience && selectedExperience !== 'Tất cả kinh nghiệm' ? selectedExperience : undefined,
            hitsPerPage: 100,
          });

          setJobs(result.jobs || []);
          setTotalResults(result.total || 0);
          setLoading(false);
          setRefreshing(false);
          return;
        } catch (algoliaError) {
          console.log('Algolia search failed, falling back to Firestore:', algoliaError);
        }
      }

      // Fallback to Firestore
      console.log('Using Firestore fallback search');
      const jobsRef = collection(db, 'jobs');
      const jobsQuery = query(jobsRef, limit(100));
      const snapshot = await getDocs(jobsQuery);
      
      let allJobs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          $id: doc.id,
          id: doc.id,
          title: '',
          company: '',
          ...data,
        } as any as Job;
      });

      console.log(`Firestore: Loaded ${allJobs.length} total jobs`);

      // Filter by position (job title)
      if (params.position && params.position.trim()) {
        const searchTerm = params.position.toLowerCase().trim();
        allJobs = allJobs.filter(job => {
          const title = job.title?.toLowerCase() || '';
          const desc = (job.description || job.job_Description || '')?.toLowerCase() || '';
          const skills = job.skills_required?.toLowerCase() || '';
          return title.includes(searchTerm) || desc.includes(searchTerm) || skills.includes(searchTerm);
        });
        console.log(`After position filter "${params.position}": ${allJobs.length} jobs`);
      }

      // Filter by location with flexible matching
      if (selectedLocation && selectedLocation !== 'Toàn quốc') {
        allJobs = allJobs.filter(job => {
          const jobLocation = job.location?.toLowerCase() || '';
          const searchLocation = selectedLocation.toLowerCase();
          
          // City name variations mapping
          const cityVariations: Record<string, string[]> = {
            'tp.hcm': ['hồ chí minh', 'hcm', 'sài gòn', 'saigon', 'ho chi minh'],
            'hà nội': ['hanoi', 'ha noi', 'hn'],
            'đà nẵng': ['da nang', 'danang'],
            'cần thơ': ['can tho'],
            'hải phòng': ['hai phong'],
          };
          
          // Direct match
          if (jobLocation.includes(searchLocation)) {
            return true;
          }
          
          // Check variations
          const variations = cityVariations[searchLocation] || [];
          return variations.some(variant => jobLocation.includes(variant));
        });
      }

      // Filter by experience level - student friendly
      if (selectedExperience && selectedExperience !== 'Tất cả kinh nghiệm') {
        allJobs = allJobs.filter(job => {
          const jobDesc = (job.description || job.job_Description || '')?.toLowerCase() || '';
          const jobReqs = job.requirements?.toLowerCase() || '';
          const jobTitle = job.title?.toLowerCase() || '';
          
          // Map experience levels to search keywords
          const experienceKeywords: Record<string, string[]> = {
            'Chưa có kinh nghiệm': [
              'không yêu cầu kinh nghiệm',
              'không yêu cầu',
              'no experience',
              'fresher',
              'sinh viên',
              'thực tập',
              'intern',
              '0 năm',
            ],
            'Dưới 1 năm': [
              'dưới 1 năm',
              'under 1 year',
              '0-1 năm',
              'fresher',
              'junior',
            ],
            '1-2 năm': [
              '1-2 năm',
              '1 năm',
              '2 năm',
              '1-2 years',
            ],
            '2-5 năm': [
              '2-5 năm',
              '3 năm',
              '4 năm',
              '5 năm',
              'middle',
              'mid-level',
            ],
          };

          const keywords = experienceKeywords[selectedExperience] || [];
          
          // Check if any keyword matches
          return keywords.some(keyword => 
            jobDesc.includes(keyword) || 
            jobReqs.includes(keyword) ||
            jobTitle.includes(keyword)
          );
        });
      }

      setJobs(allJobs);
      setTotalResults(allJobs.length);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      setJobs([]);
      setTotalResults(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchJobs();
  };

  const handleClearFilters = () => {
    setSelectedLocation(params.location || 'Hà Nội');
    setSelectedRadius(10);
    setSelectedExperience(null);
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedLocation !== (params.location || 'Hà Nội')) count++;
    if (selectedRadius !== 10) count++;
    if (selectedExperience) count++;
    return count;
  }, [selectedLocation, selectedRadius, selectedExperience, params.location]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {params.position}
          </Text>
          <Text style={styles.headerSubtitle}>
            {selectedLocation} • {totalResults} kết quả
          </Text>
        </View>
      </View>

      {/* Filters Bar */}
      <View style={styles.filtersBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScroll}
        >
          {/* Location Filter */}
          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedLocation !== (params.location || 'Hà Nội') && styles.filterButtonActive,
            ]}
            onPress={() => setShowLocationModal(true)}
          >
            <Ionicons name="location" size={16} color="#64748b" />
            <Text style={styles.filterButtonText}>{selectedLocation}</Text>
            <Ionicons name="chevron-down" size={14} color="#64748b" />
          </TouchableOpacity>

          {/* Radius Filter */}
          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedRadius !== 10 && styles.filterButtonActive,
            ]}
            onPress={() => setShowRadiusModal(true)}
          >
            <Ionicons name="navigate" size={16} color="#64748b" />
            <Text style={styles.filterButtonText}>
              {selectedRadius === 9999 ? 'Toàn quốc' : `${selectedRadius} km`}
            </Text>
            <Ionicons name="chevron-down" size={14} color="#64748b" />
          </TouchableOpacity>

          {/* Experience Filter */}
          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedExperience && styles.filterButtonActive,
            ]}
            onPress={() => setShowExperienceModal(true)}
          >
            <Ionicons name="briefcase" size={16} color="#64748b" />
            <Text style={styles.filterButtonText}>
              {selectedExperience
                ? EXPERIENCE_LEVELS.find((e) => e.value === selectedExperience)?.label || 'Kinh nghiệm'
                : 'Kinh nghiệm'}
            </Text>
            <Ionicons name="chevron-down" size={14} color="#64748b" />
          </TouchableOpacity>

          {/* Clear Filters */}
          {activeFiltersCount > 0 && (
            <TouchableOpacity style={styles.clearFilterButton} onPress={handleClearFilters}>
              <Ionicons name="close-circle" size={16} color="#ef4444" />
              <Text style={styles.clearFilterText}>Xóa bộ lọc ({activeFiltersCount})</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={styles.loadingText}>Đang tìm kiếm...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.resultsList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          {jobs.length > 0 ? (
            <View style={styles.jobsContainer}>
              {jobs.map((job, index) => (
                <Animated.View key={job.$id} entering={FadeInDown.delay(index * 50).duration(400)}>
                  <TouchableOpacity
                    style={styles.jobCard}
                    onPress={() =>
                      router.push({ pathname: '/(shared)/jobDescription', params: { jobId: job.$id } })
                    }
                  >
                    {/* Job Image */}
                    {(job.company_logo || job.image) ? (
                      <Image
                        source={{ uri: job.company_logo || job.image }}
                        style={styles.jobImage}
                      />
                    ) : (
                      <View style={[styles.jobImage, styles.placeholderImage]}>
                        <Ionicons name="briefcase-outline" size={24} color="#94a3b8" />
                      </View>
                    )}

                    <View style={styles.jobInfo}>
                      <Text style={styles.jobTitle} numberOfLines={2}>
                        {job.title}
                      </Text>
                      <View style={styles.jobMeta}>
                        <Ionicons name="business-outline" size={14} color="#64748b" />
                        <Text style={styles.jobCompany} numberOfLines={1}>
                          {job.company_name || job.company || 'Công ty'}
                        </Text>
                      </View>
                      <View style={styles.jobMeta}>
                        <Ionicons name="location-outline" size={14} color="#64748b" />
                        <Text style={styles.jobLocation} numberOfLines={1}>
                          {job.location || 'Không rõ'}
                        </Text>
                      </View>
                      <View style={styles.jobMeta}>
                        <Ionicons name="cash-outline" size={14} color="#10b981" />
                        <Text style={styles.jobSalary} numberOfLines={1}>
                          {job.salary_text || job.salary || 'Thỏa thuận'}
                        </Text>
                      </View>
                    </View>

                    <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Ionicons name="search-outline" size={64} color="#cbd5e1" />
              </View>
              <Text style={styles.emptyTitle}>Không tìm thấy công việc</Text>
              <Text style={styles.emptySubtitle}>
                Thử điều chỉnh bộ lọc hoặc tìm kiếm với từ khóa khác
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Location Modal */}
      <Modal visible={showLocationModal} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLocationModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn khu vực</Text>
              <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              {VIETNAM_CITIES.map((city) => (
                <TouchableOpacity
                  key={city}
                  style={[
                    styles.modalItem,
                    selectedLocation === city && styles.modalItemActive,
                  ]}
                  onPress={() => {
                    setSelectedLocation(city);
                    setShowLocationModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      selectedLocation === city && styles.modalItemTextActive,
                    ]}
                  >
                    {city}
                  </Text>
                  {selectedLocation === city && (
                    <Ionicons name="checkmark" size={20} color="#7c3aed" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Radius Modal */}
      <Modal visible={showRadiusModal} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowRadiusModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn bán kính</Text>
              <TouchableOpacity onPress={() => setShowRadiusModal(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              {SEARCH_RADIUS.map((radius) => (
                <TouchableOpacity
                  key={radius.value}
                  style={[
                    styles.modalItem,
                    selectedRadius === radius.value && styles.modalItemActive,
                  ]}
                  onPress={() => {
                    setSelectedRadius(radius.value);
                    setShowRadiusModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      selectedRadius === radius.value && styles.modalItemTextActive,
                    ]}
                  >
                    {radius.label}
                  </Text>
                  {selectedRadius === radius.value && (
                    <Ionicons name="checkmark" size={20} color="#7c3aed" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Experience Modal */}
      <Modal visible={showExperienceModal} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowExperienceModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn kinh nghiệm</Text>
              <TouchableOpacity onPress={() => setShowExperienceModal(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              <TouchableOpacity
                style={[
                  styles.modalItem,
                  !selectedExperience && styles.modalItemActive,
                ]}
                onPress={() => {
                  setSelectedExperience(null);
                  setShowExperienceModal(false);
                }}
              >
                <Text
                  style={[
                    styles.modalItemText,
                    !selectedExperience && styles.modalItemTextActive,
                  ]}
                >
                  Tất cả
                </Text>
                {!selectedExperience && (
                  <Ionicons name="checkmark" size={20} color="#7c3aed" />
                )}
              </TouchableOpacity>
              {EXPERIENCE_LEVELS.map((exp) => (
                <TouchableOpacity
                  key={exp.value}
                  style={[
                    styles.modalItem,
                    selectedExperience === exp.value && styles.modalItemActive,
                  ]}
                  onPress={() => {
                    setSelectedExperience(exp.value);
                    setShowExperienceModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      selectedExperience === exp.value && styles.modalItemTextActive,
                    ]}
                  >
                    {exp.label}
                  </Text>
                  {selectedExperience === exp.value && (
                    <Ionicons name="checkmark" size={20} color="#7c3aed" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9FB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: {
    marginRight: 12,
    padding: 4,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  filtersBar: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filtersScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#ede9fe',
    borderColor: '#7c3aed',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  clearFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fee2e2',
  },
  clearFilterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ef4444',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  resultsList: {
    flex: 1,
  },
  jobsContainer: {
    padding: 16,
    gap: 12,
  },
  jobCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  jobImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    marginRight: 12,
  },
  placeholderImage: {
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  jobInfo: {
    flex: 1,
    gap: 4,
  },
  jobTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  jobMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  jobCompany: {
    fontSize: 13,
    color: '#64748b',
    flex: 1,
  },
  jobLocation: {
    fontSize: 12,
    color: '#94a3b8',
    flex: 1,
  },
  jobSalary: {
    fontSize: 13,
    color: '#10b981',
    fontWeight: '600',
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalItemActive: {
    backgroundColor: '#faf5ff',
  },
  modalItemText: {
    fontSize: 15,
    color: '#334155',
  },
  modalItemTextActive: {
    color: '#7c3aed',
    fontWeight: '600',
  },
});
