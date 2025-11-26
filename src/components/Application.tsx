import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator } from "react-native";
import React, { useState } from "react";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { auth } from "@/config/firebase";
import { router } from "expo-router";
import { applicationApiService } from "@/services/applicationApi.service";
import CVViewer from "@/components/CVViewer"; // ✅ component xem CV trong app (Modal WebView)

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
  const [loading, setLoading] = useState(false);

  // 🎯 Hàm mở CV trực tiếp trong app (Expo Go compatible)
  const handleViewCV = async () => {
    try {
      let finalUrl = cv_url;
      if (!finalUrl && cv_path) {
        const storage = getStorage();
        finalUrl = await getDownloadURL(ref(storage, cv_path));
      }
      if (!finalUrl) return;
      setCvLink(finalUrl);
      setShowCV(true);
    } catch (error) {
      console.error("❌ Lỗi khi mở CV:", error);
    }
  };

  // 🗣️ Hàm mở chat (ví dụ: chuyển sang trang chat với user đó)
  const handleContact = () => {
    const candidateId = userId || app.candidateId || user?.uid;
    
    console.log('🔍 Attempting to contact candidate:', {
      userId,
      candidateId: app.candidateId,
      userUid: user?.uid,
      finalId: candidateId
    });
    
    if (!candidateId || candidateId === '') {
      Alert.alert("Lỗi", "Không tìm thấy thông tin ứng viên. Ứng viên có thể đã xóa hồ sơ.");
      return;
    }

    // 🔹 UID người đang đăng nhập
    const myUid = auth.currentUser?.uid;
    
    if (!myUid) {
      Alert.alert("Lỗi", "Bạn cần đăng nhập để chat");
      return;
    }

    // 🔹 Tạo chatId cố định giữa employer và candidate
    const chatId = [myUid, candidateId].sort().join("_");

    console.log('💬 Opening chat with:', {
      chatId,
      partnerId: candidateId,
      partnerName: user?.name || "Ứng viên"
    });

    router.push({
      pathname: "/(shared)/chat",
      params: {
        chatId,                          // ID phòng chat
        partnerId: candidateId,          // UID ứng viên
        partnerName: user?.name || "Ứng viên",
        role: "Recruiter",               // vai trò employer
      },
    });
  };


  // 🗑️ Hàm xoá ứng viên khỏi danh sách
  // Note: Backend không cho employer DELETE, nên ta sẽ update status = 'rejected' 
  // và filter ở UI (hoặc yêu cầu backend thêm endpoint DELETE cho employer)
  const handleDelete = async () => {
    Alert.alert("Xóa ứng viên", "Bạn có chắc muốn xóa ứng viên này khỏi danh sách?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            setLoading(true);
            console.log('🗑️ Deleting application:', $id);
            
            // ✅ Update status to 'rejected' instead of delete
            // Backend chỉ cho candidate withdraw, employer không có quyền delete
            await applicationApiService.updateApplicationStatus($id, 'rejected');
            
            console.log('✅ Application status updated to rejected');
            
            // ✅ Call parent callback to refresh list FIRST
            if (onDelete) {
              console.log('📞 Calling onDelete callback to refresh list');
              onDelete();
            }
            
            // ✅ Then show success message
            Alert.alert("✅ Đã xóa", "Ứng viên đã bị xóa khỏi danh sách");
          } catch (error: any) {
            console.error("❌ Lỗi khi xóa:", error);
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
      case "pending":
        return "#F5A623";
      case "accepted":
        return "#4CAF50";
      case "rejected":
        return "#F44336";
      default:
        return "#999";
    }
  };

  return (
    <TouchableOpacity 
      style={styles.card}
      activeOpacity={0.9}
      onPress={() => {
        // ✅ Navigate to application detail when card is pressed
        router.push({
          pathname: "/(employer)/applicationDetail",
          params: { applicationId: $id },
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
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.name} numberOfLines={1}>
            {user?.name || user?.displayName || user?.fullName || user?.email || "Ứng viên"}
          </Text>
          <Text style={styles.jobTitle} numberOfLines={1}>
            Ứng tuyển: {job?.title || "Không rõ công việc"}
          </Text>
          {user?.email && user.email !== user?.name && (
            <Text style={styles.emailText} numberOfLines={1}>
              {user.email}
            </Text>
          )}
        </View>
      </View>

      {/* Trạng thái */}
      <Text style={[styles.status, { color: getStatusColor(status) }]}>
        Trạng thái: {status || "pending"}
      </Text>

      {/* Nút hành động */}
      <View style={styles.actions} onStartShouldSetResponder={() => true}>
        {status === "pending" && (
          <>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: "#4CAF50" }]}
              onPress={(e) => {
                e.stopPropagation();
                onStatusChange("accepted");
              }}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Chấp nhận</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: "#F44336" }]}
              onPress={(e) => {
                e.stopPropagation();
                onStatusChange("rejected");
              }}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Từ chối</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {status === "accepted" && (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#2E8BFD" }]}
            onPress={(e) => {
              e.stopPropagation();
              handleContact();
            }}
            disabled={loading}
          >
            <Text style={styles.buttonText}>💬 Liên hệ ứng viên</Text>
          </TouchableOpacity>
        )}

        {status === "rejected" && (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#9E9E9E" }]}
            onPress={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>🗑️ Xóa ứng viên</Text>
            )}
          </TouchableOpacity>
        )}

        {/* ✅ Nút xem CV luôn hiển thị */}
        {cv_url || cv_path ? (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#2196F3" }]}
            onPress={(e) => {
              e.stopPropagation();
              handleViewCV();
            }}
            disabled={loading}
          >
            <Text style={styles.buttonText}>📄 Xem CV</Text>
          </TouchableOpacity>
        ) : (
          <Text style={{ color: "#888", fontStyle: "italic", marginTop: 8 }}>
            Ứng viên chưa tải CV
          </Text>
        )}
      </View>

      {/* ✅ Modal WebView hiển thị CV trực tiếp trong app */}
      <CVViewer visible={showCV} onClose={() => setShowCV(false)} url={cvLink} />
    </TouchableOpacity>
  );
};

export default Application;

const styles = StyleSheet.create({
  card: {
    padding: 15,
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#eee",
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
  },
  jobTitle: {
    fontSize: 14,
    color: "#555",
  },
  emailText: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  status: {
    marginTop: 10,
    fontWeight: "600",
  },
  actions: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  button: {
    flexGrow: 1,
    padding: 10,
    borderRadius: 6,
    alignItems: "center",
    minWidth: 100,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
