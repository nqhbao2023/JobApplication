import React, { useEffect, useState } from "react";
import { View, Text, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/config/firebase";

export default function CategoryJobsScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
const fetchJobs = async () => {
  try {
    // 🔍 Tìm theo cả ID và tên danh mục
    const q1 = query(collection(db, "jobs"), where("jobCategories", "==", id));
    const q2 = query(collection(db, "jobs"), where("jobCategories", "==", name));

    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    const results = [...snap1.docs, ...snap2.docs];

    setJobs(results.map((d) => ({ id: d.id, ...d.data() })));
  } catch (e) {
    console.error("Lỗi tải job:", e);
  } finally {
    setLoading(false);
  }
};

    fetchJobs();
  }, [id]);

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );

  if (jobs.length === 0)
    return (
      <View style={styles.center}>
        <Text>Không có công việc nào trong danh mục này.</Text>
      </View>
    );

  return (
    <FlatList
      data={jobs}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 16 }}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.jobCard}
          onPress={() => Alert.alert("Chi tiết công việc", item.title || "Không có tiêu đề")}
        >
          <Text style={styles.jobTitle}>{item.title}</Text>
          <Text style={styles.jobSub}>{item.company || "Không rõ công ty"}</Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  jobCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  jobSub: {
    color: "#666",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
