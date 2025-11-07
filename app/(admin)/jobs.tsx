import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { db } from "@/config/firebase";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { useRouter } from "expo-router";
type Job = {
  $id: string;
  title?: string;
  company?: string;
  location?: string;
  salary?: string;
  type?: string;
};

const JobsScreen = () => {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      const snap = await getDocs(collection(db, "jobs"));
      const data = snap.docs.map(d => ({ $id: d.id, ...d.data() })) as Job[];
      setJobs(data);
    } catch (error) {
      console.error("Error loading jobs:", error);
      Alert.alert("Lỗi", "Không thể tải danh sách jobs");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert("Xác nhận", "Bạn có chắc muốn xóa job này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "jobs", id));
            setJobs(prev => prev.filter(j => j.$id !== id));
            Alert.alert("Thành công", "Đã xóa job");
          } catch (error) {
            Alert.alert("Lỗi", "Không thể xóa job");
          }
        },
      },
    ]);
  };

  const renderJob = ({ item }: { item: Job }) => (
    <View style={styles.jobCard}>
      <View style={styles.jobInfo}>
        <Text style={styles.jobTitle}>{item.title || "N/A"}</Text>
        <Text style={styles.jobDetail}>📍 {item.location || "Chưa có"}</Text>
        <Text style={styles.jobDetail}>💰 {item.salary || "Thỏa thuận"}</Text>
        <View style={styles.badges}>
          <View style={[styles.badge, { backgroundColor: getTypeBadgeColor(item.type) }]}>
            <Text style={styles.badgeText}>{item.type || "full-time"}</Text>
          </View>
        </View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity 
          onPress={() => router.push({ pathname: "/(admin)/job-detail", params: { jobId: item.$id } } as any)}
        >
          <Ionicons name="pencil" size={22} color="#3b82f6" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item.$id)}>
          <Ionicons name="trash-outline" size={22} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={jobs}
        renderItem={renderJob}
        keyExtractor={item => item.$id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Không có jobs</Text>
        }
      />
    </View>
  );
};

const getTypeBadgeColor = (type?: string) => {
  switch (type?.toLowerCase()) {
    case "full-time": return "#10b981";
    case "part-time": return "#f59e0b";
    case "intern": return "#3b82f6";
    case "remote": return "#8b5cf6";
    default: return "#64748b";
  }
};

export default JobsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 16 },
  jobCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  jobInfo: { flex: 1 },
  jobTitle: { fontSize: 16, fontWeight: "700", color: "#1a1a1a", marginBottom: 6 },
  jobDetail: { fontSize: 14, color: "#64748b", marginBottom: 4 },
  badges: { flexDirection: "row", gap: 8, marginTop: 8 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: { fontSize: 12, fontWeight: "600", color: "#fff" },
  emptyText: { textAlign: "center", marginTop: 40, fontSize: 15, color: "#64748b" },
  actions: { flexDirection: "row", gap: 16, alignItems: "center" },
});

