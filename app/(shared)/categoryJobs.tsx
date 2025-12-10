import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/config/firebase";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useSafeBack } from "@/hooks/useSafeBack";
import { jobMatchesCategory, getCategorySlugs } from "@/utils/categoryMatching.utils";

const { width } = Dimensions.get("window");

type Job = {
  id: string;
  $id?: string;
  title?: string;
  company?: string | { corp_name?: string };
  company_name?: string;
  company_logo?: string;
  image?: string;
  location?: string;
  salary?: any;
  salary_text?: string;
  source?: string;
  external_url?: string;
  jobCategories?: any;
  status?: string;
  jobType?: string;
  created_at?: string;
};

// ✅ Format salary display
const formatSalary = (salary: any): string => {
  if (!salary) return "";
  if (typeof salary === "string") return salary;
  if (salary.text) return salary.text;
  if (salary.min && salary.max) {
    const formatNum = (n: number) => {
      if (n >= 1000000) return `${(n / 1000000).toFixed(0)}tr`;
      if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
      return n.toString();
    };
    return `${formatNum(salary.min)} - ${formatNum(salary.max)}`;
  }
  if (salary.min) return `Từ ${(salary.min / 1000000).toFixed(0)}tr`;
  if (salary.max) return `Đến ${(salary.max / 1000000).toFixed(0)}tr`;
  return "Thỏa thuận";
};

// ✅ Get company name from various formats
const getCompanyName = (job: Job): string => {
  if (job.company_name) return job.company_name;
  if (typeof job.company === "string") return job.company;
  if (typeof job.company === "object" && job.company?.corp_name) return job.company.corp_name;
  return "Không rõ công ty";
};

// ✅ Get company logo
const getCompanyLogo = (job: Job): string => {
  if (job.image) return job.image;
  if (job.company_logo) return job.company_logo;
  const name = getCompanyName(job);
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "CO";
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=200&background=4A80F0&color=fff&bold=true&format=png`;
};

export default function CategoryJobsScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { goBack } = useSafeBack();

  // ✅ Fetch all jobs and filter by category (supports both ID match and slug match)
  const fetchJobs = async () => {
    try {
      const jobsSnap = await getDocs(collection(db, "jobs"));
      const allJobs = jobsSnap.docs.map((d) => ({ 
        id: d.id, 
        $id: d.id,
        ...d.data() 
      })) as Job[];

      // ✅ Filter jobs that match this category using centralized matching logic
      // Also get the slugs that match this category for direct slug comparison
      const categorySlugs = getCategorySlugs(name || "");
      
      const filteredJobs = allJobs.filter(job => {
        // Skip inactive jobs (but allow external jobs without status)
        const status = job.status?.toLowerCase();
        if (status && status !== "active" && status !== "approved" && !job.external_url) {
          return false;
        }
        
        // Skip candidate_seeking jobs
        if (job.jobType === "candidate_seeking") return false;
        
        // ✅ Match using centralized logic (handles IDs, names, and slugs)
        if (id && jobMatchesCategory(job, id, name)) return true;
        
        // ✅ Direct slug comparison for viecoi jobs
        const jobCatSlug = typeof job.jobCategories === "string" ? job.jobCategories.toLowerCase() : "";
        if (jobCatSlug && categorySlugs.some(slug => jobCatSlug === slug || jobCatSlug.includes(slug))) {
          return true;
        }
        
        return false;
      });

      // Sort by created_at descending
      filteredJobs.sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });

      setJobs(filteredJobs);
    } catch (e) {
      console.error("❌ Lỗi tải jobs:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [id, name]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchJobs();
  };

  const handleJobPress = (job: Job) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // External jobs (viecoi) - can navigate to jobDescription or open URL
    router.push({
      pathname: "/(shared)/jobDescription",
      params: { jobId: job.id, from: "/(shared)/categoryJobs" },
    });
  };

  // ✅ Job Card Component
  const JobCard = ({ item, index }: { item: Job; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(300)}>
      <TouchableOpacity
        style={styles.jobCard}
        activeOpacity={0.85}
        onPress={() => handleJobPress(item)}
      >
        <Image
          source={{ uri: getCompanyLogo(item) }}
          style={styles.jobLogo}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.jobContent}>
          <Text style={styles.jobTitle} numberOfLines={2}>
            {item.title || "Không có tiêu đề"}
          </Text>
          <View style={styles.jobInfoRow}>
            <Ionicons name="business-outline" size={14} color="#64748b" />
            <Text style={styles.jobCompany} numberOfLines={1}>
              {getCompanyName(item)}
            </Text>
          </View>
          {item.location && (
            <View style={styles.jobInfoRow}>
              <Ionicons name="location-outline" size={14} color="#64748b" />
              <Text style={styles.jobLocation} numberOfLines={1}>
                {item.location}
              </Text>
            </View>
          )}
          <View style={styles.jobFooter}>
            <View style={styles.salaryContainer}>
              <Ionicons name="cash-outline" size={14} color="#10b981" />
              <Text style={styles.jobSalary}>
                {formatSalary(item.salary) || item.salary_text || "Thỏa thuận"}
              </Text>
            </View>
            {item.source === "viecoi" && (
              <View style={styles.sourceBadge}>
                <Text style={styles.sourceBadgeText}>viecoi.vn</Text>
              </View>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
      </TouchableOpacity>
    </Animated.View>
  );

  // ✅ Empty State
  const EmptyState = () => (
    <Animated.View entering={FadeIn.duration(400)} style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="briefcase-outline" size={56} color="#cbd5e1" />
      </View>
      <Text style={styles.emptyTitle}>Chưa có công việc</Text>
      <Text style={styles.emptySubtitle}>
        Không tìm thấy công việc nào trong danh mục "{name || "này"}".
      </Text>
      <TouchableOpacity style={styles.emptyButton} onPress={goBack}>
        <Text style={styles.emptyButtonText}>Quay lại</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <LinearGradient colors={["#4A80F0", "#6366f1"]} style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={goBack}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {name || "Danh mục"}
          </Text>
          <Text style={styles.headerSubtitle}>
            {loading ? "Đang tải..." : `${jobs.length} việc làm`}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A80F0" />
          <Text style={styles.loadingText}>Đang tải việc làm...</Text>
        </View>
      ) : jobs.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => <JobCard item={item} index={index} />}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#4A80F0"]}
              tintColor="#4A80F0"
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerContent: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#64748b",
    fontSize: 14,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  jobCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  jobLogo: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
  },
  jobContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  jobTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1e293b",
    lineHeight: 20,
    marginBottom: 4,
  },
  jobInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
    gap: 4,
  },
  jobCompany: {
    flex: 1,
    fontSize: 13,
    color: "#64748b",
  },
  jobLocation: {
    flex: 1,
    fontSize: 12,
    color: "#94a3b8",
  },
  jobFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  salaryContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  jobSalary: {
    fontSize: 12,
    fontWeight: "600",
    color: "#10b981",
  },
  sourceBadge: {
    backgroundColor: "#f0f9ff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sourceBadgeText: {
    fontSize: 10,
    color: "#0ea5e9",
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: "#4A80F0",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});
