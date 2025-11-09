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
  jobCategories?: any;
  jobTypes?: any;
  company?: any;
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

      const jobsData: Job[] = (
        await Promise.all(
          jobsSnap.docs.map(async (jobDoc) => {
            const jobData = jobDoc.data();
            console.log('🔵 [3] Processing job:', jobDoc.id, jobData.title);
            if (!jobData.title) return null;

            let companyData = {};
            if (jobData.company) {
              const companyId =
                typeof jobData.company === "string"
                  ? jobData.company
                  : jobData.company.id || jobData.company.$id || "";
              if (companyId) {
                const companySnap = await getDoc(doc(db, "companies", companyId));
                if (companySnap.exists())
                  companyData = { $id: companySnap.id, ...companySnap.data() };
              } else companyData = jobData.company;
            }

            let categoryData = undefined;
            if (jobData.jobCategories) {
              const catId =
                typeof jobData.jobCategories === "string"
                  ? jobData.jobCategories
                  : jobData.jobCategories.id ||
                    jobData.jobCategories.jobCategoryId ||
                    "";
              if (catId) {
                const catSnap = await getDoc(doc(db, "job_categories", catId));
                if (catSnap.exists())
                  categoryData = { $id: catSnap.id, ...catSnap.data() };
              } else categoryData = jobData.jobCategories;
            }

            let typeData = undefined;
            if (jobData.jobTypes) {
              const typeId =
                typeof jobData.jobTypes === "string"
                  ? jobData.jobTypes
                  : jobData.jobTypes.id || jobData.jobTypes.jobTypeId || "";
              if (typeId) {
                const typeSnap = await getDoc(doc(db, "job_types", typeId));
                if (typeSnap.exists())
                  typeData = { $id: typeSnap.id, ...typeSnap.data() };
              } else typeData = jobData.jobTypes;
            }

            return {
              $id: jobDoc.id,
              ...jobData,
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
                style={[
                  styles.tabButton,
                  activeCategory === "all" && styles.tabButtonActive,
                ]}
                onPress={() => handleCategoryChange("all")}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeCategory === "all" && styles.tabTextActive,
                  ]}
                >
                  Tất cả danh mục
                </Text>
              </TouchableOpacity>

              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.$id}
                  style={[
                    styles.tabButton,
                    activeCategory === cat.$id && styles.tabButtonActive,
                  ]}
                  onPress={() => handleCategoryChange(cat.$id)}
                >
                  <Text
                    style={[
                      styles.tabText,
                      activeCategory === cat.$id && styles.tabTextActive,
                    ]}
                  >
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
                style={[
                  styles.tabButton,
                  activeType === "all" && styles.tabButtonActive,
                ]}
                onPress={() => handleTypeChange("all")}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeType === "all" && styles.tabTextActive,
                  ]}
                >
                  Tất cả loại công việc
                </Text>
              </TouchableOpacity>

              {types.map((type) => (
                <TouchableOpacity
                  key={type.$id}
                  style={[
                    styles.tabButton,
                    activeType === type.$id && styles.tabButtonActive,
                  ]}
                  onPress={() => handleTypeChange(type.$id)}
                >
                  <Text
                    style={[
                      styles.tabText,
                      activeType === type.$id && styles.tabTextActive,
                    ]}
                  >
                    {type.type_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Job List */}
            <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
              {filteredJobs.map((job) => (
                <TouchableOpacity
                  key={job.$id}
                  style={styles.jobItem}
                  onPress={() =>
                    router.push({
                      pathname: "/(shared)/jobDescription",
                      params: { jobId: job.$id },
                    })
                  }
                  activeOpacity={0.8}
                >
                  <Image
                    source={{
                      uri:
                        job.image ||
                        "https://via.placeholder.com/100x100.png?text=Job",
                    }}
                    style={styles.jobImage}
                  />
                  <View style={styles.jobInfo}>
                    <Text style={styles.jobTitle}>{job.title}</Text>
                    <Text style={styles.jobCompany}>
                      {job.company?.corp_name ?? "Không rõ công ty"}
                    </Text>
                    <Text style={styles.jobLocation}>
                      {job.company?.city ?? "—"}, {job.company?.nation ?? "—"}
                    </Text>
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
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    elevation: 2,
  },
  backBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 10,
    padding: 6,
    marginRight: 8,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  tabScroll: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#fff",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  tabButtonActive: {
    backgroundColor: "#4A80F0",
    borderColor: "#4A80F0",
  },
  tabText: {
    fontSize: 14,
    color: "#1e293b",
  },
  tabTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
  jobItem: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  jobImage: {
    width: 56,
    height: 56,
    borderRadius: 14,
  },
  jobInfo: {
    flex: 1,
    marginLeft: 12,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  jobCompany: {
    fontSize: 14,
    color: "#475569",
  },
  jobLocation: {
    fontSize: 12,
    color: "#94a3b8",
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
