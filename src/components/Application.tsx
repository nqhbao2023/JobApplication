import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator } from "react-native";
import React, { useState } from "react";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { auth, db } from "@/config/firebase";
import { doc, getDoc } from "firebase/firestore";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { applicationApiService } from "@/services/applicationApi.service";
import CVViewer from "@/components/CVViewer";
import CVTemplateViewer from "@/components/CVTemplateViewer";
import { CVData } from "@/types/cv.types";

interface ApplicationProps {
  app: any;
  onStatusChange: (status: string) => void;
  onDelete?: () => void; // Callback after delete
}

const Application: React.FC<ApplicationProps> = ({ app, onStatusChange, onDelete }) => {
  const { user, job, status, cv_url, cv_path, $id, userId } = app;

  // ✅ State quản lý modal xem CV
  const [cvLink, setCvLink] = useState<string | null>(null);
  const [showCV, setShowCV] = useState(false);
  const [showCVTemplateViewer, setShowCVTemplateViewer] = useState(false);
  const [cvData, setCvData] = useState<CVData | null>(null);
  const [loadingCV, setLoadingCV] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(status); // ✅ Track current status locally

  // 🎯 Hàm mở CV trực tiếp trong app (hỗ trợ cả PDF và template)
  const handleViewCV = async () => {
    console.log('👁️ handleViewCV called - App CV info:', {
      hasAppId: !!$id,
      hasCvUrl: !!cv_url,
      cvUrlPrefix: cv_url?.substring(0, 20),
      hasCvPath: !!cv_path,
      cvId: app.cvId,
      cvSource: app.cvSource
    });

    setLoadingCV(true);
    try {
      // ✅ Priority 1: Check if CV is from library (has cvId in app object)
      if (app.cvId && (app.cvSource === 'library' || !app.cvSource)) {
        try {
          const cvSnapshot = await getDoc(doc(db, 'cvs', app.cvId));
          
          if (cvSnapshot.exists()) {
            const fetchedCvData = cvSnapshot.data() as CVData;
            
            // ✅ NEW: Check if this is an uploaded CV (PDF) stored in library
            if (fetchedCvData.type === 'uploaded' && (fetchedCvData.pdfUrl || fetchedCvData.fileUrl)) {
              const pdfUrl = fetchedCvData.pdfUrl || fetchedCvData.fileUrl;
              setCvLink(pdfUrl || null);
              setShowCV(true);
              setLoadingCV(false);
              return;
            }

            // Show template viewer
            setCvData(fetchedCvData);
            setShowCVTemplateViewer(true);
            setLoadingCV(false);
            return;
          }
        } catch (cvError) {
          console.warn('⚠️ Could not fetch CV from cvs collection:', cvError);
        }
      }

      // ✅ Priority 2: Try to get CV URL from cv_url or cv_path
      let finalUrl = cv_url;
      
      if (finalUrl && finalUrl.startsWith('file:///')) {
        Alert.alert(
          'Không thể xem CV',
          'CV này chứa đường dẫn file nội bộ không hợp lệ (dữ liệu cũ).'
        );
        setLoadingCV(false);
        return;
      }
      
      if (!finalUrl && cv_path) {
        try {
          const storage = getStorage();
          finalUrl = await getDownloadURL(ref(storage, cv_path));
        } catch (storageError) {
          console.warn('⚠️ Could not get download URL from storage:', storageError);
        }
      }
      
      if (finalUrl) {
        setCvLink(finalUrl);
        setShowCV(true);
      } else {
        Alert.alert('Không có CV', 'Ứng viên chưa nộp CV cho vị trí này.');
      }
    } catch (error: any) {
      Alert.alert('Lỗi', `Không thể mở CV: ${error.message || 'Vui lòng thử lại'}`);
    } finally {
      setLoadingCV(false);
    }
  };

  // 🗣️ Hàm mở chat
  const handleContact = () => {
    const candidateId = userId || app.candidateId || user?.uid;
    
    if (!candidateId || candidateId === '') {
      Alert.alert("Lỗi", "Không tìm thấy thông tin ứng viên.");
      return;
    }

    const myUid = auth.currentUser?.uid;
    if (!myUid) {
      Alert.alert("Lỗi", "Bạn cần đăng nhập để chat");
      return;
    }

    const chatId = [myUid, candidateId].sort().join("_");

    router.push({
      pathname: "/(shared)/chat",
      params: {
        chatId,
        partnerId: candidateId,
        partnerName: user?.name || "Ứng viên",
        role: "Recruiter",
        from: "/(employer)/appliedList",
      },
    });
  };

  // 🗑️ Hàm xoá ứng viên khỏi danh sách
  const handleDelete = async () => {
    Alert.alert("Xóa ứng viên", "Xóa ứng viên này khỏi danh sách?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            setLoading(true);
            await applicationApiService.updateApplicationStatus($id, 'rejected');
            if (onDelete) onDelete();
            Alert.alert("✅ Đã xóa", "Ứng viên đã được xóa khỏi danh sách");
          } catch (error: any) {
            Alert.alert("Lỗi", error.message || "Không thể xóa ứng viên này.");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "#f59e0b";
      case "accepted": return "#10b981";
      case "rejected": return "#ef4444";
      default: return "#64748b";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending": return "Chờ duyệt";
      case "accepted": return "Đã nhận";
      case "rejected": return "Đã từ chối";
      default: return "Không rõ";
    }
  };

  return (
    <TouchableOpacity 
      style={styles.card}
      activeOpacity={0.9}
      onPress={() => {
        router.push({
          pathname: "/(employer)/applicationDetail",
          params: { 
            applicationId: $id,
            from: "/(employer)/appliedList",
          },
        });
      }}
    >
      {/* Header */}
      <View style={styles.header}>
        <Image
          source={{
            uri:
              user?.photoURL ||
              user?.avatar ||
              user?.id_image ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                user?.name || user?.displayName || user?.fullName || user?.email?.charAt(0) || 'U'
              )}&size=96&background=4A80F0&color=fff&bold=true&format=png`,
          }}
          style={styles.avatar}
        />
        <View style={styles.headerContent}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {user?.name || user?.displayName || user?.fullName || user?.email || "Ứng viên"}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(currentStatus) + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(currentStatus) }]}>
                {getStatusLabel(currentStatus)}
              </Text>
            </View>
          </View>
          
          <Text style={styles.jobTitle} numberOfLines={1}>
            {job?.title || "Không rõ công việc"}
          </Text>
          
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={12} color="#94a3b8" />
            <Text style={styles.metaText}>
              {app.applied_at ? new Date(app.applied_at).toLocaleDateString('vi-VN') : 'Vừa xong'}
            </Text>
          </View>
        </View>
      </View>

      {/* Actions Divider */}
      <View style={styles.divider} />

      {/* Action Buttons */}
      <View style={styles.actions} onStartShouldSetResponder={() => true}>
        {/* Primary Actions based on Status */}
        {currentStatus === "pending" ? (
          <View style={styles.pendingActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={(e) => {
                e.stopPropagation();
                setLoading(true);
                setCurrentStatus("rejected");
                onStatusChange("rejected");
                setTimeout(() => setLoading(false), 1000);
              }}
              disabled={loading}
            >
              {loading ? <ActivityIndicator size="small" color="#ef4444" /> : (
                <>
                  <Ionicons name="close-circle-outline" size={18} color="#ef4444" />
                  <Text style={[styles.actionText, { color: "#ef4444" }]}>Từ chối</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={(e) => {
                e.stopPropagation();
                setLoading(true);
                setCurrentStatus("accepted");
                onStatusChange("accepted");
                setTimeout(() => setLoading(false), 1000);
              }}
              disabled={loading}
            >
              {loading ? <ActivityIndicator size="small" color="#10b981" /> : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#10b981" />
                  <Text style={[styles.actionText, { color: "#10b981" }]}>Chấp nhận</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.pendingActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.chatButton]}
              onPress={(e) => {
                e.stopPropagation();
                handleContact();
              }}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={18} color="#4A80F0" />
              <Text style={[styles.actionText, { color: "#4A80F0" }]}>Chat</Text>
            </TouchableOpacity>
            
            {currentStatus === 'rejected' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
              >
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
                <Text style={[styles.actionText, { color: "#ef4444" }]}>Xóa</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* CV Button - Always visible */}
        <TouchableOpacity
          style={[styles.cvButton]}
          onPress={(e) => {
            e.stopPropagation();
            handleViewCV();
          }}
          disabled={loading || loadingCV}
        >
          {loadingCV ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.cvButtonText}>CV</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Modals */}
      <CVViewer visible={showCV} onClose={() => setShowCV(false)} url={cvLink} />
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
    </TouchableOpacity>
  );
};

export default Application;

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#f1f5f9",
    borderWidth: 2,
    borderColor: "#fff",
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  jobTitle: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    fontSize: 12,
    color: "#94a3b8",
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: 12,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  pendingActions: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  rejectButton: {
    borderColor: "#fee2e2",
    backgroundColor: "#fef2f2",
  },
  acceptButton: {
    borderColor: "#d1fae5",
    backgroundColor: "#ecfdf5",
  },
  chatButton: {
    borderColor: "#dbeafe",
    backgroundColor: "#eff6ff",
  },
  deleteButton: {
    borderColor: "#fee2e2",
    backgroundColor: "#fef2f2",
  },
  actionText: {
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 6,
  },
  cvButton: {
    width: 40,
    height: 36,
    backgroundColor: "#4A80F0",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cvButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
});