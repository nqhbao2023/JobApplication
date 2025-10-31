import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import { db } from "@/config/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

type Company = {
  $id: string;
  corp_name?: string;
  corp_description?: string;
  nation?: string;
  city?: string;
  image?: string;
  color?: string;
};

type Job = {
  $id: string;
  title?: string;
  image?: string;
  job_Description?: string;
  jobCategories?: any;
};

export default function CompanyDescription() {
  const { companyId } = useLocalSearchParams<{ companyId: string }>();
  const [company, setCompany] = useState<Company | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [tab, setTab] = useState<"info" | "jobs">("info");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    const fetchData = async () => {
      try {
        const docRef = doc(db, "companies", companyId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const compData = { $id: snap.id, ...snap.data() } as Company;
          setCompany(compData);
        }

        const q = query(collection(db, "jobs"), where("company", "==", companyId));
        const jobsSnap = await getDocs(q);
        const jobList = jobsSnap.docs.map((d) => ({
          $id: d.id,
          ...d.data(),
        })) as Job[];
        setJobs(jobList);
      } catch (err) {
        console.error("❌ Lỗi tải company info:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [companyId]);

  if (loading)
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A80F0" />
        <Text style={{ color: "#64748b", marginTop: 6 }}>Đang tải dữ liệu...</Text>
      </View>
    );

  if (!company)
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={36} color="#94a3b8" />
        <Text style={{ color: "#94a3b8", marginTop: 6 }}>Không tìm thấy công ty.</Text>
      </View>
    );

  return (
  <SafeAreaView style={styles.container}>
    {/* Header */}
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.back()}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={22} color="#fff" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{company.corp_name || "Company Detail"}</Text>
    </View>

    {/* Tabs */}
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[styles.tabButton, tab === "info" && styles.tabActive]}
        onPress={() => setTab("info")}
      >
        <Text
          style={[styles.tabText, tab === "info" && styles.tabTextActive]}
        >
          Company Info
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tabButton, tab === "jobs" && styles.tabActive]}
        onPress={() => setTab("jobs")}
      >
        <Text
          style={[styles.tabText, tab === "jobs" && styles.tabTextActive]}
        >
          Jobs
        </Text>
      </TouchableOpacity>
    </View>

    {/* Nội dung từng tab */}
    {tab === "info" ? (
      <Animated.ScrollView
        entering={FadeIn.duration(400)}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner */}
        <View style={styles.banner}>
          <Image
            source={{
              uri:
                company.image ||
                "https://via.placeholder.com/400x200.png?text=Company",
            }}
            style={styles.bannerImage}
          />
          <View style={styles.bannerTextContainer}>
            <Text style={styles.bannerTitle}>{company.corp_name}</Text>
            <Text style={styles.bannerLocation}>
              <Ionicons name="location-outline" size={14} color="#64748b" />{" "}
              {company.city || "—"}, {company.nation || "—"}
            </Text>
          </View>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Giới thiệu công ty</Text>
          <Text style={styles.infoText}>
            {company.corp_description || "Chưa có mô tả."}
          </Text>
        </View>
      </Animated.ScrollView>
    ) : (
      <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1 }}>
        {jobs.length > 0 ? (
          <FlatList
            data={jobs}
            keyExtractor={(item) => item.$id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.jobCard}
                onPress={() =>
                  router.push({
                    pathname: "/(shared)/jobDescription",
                    params: { jobId: item.$id },
                  })
                }
              >
                <Image
                  source={{
                    uri:
                      item.image ||
                      "https://via.placeholder.com/100x100.png?text=Job",
                  }}
                  style={styles.jobImage}
                />
                <View style={styles.jobInfo}>
                  <Text style={styles.jobTitle}>{item.title}</Text>
                  <Text style={styles.jobDesc} numberOfLines={2}>
                    {item.job_Description || "Không có mô tả công việc."}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: 24,
            }}
          />
        ) : (
          <View style={styles.noJobContainer}>
            <Ionicons name="briefcase-outline" size={36} color="#94a3b8" />
            <Text style={styles.noJobText}>Chưa có việc đăng tuyển</Text>
          </View>
        )}
      </Animated.View>
    )}
  </SafeAreaView>
);

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9F9FB",
  },
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
  banner: {
    margin: 16,
    borderRadius: 18,
    backgroundColor: "#f1f5f9",
    overflow: "hidden",
    elevation: 1,
  },
  bannerImage: {
    width: "100%",
    height: 160,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  bannerTextContainer: {
    padding: 12,
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 4,
  },
  bannerLocation: {
    fontSize: 14,
    color: "#64748b",
  },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginHorizontal: 16,
    backgroundColor: "#e2e8f0",
    borderRadius: 12,
    marginBottom: 12,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: "#4A80F0",
  },
  tabText: {
    color: "#334155",
    fontSize: 15,
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#fff",
  },
  infoSection: {
    backgroundColor: "#fff",
    borderRadius: 18,
    marginHorizontal: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 20,
  },
  jobsSection: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  jobCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  jobImage: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: "#f1f5f9",
  },
  jobInfo: {
    flex: 1,
    marginLeft: 10,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  jobDesc: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 4,
  },
  noJobContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  noJobText: {
    color: "#94a3b8",
    marginTop: 6,
    fontSize: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
