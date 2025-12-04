// app/(employer)/applications.tsx
// Refactored: Sử dụng applicationApiService thay vì Firestore trực tiếp
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
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { SCROLL_BOTTOM_PADDING } from '@/utils/layout.utils';

import { applicationApiService } from "@/services/applicationApi.service";
import { jobApiService } from "@/services/jobApi.service";
import { userApiService } from "@/services/userApi.service";
import { useRole } from "@/contexts/RoleContext";
import { Application } from "@/services/applicationApi.service";

/* -------------------------------------------------------------------------- */
export default function Applications() {
  const router = useRouter();
  const { role } = useRole();

  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Fetch applications từ API
   * Flow: API applications → Fetch job/user details → Map data
   */
  const fetchData = useCallback(async () => {
    if (!role) return;
    
    try {
      setRefreshing(true);
      
      // ✅ Lấy applications từ API (employer hoặc candidate)
      const applications = role === "employer" 
        ? await applicationApiService.getEmployerApplications()
        : await applicationApiService.getMyApplications();
      
      // ✅ Helper: Extract company name từ Job.company (có thể là string hoặc object)
      const getCompanyName = (company: string | { $id?: string; corp_name?: string; nation?: string } | undefined): string => {
        if (!company) return "Ẩn danh";
        if (typeof company === 'string') return company;
        return company.corp_name || "Ẩn danh";
      };

      // ✅ Populate job và user details with rate limiting
      const appsWithDetails: any[] = [];
      
      for (let i = 0; i < applications.length; i++) {
        const app = applications[i];
        
        try {
          // Add 200ms delay between requests (except first one)
          if (i > 0) await new Promise(resolve => setTimeout(resolve, 200));
          
          // Fetch job và candidate info song song
          const [job, candidate] = await Promise.all([
            jobApiService.getJobById(app.jobId),
            role === "employer" && app.candidateId 
              ? userApiService.getUserById(app.candidateId)
              : Promise.resolve(null)
          ]);
          
          appsWithDetails.push({
            id: app.id,
            jobId: app.jobId,
            candidateId: app.candidateId,
            status: app.status,
            applied_at: app.appliedAt,
            jobInfo: {
              title: job.title,
              company: getCompanyName(job.company),
              image: job.image,
            },
            userInfo: candidate ? {
              name: candidate.displayName || candidate.email,
              email: candidate.email,
              photoURL: candidate.photoURL,
              phone: candidate.phone,
            } : null,
          });
        } catch (error: any) {
          console.error(`Failed to fetch details for application ${app.id}:`, error);
          
          // If 429, increase delay for next request
          if (error?.response?.status === 429) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
          appsWithDetails.push({
            id: app.id,
            jobId: app.jobId,
            candidateId: app.candidateId,
            status: app.status,
            applied_at: app.appliedAt,
            jobInfo: {
              title: "Không rõ",
              company: "Ẩn danh",
              image: undefined,
            },
            userInfo: {
              name: "Ứng viên ẩn danh",
              email: "",
              photoURL: undefined,
            },
          });
        }
      }
      
      setApps(appsWithDetails);
    } catch (error: any) {
      console.error("❌ Fetch applications error:", error);
      Alert.alert("Lỗi", "Không thể tải danh sách ứng tuyển. Vui lòng thử lại.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [role]);

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

    // Convert applied_at từ Date/string/timestamp về Date object
    const appliedDate = item.applied_at 
      ? (typeof item.applied_at === 'string' 
          ? new Date(item.applied_at) 
          : item.applied_at instanceof Date 
            ? item.applied_at 
            : item.applied_at?.seconds 
              ? new Date(item.applied_at.seconds * 1000)
              : new Date(item.applied_at))
      : null;

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.card}
        onPress={() => {
          if (isEmp && item.id) {
            // Employer: Xem chi tiết application (CV, accept/reject actions)
            router.push({
              pathname: "/(employer)/appliedList",
              params: { 
                applicationId: item.id,
                highlightId: item.id, // To scroll to specific application
              },
            });
          } else if (!isEmp) {
            // Candidate: Xem chi tiết job
            router.push({
              pathname: "/(shared)/jobDescription",
              params: { jobId: item.jobId, from: '/(employer)/applications' },
            });
          }
        }}
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
          
          {isEmp && usr.email && (
            <Text style={styles.email} numberOfLines={1}>
              📧 {usr.email}
            </Text>
          )}
          
          {isEmp && usr.phone && (
            <Text style={styles.phone} numberOfLines={1}>
              📱 {usr.phone}
            </Text>
          )}

          <View style={styles.statusRow}>
            <Ionicons
              name={
                item.status === "accepted"
                  ? "checkmark-circle"
                  : item.status === "rejected"
                  ? "close-circle"
                  : item.status === "withdrawn"
                  ? "close-circle-outline"
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
                : item.status === "withdrawn"
                ? "Đã hủy"
                : "Đang chờ duyệt"}
            </Text>
          </View>

          {appliedDate && (
            <Text style={styles.date}>
              Ứng tuyển: {appliedDate.toLocaleDateString("vi-VN")}
            </Text>
          )}
        </View>
        
        {isEmp && (
          <Ionicons name="chevron-forward" size={20} color="#999" style={{ marginLeft: 8 }} />
        )}
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
        contentContainerStyle={{ padding: 14, paddingBottom: SCROLL_BOTTOM_PADDING }}
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
  email: { fontSize: 12, color: "#666", marginTop: 2 },
  phone: { fontSize: 12, color: "#666", marginTop: 1 },

  statusRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  statusTxt: { marginLeft: 4, fontSize: 13, fontWeight: "600" },
  date: { fontSize: 12, color: "#888", marginTop: 2 },

  emptyT: { marginTop: 10, fontSize: 18, fontWeight: "700", color: "#555" },
  emptyD: { marginTop: 6, color: "#777", textAlign: "center", paddingHorizontal: 24 },
});
