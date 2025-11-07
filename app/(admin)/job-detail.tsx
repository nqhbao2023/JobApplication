import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { db } from "@/config/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

type Job = {
  title?: string;
  job_Description?: string;
  salary?: string;
  location?: string;
  skills_required?: string;
  responsibilities?: string;
};

const JobDetailScreen = () => {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const [job, setJob] = useState<Job>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (jobId) {
      loadJob();
    }
  }, [jobId]);

  const loadJob = async () => {
    try {
      const snap = await getDoc(doc(db, "jobs", jobId));
      if (snap.exists()) {
        const data = snap.data() as Job;
        console.log("📥 Loaded job:", data);
        setJob(data);
      } else {
        Alert.alert("Lỗi", "Không tìm thấy job");
        router.back();
      }
    } catch (error) {
      console.error("❌ Error loading job:", error);
      Alert.alert("Lỗi", "Không thể tải job");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!job.title?.trim()) {
      Alert.alert("Lỗi", "Tiêu đề không được để trống");
      return;
    }

    try {
      setSaving(true);
      
      const updateData = {
        title: job.title.trim(),
        job_Description: job.job_Description?.trim() || "",
        salary: job.salary?.trim() || "",
        location: job.location?.trim() || "",
        skills_required: job.skills_required?.trim() || "",
        responsibilities: job.responsibilities?.trim() || "",
        updated_at: new Date().toISOString(),
      };

      console.log("💾 Saving job:", jobId, updateData);
      
      await updateDoc(doc(db, "jobs", jobId), updateData);
      
      console.log("✅ Job saved successfully");
      
      Alert.alert("Thành công", "Đã cập nhật job", [
        {
          text: "OK",
          onPress: () => {
            router.back();
          },
        },
      ]);
    } catch (error) {
      console.error("❌ Error saving:", error);
      Alert.alert("Lỗi", `Không thể lưu: ${error}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.label}>Tiêu đề *</Text>
        <TextInput
          style={styles.input}
          value={job.title}
          onChangeText={(text) => setJob({ ...job, title: text })}
          placeholder="Nhập tiêu đề"
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Mô tả công việc</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={job.job_Description}
          onChangeText={(text) => setJob({ ...job, job_Description: text })}
          placeholder="Nhập mô tả"
          multiline
          numberOfLines={4}
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Lương</Text>
        <TextInput
          style={styles.input}
          value={job.salary}
          onChangeText={(text) => setJob({ ...job, salary: text })}
          placeholder="VD: 10-15 triệu"
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Địa điểm</Text>
        <TextInput
          style={styles.input}
          value={job.location}
          onChangeText={(text) => setJob({ ...job, location: text })}
          placeholder="Nhập địa điểm"
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Kỹ năng yêu cầu</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={job.skills_required}
          onChangeText={(text) => setJob({ ...job, skills_required: text })}
          placeholder="Nhập kỹ năng"
          multiline
          numberOfLines={3}
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Trách nhiệm</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={job.responsibilities}
          onChangeText={(text) => setJob({ ...job, responsibilities: text })}
          placeholder="Nhập trách nhiệm"
          multiline
          numberOfLines={3}
          placeholderTextColor="#999"
        />

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>Lưu thay đổi</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default JobDetailScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 14, color: "#64748b" },
  content: { padding: 16 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: "#fff",
    color: "#1a1a1a",
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#10b981",
    padding: 16,
    borderRadius: 12,
    marginTop: 32,
    marginBottom: 40,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});