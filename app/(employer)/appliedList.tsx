// app/(employer)/appliedList.tsx
// Refactored: Sử dụng applicationApiService thay vì Firestore trực tiếp
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

import { applicationApiService } from "@/services/applicationApi.service";
import { jobApiService } from "@/services/jobApi.service";
import { userApiService } from "@/services/userApi.service";
import { notificationApiService } from "@/services/notificationApi.service";
import Application from "@/components/Application";
import { Application as ApplicationType } from "@/services/applicationApi.service";

/* -------------------------------------------------------------------------- */
/*                                MAIN SCREEN                                 */
/* -------------------------------------------------------------------------- */
export default function AppliedList() {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Fetch applications từ API
   * Flow: API applications → Fetch job/user details → Map data
   */
  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      
      // ✅ Lấy applications từ API
      const applications = await applicationApiService.getEmployerApplications();
      
      // ✅ Fetch job và candidate details với rate limiting
      const mappedApps: any[] = [];
      
      for (let i = 0; i < applications.length; i++) {
        const app = applications[i];
        
        try {
          // Add 200ms delay between requests (except first one)
          if (i > 0) await new Promise(resolve => setTimeout(resolve, 200));
          
          // Fetch job và candidate info song song
          const [job, candidate] = await Promise.all([
            jobApiService.getJobById(app.jobId),
            app.candidateId 
              ? userApiService.getUserById(app.candidateId)
              : Promise.resolve(null)
          ]);
          
          mappedApps.push({
            $id: app.id,
            id: app.id,
            jobId: app.jobId,
            candidateId: app.candidateId,
            userId: app.candidateId, // For Application component compatibility
            status: app.status,
            applied_at: app.appliedAt,
            cvUrl: app.cvUrl,
            cv_url: app.cvUrl, // Alias for Application component
            coverLetter: app.coverLetter,
            job: {
              title: job.title,
              $id: job.id,
            },
            user: candidate ? {
              name: candidate.displayName || candidate.email,
              email: candidate.email,
              photoURL: candidate.photoURL,
              phone: candidate.phone,
            } : {
              name: "Ứng viên ẩn danh",
              email: "",
            },
          });
        } catch (error: any) {
          console.error(`Failed to fetch details for application ${app.id}:`, error);
          
          // If 429, increase delay
          if (error?.response?.status === 429) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
          // Fallback data
          mappedApps.push({
            $id: app.id,
            id: app.id,
            jobId: app.jobId,
            candidateId: app.candidateId,
            userId: app.candidateId,
            status: app.status,
            applied_at: app.appliedAt,
            cvUrl: app.cvUrl,
            cv_url: app.cvUrl,
            coverLetter: app.coverLetter,
            job: { title: "Không rõ", $id: app.jobId },
            user: { name: "Ứng viên ẩn danh", email: "" },
          });
        }
      }
      
      setApps(mappedApps);
    } catch (error: any) {
      console.error("❌ Fetch applications error:", error);
      Alert.alert("Lỗi", "Không thể tải danh sách ứng tuyển. Vui lòng thử lại.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /**
   * Accept / Reject application qua API
   * Flow: Update status → Create notification (nếu cần) → Refresh UI
   */
  const handleStatusChange = async (appId: string, status: string) => {
    try {
      // ✅ Update status qua API
      await applicationApiService.updateApplicationStatus(
        appId,
        status as ApplicationType['status']
      );

      // ✅ Lấy thông tin application để tạo notification
      const applications = await applicationApiService.getEmployerApplications();
      const app = applications.find((a: ApplicationType) => a.id === appId);
      
      if (app) {
        try {
          const job = await jobApiService.getJobById(app.jobId);
          const msg =
            status === "accepted"
              ? `Đã chấp nhận đơn cho job "${job?.title ?? ""}"`
              : `Đã từ chối đơn cho job "${job?.title ?? ""}"`;

          // TODO: Tạo notification qua notificationApiService nếu có endpoint
          // Hiện tại notification được tạo tự động bởi backend hoặc qua notificationApiService
          
          // ✅ Cập nhật UI
          setApps((p) => p.map((x) => (x.$id === appId ? { ...x, status } : x)));
          Alert.alert("Thông báo", msg);
        } catch (jobError) {
          console.error("Failed to fetch job for notification:", jobError);
          // Vẫn update UI dù không fetch được job
          setApps((p) => p.map((x) => (x.$id === appId ? { ...x, status } : x)));
          Alert.alert("Thông báo", `Đã ${status === "accepted" ? "chấp nhận" : "từ chối"} đơn ứng tuyển.`);
        }
      }
    } catch (e: any) {
      console.error("❌ Update application status error:", e);
      Alert.alert("Lỗi", "Không thể thay đổi trạng thái. Vui lòng thử lại.");
    }
  };

  /**
   * Handle delete callback - Refresh list
   */
  const handleDelete = () => {
    fetchData(); // Reload all applications
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
            onDelete={() => fetchData()} // Refresh list after delete
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
