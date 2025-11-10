// app/(shared)/submit.tsx
import React, { useState, useEffect, useRef } from "react";
import * as Haptics from "expo-haptics";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { db, storage, auth } from "@/config/firebase";
import { applicationApiService } from "@/services/applicationApi.service";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
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
  const { jobId, userId, applyDocId } = useLocalSearchParams<{
    jobId: string;
    userId: string;
    applyDocId?: string;
  }>();

  const [cvFile, setCvFile] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [employerId, setEmployerId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // 🔐 refs kiểm soát an toàn
  const uploadRef = useRef<any>(null);
  const isSubmittingRef = useRef(false);

  /* ------------------ Lấy ownerId ------------------ */
  useEffect(() => {
    (async () => {
      if (!jobId) return;
      const job = await getDoc(doc(db, "jobs", jobId));
      setEmployerId(job.data()?.ownerId ?? null);
    })();
  }, [jobId]);

  /* ------------------ Chọn file ------------------ */
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
        return Alert.alert("❌ File quá lớn", "Giới hạn tối đa là 25 MB.");
      }
      if (!ALLOW_TYPES.includes(f.mimeType ?? "")) {
        return Alert.alert("⚠️ Định dạng không hợp lệ", "Chỉ chấp nhận PDF, DOC hoặc DOCX.");
      }

      setCvFile({ uri: f.uri, name: f.name!, type: f.mimeType! });
    } catch {
      Alert.alert("Lỗi", "Không thể chọn file, vui lòng thử lại.");
    }
  };

  /* ------------------ Nộp file ------------------ */
  const handleSubmit = async () => {
    if (isSubmittingRef.current) return; // ⚡ chặn double tap tức thì
    isSubmittingRef.current = true;

    if (!auth.currentUser) {
      isSubmittingRef.current = false;
      return Alert.alert("Chưa đăng nhập", "Vui lòng đăng nhập để nộp CV.");
    }

    if (!userId || !jobId) {
      isSubmittingRef.current = false;
      return Alert.alert("Thiếu dữ liệu", "Không xác định được công việc hoặc người dùng.");
    }

    if (!cvFile) {
      isSubmittingRef.current = false;
      return Alert.alert("Chưa chọn file", "Hãy chọn CV trước khi nộp.");
    }

    if (!applyDocId) {
      isSubmittingRef.current = false;
      return Alert.alert(
        "Thiếu hồ sơ",
        "Không tìm thấy thông tin đơn ứng tuyển. Vui lòng quay lại và ứng tuyển lại công việc."
      );
    }

    try {
      setIsUploading(true);
      setProgress(1);
      console.log("🚀 Bắt đầu upload CV...");

      const blob = await (await fetch(cvFile.uri)).blob();
      const fname = `${userId}_${Date.now()}_${cvFile.name}`;
      const fileRef = ref(storage, `cvs/${userId}/${fname}`);

      const uploadTask = uploadBytesResumable(fileRef, blob, {
        contentType: cvFile.type,
      });
      uploadRef.current = uploadTask;

      uploadTask.on("state_changed", (snap) => {
        const percent = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        setProgress(percent);
      });

      await uploadTask;
      const url = await getDownloadURL(fileRef);

      // 🔎 Lấy dữ liệu user + job
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
        company: jobSnap.data()?.company?.corp_name ?? "",
        salary: jobSnap.data()?.salary ?? "",
      };

      // 🧾 Ghi Firestore
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
        cv_path: fileRef.fullPath,
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

      await applicationApiService.updateApplication(applyDocId, {
        cvUrl: url,
      });

      Alert.alert("🎉 Thành công", "Bạn đã nộp CV thành công!");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await new Promise((r) => setTimeout(r, 400));

      router.dismiss(1); // 👈 Đóng màn hình JobDescription cũ phía dưới Submit
      router.replace({
        pathname: "/(shared)/jobDescription",
        params: { jobId, success: "true" },
      });

    } catch (e: any) {
      console.error("❌ Upload CV error:", e);
      Alert.alert("Lỗi", e.message ?? "Không thể upload CV, thử lại sau.");

      // 🧹 Nếu lỗi giữa chừng, xóa file lỗi
      if (uploadRef.current?.snapshot?.ref) {
        try {
          await deleteObject(uploadRef.current.snapshot.ref);
          console.log("🧹 Đã xóa file lỗi khi upload.");
        } catch {}
      }
    } finally {
      setIsUploading(false);
      setProgress(0);
      uploadRef.current = null;
      isSubmittingRef.current = false; // ✅ mở khóa
    }
  };

  /* ------------------ Cleanup ------------------ */
  useEffect(() => {
    return () => {
      if (uploadRef.current) {
        console.log("🛑 Cancel upload vì rời màn hình");
        uploadRef.current.cancel();
      }
    };
  }, []);

  /* ------------------ UI ------------------ */
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

        <TouchableOpacity style={styles.upload} onPress={handlePick} disabled={isUploading}>
          <Text style={styles.uploadTxt}>
            {cvFile ? cvFile.name : "Chọn file PDF / DOCX"}
          </Text>
        </TouchableOpacity>

        {isUploading && (
          <View style={styles.progressBox}>
            <ActivityIndicator color="#28A745" />
            <Text style={styles.progressTxt}>Đang tải: {progress}%</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.submit, (!cvFile || isUploading) && { opacity: 0.6 }]}
          disabled={!cvFile || isUploading}
          onPress={handleSubmit}
          activeOpacity={0.7}
        >
          <Text style={styles.submitTxt}>
            {isUploading ? "Đang nộp..." : "Nộp đơn"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ------------------ Styles ------------------ */
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
  progressBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  progressTxt: { color: "#28A745", fontSize: 14, fontWeight: "600" },

  submit: {
    backgroundColor: "#28A745",
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
  },
  submitTxt: { fontSize: 18, color: "#fff", fontWeight: "700" },
});
