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
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { SCROLL_BOTTOM_PADDING } from '@/utils/layout.utils';

import { applicationApiService } from "@/services/applicationApi.service";
import { jobApiService } from "@/services/jobApi.service";
import { userApiService } from "@/services/userApi.service";
import { notificationApiService } from "@/services/notificationApi.service";
import { eventBus, EVENTS } from "@/utils/eventBus";
import Application from "@/components/Application";
import { Application as ApplicationType } from "@/services/applicationApi.service";

/* -------------------------------------------------------------------------- */
/*                                MAIN SCREEN                                 */
/* -------------------------------------------------------------------------- */
export default function AppliedList() {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "accepted" | "rejected">("all");

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
      
      console.log('📊 Employer applications fetched:', {
        total: applications.length,
        statuses: applications.reduce((acc: any, app) => {
          acc[app.status] = (acc[app.status] || 0) + 1;
          return acc;
        }, {}),
        sample: applications.slice(0, 2).map(app => ({
          id: app.id?.substring(0, 8),
          status: app.status,
          jobId: app.jobId?.substring(0, 8),
          hasCvUrl: !!app.cvUrl,
          cvId: (app as any).cvId,
          cvSource: (app as any).cvSource,
        })),
      });
      
      // ✅ Filter out rejected/deleted applications to keep UI clean
      // Employer can see rejected in applicationDetail if they navigate there directly
      const activeApplications = applications.filter(app => 
        app.status !== 'rejected' && app.status !== 'withdrawn'
      );
      
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
          return null; // ✅ Return null for deleted jobs
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
      
      // ✅ Create lookup maps for O(1) access - filter out null jobs
      const jobMap = new Map(
        jobs
          .filter(job => job !== null)
          .map(job => [job!.id || (job as any).$id, job])
      );
      
      // ✅ FIX: Create candidateMap with BOTH uid AND email as keys
      const candidateMap = new Map<string, any>();
      candidates
        .filter(c => c !== null && c !== undefined)
        .forEach(c => {
          if (c!.uid) candidateMap.set(c!.uid, c);
          if (c!.email) candidateMap.set(c!.email, c);
        });
      
      console.log(`✅ Loaded ${jobMap.size} jobs and ${candidateMap.size / 2} candidates (${candidateMap.size} keys)`);
      
      // ✅ Map active applications with fetched data + filter out deleted jobs
      let deletedJobsCount = 0;
      const mappedApps = activeApplications
        .map(app => {
          const job = jobMap.get(app.jobId);
          // ✅ Ưu tiên dùng candidate data từ API enriched response 
          const enrichedCandidate = (app as any).candidate;
          const fetchedCandidate = app.candidateId ? candidateMap.get(app.candidateId) : null;
          const candidate = enrichedCandidate || fetchedCandidate;
          
          // ✅ Skip if job was deleted (404)
          if (!job) {
            console.warn(`⚠️ Job ${app.jobId} not found (deleted) - skipping application ${app.id}`);
            deletedJobsCount++;
            return null;
          }
          
          // ✅ Log candidate data for debugging
          if (candidate) {
            console.log(`👤 Candidate ${app.candidateId}:`, {
              displayName: candidate.displayName,
              photoURL: candidate.photoURL,
              email: candidate.email,
              source: enrichedCandidate ? 'enriched' : 'fetched'
            });
          } else if (app.candidateId) {
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
            cvId: (app as any).cvId,
            cvSource: (app as any).cvSource,
            coverLetter: app.coverLetter,
            job: {
              title: job.title || "Không rõ",
              $id: job.id || (job as any)?.$id || app.jobId,
            },
            user: candidate ? {
              uid: candidate.uid || app.candidateId,
              // ✅ FIX: Kiểm tra cả displayName, name và fullName
              name: candidate.displayName || candidate.name || candidate.fullName || candidate.email || "Ứng viên",
              email: candidate.email || "",
              photoURL: candidate.photoURL || candidate.avatar || null,
              phone: candidate.phone || candidate.phoneNumber || "",
            } : {
              uid: app.candidateId || '',
              name: "Ứng viên (chưa có hồ sơ)",
              email: app.candidateId ? `ID: ${app.candidateId.substring(0, 8)}...` : "",
              photoURL: null,
              phone: "",
            },
          };
        })
        .filter(app => app !== null); // ✅ Remove null entries (deleted jobs)
      
      setApps(mappedApps);
      
      // ✅ Show info if some applications were filtered out
      if (deletedJobsCount > 0) {
        console.log(`ℹ Filtered out ${deletedJobsCount} application(s) for deleted jobs`);
        // Optional: Show toast or silent notification
        // Alert.alert(
        //   "Thông báo", 
        //   `Đã ẩn ${deletedJobsCount} ứng tuyển của công việc đã xóa.`,
        //   [{ text: "OK" }]
        // );
      }
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
        
        // ✅ FIX: Emit event to update homepage immediately
        eventBus.emit(EVENTS.APPLICATION_STATUS_UPDATED, { 
          applicationId: appId, 
          status,
          timestamp: Date.now() 
        });
        
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
  
  // ✅ Filter applications based on search and status
  const filteredApps = apps.filter(app => {
    // Filter by status
    if (filterStatus !== 'all' && app.status !== filterStatus) return false;
    
    // Filter by search query (Candidate Name or Job Title)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const candidateName = app.user?.name?.toLowerCase() || "";
      const jobTitle = app.job?.title?.toLowerCase() || "";
      return candidateName.includes(query) || jobTitle.includes(query);
    }
    
    return true;
  });

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4A80F0" />
      </View>
    );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Danh sách ứng viên</Text>
        <Text style={styles.subtitle}>{apps.length} hồ sơ ứng tuyển</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#94a3b8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm theo tên hoặc công việc..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#94a3b8"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={20} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'pending', label: 'Chờ duyệt' },
            { id: 'accepted', label: 'Đã nhận' },
            { id: 'rejected', label: 'Đã từ chối' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.filterTab,
                filterStatus === tab.id && styles.filterTabActive,
              ]}
              onPress={() => setFilterStatus(tab.id as any)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  filterStatus === tab.id && styles.filterTabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredApps}
        keyExtractor={(it) => it.$id}
        renderItem={({ item }) => (
          <Application
            app={item}
            onStatusChange={(s) => handleStatusChange(item.$id, s)}
            onDelete={() => fetchData()} // Refresh list after delete
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchData} tintColor="#4A80F0" />
        }
        contentContainerStyle={[
          styles.list,
          { paddingBottom: SCROLL_BOTTOM_PADDING },
          filteredApps.length === 0 && { flex: 1 },
        ]}
        ListEmptyComponent={
          <View style={styles.center}>
            <Image 
              source={{ uri: "https://cdn-icons-png.flaticon.com/512/7486/7486744.png" }} 
              style={{ width: 120, height: 120, opacity: 0.5, marginBottom: 16 }}
            />
            <Text style={styles.emptyText}>
              {searchQuery || filterStatus !== 'all' 
                ? "Không tìm thấy ứng viên phù hợp" 
                : "Chưa có ứng viên nào ứng tuyển"}
            </Text>
            {(searchQuery || filterStatus !== 'all') && (
              <TouchableOpacity 
                style={styles.clearFilterButton}
                onPress={() => {
                  setSearchQuery("");
                  setFilterStatus("all");
                }}
              >
                <Text style={styles.clearFilterText}>Xóa bộ lọc</Text>
              </TouchableOpacity>
            )}
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
  safe: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  title: { fontSize: 24, fontWeight: "700", color: "#1e293b" },
  subtitle: { fontSize: 14, color: "#64748b", marginTop: 4 },
  
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: "#1e293b" },
  
  filterContainer: {
    marginTop: 12,
    marginBottom: 8,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginRight: 8,
  },
  filterTabActive: {
    backgroundColor: "#4A80F0",
    borderColor: "#4A80F0",
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748b",
  },
  filterTabTextActive: {
    color: "#fff",
  },

  list: { paddingHorizontal: 16, paddingTop: 8 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingBottom: 100 },
  emptyText: { fontSize: 16, color: "#94a3b8", textAlign: "center" },
  clearFilterButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#e2e8f0",
    borderRadius: 20,
  },
  clearFilterText: { fontSize: 14, color: "#475569", fontWeight: "600" },
});
