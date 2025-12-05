import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Animated as RNAnimated,
  Switch,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeBack } from "@/hooks/useSafeBack";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { db, auth } from "@/config/firebase";
import { collection, getDocs, doc, getDoc, query, where } from "firebase/firestore";
import { authApiService } from "@/services/authApi.service";
import { StudentProfile, Job as JobTypeFromTypes } from "@/types";
import { useStudentFilters } from "@/hooks/useStudentFilters";
import { eventBus, EVENTS } from "@/utils/eventBus";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PROFILE_FILTER_ACTIVE_KEY = '@profile_filter_active';

type Job = {
  $id: string;
  title: string;
  image?: string;
  company_logo?: string;
  company_name?: string;
  salary_text?: string;
  location?: string;
  jobCategories?: any;
  jobTypes?: any;
  company?: any;
  salary?: any;
  // Filter fields
  jobType?: 'employer_seeking' | 'candidate_seeking';
  posterId?: string;
  employerId?: string;
  source?: string;
};

type JobCategory = {
  $id: string;
  category_name: string;
};

type JobType = {
  $id: string;
  type_name: string;
};

// ✅ Category mappings for slug matching (used in both filteredJobs and sortedJobs)
const CATEGORY_MAPPINGS: Record<string, string[]> = {
  'công nghệ thông tin': ['it-software', 'it', 'software', 'tech', 'cntt', 'công nghệ'],
  'kế toán / kiểm toán': ['finance', 'accounting', 'ke-toan', 'kiem-toan', 'kế toán'],
  'marketing / truyền thông': ['marketing', 'pr', 'truyen-thong', 'digital-marketing'],
  'bán hàng / kinh doanh': ['sales', 'business', 'kinh-doanh', 'ban-hang'],
  'nhân sự': ['hr', 'human-resource', 'nhan-su', 'tuyen-dung'],
  'thiết kế đồ họa': ['design', 'graphic', 'thiet-ke', 'ui-ux', 'uiux'],
  'ẩm thực / f&b': ['f&b', 'fb', 'food', 'restaurant', 'am-thuc', 'nha-hang'],
  'du lịch / khách sạn': ['hospitality', 'hotel', 'tourism', 'du-lich', 'khach-san'],
  'xây dựng / kiến trúc': ['construction', 'xay-dung', 'kien-truc', 'building'],
  'giáo dục / đào tạo': ['education', 'giao-duc', 'dao-tao', 'teacher', 'giang-vien'],
  'bảo hiểm': ['insurance', 'bao-hiem'],
  'logistics / vận tải': ['logistics', 'shipping', 'van-tai', 'giao-hang'],
  'y tế / dược': ['healthcare', 'medical', 'y-te', 'duoc', 'pharmacy'],
  'hành chính / văn phòng': ['admin', 'office', 'hanh-chinh', 'van-phong'],
  'dịch vụ khách hàng': ['customer-service', 'cskh', 'support', 'call-center'],
  'khác': ['other', 'khac', 'general'],
};

// ✅ Helper: Check if job matches category
const jobMatchesCategory = (job: any, activeCategory: string, activeCatName: string): boolean => {
  if (activeCategory === "all") return true;
  
  const activeCatId = activeCategory.toLowerCase();
  
  // Method 1: Direct ID match
  const jobCatId = job.jobCategoryId || job.jobCategories?.$id || job.jobCategories?.id ||
                  (typeof job.jobCategories === "string" ? job.jobCategories : "");
  if (jobCatId === activeCategory) return true;
  
  // Method 2: Match category_name directly
  const jobCatName = (job.jobCategories?.category_name || '').toLowerCase();
  if (jobCatName && activeCatName && jobCatName === activeCatName) return true;
  
  // Method 3: Match by slug/name patterns (for crawled jobs like viecoi)
  const jobCatSlug = (typeof job.jobCategories === "string" ? job.jobCategories : job.jobCategoryId || '').toLowerCase();
  
  if (jobCatSlug && activeCatName) {
    // Check if the job's category slug matches any pattern for the selected category
    const patterns = CATEGORY_MAPPINGS[activeCatName] || [];
    if (patterns.some(pattern => jobCatSlug.includes(pattern) || pattern.includes(jobCatSlug))) {
      return true;
    }
    
    // Also check reverse - if selected category ID matches job's category name
    const reversePatterns = Object.entries(CATEGORY_MAPPINGS)
      .filter(([_, slugs]) => slugs.includes(activeCatId))
      .map(([name]) => name);
    if (reversePatterns.some(name => jobCatName.includes(name) || name.includes(jobCatName))) {
      return true;
    }
  }
  
  return false;
};

// ✅ Helper: Check if job matches type
const jobMatchesType = (job: any, activeType: string, activeTypeName: string): boolean => {
  if (activeType === "all") return true;
  
  // Method 1: Direct ID match
  const jobTypeId = job.jobTypeId || job.jobTypes?.$id || job.jobTypes?.id ||
                   (typeof job.jobTypes === "string" ? job.jobTypes : "");
  if (jobTypeId === activeType) return true;
  
  // Method 2: Match viecoi job_type_id with type_name
  const vieoiTypeId = job.job_type_id?.toLowerCase() || '';
  if (vieoiTypeId && activeTypeName) {
    if (vieoiTypeId === activeTypeName ||
        vieoiTypeId.replace(/-/g, ' ') === activeTypeName.replace(/-/g, ' ') ||
        vieoiTypeId.includes(activeTypeName) ||
        activeTypeName.includes(vieoiTypeId)) {
      return true;
    }
  }
  
  // Method 3: Match type_name directly
  const jobTypeName = (job.jobTypes?.type_name || '').toLowerCase();
  if (jobTypeName && activeTypeName && jobTypeName === activeTypeName) return true;
  
  return false;
};

const AllJobs = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ filterActive?: string }>();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [categories, setCategories] = useState<JobCategory[]>([]);
  const [types, setTypes] = useState<JobType[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activeType, setActiveType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "salary" | "match">("newest");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // ✅ NEW: Pagination - hiển thị 10 jobs mỗi lần
  const JOBS_PER_PAGE = 10;
  const [visibleCount, setVisibleCount] = useState(JOBS_PER_PAGE);
  
  // ✅ NEW: Student profile filter integration
  const [studentProfile, setStudentProfile] = useState<StudentProfile | undefined>();
  // ✅ FIX: Initialize as undefined, will be set from AsyncStorage or params
  const [profileFilterEnabled, setProfileFilterEnabled] = useState<boolean | undefined>(undefined);
  
  // Animation refs for each job card
  const fadeAnims = React.useRef<RNAnimated.Value[]>([]).current;

  // ✅ FIX: Load persisted profile filter state from AsyncStorage on mount
  // This ensures sync between home page and jobList page
  useEffect(() => {
    const loadPersistedFilterState = async () => {
      try {
        // If URL param is provided, use it (navigation from home with filter active)
        if (params.filterActive === 'true') {
          setProfileFilterEnabled(true);
          return;
        }
        
        // Otherwise, load from AsyncStorage to sync with home page state
        const savedActive = await AsyncStorage.getItem(PROFILE_FILTER_ACTIVE_KEY);
        if (savedActive !== null) {
          setProfileFilterEnabled(JSON.parse(savedActive));
        } else {
          setProfileFilterEnabled(false);
        }
      } catch (error) {
        console.error('Error loading filter state:', error);
        setProfileFilterEnabled(false);
      }
    };
    loadPersistedFilterState();
  }, [params.filterActive]);

  // ✅ NEW: Listen for FILTER_CHANGED events from home page
  useEffect(() => {
    const unsubscribe = eventBus.on(EVENTS.FILTER_CHANGED, (data) => {
      if (typeof data?.active === 'boolean') {
        setProfileFilterEnabled(data.active);
        // Reset sortBy if filter is turned off and currently on "match"
        if (!data.active && sortBy === "match") {
          setSortBy("newest");
        }
      }
    });
    return () => unsubscribe();
  }, [sortBy]);

  // ✅ Load student profile on mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await authApiService.getProfile();
        setStudentProfile(profile.studentProfile);
      } catch (error) {
        console.error('Error loading student profile:', error);
      }
    };
    loadProfile();
  }, []);

  // ✅ Listen for profile updates
  useEffect(() => {
    const unsubscribe = eventBus.on(EVENTS.PROFILE_UPDATED, async (data) => {
      if (data?.profile) {
        setStudentProfile(data.profile);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchData = async () => {
    try {
      const currentUserId = auth.currentUser?.uid;
      
      // Fetch all data in parallel for better performance
      const [jobsSnap, categoriesSnap, typesSnap, companiesSnap] = await Promise.all([
        getDocs(collection(db, "jobs")),
        getDocs(collection(db, "job_categories")),
        getDocs(collection(db, "job_types")),
        getDocs(collection(db, "companies")),
      ]);

      // Build lookup maps for O(1) access
      const categoriesMap = new Map<string, any>();
      categoriesSnap.docs.forEach((cat) => {
        categoriesMap.set(cat.id, { $id: cat.id, ...cat.data() });
      });

      const typesMap = new Map<string, any>();
      typesSnap.docs.forEach((type) => {
        typesMap.set(type.id, { $id: type.id, ...type.data() });
      });

      const companiesMap = new Map<string, any>();
      companiesSnap.docs.forEach((comp) => {
        companiesMap.set(comp.id, { $id: comp.id, ...comp.data() });
      });

      // Process jobs synchronously using lookup maps (no more async per job)
      const jobsData: Job[] = jobsSnap.docs
        .map((jobDoc) => {
          try {
            const jobData = jobDoc.data();
            
            if (!jobData.title) return null;

            // FILTER 1: Exclude candidate_seeking jobs (only show employer jobs)
            if (jobData.jobType === 'candidate_seeking') {
              return null;
            }
            
            // FILTER 2: Exclude current user's own job posts
            const jobPosterId = jobData.posterId || jobData.employerId || jobData.ownerId;
            if (currentUserId && jobPosterId === currentUserId) {
              return null;
            }
            
            // ✅ FILTER 3: Only show approved/active jobs (exclude pending/rejected)
            // Jobs from external sources (viecoi) don't need approval - always show them
            const jobStatus = jobData.status?.toLowerCase();
            const isExternalJob = jobData.source === 'viecoi' || jobData.external_url;
            
            // External jobs (viecoi crawled) always pass - they don't need approval
            // Internal jobs must be approved or active
            if (!isExternalJob && jobStatus && jobStatus !== 'approved' && jobStatus !== 'active') {
              return null;
            }

            // Process company data using lookup map
            let companyData: any = {};
            let companyName = '';
            let companyLogo = '';

            if (jobData.company_name) {
              companyName = jobData.company_name;
              companyLogo = jobData.company_logo || '';
            } else if (jobData.company) {
              const companyId = typeof jobData.company === "string" 
                ? jobData.company 
                : jobData.company.id || jobData.company.$id || "";
              
              if (companyId && companiesMap.has(companyId)) {
                companyData = companiesMap.get(companyId);
                companyName = companyData.corp_name || companyData.name || '';
                companyLogo = companyData.image || '';
              } else if (typeof jobData.company === 'object') {
                companyData = jobData.company;
                companyName = companyData.corp_name || companyData.name || '';
                companyLogo = companyData.image || '';
              }
            }

            // Process category using lookup map
            let categoryData = undefined;
            let categoryId = "";
            if (jobData.jobCategories) {
              const catId = typeof jobData.jobCategories === "string"
                ? jobData.jobCategories
                : jobData.jobCategories.id || jobData.jobCategories.$id || jobData.jobCategories.jobCategoryId || "";
              
              categoryId = catId;
              
              if (catId && categoriesMap.has(catId)) {
                categoryData = categoriesMap.get(catId);
              } else if (typeof jobData.jobCategories === 'object') {
                categoryData = jobData.jobCategories;
                categoryId = jobData.jobCategories.$id || jobData.jobCategories.id || "";
              }
            }

            // Process job type using lookup map
            // ✅ Support both jobTypes (manual jobs) and job_type_id (crawled jobs from viecoi)
            let typeData = undefined;
            let typeId = "";
            
            // First check job_type_id (viecoi crawled jobs format)
            if (jobData.job_type_id) {
              typeId = jobData.job_type_id;
              if (typesMap.has(typeId)) {
                typeData = typesMap.get(typeId);
              }
            }
            // Then check jobTypes (manual job posts format)
            else if (jobData.jobTypes) {
              const tId = typeof jobData.jobTypes === "string"
                ? jobData.jobTypes
                : jobData.jobTypes.id || jobData.jobTypes.$id || jobData.jobTypes.jobTypeId || "";
              
              typeId = tId;
              
              if (tId && typesMap.has(tId)) {
                typeData = typesMap.get(tId);
              } else if (typeof jobData.jobTypes === 'object') {
                typeData = jobData.jobTypes;
                typeId = jobData.jobTypes.$id || jobData.jobTypes.id || "";
              }
            }

            // Process salary
            let salaryDisplay = '';
            if (jobData.salary_text) {
              salaryDisplay = jobData.salary_text;
            } else if (jobData.salary) {
              if (typeof jobData.salary === 'string') {
                salaryDisplay = jobData.salary;
              } else if (jobData.salary.min && jobData.salary.max) {
                const minStr = jobData.salary.min.toLocaleString();
                const maxStr = jobData.salary.max.toLocaleString();
                const currency = jobData.salary.currency || 'VND';
                salaryDisplay = minStr + ' - ' + maxStr + ' ' + currency;
              } else {
                salaryDisplay = 'Thỏa thuận';
              }
            } else {
              salaryDisplay = 'Thỏa thuận';
            }

            // Process location
            const locationDisplay = jobData.location || 
                                   (companyData?.city ? (companyData.city + ', ' + (companyData.nation || 'Việt Nam')) : 'Không rõ');

            return {
              $id: jobDoc.id,
              ...jobData,
              displayImage: jobData.image || jobData.company_logo || companyLogo || '',
              displayCompanyName: companyName || 'Ẩn danh',
              displaySalary: salaryDisplay,
              displayLocation: locationDisplay,
              company: companyData,
              jobCategories: categoryData,
              jobCategoryId: categoryId,
              jobTypes: typeData,
              jobTypeId: typeId,
            } as unknown as Job;
          } catch (err) {
            console.warn('Error processing job:', jobDoc.id, err);
            return null;
          }
        })
        .filter((job): job is Job => job !== null);

      const categoriesData: JobCategory[] = Array.from(categoriesMap.values());
      const typesData: JobType[] = Array.from(typesMap.values());

      // Initialize animation values for new jobs
      while (fadeAnims.length < jobsData.length) {
        fadeAnims.push(new RNAnimated.Value(0));
      }

      setJobs(jobsData);
      setCategories(categoriesData);
      setTypes(typesData);
      
      // Animate cards appearing with stagger (limit to first 20 for performance)
      const animateCount = Math.min(jobsData.length, 20);
      for (let index = 0; index < animateCount; index++) {
        RNAnimated.timing(fadeAnims[index], {
          toValue: 1,
          duration: 300,
          delay: index * 30,
          useNativeDriver: true,
        }).start();
      }
      // Set remaining to visible immediately
      for (let index = animateCount; index < jobsData.length; index++) {
        fadeAnims[index]?.setValue(1);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Memoized filtered & sorted jobs with fixed logic
  const filteredJobs = useMemo(() => {
    let result = [...jobs];
    
    // Get active category/type names for matching
    const activeCatName = categories.find(c => c.$id === activeCategory)?.category_name?.toLowerCase() || '';
    const activeTypeName = types.find(t => t.$id === activeType)?.type_name?.toLowerCase() || '';

    // 1. Filter by category using helper
    if (activeCategory !== "all") {
      result = result.filter((job) => jobMatchesCategory(job, activeCategory, activeCatName));
    }

    // 2. Filter by type using helper
    if (activeType !== "all") {
      result = result.filter((job) => jobMatchesType(job, activeType, activeTypeName));
    }

    // 3. Sort
    if (sortBy === "newest") {
      result.sort((a, b) => {
        const aTime = (a as any).createdAt?.toMillis?.() || (a as any).createdAt?.seconds * 1000 || 0;
        const bTime = (b as any).createdAt?.toMillis?.() || (b as any).createdAt?.seconds * 1000 || 0;
        return bTime - aTime;
      });
    } else if (sortBy === "salary") {
      result.sort((a, b) => {
        const getSalaryValue = (job: Job) => {
          const salary = (job as any).salary;
          if (typeof salary === "object" && salary?.max) {
            return salary.max;
          }
          return 0;
        };
        return getSalaryValue(b) - getSalaryValue(a);
      });
    }

    return result;
  }, [jobs, activeCategory, activeType, sortBy, types, categories]);

  // ✅ FIX: Apply student profile filter using useStudentFilters hook
  // Truyền TOÀN BỘ jobs (không qua category/type filter) để hook tính matchScore chính xác
  // Category/type filter sẽ được áp dụng SAU khi đã có matchScore
  const {
    filteredJobs: profileFilteredJobs,
    profileFilterActive,
    handleProfileFilterToggle,
    matchedJobsCount,
    totalJobsCount,
  } = useStudentFilters(
    jobs as unknown as JobTypeFromTypes[], // ✅ FIX: Truyền toàn bộ jobs thay vì filteredJobs
    studentProfile
  );

  // ✅ FIX: Combine category/type filter + profile filter + sorting
  const sortedJobs = useMemo(() => {
    let result: any[] = [];
    
    // Get active category/type names for matching
    const activeCatName = categories.find(c => c.$id === activeCategory)?.category_name?.toLowerCase() || '';
    const activeTypeName = types.find(t => t.$id === activeType)?.type_name?.toLowerCase() || '';
    
    // When profile filter is enabled, start from profileFilteredJobs (has matchScore)
    // Then apply category/type filters ON TOP of profile filter
    if (profileFilterEnabled && studentProfile) {
      result = [...profileFilteredJobs];
      
      // ✅ FIX: Apply category filter using helper
      if (activeCategory !== "all") {
        result = result.filter((job: any) => jobMatchesCategory(job, activeCategory, activeCatName));
      }
      
      // ✅ FIX: Apply type filter using helper
      if (activeType !== "all") {
        result = result.filter((job: any) => jobMatchesType(job, activeType, activeTypeName));
      }
    } else {
      // Khi tắt profile filter: dùng filteredJobs (đã qua category/type filter)
      result = [...filteredJobs];
    }
    
    // ✅ FIX: Apply sorting - giữ nguyên matchScore
    if (sortBy === "newest") {
      result.sort((a, b) => {
        const aTime = (a as any).createdAt?.toMillis?.() || (a as any).createdAt?.seconds * 1000 || 0;
        const bTime = (b as any).createdAt?.toMillis?.() || (b as any).createdAt?.seconds * 1000 || 0;
        return bTime - aTime;
      });
    } else if (sortBy === "salary") {
      result.sort((a, b) => {
        const getSalaryValue = (job: any) => {
          if (typeof job.salary === "object" && job.salary?.max) return job.salary.max;
          if (job.salary_max) return job.salary_max;
          if (job.salary_min) return job.salary_min;
          if (job.salary_text) {
            const match = job.salary_text.match(/(\d+)/g);
            if (match && match.length > 0) {
              return parseInt(match[match.length - 1]) * (job.salary_text.includes('triệu') ? 1000000 : 1);
            }
          }
          return 0;
        };
        return getSalaryValue(b) - getSalaryValue(a);
      });
    } else if (sortBy === "match") {
      // Sort by match score (highest first)
      result.sort((a, b) => {
        const aScore = (a as any).matchScore?.totalScore || 0;
        const bScore = (b as any).matchScore?.totalScore || 0;
        return bScore - aScore;
      });
    }
    
    return result;
  }, [profileFilterEnabled, profileFilteredJobs, filteredJobs, studentProfile, sortBy, activeCategory, activeType, categories, types]);

  // ✅ NEW: Apply pagination - khi bật filter thì hiển thị tất cả jobs phù hợp, khi tắt thì phân trang
  const displayJobs = useMemo(() => {
    // ✅ FIX: Treat undefined as false (filter OFF)
    const filterEnabled = profileFilterEnabled === true;
    
    // Khi bật lọc theo hồ sơ: hiển thị TẤT CẢ công việc phù hợp
    if (filterEnabled && studentProfile) {
      return sortedJobs;
    }
    // Khi tắt lọc hoặc chưa load xong: hiển thị theo pagination
    return sortedJobs.slice(0, visibleCount);
  }, [sortedJobs, visibleCount, profileFilterEnabled, studentProfile]);

  // ✅ NEW: Reset visible count khi thay đổi filter
  useEffect(() => {
    setVisibleCount(JOBS_PER_PAGE);
  }, [activeCategory, activeType, profileFilterEnabled]);

  // ✅ NEW: Kiểm tra còn jobs để load thêm không
  // ✅ FIX: Treat undefined as false (filter OFF)
  const hasMoreJobs = profileFilterEnabled !== true && visibleCount < sortedJobs.length;

  // ✅ NEW: Load thêm jobs
  const handleLoadMore = useCallback(() => {
    setVisibleCount(prev => prev + JOBS_PER_PAGE);
  }, []);

  // ✅ FIX: Toggle profile filter - sync với hook và persist to AsyncStorage
  const toggleProfileFilter = useCallback(async (value: boolean) => {
    setProfileFilterEnabled(value);
    handleProfileFilterToggle(value);
    
    // ✅ Persist to AsyncStorage so other pages stay in sync
    try {
      await AsyncStorage.setItem(PROFILE_FILTER_ACTIVE_KEY, JSON.stringify(value));
    } catch (error) {
      console.error('Error saving filter state:', error);
    }
    
    // ✅ FIX: Reset sortBy to "newest" when turning OFF profile filter
    // This prevents "match" sort from persisting when it's no longer available
    if (!value && sortBy === "match") {
      setSortBy("newest");
    }
  }, [handleProfileFilterToggle, sortBy]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  // ✅ REMOVED: Old auto-enable effect - now handled in loadPersistedFilterState useEffect

  const { goBack } = useSafeBack();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9F9FB" }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={goBack}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tất cả công việc</Text>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{displayJobs.length}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A80F0" />
          <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* ✅ FIX: Profile Filter Toggle - hiển thị đúng matchedJobsCount từ hook */}
          {studentProfile && (
            <View style={styles.profileFilterRow}>
              <View style={styles.profileFilterLeft}>
                <Ionicons 
                  name={profileFilterEnabled === true ? "filter" : "filter-outline"} 
                  size={18} 
                  color={profileFilterEnabled === true ? "#4A80F0" : "#64748b"} 
                />
                <Text style={[
                  styles.profileFilterText,
                  profileFilterEnabled === true && styles.profileFilterTextActive
                ]}>
                  Lọc theo hồ sơ
                </Text>
                {profileFilterEnabled === true && (
                  <View style={styles.filterMatchBadge}>
                    <Text style={styles.filterMatchBadgeText}>
                      {matchedJobsCount} phù hợp
                    </Text>
                  </View>
                )}
              </View>
              <Switch
                value={profileFilterEnabled === true}
                onValueChange={toggleProfileFilter}
                trackColor={{ false: '#e2e8f0', true: '#93c5fd' }}
                thumbColor={profileFilterEnabled === true ? '#4A80F0' : '#f4f4f5'}
              />
            </View>
          )}

          {/* Filter Stats & Sort */}
          <View style={styles.filterStatsRow}>
            <Text style={styles.filterStatsText}>
              {profileFilterEnabled === true 
                ? (activeCategory !== "all" || activeType !== "all")
                  ? `${sortedJobs.length}/${matchedJobsCount} công việc phù hợp (đã lọc thêm)`
                  : `${matchedJobsCount} công việc phù hợp`
                : (activeCategory !== "all" || activeType !== "all")
                  ? `${sortedJobs.length}/${jobs.length} công việc (đã lọc)`
                  : `${jobs.length} công việc`
              }
            </Text>
            
            <View style={styles.sortButtons}>
              <TouchableOpacity
                style={[styles.sortBtn, sortBy === "newest" && styles.sortBtnActive]}
                onPress={() => setSortBy("newest")}
              >
                <Ionicons 
                  name="time-outline" 
                  size={14} 
                  color={sortBy === "newest" ? "#4A80F0" : "#64748b"} 
                />
                <Text style={[styles.sortBtnText, sortBy === "newest" && styles.sortBtnTextActive]}>
                  Mới nhất
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.sortBtn, sortBy === "salary" && styles.sortBtnActive]}
                onPress={() => setSortBy("salary")}
              >
                <Ionicons 
                  name="cash-outline" 
                  size={14} 
                  color={sortBy === "salary" ? "#4A80F0" : "#64748b"} 
                />
                <Text style={[styles.sortBtnText, sortBy === "salary" && styles.sortBtnTextActive]}>
                  Lương cao
                </Text>
              </TouchableOpacity>
              
              {/* Show "Phù hợp" sort only when profile filter is enabled */}
              {profileFilterEnabled === true && studentProfile && (
                <TouchableOpacity
                  style={[styles.sortBtn, sortBy === "match" && styles.sortBtnActive]}
                  onPress={() => setSortBy("match")}
                >
                  <Ionicons 
                    name="star-outline" 
                    size={14} 
                    color={sortBy === "match" ? "#4A80F0" : "#64748b"} 
                  />
                  <Text style={[styles.sortBtnText, sortBy === "match" && styles.sortBtnTextActive]}>
                    Phù hợp
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <ScrollView 
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
          >
            {/* Category Tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabScroll}
            >
              <TouchableOpacity
                style={[styles.tabButton, activeCategory === "all" && styles.tabButtonActive]}
                onPress={() => setActiveCategory("all")}
              >
                <Text style={[styles.tabText, activeCategory === "all" && styles.tabTextActive]}>
                  Tất cả
                </Text>
              </TouchableOpacity>

              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.$id}
                  style={[styles.tabButton, activeCategory === cat.$id && styles.tabButtonActive]}
                  onPress={() => setActiveCategory(cat.$id)}
                >
                  <Text style={[styles.tabText, activeCategory === cat.$id && styles.tabTextActive]}>
                    {cat.category_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Type Tabs - Simplified */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.tabScroll, { paddingTop: 0 }]}
            >
              <TouchableOpacity
                style={[styles.tabButton, activeType === "all" && styles.tabButtonActive]}
                onPress={() => setActiveType("all")}
              >
                <Text style={[styles.tabText, activeType === "all" && styles.tabTextActive]}>
                  Tất cả
                </Text>
              </TouchableOpacity>

              {types.map((type) => (
                <TouchableOpacity
                  key={type.$id}
                  style={[styles.tabButton, activeType === type.$id && styles.tabButtonActive]}
                  onPress={() => setActiveType(type.$id)}
                >
                  <Text style={[styles.tabText, activeType === type.$id && styles.tabTextActive]}>
                    {type.type_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Jobs List - Using native Animated instead of reanimated */}
            <View style={styles.jobsContainer}>
              {displayJobs.map((job, index) => {
                // ✅ FIX: Get matchScore for displaying "phù hợp %"
                const matchScore = (job as any).matchScore;
                const isHighMatch = (job as any).isHighMatch || (matchScore?.totalScore >= 0.6);
                const matchPercent = matchScore?.totalScore ? Math.round(matchScore.totalScore * 100) : 0;
                
                return (
                <RNAnimated.View
                  key={job.$id}
                  style={{
                    opacity: fadeAnims[index] || 1,
                    transform: [{
                      translateY: fadeAnims[index] 
                        ? fadeAnims[index].interpolate({
                            inputRange: [0, 1],
                            outputRange: [20, 0],
                          })
                        : 0,
                    }],
                  }}
                >
                  <TouchableOpacity
                    style={styles.jobCard}
                    activeOpacity={0.7}
                    onPress={() => router.push({ pathname: "/(shared)/jobDescription", params: { jobId: job.$id, from: '/(shared)/jobList' } })}
                  >
                    {/* ✅ NEW: Match Score Badge - only show when profile filter is enabled */}
                    {profileFilterEnabled === true && matchScore && matchPercent > 0 && (
                      <View style={[
                        styles.matchBadge, 
                        isHighMatch ? styles.matchBadgeHigh : styles.matchBadgeLow
                      ]}>
                        <Ionicons 
                          name={isHighMatch ? "star" : "checkmark-circle"} 
                          size={12} 
                          color="#fff" 
                        />
                        <Text style={styles.matchBadgeText}>
                          Phù hợp {matchPercent}%
                        </Text>
                      </View>
                    )}
                    
                    {/* Job Image with fallback */}
                    {(job as any).displayImage ? (
                      <Image source={{ uri: (job as any).displayImage }} style={styles.jobImage} />
                    ) : (
                      <View style={[styles.jobImage, styles.placeholderImage]}>
                        <Ionicons name="briefcase-outline" size={32} color="#94a3b8" />
                      </View>
                    )}

                    <View style={styles.jobDetails}>
                      <Text style={styles.jobTitle} numberOfLines={2}>
                        {job.title}
                      </Text>
                      
                      {/* Company Name */}
                      <View style={styles.infoRow}>
                        <Ionicons name="business-outline" size={14} color="#64748b" />
                        <Text style={styles.jobCompany} numberOfLines={1}>
                          {(job as any).displayCompanyName}
                        </Text>
                      </View>

                      {/* Location */}
                      <View style={styles.infoRow}>
                        <Ionicons name="location-outline" size={14} color="#64748b" />
                        <Text style={styles.jobLocation} numberOfLines={1}>
                          {(job as any).displayLocation}
                        </Text>
                      </View>

                      {/* Salary */}
                      <View style={styles.infoRow}>
                        <Ionicons name="cash-outline" size={14} color="#10b981" />
                        <Text style={styles.jobSalary} numberOfLines={1}>
                          {(job as any).displaySalary}
                        </Text>
                      </View>

                      {/* Job Type & Category Badges */}
                      <View style={styles.badgeRow}>
                        {job.jobTypes && (
                          <View style={styles.badge}>
                            <Text style={styles.badgeText}>
                              {typeof job.jobTypes === "string" ? job.jobTypes : job.jobTypes.type_name || 'Full-time'}
                            </Text>
                          </View>
                        )}
                        {job.jobCategories && (
                          <View style={[styles.badge, styles.categoryBadge]}>
                            <Text style={[styles.badgeText, styles.categoryBadgeText]}>
                              {typeof job.jobCategories === "string" ? job.jobCategories : job.jobCategories.category_name || ''}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Arrow icon */}
                    <Ionicons name="chevron-forward" size={20} color="#cbd5e1" style={styles.arrowIcon} />
                  </TouchableOpacity>
                </RNAnimated.View>
              );
              })}

              {displayJobs.length === 0 && (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIcon}>
                    <Ionicons name="briefcase-outline" size={64} color="#cbd5e1" />
                  </View>
                  <Text style={styles.emptyTitle}>Không tìm thấy công việc</Text>
                  <Text style={styles.emptySubtitle}>
                    {profileFilterEnabled === true 
                      ? "Không có công việc phù hợp với hồ sơ. Thử tắt bộ lọc hoặc cập nhật hồ sơ."
                      : "Thử điều chỉnh bộ lọc để xem thêm công việc"
                    }
                  </Text>
                  {(activeCategory !== "all" || activeType !== "all" || profileFilterEnabled === true) && (
                    <TouchableOpacity
                      style={styles.resetButton}
                      onPress={() => {
                        setActiveCategory("all");
                        setActiveType("all");
                        if (profileFilterEnabled === true) {
                          toggleProfileFilter(false);
                        }
                      }}
                    >
                      <Text style={styles.resetButtonText}>Xóa bộ lọc</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* ✅ NEW: Nút Xem thêm - chỉ hiện khi không bật filter và còn jobs */}
              {hasMoreJobs && (
                <TouchableOpacity
                  style={styles.loadMoreButton}
                  onPress={handleLoadMore}
                  activeOpacity={0.7}
                >
                  <Text style={styles.loadMoreText}>
                    Xem thêm ({sortedJobs.length - visibleCount} công việc)
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#4A80F0" />
                </TouchableOpacity>
              )}

              {/* Hiển thị thông tin đã xem hết */}
              {!hasMoreJobs && displayJobs.length > 0 && profileFilterEnabled !== true && (
                <View style={styles.endListContainer}>
                  <Text style={styles.endListText}>
                    Đã hiển thị tất cả {sortedJobs.length} công việc
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
};

export default AllJobs;

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#4A80F0",
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  backBtn: {
    marginRight: 12,
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    flex: 1,
  },
  headerBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  headerBadgeText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#64748b",
    marginTop: 8,
    fontSize: 14,
  },
  // ✅ NEW: Profile Filter Row styles
  profileFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  profileFilterLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  profileFilterText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },
  profileFilterTextActive: {
    color: "#4A80F0",
  },
  // ✅ Style for match badge in filter row
  filterMatchBadge: {
    backgroundColor: "#dbeafe",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  filterMatchBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3b82f6",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1e293b",
  },
  clearBtn: {
    padding: 4,
  },
  filterStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterStatsText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
  },
  sortButtons: {
    flexDirection: "row",
    gap: 6,
  },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },
  sortBtnActive: {
    backgroundColor: "#e0edff",
  },
  sortBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  sortBtnTextActive: {
    color: "#4A80F0",
  },
  tabScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tabButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  tabButtonActive: {
    backgroundColor: "#4A80F0",
    borderColor: "#4A80F0",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
  },
  tabTextActive: {
    color: "#fff",
  },
  jobsContainer: {
    padding: 16,
    gap: 12,
  },
  jobCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    position: "relative", // ✅ For absolute positioning of match badge
  },
  // ✅ NEW: Match score badge styles
  matchBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
  },
  matchBadgeHigh: {
    backgroundColor: "#10b981",
  },
  matchBadgeLow: {
    backgroundColor: "#f59e0b",
  },
  matchBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },
  jobImage: {
    width: 70,
    height: 70,
    borderRadius: 12,
    marginRight: 12,
  },
  placeholderImage: {
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  jobDetails: {
    flex: 1,
    gap: 6,
  },
  jobTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 2,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  jobCompany: {
    fontSize: 13,
    color: "#64748b",
    flex: 1,
    fontWeight: "500",
  },
  jobLocation: {
    fontSize: 12,
    color: "#94a3b8",
    flex: 1,
  },
  jobSalary: {
    fontSize: 13,
    color: "#10b981",
    fontWeight: "700",
    flex: 1,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
    flexWrap: "wrap",
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#eff6ff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    color: "#3b82f6",
    fontWeight: "700",
  },
  categoryBadge: {
    backgroundColor: "#f0fdf4",
  },
  categoryBadgeText: {
    color: "#16a34a",
  },
  arrowIcon: {
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#e2e8f0",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  resetButton: {
    backgroundColor: "#4A80F0",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: "#4A80F0",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  resetButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  // ✅ NEW: Load More button styles
  loadMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#4A80F0",
    gap: 8,
  },
  loadMoreText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4A80F0",
  },
  endListContainer: {
    alignItems: "center",
    paddingVertical: 20,
    marginBottom: 16,
  },
  endListText: {
    fontSize: 13,
    color: "#94a3b8",
    fontStyle: "italic",
  },
});