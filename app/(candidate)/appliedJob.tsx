import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { db, auth } from "@/config/firebase";
import { collection, getDocs, doc, getDoc, query, where } from "firebase/firestore";

export default function AppliedJob() {
  const router = useRouter();
  const [appliedJobs, setAppliedJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>("");

  // ✅ Lấy userId từ Firebase Auth
  useEffect(() => {
    const user = auth.currentUser;
    if (user) setUserId(user.uid);
  }, []);

  // ✅ Lấy danh sách công việc đã ứng tuyển
  useEffect(() => {
    if (!userId) return;
    const fetchAppliedJobs = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "applied_jobs"), where("userId", "==", userId));
        const res = await getDocs(q);

        const jobs = await Promise.all(
          res.docs.map(async (docSnap) => {
            const data = docSnap.data();
            const jobRef = doc(db, "jobs", data.jobId);
            const jobSnap = await getDoc(jobRef);
            const jobData = jobSnap.exists() ? jobSnap.data() : {};

            let companyData = {};
            if (jobData?.company) {
              const companySnap = await getDoc(doc(db, "companies", jobData.company));
              if (companySnap.exists()) companyData = companySnap.data();
            }

            return {
              $id: docSnap.id,
              jobId: data.jobId,
              status: data.status,
              applied_at: data.applied_at,
              ...jobData,
              company: companyData,
            };
          })
        );

        setAppliedJobs(jobs);
      } catch (err) {
        console.error("Failed to fetch applied jobs:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAppliedJobs();
  }, [userId]);

  const renderItem = ({ item }: { item: any }) => {
    if (!item) return null;
    return (
      <TouchableOpacity
        style={styles.jobItem}
        onPress={() =>
          router.navigate({
            pathname: "/(shared)/jobDescription",
            params: {
              jobId: item.jobId,
              fromApplied: "true",
              status: item.status || "",
              appliedAt: item.applied_at || "",
            },
          })
        }
      >
        <Image
          source={{ uri: item.image || "https://via.placeholder.com/50" }}
          style={styles.jobImage}
        />
        <View style={styles.jobInfo}>
          <Text style={styles.jobTitle}>{item.title || "Không có tiêu đề"}</Text>
          <Text style={styles.jobCompany}>{item.company?.corp_name || "Ẩn danh"}</Text>
          <Text style={styles.jobLocation}>{item.company?.location || "Không rõ địa điểm"}</Text>
          <Text style={styles.jobStatus}>
            Trạng thái:
            <Text
              style={{
                fontWeight: "bold",
                color:
                  item.status === "Đã duyệt"
                    ? "#34C759"
                    : item.status === "Từ chối"
                    ? "#FF3B30"
                    : "#FF9500",
              }}
            >
              {" "}
              {item.status || "Đang chờ"}
            </Text>
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 50 }} />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.back_btn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Công việc đã ứng tuyển</Text>
      </View>

      {appliedJobs.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text>Bạn chưa ứng tuyển công việc nào.</Text>
        </View>
      ) : (
        <FlatList
          data={appliedJobs}
          renderItem={renderItem}
          keyExtractor={(item, i) => (item?.$id ? String(item.$id) : `job-${i}`)}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9F9FB" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: "#fff",
    elevation: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  back_btn: { position: "absolute", left: 16, padding: 6 },
  headerText: { fontSize: 18, fontWeight: "bold", color: "#007AFF" },
  jobItem: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    elevation: 2,
  },
  jobImage: { width: 50, height: 50, borderRadius: 25 },
  jobInfo: { flex: 1, marginLeft: 12 },
  jobTitle: { fontSize: 16, fontWeight: "bold" },
  jobCompany: { fontSize: 14, color: "#777" },
  jobLocation: { fontSize: 12, color: "#aaa" },
  jobStatus: { fontSize: 12, marginTop: 4, color: "#444" },
});
