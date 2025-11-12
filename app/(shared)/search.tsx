import { useLocalSearchParams } from 'expo-router';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import DropDownPicker from 'react-native-dropdown-picker';
import { Provider as PaperProvider } from 'react-native-paper';
import { router } from 'expo-router';
import { db } from '@/config/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { searchJobs, isAlgoliaAvailable } from '@/services/algoliaSearch.service';
import { Ionicons } from '@expo/vector-icons';

interface Job {
  $id: string;
  title: string;
  company: string;
  companyId?: string;
  location?: string;
  type?: string;
  category?: string;
  salary?: any;
  skills?: string[];
  description?: string;
  _highlightResult?: any; // Algolia highlights
}

interface JobType {
  $id: string;
  type_name: string;
}

interface JobCategory {
  $id: string;
  category_name: string;
}
interface Company {
  $id: string;
  corp_name: string;
  nation: string;
  corp_description: string;
  city: string;
}

export default function SearchScreen() {
  const { q } = useLocalSearchParams();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState(0);
  
  const [company, setCompany] = useState<Company[]>([]);
  const [jobTypes, setJobTypes] = useState<JobType[]>([]);
  const [jobCategories, setJobCategories] = useState<JobCategory[]>([]);

  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);

  // Check if Algolia is available
  const useAlgolia = isAlgoliaAvailable();

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // ✅ Use Algolia if available, fallback to Firestore
      if (useAlgolia) {
        console.log('🔍 Using Algolia search');
        
        const result = await searchJobs({
          query: typeof q === 'string' ? q : '',
          jobType: selectedTypeId || undefined,
          category: selectedCategoryId || undefined,
          companyId: selectedCompanyId || undefined,
          hitsPerPage: 50,
        });

        setJobs(result.jobs);
        setTotalResults(result.total);
        console.log(`✅ Algolia: Found ${result.total} jobs`);
      } else {
        // Fallback: Firestore client-side filtering
        console.log('⚠️  Algolia unavailable, using Firestore fallback');
        
        const qJobs = collection(db, 'jobs');
        const snapshot = await getDocs(qJobs);

        let formattedJobs: Job[] = snapshot.docs
          .map((docSnap) => {
            const data = docSnap.data();
            return {
              $id: docSnap.id,
              title: data.title || '',
              company: data.company?.corp_name || data.company || '',
              companyId: data.companyId || data.company?.$id,
              location: data.location || '',
              type: data.type || data.jobTypes,
              category: data.category || data.jobCategories,
              salary: data.salary,
              skills: data.skills || [],
              description: data.description || '',
            } as Job;
          });

        // Client-side filtering
        if (q && typeof q === 'string') {
          const searchLower = q.toLowerCase().trim();
          formattedJobs = formattedJobs.filter(job =>
            job.title?.toLowerCase().includes(searchLower) ||
            job.company?.toLowerCase().includes(searchLower)
          );
        }

        if (selectedTypeId) {
          formattedJobs = formattedJobs.filter(job => job.type === selectedTypeId);
        }

        if (selectedCategoryId) {
          formattedJobs = formattedJobs.filter(job => job.category === selectedCategoryId);
        }

        if (selectedCompanyId) {
          formattedJobs = formattedJobs.filter(job => job.companyId === selectedCompanyId);
        }

        setJobs(formattedJobs);
        setTotalResults(formattedJobs.length);
        console.log(`� Firestore fallback: Found ${formattedJobs.length} jobs`);
      }
    } catch (error: any) {
      console.error('❌ Error fetching jobs:', error);
      setError(error.message || 'Có lỗi xảy ra khi tìm kiếm');
      setJobs([]);
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
  }, [q, selectedTypeId, selectedCategoryId, selectedCompanyId, useAlgolia]);

  const fetchFilters = async () => {
    try {
      const typesSnap = await getDocs(collection(db, 'job_types'));
      const categoriesSnap = await getDocs(collection(db, 'job_categories'));
      const companySnap = await getDocs(collection(db, 'companies'));

      setJobTypes(
        typesSnap.docs.map((doc) => ({
          $id: doc.id,
          type_name: doc.data().type_name,
        }))
      );

      setJobCategories(
        categoriesSnap.docs.map((doc) => ({
          $id: doc.id,
          category_name: doc.data().category_name,
        }))
      );
      setCompany(
        companySnap.docs.map((doc) => ({
          $id: doc.id,
          corp_name: doc.data().corp_name,
          nation: doc.data().nation,
          corp_description: doc.data().corp_description,
          city: doc.data().city,
        }))
      );
    } catch (err) {
      console.error('Error loading filters:', err);
    }
  };

  const clearFilters = () => {
    setSelectedTypeId(null);
    setSelectedCategoryId(null);
    setSelectedCompanyId(null);
  };

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [q, selectedTypeId, selectedCategoryId, selectedCompanyId]);

  return (
    <PaperProvider>
      <View style={styles.container}>
        {/* Header với search info */}
        <View style={styles.header}>
          <Text style={styles.heading}>
            Kết quả tìm kiếm
            {q && <Text style={styles.queryText}> "{q}"</Text>}
          </Text>
          {!loading && (
            <View style={styles.resultCount}>
              {useAlgolia && <Ionicons name="flash" size={16} color="#10b981" />}
              <Text style={styles.resultText}>
                {totalResults} công việc
                {useAlgolia && ' (Algolia)'}
              </Text>
            </View>
          )}
        </View>

        {/* DropDown Loại công việc */}
        <View style={{ zIndex: 2000 }}>
          <DropDownPicker
            open={typeDropdownOpen}
            setOpen={setTypeDropdownOpen}
            value={selectedTypeId}
            setValue={setSelectedTypeId}
            items={jobTypes.map((type) => ({
              label: type.type_name,
              value: type.$id
            }))}
            placeholder="Loại công việc"
            style={styles.dropdown}
            dropDownContainerStyle={styles.dropdownContainer}
          />
        </View>

        {/* DropDown Danh mục công việc */}
        <View style={{ zIndex: 1000 }}>
          <DropDownPicker
            open={categoryDropdownOpen}
            setOpen={setCategoryDropdownOpen}
            value={selectedCategoryId}
            setValue={setSelectedCategoryId}
            items={jobCategories.map((cat) => ({
              label: cat.category_name,
              value: cat.$id
            }))}
            placeholder="Danh mục công việc"
            style={styles.dropdown}
            dropDownContainerStyle={styles.dropdownContainer}
          />
        </View>
         {/* DropDown Danh mục công ty */}
         <View style={{ zIndex: 800 }}>
          <DropDownPicker
            open={companyDropdownOpen}
            setOpen={setCompanyDropdownOpen}
            value={selectedCompanyId}
            setValue={setSelectedCompanyId}
            items={company.map((com) => ({
              label: com.corp_name,
              value: com.$id
            }))}
            placeholder="Danh mục công ty"
            style={styles.dropdown}
            dropDownContainerStyle={styles.dropdownContainer}
          />
        </View>
        <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
          <Ionicons name="close-circle" size={16} color="#ef4444" />
          <Text style={styles.clearButtonText}>Xóa bộ lọc</Text>
        </TouchableOpacity>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A80F0" />
            <Text style={styles.loadingText}>
              {useAlgolia ? 'Đang tìm kiếm với Algolia...' : 'Đang tìm kiếm...'}
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={48} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchJobs}>
              <Text style={styles.retryButtonText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : jobs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={64} color="#94a3b8" />
            <Text style={styles.emptyText}>Không tìm thấy công việc phù hợp</Text>
            <Text style={styles.emptySubtext}>
              Thử điều chỉnh bộ lọc hoặc tìm kiếm với từ khóa khác
            </Text>
          </View>
        ) : (
          <FlatList
            data={jobs}
            keyExtractor={(item) => item.$id}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => router.push({ pathname: "/jobDescription", params: { jobId: item.$id } })}
                activeOpacity={0.7}
              >
                <View style={styles.jobItem}>
                  <View style={styles.jobHeader}>
                    <Text style={styles.jobTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    {item.type && (
                      <View style={styles.typeBadge}>
                        <Text style={styles.typeBadgeText}>
                          {jobTypes.find(t => t.$id === item.type)?.type_name || item.type}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.jobDetails}>
                    <View style={styles.detailRow}>
                      <Ionicons name="business-outline" size={14} color="#64748b" />
                      <Text style={styles.detailText} numberOfLines={1}>
                        {item.company}
                      </Text>
                    </View>
                    {item.location && (
                      <View style={styles.detailRow}>
                        <Ionicons name="location-outline" size={14} color="#64748b" />
                        <Text style={styles.detailText} numberOfLines={1}>
                          {item.location}
                        </Text>
                      </View>
                    )}
                    {item.salary && (
                      <View style={styles.detailRow}>
                        <Ionicons name="cash-outline" size={14} color="#10b981" />
                        <Text style={[styles.detailText, { color: '#10b981', fontWeight: '600' }]}>
                          {typeof item.salary === 'object' 
                            ? `${item.salary.min?.toLocaleString()} - ${item.salary.max?.toLocaleString()} ${item.salary.currency || 'VND'}`
                            : item.salary.toLocaleString() + ' VND'}
                        </Text>
                      </View>
                    )}
                  </View>
                  {item.skills && item.skills.length > 0 && (
                    <View style={styles.skillsContainer}>
                      {item.skills.slice(0, 3).map((skill, index) => (
                        <View key={index} style={styles.skillChip}>
                          <Text style={styles.skillText}>{skill}</Text>
                        </View>
                      ))}
                      {item.skills.length > 3 && (
                        <Text style={styles.moreSkills}>+{item.skills.length - 3}</Text>
                      )}
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.listContent}
          />
        )}
    </View>           
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingTop: 50,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  queryText: {
    color: '#4A80F0',
    fontStyle: 'italic',
  },
  resultCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  resultText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  dropdown: {
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginTop: 12,
  },
  dropdownContainer: {
    borderColor: '#e2e8f0',
    borderRadius: 12,
    marginHorizontal: 16,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    alignSelf: 'flex-start',
  },
  clearButtonText: {
    color: '#ef4444',
    fontWeight: '600',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    fontWeight: '500',
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: '#4A80F0',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  jobItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4A80F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  jobTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
    marginRight: 8,
  },
  typeBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1e40af',
    textTransform: 'uppercase',
  },
  jobDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#64748b',
    flex: 1,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  skillChip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  skillText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  moreSkills: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
    alignSelf: 'center',
  },
});
