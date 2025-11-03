// app/(employer)/index.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { db, auth } from "@/config/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  orderBy,
  limit,
} from "firebase/firestore";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

type RecentApp = { userName: string; jobTitle: string; id: string };

export default function EmployerHome() {
  const router = useRouter();
  const [jobCount, setJobCount] = useState(0);
  const [appCount, setAppCount] = useState(0);
  const [recentApps, setRecentApps] = useState<RecentApp[]>([]);
  const [companyName, setCompanyName] = useState<string>("");

  /* ------------------------------------------------------------------ */
  /*                           LOAD DASHBOARD                           */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const loadStats = async () => {
      const user = auth.currentUser;
      if (!user) return;

      /* 1️⃣ tên công ty */
      const companySnap = await getDoc(doc(db, "users", user.uid));
      setCompanyName(companySnap.data()?.name ?? "");

      /* 2️⃣ đếm job */
      const jobSnap = await getDocs(
        query(collection(db, "jobs"), where("ownerId", "==", user.uid))
      );
      setJobCount(jobSnap.size);

      /* 3️⃣ đếm & lấy ứng viên gần nhất */
      const appQuery = query(
        collection(db, "applied_jobs"),
        where("employerId", "==", user.uid),
        orderBy("applied_at", "desc"),
        limit(3)
      );
      const appliedSnap = await getDocs(appQuery);
      setAppCount(appliedSnap.size);

      /* lấy chi tiết user + job song song */
      const detailed: RecentApp[] = await Promise.all(
        appliedSnap.docs.map(async (d) => {
          const data = d.data();
          const [userSnap, jobSnap] = await Promise.all([
            getDoc(doc(db, "users", data.userId)),
            getDoc(doc(db, "jobs", data.jobId)),
          ]);
          return {
            id: d.id,
            userName: userSnap.data()?.name ?? "Không rõ tên",
            jobTitle: jobSnap.data()?.title ?? "Không rõ công việc",
          };
        })
      );
      setRecentApps(detailed);
    };

    loadStats();
  }, []);

  /* ------------------------------------------------------------------ */
  /*                                UI                                  */
  /* ------------------------------------------------------------------ */
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" backgroundColor="#fff" />

      <Text style={styles.header}>👋 Xin chào, {companyName || "Công ty của bạn"}</Text>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatBox number={jobCount} label="Job đang mở" />
        <StatBox number={appCount} label="Ứng viên đã ứng tuyển" />
      </View>

      {/* Quick actions */}
      <View style={styles.actionsRow}>
        <ActionBtn
          icon="add-circle-outline"
          label="Đăng việc"
          onPress={() => router.push("/(employer)/addJob")}
        />
        <ActionBtn
          icon="briefcase-outline"
          label="Job của tôi"
          onPress={() => router.push("/(employer)/myJobs")}
        />
        <ActionBtn
          icon="people-outline"
          label="Ứng viên"
          onPress={() => router.push("/(employer)/appliedList")}
        />
      </View>

      {/* Recent applicants */}
      <Text style={styles.sectionTitle}>Ứng viên gần đây</Text>
      <FlatList
        data={recentApps}
        keyExtractor={(it) => it.id}
        renderItem={({ item }) => (
          <View style={styles.appCard}>
            <Text style={styles.appName}>{item.userName}</Text>
            <Text style={styles.appJob}>{item.jobTitle}</Text>
          </View>
        )}
        ListEmptyComponent={<Text>Chưa có ứng viên nào</Text>}
      />
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/*                        Small reusable pieces                       */
/* ------------------------------------------------------------------ */
const StatBox = ({ number, label }: { number: number; label: string }) => (
  <View style={styles.statBox}>
    <Text style={styles.statNum}>{number}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const ActionBtn = ({
  icon,
  label,
  onPress,
}: {
  icon: any;
  label: string;
  onPress: () => void;
}) => (
  <TouchableOpacity style={styles.actionBtn} onPress={onPress}>
    <Ionicons name={icon} size={24} color="#007AFF" />
    <Text style={styles.actionText}>{label}</Text>
  </TouchableOpacity>
);

/* ------------------------------------------------------------------ */
/*                                Styles                              */
/* ------------------------------------------------------------------ */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  header: { fontSize: 20, fontWeight: "700", marginBottom: 16, color: "#007AFF" },

  /* stats */
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

  /* actions */
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 16,
  },
  actionBtn: { alignItems: "center" },
  actionText: { fontSize: 13, color: "#007AFF", marginTop: 4 },

  /* recent apps */
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
