import React, { useEffect, useState } from "react";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Image,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
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
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [categories, setCategories] = useState<JobCategory[]>([]);
  const [types, setTypes] = useState<JobType[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activeType, setActiveType] = useState<string>("all");
  const [loading, setLoading] = useState(true);

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
            if (jobData.jobCategories) {
              const catId = typeof jobData.jobCategories === "string"
                ? jobData.jobCategories
                : jobData.jobCategories.id || jobData.jobCategories.jobCategoryId || "";
              
              if (catId) {
                try {
                  const catSnap = await getDoc(doc(db, "job_categories", catId));
                  if (catSnap.exists()) {
                    categoryData = { $id: catSnap.id, ...catSnap.data() };
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
            if (jobData.jobTypes) {
              const typeId = typeof jobData.jobTypes === "string"
                ? jobData.jobTypes
                : jobData.jobTypes.id || jobData.jobTypes.jobTypeId || "";
              
              if (typeId) {
                try {
                  const typeSnap = await getDoc(doc(db, "job_types", typeId));
                  if (typeSnap.exists()) {
                    typeData = { $id: typeSnap.id, ...typeSnap.data() };
                  }
                } catch (err) {
                  console.warn('⚠️ Failed to fetch type:', typeId);
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

            return {
              $id: jobDoc.id,
              ...jobData,
              // ✅ Normalized fields
              displayImage: jobData.company_logo || jobData.image || companyLogo || '',
              displayCompanyName: companyName || 'Ẩn danh',
              displaySalary: salaryDisplay,
              displayLocation: locationDisplay,
              company: companyData,
              jobCategories: categoryData,
              jobTypes: typeData,
            } as Job;
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
      setFilteredJobs(jobsData);
    } catch (err) {
      console.error("🔥 Lỗi fetchData():", err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (categoryId: string, typeId: string) => {
    let tempJobs = [...jobs];
    if (categoryId !== "all") {
      tempJobs = tempJobs.filter(
        (job) => job.jobCategories && job.jobCategories.$id === categoryId
      );
    }
    if (typeId !== "all") {
      tempJobs = tempJobs.filter(
        (job) => job.jobTypes && job.jobTypes.$id === typeId
      );
    }
    setFilteredJobs(tempJobs);
  };

  const handleCategoryChange = (id: string) => {
    setActiveCategory(id);
    applyFilters(id, activeType);
  };
  
  const handleTypeChange = (id: string) => {
    setActiveType(id);
    applyFilters(activeCategory, id);
  };

  useEffect(() => {
    console.log('🟢 useEffect triggered - calling fetchData()');
    fetchData();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9F9FB" }}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tất cả công việc</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A80F0" />
          <Text style={{ color: "#64748b", marginTop: 6 }}>Đang tải dữ liệu...</Text>
        </View>
      ) : (
        <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Category Tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabScroll}
            >
              <TouchableOpacity
                style={[styles.tabButton, activeCategory === "all" && styles.tabButtonActive]}
                onPress={() => handleCategoryChange("all")}
              >
                <Text style={[styles.tabText, activeCategory === "all" && styles.tabTextActive]}>
                  Tất cả danh mục
                </Text>
              </TouchableOpacity>

              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.$id}
                  style={[styles.tabButton, activeCategory === cat.$id && styles.tabButtonActive]}
                  onPress={() => handleCategoryChange(cat.$id)}
                >
                  <Text style={[styles.tabText, activeCategory === cat.$id && styles.tabTextActive]}>
                    {cat.category_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Type Tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabScroll}
            >
              <TouchableOpacity
                style={[styles.tabButton, activeType === "all" && styles.tabButtonActive]}
                onPress={() => handleTypeChange("all")}
              >
                <Text style={[styles.tabText, activeType === "all" && styles.tabTextActive]}>
                  Tất cả loại hình
                </Text>
              </TouchableOpacity>

              {types.map((type) => (
                <TouchableOpacity
                  key={type.$id}
                  style={[styles.tabButton, activeType === type.$id && styles.tabButtonActive]}
                  onPress={() => handleTypeChange(type.$id)}
                >
                  <Text style={[styles.tabText, activeType === type.$id && styles.tabTextActive]}>
                    {type.type_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Jobs List */}
            <View style={{ padding: 16, gap: 12 }}>
              {filteredJobs.map((job) => (
                <TouchableOpacity
                  key={job.$id}
                  style={styles.jobCard}
                  activeOpacity={0.8}
                  onPress={() => router.push({ pathname: "/(shared)/jobDescription", params: { jobId: job.$id } })}
                >
                  {/* ✅ Job Image with fallback */}
                  {job.displayImage ? (
                    <Image source={{ uri: job.displayImage }} style={styles.jobImage} />
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
                        {job.displayCompanyName}
                      </Text>
                    </View>

                    {/* ✅ Location */}
                    <View style={styles.infoRow}>
                      <Ionicons name="location-outline" size={14} color="#64748b" />
                      <Text style={styles.jobLocation} numberOfLines={1}>
                        {job.displayLocation}
                      </Text>
                    </View>

                    {/* ✅ Salary */}
                    <View style={styles.infoRow}>
                      <Ionicons name="cash-outline" size={14} color="#10b981" />
                      <Text style={styles.jobSalary} numberOfLines={1}>
                        {job.displaySalary}
                      </Text>
                    </View>

                    {/* ✅ Job Type Badge */}
                    {job.jobTypes && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                          {job.jobTypes.type_name || 'Full-time'}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}

              {filteredJobs.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Ionicons name="briefcase-outline" size={40} color="#94a3b8" />
                  <Text style={styles.emptyText}>Không có công việc phù hợp</Text>
                </View>
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  tabScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    marginRight: 8,
  },
  tabButtonActive: {
    backgroundColor: "#4A80F0",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },
  tabTextActive: {
    color: "#fff",
  },
  jobCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  jobImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  placeholderImage: {
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  jobDetails: {
    flex: 1,
    gap: 4,
  },
  jobTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
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
  },
  jobLocation: {
    fontSize: 12,
    color: "#94a3b8",
    flex: 1,
  },
  jobSalary: {
    fontSize: 13,
    color: "#10b981",
    fontWeight: "600",
    flex: 1,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#eff6ff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
  },
  badgeText: {
    fontSize: 11,
    color: "#3b82f6",
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 40,
  },
  emptyText: {
    color: "#94a3b8",
    fontSize: 16,
    marginTop: 8,
  },
});