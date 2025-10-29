import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { db, auth } from "@/config/firebase";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

export default function EmployerHome() {
  const router = useRouter();
  const [jobCount, setJobCount] = useState(0);
  const [appCount, setAppCount] = useState(0);
  const [recentApps, setRecentApps] = useState<any[]>([]);
  const [companyName, setCompanyName] = useState("Ẩn danh");

  useEffect(() => {
    const loadStats = async () => {
      const user = auth.currentUser;
      if (!user) return;

      // 🔹 Lấy thông tin công ty
      const companyRef = doc(db, "users", user.uid);
      const companySnap = await getDoc(companyRef);
      if (companySnap.exists()) {
        setCompanyName(companySnap.data().name || "Ẩn danh");
      }

      // 🔹 Lấy tất cả job của employer này
      const jobQuery = query(collection(db, "jobs"), where("ownerId", "==", user.uid));
      const jobSnap = await getDocs(jobQuery);
      setJobCount(jobSnap.size);

      // 🔹 Lấy tất cả ứng viên ứng tuyển vào job của employer
      const appQuery = query(collection(db, "applied_jobs"), where("employerId", "==", user.uid));
      const appSnap = await getDocs(appQuery);
      setAppCount(appSnap.size);

      // 🔹 Lấy 3 ứng viên gần nhất apply
      const apps = appSnap.docs.slice(0, 3).map((d) => d.data());
      setRecentApps(apps);
    };
    loadStats();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" backgroundColor="#fff" />

      <View>
        <Text style={styles.header}>👋 Xin chào, {companyName}</Text>

        {/* ✅ Thống kê */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{jobCount}</Text>
            <Text style={styles.statLabel}>Job đang mở</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{appCount}</Text>
            <Text style={styles.statLabel}>Ứng viên đã ứng tuyển</Text>
          </View>
        </View>

        {/* ✅ Hành động nhanh */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push("/(employer)/addJob")}
          >
            <Ionicons name="add-circle-outline" size={24} color="#007AFF" />
            <Text style={styles.actionText}>Đăng việc</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push("/(employer)/myJobs")}
          >
            <Ionicons name="briefcase-outline" size={24} color="#007AFF" />
            <Text style={styles.actionText}>Job của tôi</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push("/(employer)/appliedList")}
          >
            <Ionicons name="people-outline" size={24} color="#007AFF" />
            <Text style={styles.actionText}>Ứng viên</Text>
          </TouchableOpacity>
        </View>

        {/* ✅ Ứng viên gần đây */}
        <View style={{ marginTop: 20 }}>
          <Text style={styles.sectionTitle}>Ứng viên gần đây</Text>
          <FlatList
            data={recentApps}
            keyExtractor={(item, i) => `app-${i}`}
            renderItem={({ item }) => (
              <View style={styles.appCard}>
                <Text style={styles.appName}>{item.userName || "Ẩn danh"}</Text>
                <Text style={styles.appJob}>{item.jobTitle || "Không rõ công việc"}</Text>
              </View>
            )}
            ListEmptyComponent={<Text>Chưa có ứng viên nào</Text>}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  header: { fontSize: 20, fontWeight: "700", marginBottom: 16, color: "#007AFF" },
  statsRow: { flexDirection: "row", justifyContent: "space-between" },
  statBox: {
    flex: 1,
    margin: 6,
    backgroundColor: "#F2F4F8",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  statNum: { fontSize: 22, fontWeight: "700", color: "#007AFF" },
  statLabel: { fontSize: 13, color: "#555", marginTop: 4 },
  actionsRow: { flexDirection: "row", justifyContent: "space-around", marginVertical: 16 },
  actionBtn: { alignItems: "center" },
  actionText: { fontSize: 13, color: "#007AFF", marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  appCard: {
    backgroundColor: "#F9F9FB",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  appName: { fontSize: 14, fontWeight: "600" },
  appJob: { fontSize: 13, color: "#777" },
});
