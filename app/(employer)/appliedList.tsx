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
import { SCROLL_BOTTOM_PADDING } from '@/utils/layout.utils';

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
   * Flow: API applications → Batch fetch job/user details → Map data
   * ✅ Optimized: Batch fetch + parallel requests + caching
   */
  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      
      // ✅ Lấy applications từ API
      const applications = await applicationApiService.getEmployerApplications();
      
      // ✅ Filter out rejected/deleted applications
      const activeApplications = applications.filter(app => app.status !== 'rejected');
      
      console.log(`📊 Total applications: ${applications.length}, Active: ${activeApplications.length}`);
      
      if (activeApplications.length === 0) {
        setApps([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      // ✅ Extract unique IDs - lọc bỏ null/undefined candidateIds
      const jobIds = [...new Set(activeApplications.map(app => app.jobId))];
      const candidateIds = [...new Set(
        activeApplications
          .map(app => app.candidateId)
          .filter(id => id != null && id !== undefined && id !== '') // ✅ Filter null/undefined/empty
      )];
      
      console.log(`📊 Fetching ${jobIds.length} jobs and ${candidateIds.length} candidates`);
      
      // ✅ Batch fetch jobs và candidates in parallel
      const jobsPromises = jobIds.map(jobId => 
        jobApiService.getJobById(jobId).catch(err => {
          console.warn(`⚠️ Failed to fetch job ${jobId}:`, err.message);
          return { id: jobId, title: "Không rõ" };
        })
      );
      
      const candidatesPromises = candidateIds.map(candidateId => 
        userApiService.getUserById(candidateId).catch(err => {
          console.warn(`⚠️ Failed to fetch candidate ${candidateId}:`, err.message);
          return null;
        })
      );
      
      // ✅ Wait for all fetches (parallel, much faster!)
      const [jobs, candidates] = await Promise.all([
        Promise.all(jobsPromises),
        Promise.all(candidatesPromises)
      ]);
      
      // ✅ Create lookup maps for O(1) access
      const jobMap = new Map(jobs.map(job => [job.id || (job as any).$id, job]));
      const candidateMap = new Map(
        candidates
          .filter(c => c !== null && c !== undefined)
          .map(c => [c!.uid || c!.email, c]) // ✅ Use uid or email as key
      );
      
      console.log(`✅ Loaded ${jobMap.size} jobs and ${candidateMap.size} candidates`);
      
      // ✅ Map active applications with fetched data
      const mappedApps = activeApplications.map(app => {
        const job = jobMap.get(app.jobId);
        const candidate = app.candidateId ? candidateMap.get(app.candidateId) : null;
        
        // ✅ Log if candidate is missing (debugging)
        if (app.candidateId && !candidate) {
          console.warn(`⚠️ Candidate data not found for ID: ${app.candidateId}`);
        }
        
        return {
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
          job: {
            title: job?.title || "Không rõ",
            $id: job?.id || (job as any)?.$id || app.jobId,
          },
          user: candidate ? {
            uid: candidate.uid || app.candidateId, // ✅ Add uid field (from User type)
            name: candidate.displayName || candidate.email || "Ứng viên",
            email: candidate.email || "",
            photoURL: candidate.photoURL || null,
            phone: candidate.phone || "",
          } : {
            uid: app.candidateId || '', // ✅ Fallback uid
            name: app.candidateId ? "Đang tải..." : "Ứng viên ẩn danh",
            email: "",
            photoURL: null,
            phone: "",
          },
        };
      });
      
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
      console.log(`🔄 Changing application ${appId} status to ${status}`);
      
      // ✅ Update status qua API
      await applicationApiService.updateApplicationStatus(
        appId,
        status as ApplicationType['status']
      );

      console.log(`✅ Status updated successfully`);

      // ✅ Lấy thông tin application để hiển thị notification
      const app = apps.find(a => a.$id === appId);
      
      if (app) {
        const msg =
          status === "accepted"
            ? `Đã chấp nhận đơn cho job "${app.job?.title ?? ""}"`
            : `Đã từ chối đơn cho job "${app.job?.title ?? ""}"`;

        // ✅ Update UI immediately
        if (status === 'rejected') {
          // Remove rejected applications from list
          console.log(`🗑️ Removing rejected application from list`);
          setApps((prev) => prev.filter((x) => x.$id !== appId));
        } else {
          // Update status for accepted applications
          setApps((prev) => prev.map((x) => (x.$id === appId ? { ...x, status } : x)));
        }
        
        Alert.alert("Thành công", msg);
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
          { paddingBottom: SCROLL_BOTTOM_PADDING },
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
