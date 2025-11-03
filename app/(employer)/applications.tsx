// app/(shared)/applications.tsx
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { auth, db } from "@/config/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";

/* -------------------------------------------------------------------------- */
export default function Applications() {
  const uid = auth.currentUser?.uid;
  const router = useRouter();

  const [role, setRole] = useState<"candidate" | "employer">("candidate");
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /* 👉 fetch once + pull-to-refresh */
  const fetchData = useCallback(async () => {
    if (!uid) return;
    setRefreshing(true);

    /* lấy role */
    const me = await getDoc(doc(db, "users", uid));
    const myRole = me.data()?.role === "employer" ? "employer" : "candidate";
    setRole(myRole);

    /* lấy applications */
    const q = query(
      collection(db, "applied_jobs"),
      where(myRole === "employer" ? "employerId" : "userId", "==", uid),
      orderBy("applied_at", "desc")
    );
    const snap = await getDocs(q);
    setApps(snap.docs.map((d) => ({ id: d.id, ...d.data() })));

    setLoading(false);
    setRefreshing(false);
  }, [uid]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* màu trạng thái */
  const statusColor = (s?: string) =>
    s === "accepted" ? "#34C759" : s === "rejected" ? "#FF3B30" : "#FF9500";

  /* render row */
  const Row = ({ item }: { item: any }) => {
    const isEmp = role === "employer";
    const job = item.jobInfo ?? {};
    const usr = item.userInfo ?? {};

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.card}
        onPress={() =>
          !isEmp &&
          router.push({
            pathname: "/(shared)/jobDescription",
            params: { jobId: item.jobId },
          })
        }
      >
        <Image
          source={{
            uri:
              (isEmp ? usr.photoURL : job.image) ??
              "https://placehold.co/60x60",
          }}
          style={styles.logo}
        />

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.title} numberOfLines={1}>
            {isEmp ? usr.name ?? "Ứng viên ẩn danh" : job.title ?? "Không rõ"}
          </Text>

          <Text style={styles.sub} numberOfLines={1}>
            {isEmp ? `Ứng tuyển: ${job.title ?? "Không rõ"}` : job.company ?? "Ẩn danh"}
          </Text>

          <View style={styles.statusRow}>
            <Ionicons
              name={
                item.status === "accepted"
                  ? "checkmark-circle"
                  : item.status === "rejected"
                  ? "close-circle"
                  : "time"
              }
              size={14}
              color={statusColor(item.status)}
            />
            <Text style={[styles.statusTxt, { color: statusColor(item.status) }]}>
              {item.status === "accepted"
                ? "Đã chấp nhận"
                : item.status === "rejected"
                ? "Đã từ chối"
                : "Đang chờ duyệt"}
            </Text>
          </View>

          {item.applied_at?.seconds && (
            <Text style={styles.date}>
              {new Date(item.applied_at.seconds * 1000).toLocaleDateString("vi-VN")}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  /* ----------------------------- render screen ---------------------------- */
  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ color: "#666", marginTop: 6 }}>Đang tải dữ liệu…</Text>
      </View>
    );

  if (apps.length === 0)
    return (
      <SafeAreaView style={styles.center} edges={["top"]}>
        <Ionicons name="file-tray-outline" size={64} color="#bbb" />
        <Text style={styles.emptyT}>Không có dữ liệu</Text>
        <Text style={styles.emptyD}>
          {role === "employer"
            ? "Chưa có ứng viên nào ứng tuyển."
            : "Bạn chưa ứng tuyển công việc nào."}
        </Text>
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9F9FB" }} edges={["top"]}>
      <FlatList
        data={apps}
        keyExtractor={(it) => it.id}
        renderItem={({ item }) => <Row item={item} />}
        contentContainerStyle={{ padding: 14 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchData} />
        }
      />
    </SafeAreaView>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   STYLE                                    */
/* -------------------------------------------------------------------------- */
const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
  },
  logo: { width: 60, height: 60, borderRadius: 8 },

  title: { fontSize: 16, fontWeight: "700", color: "#111827" },
  sub: { fontSize: 14, color: "#555", marginVertical: 2 },

  statusRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  statusTxt: { marginLeft: 4, fontSize: 13, fontWeight: "600" },
  date: { fontSize: 12, color: "#888", marginTop: 2 },

  emptyT: { marginTop: 10, fontSize: 18, fontWeight: "700", color: "#555" },
  emptyD: { marginTop: 6, color: "#777", textAlign: "center", paddingHorizontal: 24 },
});
