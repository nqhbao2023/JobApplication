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
import { useSafeBack } from "@/hooks/useSafeBack";
import JobApplySection from "@/components/JobApplySection";
import * as Haptics from "expo-haptics";
import { formatSalary } from "@/utils/salary.utils";
import { getJobSections, isViecoiJob } from "@/utils/jobContent.utils";
import { SCROLL_BOTTOM_PADDING } from "@/utils/layout.utils";
import { Job } from "@/types";
import { auth } from "@/config/firebase";
import { quickPostService } from "@/services/quickPostApi.service";
import { authApiService } from "@/services/authApi.service";
import { SalaryPredictionBadge } from "@/components/job/SalaryPredictionBadge";

const JobDescription = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [hasFocused, setHasFocused] = useState(false); // Track if already focused once
  const { role: userRole } = useRole();
  
  const params = useLocalSearchParams<{ 
    jobId?: string; 
    id?: string;
    applicationStatus?: string;
    applicationId?: string;
    from?: string; // ✅ Track where user came from
  }>();
  const jobId = (params.jobId || params.id || "") as string;
  const paramsApplicationStatus = params.applicationStatus as string | undefined;
  
  // ✅ Sử dụng useSafeBack hook với from param được truyền explicitly
  const { goBack } = useSafeBack({ from: params.from });

  const {
    jobData,
    companyData,
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
    applicationStatus: apiApplicationStatus, // ✅ Lấy từ API
  } = useJobDescription(jobId);

  // ✅ Only refresh on focus if coming back (not initial load)
  useFocusEffect(
    React.useCallback(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Only refresh if we've already focused once (coming back from another screen)
      if (hasFocused) {
        refresh();
      } else {
        setHasFocused(true);
      }
    }, [hasFocused, refresh])
  );

  const { isSaved, saveLoading, toggleSave } = useJobStatus(jobId);

  // ✅ Ưu tiên dùng applicationStatus từ API (realtime), fallback về params nếu chưa có
  const applicationStatus = apiApplicationStatus || paramsApplicationStatus;

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
      // ✅ Cho phép rút hồ sơ nếu đang là draft hoặc pending
      return applicationStatus === 'pending' || applicationStatus === 'draft';
    }
    return true;
  }, [applicationStatus]);

  const statusLabel = React.useMemo(() => {
    if (!applicationStatus) return null;
    switch (applicationStatus) {
      case 'accepted': return '✅ Đã được chấp nhận';
      case 'rejected': return '❌ Đã bị từ chối';
      case 'reviewing': return '👀 Đang xem xét';
      case 'withdrawn': return '🔙 Đã rút hồ sơ';
      case 'pending': return '⏳ Đang chờ duyệt';
      case 'draft': return '📝 Chưa nộp CV'; // ✅ NEW: Draft status
      default: return null;
    }
  }, [applicationStatus]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  /**
   * ✅ Handle Chat with Employer
   * Navigate to chat screen with employer when application is accepted
   */
  const handleChatWithEmployer = React.useCallback(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert('Lỗi', 'Vui lòng đăng nhập để nhắn tin');
      return;
    }

    const job = jobData as Job;
    const employerId = job?.employerId || job?.ownerId;
    
    if (!employerId) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin nhà tuyển dụng');
      return;
    }

    // Get employer/company name for display
    const employerName = companyData?.corp_name || 
      job?.company_name || 
      (typeof job?.company === 'object' ? job?.company?.corp_name : '') ||
      'Nhà tuyển dụng';

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    router.push({
      pathname: "/(shared)/chat",
      params: {
        partnerId: employerId,
        partnerName: employerName,
        role: "Candidate",
        jobId: jobId, // Optional: để context về job nào
        from: "/(shared)/jobDescription",
      },
    });
  }, [jobData, companyData, jobId]);

  /**
   * Handle Quick-Post Application
   * Send CV notification via email to poster
   */
  const handleQuickPostApply = async () => {
    try {
      // Get current user info
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Lỗi', 'Vui lòng đăng nhập để ứng tuyển');
        return;
      }

      // Get user profile
      const profile = await authApiService.getProfile();
      
      // Show confirmation
      Alert.alert(
        'Gửi CV ứng tuyển',
        'CV của bạn sẽ được gửi đến nhà tuyển dụng qua email. Bạn có muốn tiếp tục?',
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Gửi ngay',
            onPress: async () => {
              try {
                await quickPostService.notifyQuickPostApplication(jobId, {
                  name: profile.name || user.displayName || 'Ứng viên',
                  email: user.email || profile.email || '',
                  phone: profile.phone || undefined,
                  // TODO: Add CV URL if user has uploaded CV
                  cvUrl: undefined,
                });

                Alert.alert(
                  'Thành công!',
                  'Thông tin của bạn đã được gửi đến nhà tuyển dụng. Họ sẽ liên hệ lại với bạn sớm.'
                );
                
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } catch (error: any) {
                Alert.alert('Lỗi', error.message || 'Không thể gửi CV. Vui lòng thử lại sau.');
              }
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Đã xảy ra lỗi');
    }
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
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
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
        <TouchableOpacity 
          style={styles.buttons} 
          onPress={goBack}
        >
          <Ionicons name="arrow-back" size={24} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.buttons}
          onPress={async () => {
            try {
              const { Share } = await import('react-native');
              const job = jobData as Job;
              const jobTitle = job?.title || 'Công việc';
              const companyName = companyData?.corp_name || job?.company_name || 'Công ty';
              
              await Share.share({
                title: jobTitle,
                message: `🔥 ${jobTitle}\n🏢 ${companyName}\n📍 ${job?.location || 'Chưa cập nhật'}\n\nXem chi tiết tại ứng dụng JobApplication!`,
              });
            } catch (error) {
              // User cancelled or share failed - ignore
            }
          }}
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
                  // ✅ Priority: job.image (employer-uploaded) > job.company_logo (viecoi) > companyData.image > company.image > placeholder
                  
                  // 1. Check job.image (employer uploaded)
                  if (job?.image && job.image.startsWith('http')) return job.image;
                  
                  // 2. Check company_logo from viecoi (skip default/placeholder images)
                  if (job?.company_logo && 
                      job.company_logo.startsWith('http') &&
                      !job.company_logo.includes('prof-img.png') && // viecoi default
                      !job.company_logo.includes('placeholder') &&
                      !job.company_logo.includes('default')) {
                    return job.company_logo;
                  }
                  
                  // 3. Check fetched company data (employer jobs)
                  if (companyData?.image && 
                      companyData.image.startsWith('http') &&
                      !companyData.image.includes('ui-avatars')) {
                    return companyData.image;
                  }
                  
                  // 4. Check company object in job data
                  const company = job?.company;
                  if (company && typeof company === 'object' && (company as any).image) {
                    const img = (company as any).image;
                    if (img && img.startsWith('http') && !img.includes('ui-avatars')) {
                      return img;
                    }
                  }
                  
                  // 5. Fallback to ui-avatars placeholder with company name
                  const companyName = companyData?.corp_name || 
                    job?.company_name || 
                    (company && typeof company === 'object' ? company.corp_name : '') || 
                    'Job';
                  // Get first letter of each word for better avatar (handle empty strings safely)
                  const initials = companyName
                    .split(' ')
                    .filter((w: string) => w.length > 0)
                    .map((w: string) => w[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase() || 'JB';
                  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=200&background=4A80F0&color=fff&bold=true&format=png`;
                })(),
              }}
            />
          </View>

          <Text style={styles.jobTitle} numberOfLines={3}>{jobData?.title}</Text>
          
          <View style={styles.companyRow}>
            <Ionicons name="business-outline" size={16} color="#666" />
            <Text style={styles.companyName} numberOfLines={2}>
              {(() => {
                const job = jobData as Job;
                // Priority: companyData (employer jobs) > company_name (viecoi) > company object
                if (companyData?.corp_name) return companyData.corp_name;
                if (job?.company_name) return job.company_name;
                
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

          {/* Meta Info - Vertical Layout */}
          <View style={styles.metaGrid}>
            {/* Salary Row */}
            <View style={styles.metaItem}>
              <View style={styles.metaIcon}>
                <Ionicons name="cash-outline" size={18} color="#4A80F0" />
              </View>
              <Text style={styles.metaText} numberOfLines={1}>
                {formatSalary((jobData as Job)?.salary) || "Thoả thuận"}
              </Text>
            </View>
            
            {/* Location Row - Full width, wrap text */}
            <View style={styles.metaItemFull}>
              <View style={styles.metaIcon}>
                <Ionicons name="location-outline" size={18} color="#4A80F0" />
              </View>
              <Text style={styles.metaTextLocation} numberOfLines={2}>
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

          {/* ✅ AI Salary Prediction */}
          {(jobData as Job)?.title && (
            <SalaryPredictionBadge
              jobData={{
                title: (jobData as Job).title || '',
                // Use category_name for better matching with salary database
                category: (() => {
                  const job = jobData as Job;
                  // Try jobCategories first
                  if (job.jobCategories) {
                    if (typeof job.jobCategories === 'object' && job.jobCategories.category_name) {
                      return job.jobCategories.category_name;
                    }
                    if (typeof job.jobCategories === 'string') {
                      return job.jobCategories;
                    }
                  }
                  // Fallback: try to infer from title
                  const title = (job.title || '').toLowerCase();
                  if (title.includes('bán hàng') || title.includes('kinh doanh') || title.includes('sales')) return 'sales';
                  if (title.includes('marketing') || title.includes('content')) return 'marketing';
                  if (title.includes('phục vụ') || title.includes('nhân viên') || title.includes('bếp') || title.includes('pha chế')) return 'f&b';
                  if (title.includes('giao hàng') || title.includes('shipper')) return 'logistics';
                  if (title.includes('thiết kế') || title.includes('design')) return 'design';
                  if (title.includes('gia sư') || title.includes('giáo viên')) return 'education';
                  if (title.includes('lập trình') || title.includes('developer') || title.includes('it')) return 'it-software';
                  return 'other';
                })(),
                location: (jobData as Job).location || 'TP.HCM',
                // Better job type detection
                type: (() => {
                  const job = jobData as Job;
                  const typeStr = (job.type || job.jobTypes?.type_name || '').toLowerCase();
                  
                  if (typeStr.includes('part') || typeStr.includes('bán thời gian')) return 'part-time';
                  if (typeStr.includes('intern') || typeStr.includes('thực tập')) return 'internship';
                  if (typeStr.includes('freelance') || typeStr.includes('tự do')) return 'freelance';
                  
                  // Check title for hints
                  const title = (job.title || '').toLowerCase();
                  if (title.includes('part-time') || title.includes('bán thời gian')) return 'part-time';
                  if (title.includes('intern') || title.includes('thực tập')) return 'internship';
                  
                  return 'full-time';
                })() as any,
              }}
              autoLoad={false}
              actualSalary={(() => {
                const salary = (jobData as Job)?.salary;
                const salaryObj = typeof salary === 'object' && salary ? salary : undefined;
                return {
                  min: salaryObj?.min,
                  max: salaryObj?.max,
                  text: (jobData as any)?.salary_text || undefined,
                };
              })()}
            />
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
            onApplyQuickPost={handleQuickPostApply}
            onCancel={handleCancel}
            onChat={handleChatWithEmployer}
            isSaved={isSaved}
            saveLoading={saveLoading}
            onToggleSave={toggleSave}
            isApplied={isApplied}
            applyLoading={applyLoading}
            applicationStatus={applicationStatus}
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
    paddingHorizontal: 12,
    maxWidth: '100%',
  },
  companyName: { 
    fontSize: 15,
    color: "#666",
    fontWeight: "500",
    flex: 1,
    textAlign: 'center',
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
    width: '100%',
    gap: 10,
    marginTop: 12,
    paddingHorizontal: 8,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaItemFull: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    width: '100%',
  },
  metaIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaText: {
    fontSize: 14,
    color: "#4A80F0",
    fontWeight: "600",
    flex: 1,
  },
  metaTextLocation: {
    fontSize: 14,
    color: "#4A80F0",
    fontWeight: "500",
    flex: 1,
    lineHeight: 20,
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
