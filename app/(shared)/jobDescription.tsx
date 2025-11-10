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
import ContactEmployerButton from "@/components/ContactEmployerButton";
import * as Haptics from "expo-haptics";

const JobDescription = () => {
  const [selected, setSelected] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const params = useLocalSearchParams<{ jobId?: string; id?: string }>();
  const jobId = (params.jobId || params.id || "") as string;
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
  // ✅ Re-fetch lại khi màn hình JobDescription được focus lại
  useFocusEffect(
    React.useCallback(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      refresh(); // luôn đồng bộ khi focus lại
    }, [refresh])
  );
  const { isSaved, saveLoading, toggleSave } = useJobStatus(jobId);

  const showCandidateUI = userRole === "candidate";
  const showEmployerUI = userRole === "employer" && jobData?.users?.id;

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

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
      <ScrollView
        style={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Header */}
        <View style={styles.topView}>
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

        {/* Thông tin Job */}
        <View style={styles.headerContainer}>
          <View style={styles.jobImageContainer}>
            <Image
              style={styles.jobImage}
              source={{
                uri: jobData?.image || "https://via.placeholder.com/100",
              }}
            />
          </View>

          <View style={styles.companyName}>
            <Text style={styles.companyNameText}>{jobData?.title}</Text>
            <Text
              style={[styles.companyNameText, { fontSize: 16, color: "#555" }]}
            >
              {jobData?.company?.corp_name ?? "Đang tải..."}
            </Text>
          </View>

          <View style={styles.companyInfoBox}>
            <Text style={styles.companyInfoText}>
              💰 Lương: {jobData?.salary || "Thoả thuận"}
            </Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {["Giới thiệu", "Yêu cầu", "Trách nhiệm"].map((label, i) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.tabBox,
                selected === i ? styles.tabActive : styles.tabNormal,
              ]}
              onPress={() => setSelected(i)}
            >
              <Text
                style={[
                  selected === i ? styles.tabActiveText : styles.tabNormalText,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Nội dung tab */}
        <View style={styles.contentTab}>
          <Text style={styles.descriptionContent}>
            Người đăng: {posterInfo.name || posterInfo.email || "Ẩn danh"}
          </Text>
          {selected === 0 && (
            <Text style={styles.descriptionContent}>
              {jobData?.job_Description || "Không có mô tả công việc."}
            </Text>
          )}
          {selected === 1 && (
            <Text style={styles.descriptionContent}>
              {jobData?.skills_required ||
                "Không có thông tin kỹ năng yêu cầu."}
            </Text>
          )}
          {selected === 2 && (
            <Text style={styles.descriptionContent}>
              {jobData?.responsibilities || "Không có trách nhiệm công việc."}
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Thanh hành động dưới */}
      <View style={styles.bottomBar}>
        {showCandidateUI && (
          <>
            {/* Lưu tin */}
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                toggleSave();
              }}
              disabled={saveLoading}
            >
              <Ionicons
                name={isSaved ? "heart" : "heart-outline"}
                size={24}
                color={isSaved ? "#F97459" : "#999"}
              />
            </TouchableOpacity>

            {/* Nút Ứng tuyển */}
            {applyLoading ? (
              <TouchableOpacity
                style={[styles.actionBtn, styles.disabledBtn]}
                disabled
              >
                <ActivityIndicator size="small" color="#F97459" />
              </TouchableOpacity>
            ) : isApplied ? (
              <TouchableOpacity
                style={[styles.actionBtn, styles.cancelBtn]}
                onPress={handleCancel}
              >
                <Text style={styles.actionText}>Hủy ứng tuyển</Text>
              </TouchableOpacity>
            ) : hasDraft ? (
              <TouchableOpacity
                style={[styles.actionBtn, styles.applyBtn]}
                onPress={handleApply}
              >
                <Text style={styles.actionText}>Tiếp tục nộp</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionBtn, styles.applyBtn]}
                onPress={handleApply}
              >
                <Text style={styles.actionText}>Ứng tuyển ngay</Text>
              </TouchableOpacity>
            )}

            {/* Liên hệ nhà tuyển dụng */}
            {jobData?.ownerId && (
              <TouchableOpacity
                style={styles.chatBtn}
                activeOpacity={0.8}
                onPress={() =>
                  router.push({
                    pathname: "/chat",
                    params: { employerId: jobData.ownerId },
                  })
                }
              >
                <Ionicons name="chatbubbles-outline" size={20} color="#fff" />
                <Text style={styles.chatText}>Liên hệ nhà tuyển dụng</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Giao diện cho nhà tuyển dụng */}
        {showEmployerUI && (
          <View style={styles.employerButtons}>
            <TouchableOpacity
              style={[styles.editButton, { backgroundColor: "#4A80F0" }]}
              onPress={() =>
                router.push({
                  pathname: "/employer/editJob",
                  params: { id: jobId },
                } as any)
              }
            >
              <Ionicons name="create-outline" size={20} color="#fff" />
              <Text style={styles.employerText}>Chỉnh sửa</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.editButton, { backgroundColor: "#EF4444" }]}
              onPress={handleDelete}
            >
              <Ionicons name="trash-outline" size={20} color="#fff" />
              <Text style={styles.employerText}>Xóa</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

export default JobDescription;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scrollContent: { flex: 1 },

  // Header
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

  headerContainer: {
    margin: 20,
    padding: 15,
    borderRadius: 10,
    backgroundColor: "#EBF2FC",
  },
  jobImageContainer: {
    marginTop: 10,
    height: 120,
    justifyContent: "center",
    alignItems: "center",
  },
  jobImage: { height: 100, width: 100, borderRadius: 50 },
  companyName: { alignItems: "center", justifyContent: "center", padding: 10 },
  companyNameText: { fontSize: 20, fontWeight: "bold" },
  companyInfoBox: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 10,
  },
  companyInfoText: { fontSize: 16, fontWeight: "600", color: "#333" },

  // Tabs
  tabs: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginBottom: 10,
    gap: 10,
  },
  tabBox: {
    borderRadius: 15,
    height: 40,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  tabNormal: { backgroundColor: "#EEEEEE" },
  tabNormalText: { color: "#777" },
  tabActive: { backgroundColor: "#2F264F" },
  tabActiveText: { color: "white", fontWeight: "bold" },

  // Nội dung
  contentTab: {
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  descriptionContent: {
    fontSize: 15,
    color: "#222",
    textAlign: "justify",
    marginBottom: 8,
  },

  // Bottom bar
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    gap: 10,
  },
  saveBtn: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  actionBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  applyBtn: { backgroundColor: "#F97459" },
  cancelBtn: { backgroundColor: "#999" },
  disabledBtn: { backgroundColor: "#eee" },
  actionText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },

  chatBtn: {
    flex: 1,
    backgroundColor: "#4A80F0",
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 10,
    gap: 6,
  },
  chatText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
    marginTop: 1,
  },

  employerButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    flex: 1,
  },
  employerText: { color: "#fff", fontWeight: "600", marginLeft: 6 },

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
