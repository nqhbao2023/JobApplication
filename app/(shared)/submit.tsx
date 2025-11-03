// app/(shared)/submit.tsx
import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { db, storage, auth } from "@/config/firebase";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import {
  addDoc,
  collection,
  serverTimestamp,
  doc,
  updateDoc,
  query,
  where,
  getDocs,
  getDoc,
} from "firebase/firestore";

const MAX_SIZE = 25 * 1024 * 1024; // 25 MB
const ALLOW_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export default function Submit() {
  const { jobId, userId } = useLocalSearchParams<{ jobId: string; userId: string }>();

  const [cvFile, setCvFile] = useState<{
    uri: string;
    name: string;
    type: string;
  } | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [employerId, setEmployerId] = useState<string | null>(null);

  /* ----------------------------- lấy ownerId ----------------------------- */
  useEffect(() => {
    (async () => {
      if (!jobId) return;
      const job = await getDoc(doc(db, "jobs", jobId));
      const owner = job.data()?.ownerId;
      setEmployerId(owner ?? null);
    })();
  }, [jobId]);

  /* ----------------------------- pick file ------------------------------- */
  const handlePick = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ALLOW_TYPES,
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      const f = res.assets?.[0];
      if (!f) return;

      if (f.size && f.size > MAX_SIZE) {
        return Alert.alert("File quá lớn", "Giới hạn 25 MB.");
      }
      if (!ALLOW_TYPES.includes(f.mimeType ?? "")) {
        return Alert.alert("Sai định dạng", "Chỉ nhận PDF / DOC / DOCX.");
      }

      setCvFile({ uri: f.uri, name: f.name!, type: f.mimeType! });
    } catch (e) {
      Alert.alert("Lỗi", "Không thể chọn file, thử lại.");
    }
  };

  /* ----------------------------- upload file ----------------------------- */
  const handleSubmit = async () => {
    if (!cvFile || !jobId || !userId) {
      return Alert.alert("Thiếu dữ liệu", "Hãy chọn CV trước.");
    }

    try {
      /* 1. chuẩn bị upload */
      const blob = await (await fetch(cvFile.uri)).blob();
      const fname = `${userId}_${Date.now()}_${cvFile.name}`;
      const r = ref(storage, `cvs/${fname}`);
      const task = uploadBytesResumable(r, blob, { contentType: cvFile.type });

      /* 2. theo dõi % */
      task.on("state_changed", (snap) => {
        setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
      });

      await task; // wait finish
      const url = await getDownloadURL(r);

      /* 3. thông tin user + job để embed */
      const [userSnap, jobSnap] = await Promise.all([
        getDoc(doc(db, "users", userId)),
        getDoc(doc(db, "jobs", jobId)),
      ]);

      const userInfo = {
        name: userSnap.data()?.name ?? "",
        email: userSnap.data()?.email ?? "",
        photoURL: userSnap.data()?.photoURL ?? null,
      };
      const jobInfo = {
        title: jobSnap.data()?.title ?? "",
        company: jobSnap.data()?.company ?? "",
        salary: jobSnap.data()?.salary ?? "",
      };

      /* 4. tạo / update applied_jobs */
      const qExisting = query(
        collection(db, "applied_jobs"),
        where("userId", "==", userId),
        where("jobId", "==", jobId)
      );
      const snap = await getDocs(qExisting);

      const payload = {
        userId,
        jobId,
        employerId,
        userInfo,
        jobInfo,
        cv_url: url,
        cv_path: r.fullPath,
        cv_uploaded: true,
        status: "pending",
        applied_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      };

      if (snap.empty) {
        await addDoc(collection(db, "applied_jobs"), payload);
      } else {
        await updateDoc(snap.docs[0].ref, payload);
      }

      Alert.alert("Thành công", "Đã nộp CV!");
      router.replace({ pathname: "/(shared)/jobDescription", params: { jobId } });
    } catch (e: any) {
      Alert.alert("Lỗi", e.message ?? "Không thể upload");
    } finally {
      setProgress(0);
    }
  };

  /* --------------------------------- UI ---------------------------------- */
  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Hồ sơ & Portfolio</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.label}>CV / Resume</Text>
        <Text style={styles.sub}>Tải lên để ứng tuyển công việc</Text>

        <TouchableOpacity style={styles.upload} onPress={handlePick}>
          <Text style={styles.uploadTxt}>
            {cvFile ? cvFile.name : "Chọn file PDF / DOCX"}
          </Text>
        </TouchableOpacity>

        {progress > 0 && (
          <Text style={{ marginBottom: 8 }}>Đang tải: {progress}%</Text>
        )}

        <TouchableOpacity
          style={[styles.submit, !cvFile && { opacity: 0.5 }]}
          disabled={!cvFile}
          onPress={handleSubmit}
        >
          <Text style={styles.submitTxt}>Nộp đơn</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* -------------------------------- Styles -------------------------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingHorizontal: 20 },
  top: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 40,
    marginBottom: 20,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  title: { flex: 1, textAlign: "center", fontSize: 20, fontWeight: "700" },

  body: { marginBottom: 30 },
  label: { fontSize: 18, fontWeight: "700", marginBottom: 5 },
  sub: { fontSize: 14, color: "#666", marginBottom: 10 },

  upload: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
    marginBottom: 15,
  },
  uploadTxt: { fontSize: 16, color: "#666" },

  submit: {
    backgroundColor: "#28A745",
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
  },
  submitTxt: { fontSize: 18, color: "#fff", fontWeight: "700" },
});
