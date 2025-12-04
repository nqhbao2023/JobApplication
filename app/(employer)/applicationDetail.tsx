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
import { smartBack } from "@/utils/navigation";
import CVViewer from "@/components/CVViewer";

type ApplicationDetail = {
  id: string;
  status: string;
  appliedAt: string;
  cvUrl?: string;
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
  const params = useLocalSearchParams<{ applicationId?: string }>();
  const applicationId = params.applicationId as string;

  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCVViewer, setShowCVViewer] = useState(false);

  const fetchApplicationDetail = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch application data
      const apps = await applicationApiService.getEmployerApplications();
      const app = apps.find((a) => a.id === applicationId);

      if (!app) {
        Alert.alert("Lỗi", "Không tìm thấy ứng tuyển này.");
        smartBack();
        return;
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
              
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert(
                "Thành công",
                `Đã ${actionText} ứng viên thành công!`,
                [{ text: "OK", onPress: () => smartBack() }]
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

    Alert.alert(
      "Xác nhận xóa",
      "Bạn có chắc muốn xóa ứng tuyển này?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              setActionLoading(true);
              await applicationApiService.updateApplicationStatus(application.id, "rejected");
              
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert("Thành công", "Đã xóa ứng tuyển!", [
                { text: "OK", onPress: () => smartBack() },
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
          <TouchableOpacity onPress={() => smartBack()} style={styles.backButton}>
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
          <TouchableOpacity onPress={() => smartBack()} style={styles.backButton}>
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
        <TouchableOpacity onPress={() => smartBack()} style={styles.backButton}>
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
                params: { jobId: application.job.id, from: '/(employer)/applicationDetail' },
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
        {application.cvUrl && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hồ sơ CV</Text>
            <TouchableOpacity
              style={styles.cvButton}
              onPress={() => setShowCVViewer(true)}
            >
              <Ionicons name="document-text-outline" size={24} color="#4A80F0" />
              <Text style={styles.cvButtonText}>Xem CV</Text>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </TouchableOpacity>
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
