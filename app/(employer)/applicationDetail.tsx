// app/(employer)/applicationDetail.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";

import { applicationApiService } from "@/services/applicationApi.service";
import { jobApiService } from "@/services/jobApi.service";
import { userApiService } from "@/services/userApi.service";
import { useSafeBack } from "@/hooks/useSafeBack";
import CVViewer from "@/components/CVViewer";
import CVTemplateViewer from "@/components/CVTemplateViewer";
import { cvService } from "@/services/cv.service";
import { CVData } from "@/types/cv.types";
import { db } from "@/config/firebase";
import { doc, getDoc } from "firebase/firestore";
import { eventBus, EVENTS } from "@/utils/eventBus";

type ApplicationDetail = {
  id: string;
  status: string;
  appliedAt: string;
  cvUrl?: string;
  cvId?: string; // ✅ NEW: CV ID for template CVs
  cvSource?: 'library' | 'upload' | 'none'; // ✅ NEW: CV source type
  coverLetter?: string;
  candidate: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    photoURL?: string;
  };
  job: {
    id: string;
    title: string;
    image?: string;
    company_logo?: string; // ✅ Add company_logo field
  };
};

export default function ApplicationDetail() {
  const router = useRouter();
  const params = useLocalSearchParams<{ applicationId?: string; from?: string }>();
  const applicationId = params.applicationId as string;
  const fromParam = params.from as string | undefined;
  
  // ✅ Use useSafeBack for proper navigation
  const { goBack } = useSafeBack({ from: fromParam, fallback: '/(employer)/appliedList' });

  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCVViewer, setShowCVViewer] = useState(false);
  const [showCVTemplateViewer, setShowCVTemplateViewer] = useState(false); // ✅ NEW
  const [cvData, setCvData] = useState<CVData | null>(null); // ✅ NEW: Store CV template data
  const [loadingCV, setLoadingCV] = useState(false); // ✅ NEW: Loading state for CV fetch

  const fetchApplicationDetail = useCallback(async () => {
    if (!applicationId) {
      console.warn('⚠️ No applicationId provided to ApplicationDetail');
      Alert.alert("Lỗi", "Không tìm thấy ID ứng tuyển.");
      goBack();
      return;
    }

    try {
      setLoading(true);
      console.log(`🔍 Fetching application detail for ID: ${applicationId}`);

      // Fetch application data directly by ID (more reliable than filtering list)
      let app: any;
      try {
        app = await applicationApiService.getApplicationById(applicationId);
      } catch (error) {
        console.warn('⚠️ Failed to fetch application by ID, falling back to list:', error);
        // Fallback to list if direct fetch fails (e.g. endpoint not deployed yet)
        try {
          const apps = await applicationApiService.getEmployerApplications();
          app = apps.find((a) => a.id === applicationId);
          if (app) {
            console.log('✅ Found application in fallback list');
          } else {
            console.warn('❌ Application not found in fallback list either');
          }
        } catch (listError) {
          console.error('❌ Failed to fetch employer applications list:', listError);
        }
      }

      if (!app) {
        Alert.alert("Lỗi", "Không tìm thấy ứng tuyển này.");
        goBack();
        return;
      }

      // ✅ NEW: Fetch cv_id and cv_source
      // Priority 1: From API response (applications collection)
      let cvId = (app as any).cvId;
      let cvSource = (app as any).cvSource;
      
      // Priority 2: From Firestore applied_jobs collection (fallback)
      if (!cvId) {
        try {
          const appliedJobsSnapshot = await getDoc(doc(db, 'applied_jobs', applicationId));
          if (appliedJobsSnapshot.exists()) {
            const appliedJobData = appliedJobsSnapshot.data();
            cvId = appliedJobData?.cv_id;
            cvSource = appliedJobData?.cv_source;
            console.log('📄 CV Info from applied_jobs:', { cvId, cvSource });
          } else {
            console.log('📄 No applied_jobs document, trying candidate profile...');
          }
        } catch (err) {
          console.warn('⚠️ Error fetching applied_jobs:', err);
        }
      } else {
        console.log('📄 CV Info from API:', { cvId, cvSource });
      }
      
      // ✅ If no cvId from applied_jobs, try to get from candidate profile
      if (!cvId && app.candidateId) {
        try {
          const candidateDoc = await getDoc(doc(db, 'users', app.candidateId));
          if (candidateDoc.exists()) {
            const candidateData = candidateDoc.data();
            cvId = candidateData?.cvId || candidateData?.defaultCvId;
            if (cvId) {
              cvSource = 'library'; // Assume library if from candidate profile
              console.log('📄 Found CV in candidate profile:', cvId);
            }
          }
        } catch (candidateError) {
          console.warn('⚠️ Could not fetch candidate profile:', candidateError);
        }
      }

      // Fetch related data
      const [job, candidate] = await Promise.all([
        jobApiService.getJobById(app.jobId),
        app.candidateId
          ? userApiService.getUserById(app.candidateId)
          : Promise.resolve(null),
      ]);

      setApplication({
        id: app.id || "",
        status: app.status,
        appliedAt: (() => {
          if (!app.appliedAt) return new Date().toISOString();
          if (typeof app.appliedAt === 'string') return app.appliedAt;
          if (typeof app.appliedAt === 'number') return new Date(app.appliedAt).toISOString();
          if (app.appliedAt instanceof Date) return app.appliedAt.toISOString();
          return new Date().toISOString();
        })(),
        cvUrl: app.cvUrl,
        cvId, // ✅ NEW
        cvSource, // ✅ NEW
        coverLetter: app.coverLetter,
        candidate: candidate
          ? {
              id: candidate.uid || app.candidateId || "", // ✅ Use uid as primary ID
              // ✅ FIX: Kiểm tra cả displayName, name và fullName - cast to any for flexibility
              name: candidate.displayName || (candidate as any).name || (candidate as any).fullName || candidate.email || "Ứng viên",
              email: candidate.email || "",
              phone: candidate.phone || (candidate as any).phoneNumber || "",
              photoURL: candidate.photoURL || (candidate as any).avatar || "",
            }
          : {
              id: app.candidateId || "", // ✅ Fallback to candidateId from application
              name: "Ứng viên ẩn danh",
              email: "",
            },
        job: {
          id: job.id || "",
          title: job.title || "Không rõ",
          image: job.image,
          company_logo: job.company_logo, // ✅ Include company_logo
        },
      });
    } catch (error) {
      console.error("❌ Fetch application detail error:", error);
      Alert.alert("Lỗi", "Không thể tải thông tin ứng tuyển.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [applicationId]);

  useEffect(() => {
    fetchApplicationDetail();
  }, [fetchApplicationDetail]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchApplicationDetail();
  }, [fetchApplicationDetail]);

  const handleStatusChange = async (status: "accepted" | "rejected") => {
    if (!application) return;
    
    // ✅ FIX: Prevent duplicate updates - check current status
    if (application.status !== 'pending') {
      Alert.alert(
        "Thông báo",
        `Ứng viên này đã được ${application.status === 'accepted' ? 'chấp nhận' : 'từ chối'} rồi.`
      );
      return;
    }

    const actionText = status === "accepted" ? "chấp nhận" : "từ chối";
    Alert.alert(
      "Xác nhận",
      `Bạn có chắc muốn ${actionText} ứng viên này?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xác nhận",
          onPress: async () => {
            try {
              setActionLoading(true);
              await applicationApiService.updateApplicationStatus(application.id, status);
              
              // ✅ Update local state immediately
              setApplication(prev => prev ? { ...prev, status } : prev);
              
              // ✅ FIX: Emit event to update homepage immediately
              eventBus.emit(EVENTS.APPLICATION_STATUS_UPDATED, { 
                applicationId: application.id, 
                status,
                timestamp: Date.now() 
              });
              
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert(
                "Thành công",
                `Đã ${actionText} ứng viên thành công!`,
                [{ text: "OK", onPress: () => goBack() }]
              );
            } catch (error) {
              console.error("❌ Update status error:", error);
              Alert.alert("Lỗi", `Không thể ${actionText} ứng viên. Vui lòng thử lại.`);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDelete = async () => {
    if (!application) return;
    
    // ✅ Check if already rejected to prevent duplicate
    if (application.status === 'rejected') {
      Alert.alert("Thông báo", "Ứng tuyển này đã bị từ chối rồi.");
      return;
    }

    Alert.alert(
      "Xác nhẫn xóa",
      "Xóa ứng tuyển này khỏi danh sách? (Có thể xem lại trong lịch sử)",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              setActionLoading(true);
              // ✅ Mark as rejected instead of permanent delete (for audit trail)
              await applicationApiService.updateApplicationStatus(application.id, "rejected");
              
              // ✅ Update local state immediately
              setApplication(prev => prev ? { ...prev, status: 'rejected' } : prev);
              
              // ✅ Emit event to update homepage immediately
              eventBus.emit(EVENTS.APPLICATION_STATUS_UPDATED, { 
                applicationId: application.id, 
                status: 'rejected',
                timestamp: Date.now() 
              });
              
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert("Đã xóa", "Ứng tuyển đã được xóa khỏi danh sách!", [
                { text: "OK", onPress: () => goBack() },
              ]);
            } catch (error) {
              console.error("❌ Delete application error:", error);
              Alert.alert("Lỗi", "Không thể xóa ứng tuyển. Vui lòng thử lại.");
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleChat = () => {
    if (!application?.candidate || !application.candidate.id || application.candidate.id === '') {
      Alert.alert(
        "Không thể chat", 
        "Thông tin ứng viên không khả dụng. Ứng viên có thể đã xóa hồ sơ hoặc chưa hoàn thiện thông tin."
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const myUid = require("@/config/firebase").auth.currentUser?.uid;
    if (!myUid) {
      Alert.alert("Lỗi", "Bạn cần đăng nhập để chat");
      return;
    }
    
    const candidateId = application.candidate.id;
    const chatId = [myUid, candidateId].sort().join("_");
    
    console.log('💬 Opening chat:', {
      chatId,
      candidateId,
      candidateName: application.candidate.name
    });

    router.push({
      pathname: "/(shared)/chat",
      params: {
        chatId,
        partnerId: candidateId,
        partnerName: application.candidate.name,
        role: "Recruiter",
        from: "/(employer)/applicationDetail",
      },
    });
  };

  const handleCallPhone = () => {
    if (!application?.candidate.phone) {
      Alert.alert("Thông báo", "Ứng viên chưa cung cấp số điện thoại.");
      return;
    }

    Linking.openURL(`tel:${application.candidate.phone}`);
  };

  const handleEmail = () => {
    if (!application?.candidate.email) {
      Alert.alert("Thông báo", "Ứng viên chưa cung cấp email.");
      return;
    }

    Linking.openURL(`mailto:${application.candidate.email}`);
  };

  /**
   * ✅ Handle CV viewing - supports both PDF and template CVs
   */
  const handleViewCV = async () => {
    if (!application) return;

    console.log('👁️ handleViewCV called - Application CV info:', {
      hasCvId: !!application.cvId,
      cvSource: application.cvSource,
      hasCvUrl: !!application.cvUrl,
      cvUrlPrefix: application.cvUrl?.substring(0, 20)
    });

    setLoadingCV(true);

    try {
      // Case 1: CV is from library - always use template viewer
      // Also handle case where cvSource is undefined but cvId exists (legacy/fallback)
      if (application.cvId && (application.cvSource === 'library' || !application.cvSource)) {
        console.log('📄 Fetching CV data for cvId:', application.cvId);
        
        try {
          // Fetch CV data from Firestore
          const cvSnapshot = await getDoc(doc(db, 'cvs', application.cvId));
          
          if (cvSnapshot.exists()) {
            const fetchedCvData = cvSnapshot.data() as CVData;
            console.log('✅ Fetched CV data:', fetchedCvData.personalInfo?.fullName);
            
            // ✅ Show template viewer for library CVs
            setCvData(fetchedCvData);
            setShowCVTemplateViewer(true);
            setLoadingCV(false);
            return;
          } else {
            console.warn('⚠️ CV document does not exist');
            Alert.alert(
              'CV không tìm thấy',
              'CV của ứng viên không còn tồn tại hoặc đã bị xóa.'
            );
            setLoadingCV(false);
            return;
          }
        } catch (firestoreError: any) {
          console.error('❌ Error fetching CV from Firestore:', firestoreError);
          Alert.alert(
            'Lỗi truy cập CV',
            `Không thể tải CV từ thư viện: ${firestoreError.message || 'Lỗi không xác định'}. Vui lòng kiểm tra quyền truy cập.`
          );
          setLoadingCV(false);
          return;
        }
      }

      // Case 2: CV has a PDF URL (uploaded file) - use PDF viewer
      if (application.cvUrl) {
        // ✅ CRITICAL: Block file:/// URLs ONLY for uploaded CVs (when no cvId)
        if (application.cvUrl.startsWith('file:///')) {
          console.error('❌ BLOCKED: file:/// URL detected for uploaded CV');
          Alert.alert(
            'Không thể xem CV',
            'CV này chứa đường dẫn file nội bộ không hợp lệ (dữ liệu cũ).\n\n' +
            'Vui lòng yêu cầu ứng viên nộp lại CV hoặc liên hệ qua chat/email.'
          );
          setLoadingCV(false);
          return;
        }
        
        console.log('✅ Opening CV PDF from URL:', application.cvUrl.substring(0, 50) + '...');
        setShowCVViewer(true);
        setLoadingCV(false);
        return;
      }

      // Case 3: No CV available
      console.log('❌ No CV available for this application');
      Alert.alert(
        'Chưa có CV',
        'Ứng viên chưa nộp CV cho vị trí này.'
      );
    } catch (error: any) {
      console.error('❌ Unexpected error in handleViewCV:', error);
      Alert.alert('Lỗi', `Không thể xem CV: ${error.message || 'Vui lòng thử lại'}`);
    } finally {
      setLoadingCV(false);
    }
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted":
        return "#10b981";
      case "rejected":
        return "#ef4444";
      case "reviewing":
        return "#f59e0b";
      default:
        return "#64748b";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "accepted":
        return "Đã chấp nhận";
      case "rejected":
        return "Đã từ chối";
      case "reviewing":
        return "Đang xem xét";
      default:
        return "Chờ duyệt";
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết ứng tuyển</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A80F0" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!application) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết ứng tuyển</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
          <Text style={styles.errorText}>Không tìm thấy ứng tuyển</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết ứng tuyển</Text>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
          <Ionicons name="trash-outline" size={22} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Job Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Công việc</Text>
          <TouchableOpacity
            style={styles.jobCard}
            onPress={() =>
              router.push({
                pathname: "/(shared)/jobDescription",
                params: { 
                  jobId: application.job.id, 
                  from: `/(employer)/applicationDetail?applicationId=${applicationId}` 
                },
              })
            }
          >
            {(application.job.image || application.job.company_logo) && (
              <Image source={{ uri: application.job.image || application.job.company_logo }} style={styles.jobImage} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.jobTitle}>{application.job.title}</Text>
              <View style={styles.statusContainer}>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(application.status) + "20" },
                  ]}
                >
                  <Text style={[styles.statusText, { color: getStatusColor(application.status) }]}>
                    {getStatusLabel(application.status)}
                  </Text>
                </View>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Candidate Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin ứng viên</Text>
          <View style={styles.candidateCard}>
            <Image
              source={{
                uri: application.candidate.photoURL || "https://via.placeholder.com/80",
              }}
              style={styles.candidateAvatar}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.candidateName}>{application.candidate.name}</Text>
              {application.candidate.email && (
                <View style={styles.infoRow}>
                  <Ionicons name="mail-outline" size={16} color="#64748b" />
                  <Text style={styles.infoText}>{application.candidate.email}</Text>
                </View>
              )}
              {application.candidate.phone && (
                <View style={styles.infoRow}>
                  <Ionicons name="call-outline" size={16} color="#64748b" />
                  <Text style={styles.infoText}>{application.candidate.phone}</Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={16} color="#64748b" />
                <Text style={styles.infoText}>
                  Ứng tuyển: {new Date(application.appliedAt).toLocaleDateString("vi-VN")}
                </Text>
              </View>
            </View>
          </View>

          {/* Contact Actions */}
          <View style={styles.contactActions}>
            <TouchableOpacity
              style={[styles.contactButton, { backgroundColor: "#4A80F0" }]}
              onPress={handleChat}
            >
              <Ionicons name="chatbubbles-outline" size={20} color="#fff" />
              <Text style={styles.contactButtonText}>Chat</Text>
            </TouchableOpacity>
            {application.candidate.phone && (
              <TouchableOpacity
                style={[styles.contactButton, { backgroundColor: "#10b981" }]}
                onPress={handleCallPhone}
              >
                <Ionicons name="call-outline" size={20} color="#fff" />
                <Text style={styles.contactButtonText}>Gọi</Text>
              </TouchableOpacity>
            )}
            {application.candidate.email && (
              <TouchableOpacity
                style={[styles.contactButton, { backgroundColor: "#f59e0b" }]}
                onPress={handleEmail}
              >
                <Ionicons name="mail-outline" size={20} color="#fff" />
                <Text style={styles.contactButtonText}>Email</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Cover Letter */}
        {application.coverLetter && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thư xin việc</Text>
            <View style={styles.coverLetterCard}>
              <Text style={styles.coverLetterText}>{application.coverLetter}</Text>
            </View>
          </View>
        )}

        {/* CV */}
        {(application.cvUrl || application.cvId) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hồ sơ CV</Text>
            <TouchableOpacity
              style={styles.cvButton}
              onPress={handleViewCV}
              disabled={loadingCV}
            >
              {loadingCV ? (
                <ActivityIndicator size="small" color="#4A80F0" />
              ) : (
                <Ionicons name="document-text-outline" size={24} color="#4A80F0" />
              )}
              <Text style={styles.cvButtonText}>
                {loadingCV ? 'Đang tải CV...' : 'Xem CV'}
              </Text>
              {!loadingCV && <Ionicons name="chevron-forward" size={20} color="#94a3b8" />}
            </TouchableOpacity>
            {/* ✅ NEW: Show CV type indicator */}
            {application.cvSource && (
              <Text style={styles.cvTypeHint}>
                {application.cvSource === 'library' 
                  ? '📚 CV từ thư viện' 
                  : application.cvSource === 'upload'
                  ? '📎 CV đã tải lên'
                  : 'CV'}
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      {application.status === "pending" && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: "#ef4444" }]}
            onPress={() => handleStatusChange("rejected")}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="close-circle-outline" size={22} color="#fff" />
                <Text style={styles.actionButtonText}>Từ chối</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: "#10b981" }]}
            onPress={() => handleStatusChange("accepted")}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
                <Text style={styles.actionButtonText}>Chấp nhận</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* CV Viewer Modal */}
      {showCVViewer && application.cvUrl && (
        <CVViewer visible={showCVViewer} url={application.cvUrl} onClose={() => setShowCVViewer(false)} />
      )}

      {/* ✅ NEW: CV Template Viewer Modal */}
      {showCVTemplateViewer && cvData && (
        <CVTemplateViewer 
          visible={showCVTemplateViewer} 
          cvData={cvData} 
          onClose={() => {
            setShowCVTemplateViewer(false);
            setCvData(null);
          }} 
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
  },
  deleteButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748b",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: "#fff",
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 12,
  },
  jobCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  jobImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  jobTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 6,
  },
  statusContainer: {
    flexDirection: "row",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  candidateCard: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 12,
  },
  candidateAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 12,
  },
  candidateName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  infoText: {
    fontSize: 14,
    color: "#64748b",
    marginLeft: 6,
  },
  contactActions: {
    flexDirection: "row",
    gap: 8,
  },
  contactButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  coverLetterCard: {
    padding: 14,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  coverLetterText: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 22,
  },
  cvButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cvButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#4A80F0",
    marginLeft: 12,
  },
  cvTypeHint: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 8,
    fontStyle: "italic",
  },
  actionBar: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
});
