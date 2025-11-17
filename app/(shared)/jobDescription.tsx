// app/(shared)/jobDescription.tsx
import React, { useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  RefreshControl,
  Platform,
  StatusBar,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator } from "react-native-paper";
import { useRole } from "@/contexts/RoleContext";
import { useJobDescription } from "@/hooks/useJobDescription";
import { useJobStatus } from "@/hooks/useJobStatus";
import { smartBack } from "@/utils/navigation";
import JobApplySection from "@/components/JobApplySection";
import * as Haptics from "expo-haptics";
import { formatSalary } from "@/utils/salary.utils";
import { getJobSections, isViecoiJob } from "@/utils/jobContent.utils";
import { SCROLL_BOTTOM_PADDING } from "@/utils/layout.utils";
import { Job } from "@/types";
import { auth } from "@/config/firebase";

const JobDescription = () => {
  const [refreshing, setRefreshing] = useState(false);
  const params = useLocalSearchParams<{ 
    jobId?: string; 
    id?: string;
    applicationStatus?: string;
    applicationId?: string;
  }>();
  const jobId = (params.jobId || params.id || "") as string;
  const applicationStatus = params.applicationStatus as string | undefined;
  const { role: userRole } = useRole();

  const {
    jobData,
    posterInfo,
    loading,
    error,
    isApplied,
    applyLoading,
    handleApply,
    handleCancel,
    handleDelete,
    refresh,
    hasDraft,
  } = useJobDescription(jobId);

  useFocusEffect(
    React.useCallback(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      refresh();
    }, [refresh])
  );

  const { isSaved, saveLoading, toggleSave } = useJobStatus(jobId);

  const showCandidateUI = userRole === "candidate";
  
  const showEmployerUI = React.useMemo(() => {
    if (userRole !== "employer" || !jobData) return false;
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) return false;
    const jobEmployerId = (jobData as Job)?.employerId || (jobData as Job)?.ownerId;
    return jobEmployerId === currentUserId;
  }, [userRole, jobData]);

  const canWithdraw = React.useMemo(() => {
    if (applicationStatus) {
      return applicationStatus === 'pending';
    }
    return true;
  }, [applicationStatus]);

  const statusLabel = React.useMemo(() => {
    if (!applicationStatus) return null;
    switch (applicationStatus) {
      case 'accepted': return '✅ Đã được chấp nhận';
      case 'rejected': return '❌ Đã bị từ chối';
      case 'pending': return '⏳ Đang chờ duyệt';
      default: return null;
    }
  }, [applicationStatus]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  // Parse job sections
  const sections = React.useMemo(() => {
    if (!jobData) return null;
    return getJobSections(jobData);
  }, [jobData]);

  // ✅ ERROR
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#FF6B6B" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => smartBack()}>
          <Text style={styles.backButtonText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ✅ LOADING
  if (loading || !jobData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F97459" />
        <Text style={styles.loadingText}>Đang tải thông tin công việc...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Fixed Header - Luôn hiển thị ở top */}
      <View style={styles.fixedHeader}>
        <TouchableOpacity style={styles.buttons} onPress={() => smartBack()}>
          <Ionicons name="arrow-back" size={24} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.buttons}
          onPress={() => router.push("/")}
        >
          <Ionicons name="share-social" size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingBottom: SCROLL_BOTTOM_PADDING, paddingTop: 60 }}
        showsVerticalScrollIndicator={false}
      >

        {/* Job Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.jobImageContainer}>
            <Image
              style={styles.jobImage}
              source={{
                uri: (() => {
                  const job = jobData as Job;
                  // Priority: company_logo (viecoi) > image > company.image > placeholder
                  if (job?.company_logo) return job.company_logo;
                  if (job?.image) return job.image;
                  
                  const company = job?.company;
                  if (company && typeof company === 'object' && (company as any).image) {
                    return (company as any).image;
                  }
                  
                  // Fallback to placeholder with company name
                  const companyName = job?.company_name || 
                    (company && typeof company === 'object' ? company.corp_name : '') || 
                    'Job';
                  return `https://via.placeholder.com/100?text=${encodeURIComponent(companyName)}`;
                })(),
              }}
            />
          </View>

          <Text style={styles.jobTitle}>{jobData?.title}</Text>
          
          <View style={styles.companyRow}>
            <Ionicons name="business-outline" size={16} color="#666" />
            <Text style={styles.companyName}>
              {(() => {
                const job = jobData as Job;
                // Thử company_name trước (cho viecoi jobs)
                if (job?.company_name) return job.company_name;
                // Sau đó thử company object
                const company = job?.company;
                if (!company) return "";
                if (typeof company === 'string') return company;
                return company.corp_name || "";
              })()}
            </Text>
          </View>

          {/* Job Type Badge */}
          {(jobData as Job)?.type && (
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>
                {(jobData as Job)?.type}
              </Text>
            </View>
          )}

          {/* Meta Info Grid */}
          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Ionicons name="cash-outline" size={18} color="#4A80F0" />
              <Text style={styles.metaText}>
                {formatSalary((jobData as Job)?.salary) || "Thoả thuận"}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={18} color="#4A80F0" />
              <Text style={styles.metaText}>
                {(jobData as Job)?.location || "Chưa cập nhật"}
              </Text>
            </View>
          </View>

          {/* Source Badge */}
          {isViecoiJob(jobData) && (
            <View style={styles.sourceBadge}>
              <Ionicons name="globe-outline" size={14} color="#4A80F0" />
              <Text style={styles.sourceBadgeText}>Nguồn: viecoi.vn</Text>
            </View>
          )}
        </View>

        {/* Job Sections - Single Scroll */}
        {sections && (
          <View style={styles.sectionsContainer}>
            {/* Overview Section */}
            {sections.overview && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="information-circle-outline" size={22} color="#2F264F" />
                  <Text style={styles.sectionTitle}>Tổng quan</Text>
                </View>
                <Text style={styles.sectionContent}>{sections.overview}</Text>
              </View>
            )}

            {/* Responsibilities Section */}
            {sections.responsibilities && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="list-outline" size={22} color="#2F264F" />
                  <Text style={styles.sectionTitle}>Chi tiết công việc</Text>
                </View>
                <Text style={styles.sectionContent}>{sections.responsibilities}</Text>
              </View>
            )}

            {/* Requirements Section */}
            {sections.requirements && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="checkmark-circle-outline" size={22} color="#2F264F" />
                  <Text style={styles.sectionTitle}>Yêu cầu ứng viên</Text>
                </View>
                <Text style={styles.sectionContent}>{sections.requirements}</Text>
              </View>
            )}

            {/* Benefits Section */}
            {sections.benefits && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="gift-outline" size={22} color="#2F264F" />
                  <Text style={styles.sectionTitle}>Quyền lợi</Text>
                </View>
                <Text style={styles.sectionContent}>{sections.benefits}</Text>
              </View>
            )}

            {/* Company Info Section */}
            {sections.companyInfo && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="business-outline" size={22} color="#2F264F" />
                  <Text style={styles.sectionTitle}>Thông tin công ty</Text>
                </View>
                <Text style={styles.sectionContent}>{sections.companyInfo}</Text>
              </View>
            )}

            {/* Poster Info - Chỉ hiển thị cho internal jobs */}
            {posterInfo && (posterInfo.name || posterInfo.email) && (
              <View style={styles.posterSection}>
                <Ionicons name="person-circle-outline" size={18} color="#666" />
                <Text style={styles.posterText}>
                  Người đăng: {posterInfo.name || posterInfo.email}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Fixed Bottom Bar - Compact UI */}
      {showCandidateUI && (
        <View style={styles.floatingBottomBar}>
          <JobApplySection
            job={jobData as Job}
            onApplyFeatured={handleApply}
            isSaved={isSaved}
            saveLoading={saveLoading}
            onToggleSave={toggleSave}
          />
        </View>
      )}

      {showEmployerUI && (
        <View style={styles.floatingBottomBar}>
          <View style={styles.employerButtons}>
            <TouchableOpacity
              style={[styles.editButton, { backgroundColor: "#4A80F0" }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                console.log('[Chỉnh sửa] Navigating to editJob with jobId:', jobId);
                router.push({
                  pathname: "/(employer)/editJob",
                  params: { jobId: jobId },
                });
              }}
            >
              <Ionicons name="create-outline" size={18} color="#fff" />
              <Text style={styles.employerText}>Chỉnh sửa</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.editButton, { backgroundColor: "#EF4444" }]}
              onPress={handleDelete}
            >
              <Ionicons name="trash-outline" size={18} color="#fff" />
              <Text style={styles.employerText}>Xóa</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

export default JobDescription;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  scrollContent: { flex: 1 },

  // Fixed Header - Always on top
  fixedHeader: {
    position: "absolute",
    top: Platform.OS === "android" ? (StatusBar.currentHeight || 24) + 10 : 50,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    zIndex: 1000,
  },
  // Old topView (deprecated)
  topView: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop:
      Platform.OS === "android" ? (StatusBar.currentHeight || 24) + 10 : 10,
  },
  buttons: {
    height: 40,
    width: 40,
    backgroundColor: "white",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    elevation: 3,
  },

  // Header Card
  headerCard: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  jobImageContainer: {
    marginBottom: 16,
  },
  jobImage: { 
    height: 80, 
    width: 80, 
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "#F0F0F0",
  },
  jobTitle: { 
    fontSize: 22, 
    fontWeight: "700",
    color: "#1A1A1A",
    textAlign: "center",
    marginBottom: 8,
  },
  companyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  companyName: { 
    fontSize: 15,
    color: "#666",
    fontWeight: "500",
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: "#FFF4E6",
    borderRadius: 20,
    marginBottom: 12,
  },
  typeBadgeText: {
    fontSize: 12,
    color: "#FF9500",
    fontWeight: "600",
  },
  metaGrid: {
    flexDirection: "row",
    gap: 16,
    marginTop: 8,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    color: "#4A80F0",
    fontWeight: "600",
  },
  sourceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#EBF2FC",
    borderRadius: 20,
  },
  sourceBadgeText: {
    fontSize: 12,
    color: "#4A80F0",
    fontWeight: "600",
  },

  // Sections Container
  sectionsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2F264F",
  },
  sectionContent: {
    fontSize: 15,
    color: "#333",
    lineHeight: 24,
    textAlign: "justify",
  },

  // Floating Bottom Bar - Compact Modern UI
  floatingBottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },

  // Poster Info
  posterSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F8F9FA",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  posterText: {
    fontSize: 13,
    color: "#666",
    fontStyle: "italic",
  },

  // Employer Buttons
  employerButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    flex: 1,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    flex: 1,
  },
  employerText: { color: "#fff", fontWeight: "600", marginLeft: 4, fontSize: 14 },

  // Error & Loading States
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: "#FF6B6B",
    textAlign: "center",
    fontWeight: "600",
  },
  backButton: {
    backgroundColor: "#4A80F0",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  backButtonText: { color: "#fff", fontWeight: "600", fontSize: 16 },

  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { fontSize: 16, color: "#666", marginTop: 8 },
});
