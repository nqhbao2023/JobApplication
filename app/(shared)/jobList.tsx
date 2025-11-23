import React, { useEffect, useState, useMemo } from "react";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Image,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "@/config/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";

type Job = {
  $id: string;
  title: string;
  image?: string;
  company_logo?: string; // ✅ Thêm field từ viecoi
  company_name?: string; // ✅ Thêm field từ viecoi
  salary_text?: string;  // ✅ Thêm field từ viecoi
  location?: string;     // ✅ Thêm field từ viecoi
  jobCategories?: any;
  jobTypes?: any;
  company?: any;
  salary?: any;
};

type JobCategory = {
  $id: string;
  category_name: string;
};

type JobType = {
  $id: string;
  type_name: string;
};

const AllJobs = () => {
  console.log('🟡 AllJobs component mounted');
  
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [categories, setCategories] = useState<JobCategory[]>([]);
  const [types, setTypes] = useState<JobType[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activeType, setActiveType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "salary">("newest");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      console.log('🔵 [1] Bắt đầu fetch...');
      
      const jobsSnap = await getDocs(collection(db, "jobs"));
      console.log('🔵 [2] Firebase jobs count:', jobsSnap.docs.length);
      
      const categoriesSnap = await getDocs(collection(db, "job_categories"));
      const typesSnap = await getDocs(collection(db, "job_types"));

      // ✅ Normalize jobs data
      const jobsData: Job[] = (
        await Promise.all(
          jobsSnap.docs.map(async (jobDoc) => {
            const jobData = jobDoc.data();
            console.log('🔵 [3] Processing job:', jobDoc.id, jobData.title);
            
            if (!jobData.title) return null;

            // ✅ Xử lý company data
            let companyData: any = {};
            let companyName = '';
            let companyLogo = '';

            if (jobData.company_name) {
              // Viecoi job - có sẵn company_name
              companyName = jobData.company_name;
              companyLogo = jobData.company_logo || '';
            } else if (jobData.company) {
              // Internal job - cần fetch company
              const companyId = typeof jobData.company === "string" 
                ? jobData.company 
                : jobData.company.id || jobData.company.$id || "";
              
              if (companyId) {
                try {
                  const companySnap = await getDoc(doc(db, "companies", companyId));
                  if (companySnap.exists()) {
                    companyData = { $id: companySnap.id, ...companySnap.data() };
                    companyName = companyData.corp_name || companyData.name || '';
                    companyLogo = companyData.image || '';
                  }
                } catch (err) {
                  console.warn('⚠️ Failed to fetch company:', companyId);
                }
              } else if (typeof jobData.company === 'object') {
                companyData = jobData.company;
                companyName = companyData.corp_name || companyData.name || '';
                companyLogo = companyData.image || '';
              }
            }

            // ✅ Xử lý category
            let categoryData = undefined;
            let categoryId = "";
            if (jobData.jobCategories) {
              const catId = typeof jobData.jobCategories === "string"
                ? jobData.jobCategories
                : jobData.jobCategories.id || jobData.jobCategories.jobCategoryId || "";
              
              categoryId = catId;
              
              if (catId) {
                try {
                  const catSnap = await getDoc(doc(db, "job_categories", catId));
                  if (catSnap.exists()) {
                    categoryData = { $id: catSnap.id, ...catSnap.data() };
                    console.log(`📁 Job "${jobData.title}" -> Category: ${(categoryData as any).category_name} (${catSnap.id})`);
                  }
                } catch (err) {
                  console.warn('⚠️ Failed to fetch category:', catId);
                }
              } else {
                categoryData = jobData.jobCategories;
              }
            }

            // ✅ Xử lý job type
            let typeData = undefined;
            let typeId = "";
            if (jobData.jobTypes) {
              const tId = typeof jobData.jobTypes === "string"
                ? jobData.jobTypes
                : jobData.jobTypes.id || jobData.jobTypes.jobTypeId || "";
              
              typeId = tId;
              
              if (tId) {
                try {
                  const typeSnap = await getDoc(doc(db, "job_types", tId));
                  if (typeSnap.exists()) {
                    typeData = { $id: typeSnap.id, ...typeSnap.data() };
                    console.log(`🏷️  Job "${jobData.title}" -> Type: ${(typeData as any).type_name} (${typeSnap.id})`);
                  }
                } catch (err) {
                  console.warn('⚠️ Failed to fetch type:', tId);
                }
              } else {
                typeData = jobData.jobTypes;
              }
            }

            // ✅ Xử lý salary
            let salaryDisplay = '';
            if (jobData.salary_text) {
              // Viecoi job
              salaryDisplay = jobData.salary_text;
            } else if (jobData.salary) {
              if (typeof jobData.salary === 'string') {
                salaryDisplay = jobData.salary;
              } else if (jobData.salary.min && jobData.salary.max) {
                salaryDisplay = `${jobData.salary.min.toLocaleString()} - ${jobData.salary.max.toLocaleString()} ${jobData.salary.currency || 'VND'}`;
              } else {
                salaryDisplay = 'Thỏa thuận';
              }
            } else {
              salaryDisplay = 'Thỏa thuận';
            }

            // ✅ Xử lý location
            const locationDisplay = jobData.location || 
                                   (companyData?.city ? `${companyData.city}, ${companyData.nation || 'Việt Nam'}` : 'Không rõ');

            const normalizedJob = {
              $id: jobDoc.id,
              ...jobData,
              // ✅ Normalized fields - Priority: job.image > job.company_logo > company.image
              displayImage: jobData.image || jobData.company_logo || companyLogo || '',
              displayCompanyName: companyName || 'Ẩn danh',
              displaySalary: salaryDisplay,
              displayLocation: locationDisplay,
              company: companyData,
              jobCategories: categoryData,
              jobTypes: typeData,
            };
            
            return normalizedJob as unknown as Job;
          })
        )
      ).filter((job): job is Job => job !== null);

      console.log('✅ [4] Final jobsData:', jobsData.length);

      const categoriesData: JobCategory[] = categoriesSnap.docs.map((cat) => ({
        $id: cat.id,
        ...cat.data(),
      })) as JobCategory[];

      const typesData: JobType[] = typesSnap.docs.map((type) => ({
        $id: type.id,
        ...type.data(),
      })) as JobType[];

      setJobs(jobsData);
      setCategories(categoriesData);
      setTypes(typesData);
    } catch (err) {
      console.error("🔥 Lỗi fetchData():", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ✅ Memoized filtered & sorted jobs với logic chính xác
  const filteredJobs = useMemo(() => {
    let result = [...jobs];

    // 1. Filter by category
    if (activeCategory !== "all") {
      result = result.filter((job) => {
        if (!job.jobCategories) return false;
        
        // Xử lý cả trường hợp jobCategories là string hoặc object
        const categoryId = typeof job.jobCategories === "string"
          ? job.jobCategories
          : job.jobCategories.$id || job.jobCategories.id || "";
        
        return categoryId === activeCategory;
      });
    }

    // 2. Filter by type
    if (activeType !== "all") {
      result = result.filter((job) => {
        if (!job.jobTypes) return false;
        
        // Xử lý cả trường hợp jobTypes là string hoặc object
        const typeId = typeof job.jobTypes === "string"
          ? job.jobTypes
          : job.jobTypes.$id || job.jobTypes.id || "";
        
        return typeId === activeType;
      });
    }

    // 3. Sort
    if (sortBy === "newest") {
      result.sort((a, b) => {
        const aTime = (a as any).createdAt?.toMillis?.() || 0;
        const bTime = (b as any).createdAt?.toMillis?.() || 0;
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
  }, [jobs, activeCategory, activeType, sortBy]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  useEffect(() => {
    console.log('🟢 useEffect triggered - calling fetchData()');
    fetchData();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9F9FB" }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tất cả công việc</Text>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{filteredJobs.length}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A80F0" />
          <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
        </View>
      ) : (
        <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1 }}>
          {/* Filter Stats & Sort */}
          <View style={styles.filterStatsRow}>
            <Text style={styles.filterStatsText}>
              {filteredJobs.length} công việc
              {activeCategory !== "all" || activeType !== "all" ? " phù hợp" : ""}
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
                  Tất cả danh mục
                </Text>
                {activeCategory === "all" && (
                  <View style={styles.activeIndicator} />
                )}
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
                  {activeCategory === cat.$id && (
                    <View style={styles.activeIndicator} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Type Tabs */}
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
                  Tất cả loại hình
                </Text>
                {activeType === "all" && (
                  <View style={styles.activeIndicator} />
                )}
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
                  {activeType === type.$id && (
                    <View style={styles.activeIndicator} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Jobs List */}
            <View style={styles.jobsContainer}>
              {filteredJobs.map((job, index) => (
                <Animated.View
                  key={job.$id}
                  entering={FadeInDown.delay(index * 50).duration(400)}
                >
                  <TouchableOpacity
                    style={styles.jobCard}
                    activeOpacity={0.7}
                    onPress={() => router.push({ pathname: "/(shared)/jobDescription", params: { jobId: job.$id } })}
                  >
                    {/* ✅ Job Image with fallback */}
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
                      
                      {/* ✅ Company Name */}
                      <View style={styles.infoRow}>
                        <Ionicons name="business-outline" size={14} color="#64748b" />
                        <Text style={styles.jobCompany} numberOfLines={1}>
                          {(job as any).displayCompanyName}
                        </Text>
                      </View>

                      {/* ✅ Location */}
                      <View style={styles.infoRow}>
                        <Ionicons name="location-outline" size={14} color="#64748b" />
                        <Text style={styles.jobLocation} numberOfLines={1}>
                          {(job as any).displayLocation}
                        </Text>
                      </View>

                      {/* ✅ Salary */}
                      <View style={styles.infoRow}>
                        <Ionicons name="cash-outline" size={14} color="#10b981" />
                        <Text style={styles.jobSalary} numberOfLines={1}>
                          {(job as any).displaySalary}
                        </Text>
                      </View>

                      {/* ✅ Job Type & Category Badges */}
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
                </Animated.View>
              ))}

              {filteredJobs.length === 0 && (
                <Animated.View 
                  entering={FadeIn.duration(400)}
                  style={styles.emptyContainer}
                >
                  <View style={styles.emptyIcon}>
                    <Ionicons name="briefcase-outline" size={64} color="#cbd5e1" />
                  </View>
                  <Text style={styles.emptyTitle}>Không tìm thấy công việc</Text>
                  <Text style={styles.emptySubtitle}>
                    Thử điều chỉnh bộ lọc để xem thêm công việc
                  </Text>
                  {(activeCategory !== "all" || activeType !== "all") && (
                    <TouchableOpacity
                      style={styles.resetButton}
                      onPress={() => {
                        setActiveCategory("all");
                        setActiveType("all");
                      }}
                    >
                      <Text style={styles.resetButtonText}>Xóa bộ lọc</Text>
                    </TouchableOpacity>
                  )}
                </Animated.View>
              )}
            </View>
          </ScrollView>
        </Animated.View>
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
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: "#fff",
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    position: "relative",
  },
  tabButtonActive: {
    backgroundColor: "#4A80F0",
    borderColor: "#4A80F0",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },
  tabTextActive: {
    color: "#fff",
  },
  activeIndicator: {
    position: "absolute",
    bottom: -2,
    left: "25%",
    right: "25%",
    height: 3,
    backgroundColor: "#fff",
    borderRadius: 2,
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
});