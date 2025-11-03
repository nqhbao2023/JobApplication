import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from "react-native";
import React, { useState } from "react";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { doc, deleteDoc } from "firebase/firestore";
import { auth, db } from "@/config/firebase";
import { router } from "expo-router";
import CVViewer from "@/components/CVViewer"; // ✅ component xem CV trong app (Modal WebView)

interface ApplicationProps {
  app: any;
  onStatusChange: (status: string) => void;
}

const Application: React.FC<ApplicationProps> = ({ app, onStatusChange }) => {
  const { user, job, status, cv_url, cv_path, $id, userId } = app;

  // ✅ State quản lý modal xem CV
  const [cvLink, setCvLink] = useState<string | null>(null);
  const [showCV, setShowCV] = useState(false);

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
  if (!userId) {
    Alert.alert("Không tìm thấy ứng viên");
    return;
  }

  // 🔹 UID người đang đăng nhập
  const myUid = auth.currentUser?.uid;

  // 🔹 Tạo chatId cố định giữa employer và candidate
  const chatId = [myUid, userId].sort().join("_");

  router.push({
    pathname: "/(shared)/chat",
    params: {
      chatId,             // ID phòng chat
      partnerId: userId,  // UID ứng viên
      partnerName: user?.name || "Ứng viên",
      role: "Recruiter",  // vai trò employer
    },
  });
};


  // 🗑️ Hàm xoá ứng viên khỏi danh sách applied_jobs
  const handleDelete = async () => {
    Alert.alert("Xóa ứng viên", "Bạn có chắc muốn xóa ứng viên này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "applied_jobs", $id));
            Alert.alert("✅ Đã xóa", "Ứng viên đã bị xóa khỏi danh sách");
          } catch (error) {
            console.error("❌ Lỗi khi xóa:", error);
            Alert.alert("Lỗi", "Không thể xóa ứng viên này.");
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
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Image
          source={{
            uri:
              user?.photoURL ||
              user?.id_image ||
              "https://randomuser.me/api/portraits/men/1.jpg",
          }}
          style={styles.avatar}
        />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.name}>{user?.name || "Ứng viên ẩn danh"}</Text>
          <Text style={styles.jobTitle}>
            Ứng tuyển: {job?.title || "Không rõ công việc"}
          </Text>
        </View>
      </View>

      {/* Trạng thái */}
      <Text style={[styles.status, { color: getStatusColor(status) }]}>
        Trạng thái: {status || "pending"}
      </Text>

      {/* Nút hành động */}
      <View style={styles.actions}>
        {status === "pending" && (
          <>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: "#4CAF50" }]}
              onPress={() => onStatusChange("accepted")}
            >
              <Text style={styles.buttonText}>Chấp nhận</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: "#F44336" }]}
              onPress={() => onStatusChange("rejected")}
            >
              <Text style={styles.buttonText}>Từ chối</Text>
            </TouchableOpacity>
          </>
        )}

        {status === "accepted" && (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#2E8BFD" }]}
            onPress={handleContact}
          >
            <Text style={styles.buttonText}>Liên hệ ứng viên</Text>
          </TouchableOpacity>
        )}

        {status === "rejected" && (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#9E9E9E" }]}
            onPress={handleDelete}
          >
            <Text style={styles.buttonText}>Xóa ứng viên</Text>
          </TouchableOpacity>
        )}

        {/* ✅ Nút xem CV luôn hiển thị */}
        {cv_url || cv_path ? (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#2196F3" }]}
            onPress={handleViewCV}
          >
            <Text style={styles.buttonText}>Xem CV</Text>
          </TouchableOpacity>
        ) : (
          <Text style={{ color: "#888", fontStyle: "italic" }}>
            Ứng viên chưa tải CV
          </Text>
        )}
      </View>

      {/* ✅ Modal WebView hiển thị CV trực tiếp trong app */}
      <CVViewer visible={showCV} onClose={() => setShowCV(false)} url={cvLink} />
    </View>
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
