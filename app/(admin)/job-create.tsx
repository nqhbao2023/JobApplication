import React, { useState } from "react";
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
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { db, auth } from "@/config/firebase";
import { collection, addDoc } from "firebase/firestore";

type Job = {
  title: string;
  job_Description: string;
  salary: string;
  location: string;
  skills_required: string;
  responsibilities: string;
};

const JobCreateScreen = () => {
  const [job, setJob] = useState<Job>({
    title: "",
    job_Description: "",
    salary: "",
    location: "",
    skills_required: "",
    responsibilities: "",
  });
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!job.title?.trim()) {
      Alert.alert("Lỗi", "Tiêu đề không được để trống");
      return;
    }

    try {
      setSaving(true);

      const jobData = {
        title: job.title.trim(),
        job_Description: job.job_Description.trim() || "",
        salary: job.salary.trim() || "",
        location: job.location.trim() || "",
        skills_required: job.skills_required.trim() || "",
        responsibilities: job.responsibilities.trim() || "",
        created_at: new Date().toISOString(),
        ownerId: auth.currentUser?.uid || "",
      };

      await addDoc(collection(db, "jobs"), jobData);

      Alert.alert("Thành công", "Đã tạo job mới", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error("❌ Error creating job:", error);
      Alert.alert("Lỗi", "Không thể tạo job");
    } finally {
      setSaving(false);
    }
  };

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
          onPress={handleCreate}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>Tạo Job</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default JobCreateScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
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