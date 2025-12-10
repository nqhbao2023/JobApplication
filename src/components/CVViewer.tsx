import React from "react";
import {
  Modal,
  View,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Platform,
  Linking,
  Alert,
} from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  visible: boolean;
  onClose: () => void;
  url: string | null;
}

export default function CVViewer({ visible, onClose, url }: Props) {
  if (!url) return null;

  // ✅ CRITICAL: Prevent file:/// URLs from being opened (defensive check)
  if (url.startsWith('file:///')) {
    console.error('❌ CVViewer received file:/// URL - This should NEVER happen!', url.substring(0, 50));
    return null; // Don't render anything
  }

  const encodedUrl = encodeURIComponent(url);
  // ✅ Dùng "gview" thay vì "viewerng" giúp tránh đen thui và co mép sai
  const viewerUrl = `https://docs.google.com/gview?embedded=1&url=${encodedUrl}`;

  const handleOpenBrowser = async () => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Lỗi", "Không thể mở liên kết này.");
      }
    } catch (error) {
      Alert.alert("Lỗi", "Đã xảy ra lỗi khi mở trình duyệt.");
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {/* ✅ SafeAreaView đảm bảo header không bị che hoặc thừa */}
      <SafeAreaView style={styles.safeArea}>
        {/* 🔵 Header gọn, sát mép trên, luôn đúng vị trí */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
            <Text style={styles.closeText}>Đóng</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Xem CV</Text>
          <TouchableOpacity style={styles.browserButton} onPress={handleOpenBrowser}>
            <Ionicons name="globe-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* 📄 WebView chiếm toàn bộ phần còn lại */}
        <WebView
          source={{ uri: viewerUrl }}
          style={styles.webview}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Đang tải CV...</Text>
            </View>
          )}
          onError={() => {
             // Fallback if WebView fails
             Alert.alert(
               "Không thể tải bản xem trước", 
               "Vui lòng mở bằng trình duyệt để xem chi tiết.",
               [
                 { text: "Hủy", style: "cancel" },
                 { text: "Mở trình duyệt", onPress: handleOpenBrowser }
               ]
             );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    height: 56,
    backgroundColor: "#007AFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  closeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 8,
  },
  browserButton: {
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 8,
  },
  closeText: {
    color: "#fff",
    fontSize: 16,
    marginLeft: 4,
    fontWeight: "500",
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  webview: {
    flex: 1,
    backgroundColor: "#F9F9F9",
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 10,
    color: "#555",
  },
});
