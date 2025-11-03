// app/(candidate)/appliedJob.tsx
import React, { useCallback, useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { db, auth } from "@/config/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from "firebase/firestore";

/* -------------------------------------------------------------------------- */
/*                                 MAIN PAGE                                  */
/* -------------------------------------------------------------------------- */
export default function AppliedJob() {
  const router = useRouter();
  const uid = auth.currentUser?.uid;

  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /* fetch once + on pull */
  const fetchJobs = useCallback(async () => {
    if (!uid) return;
    setRefreshing(true);

    const q = query(
      collection(db, "applied_jobs"),
      where("userId", "==", uid),
      orderBy("applied_at", "desc")
    );
    const snap = await getDocs(q);
    setJobs(
      snap.docs.map((d) => ({
        $id: d.id,
        ...d.data(),
      }))
    );
    setLoading(false);
    setRefreshing(false);
  }, [uid]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  /* --------------------------------- UI ---------------------------------- */
  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTxt}>Công việc đã ứng tuyển</Text>
      </View>

      {/* list */}
      <FlatList
        data={jobs}
        keyExtractor={(it) => it.$id}
        renderItem={({ item }) => <JobRow item={item} onPress={router} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchJobs} />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="briefcase-outline" size={64} color="#ccc" />
            <Text style={{ color: "#888", marginTop: 8 }}>
              Bạn chưa ứng tuyển công việc nào
            </Text>
          </View>
        }
        contentContainerStyle={[
          styles.listPad,
          jobs.length === 0 && { flex: 1 },
        ]}
      />
    </SafeAreaView>
  );
}

/* -------------------------------------------------------------------------- */
/*                             ROW COMPONENT                                  */
/* -------------------------------------------------------------------------- */
const statusColor = (s?: string) =>
  s === "accepted"
    ? "#34C759"
    : s === "rejected"
    ? "#FF3B30"
    : "#FF9500";

const JobRow = React.memo(
  ({ item, onPress }: { item: any; onPress: any }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() =>
        onPress.navigate({
          pathname: "/(shared)/jobDescription",
          params: { jobId: item.jobId, fromApplied: "true" },
        })
      }
    >
      <Image
        source={{
          uri:
            item.jobInfo?.image ??
            "https://placehold.co/60x60?text=Job",
        }}
        style={styles.logo}
      />

      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.title} numberOfLines={1}>
          {item.jobInfo?.title ?? "Không rõ tiêu đề"}
        </Text>
        <Text style={styles.company} numberOfLines={1}>
          {item.jobInfo?.company ?? "Ẩn danh"}
        </Text>
        <Text style={styles.location} numberOfLines={1}>
          {item.jobInfo?.location ?? "Không rõ địa điểm"}
        </Text>

        <Text style={[styles.status, { color: statusColor(item.status) }]}>
          {item.status === "accepted"
            ? "Đã duyệt"
            : item.status === "rejected"
            ? "Từ chối"
            : "Đang chờ"}
        </Text>
      </View>
    </TouchableOpacity>
  )
);

/* -------------------------------------------------------------------------- */
/*                                   STYLE                                    */
/* -------------------------------------------------------------------------- */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F9F9FB" },
  listPad: { padding: 16 },

  /* header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    elevation: 2,
  },
  back: { position: "absolute", left: 16, padding: 6 },
  headerTxt: { fontSize: 18, fontWeight: "700", color: "#007AFF" },

  /* row */
  row: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
  },
  logo: { width: 60, height: 60, borderRadius: 8 },
  title: { fontSize: 16, fontWeight: "700", color: "#111827" },
  company: { fontSize: 14, color: "#555" },
  location: { fontSize: 12, color: "#888" },
  status: { marginTop: 4, fontSize: 12, fontWeight: "600" },

  /* misc */
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
