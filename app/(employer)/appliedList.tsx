// app/(employer)/appliedList.tsx
import React, { useEffect, useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { db, auth } from "@/config/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  orderBy,
} from "firebase/firestore";

import Application from "@/components/Application";

/* -------------------------------------------------------------------------- */
/*                                MAIN SCREEN                                 */
/* -------------------------------------------------------------------------- */
export default function AppliedList() {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const userId = auth.currentUser?.uid;

  /* 1️⃣ fetch data */
  const fetchData = useCallback(async () => {
    if (!userId) return;
    setRefreshing(true);

    const q = query(
      collection(db, "applied_jobs"),
      where("employerId", "==", userId),
      orderBy("applied_at", "desc")
    );
    const snap = await getDocs(q);
    setApps(snap.docs.map((d) => ({ $id: d.id, ...d.data() })));
    setLoading(false);
    setRefreshing(false);
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* 2️⃣ accept / reject */
  const handleStatusChange = async (appId: string, status: string) => {
    try {
      const ref = doc(db, "applied_jobs", appId);
      await updateDoc(ref, { status });

      const app = (await getDoc(ref)).data();
      if (!app) return;

      const job = (await getDoc(doc(db, "jobs", app.jobId))).data();
      const msg =
        status === "accepted"
          ? `Đã chấp nhận đơn cho job “${job?.title ?? ""}”`
          : `Đã từ chối đơn cho job “${job?.title ?? ""}”`;

      await addDoc(collection(db, "notifications"), {
        userId: app.userId,
        message: msg,
        type: status,
        jobId: app.jobId,
        read: false,
        created_at: new Date(),
      });

      /* cập nhật nhanh UI */
      setApps((p) => p.map((x) => (x.$id === appId ? { ...x, status } : x)));
      Alert.alert("Thông báo", msg);
    } catch (e) {
      Alert.alert("Lỗi", "Không thể thay đổi trạng thái.");
    }
  };

  /* --------------------------------- UI ---------------------------------- */
  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Text style={styles.title}>Danh sách ứng viên</Text>

      <FlatList
        data={apps}
        keyExtractor={(it) => it.$id}
        renderItem={({ item }) => (
          <Application
            app={item}
            onStatusChange={(s) => handleStatusChange(item.$id, s)}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchData} />
        }
        contentContainerStyle={[
          styles.list,
          apps.length === 0 && { flex: 1 },
        ]}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="people-outline" size={64} color="#ccc" />
            <Text style={{ color: "#888", marginTop: 8 }}>
              Chưa có ứng viên nào
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   STYLE                                    */
/* -------------------------------------------------------------------------- */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8FAFC", paddingHorizontal: 16 },
  title: { fontSize: 20, fontWeight: "700", marginVertical: 12 },
  list: { paddingBottom: 12 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
