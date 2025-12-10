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
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeBack } from "@/hooks/useSafeBack";
import * as DocumentPicker from "expo-document-picker";
import { db, storage, auth } from "@/config/firebase";
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
import { applicationApiService } from "@/services/applicationApi.service";
import CVSelectorModal, { CVSelectionResult } from "@/components/CVSelectorModal";
import { CVData } from "@/types/cv.types";
import { LinearGradient } from "expo-linear-gradient";
const MAX_SIZE = 25 * 1024 * 1024; // 25 MB
const ALLOW_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// ✅ CV Source type
type CVSource = 'none' | 'library' | 'upload';

export default function Submit() {
  const { jobId, userId, applyDocId } = useLocalSearchParams<{
    jobId: string;
    userId: string;
    applyDocId?: string;
  }>();
  
  // ✅ NEW: CV Selection states
  const [cvSource, setCvSource] = useState<CVSource>('none');
  const [selectedCV, setSelectedCV] = useState<CVData | null>(null);
  const [showCVSelector, setShowCVSelector] = useState(false);
  
  // Legacy states (for direct upload)
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

  /* ------------------ ✅ NEW: Handle CV Selection ------------------ */
  const handleCVSelection = (result: CVSelectionResult) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (result.type === 'none') {
      setCvSource('none');
      setSelectedCV(null);
      setCvFile(null);
    } else if (result.type === 'existing' || result.type === 'new-upload') {
      setCvSource('library');
      setSelectedCV(result.cv || null);
      setCvFile(null); // Clear direct upload file
    }
  };

  /* ------------------ Chọn file (Direct Upload) ------------------ */
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
      setCvSource('upload');
      setSelectedCV(null); // Clear library selection
    } catch (_e) {
      Alert.alert("Lỗi", "Không thể chọn file, vui lòng thử lại.");
    }
  };

  /* ------------------ Get CV URL for submission ------------------ */
  const getCvUrlForSubmission = async (): Promise<string | null> => {
    // Case 1: Using CV from library
    if (cvSource === 'library' && selectedCV) {
      console.log('📄 CV from library:', {
        id: selectedCV.id,
        type: selectedCV.type,
        pdfUrl: selectedCV.pdfUrl,
        fileUrl: selectedCV.fileUrl,
        fileName: selectedCV.fileName,
      });
      
      // Check if CV has a valid URL
      const cvUrl = selectedCV.pdfUrl || selectedCV.fileUrl;
      
      // ✅ For template CVs: URL is optional (can view via CVTemplateViewer using cvId)
      // ✅ For uploaded CVs: URL is required and must be valid Firebase Storage URL
      if (selectedCV.type === 'uploaded' && cvUrl) {
        // Block file:/// URLs only for uploaded CVs
        if (cvUrl.startsWith('file:///')) {
          console.error('❌ BLOCKED: file:/// URL detected for uploaded CV:', cvUrl.substring(0, 50));
          Alert.alert(
            "Lỗi CV",
            "CV này chứa đường dẫn file nội bộ không hợp lệ.\n\n" +
            "Vui lòng chọn CV khác hoặc tải lên CV mới.",
            [{ text: "Đã hiểu" }]
          );
          return null;
        }
      }
      
      // Template CVs can be submitted without PDF URL (will use cvId to fetch from Firestore)
      // Return cvUrl if available, or null for templates (will be handled by cv_id + cv_source)
      return cvUrl || null;
    }
    
    // Case 2: Direct file upload
    if (cvSource === 'upload' && cvFile) {
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
      return await getDownloadURL(fileRef);
    }
    
    return null;
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

    // ✅ NEW: Check if CV is selected (from library OR upload)
    const hasCV = (cvSource === 'library' && selectedCV) || (cvSource === 'upload' && cvFile);
    if (!hasCV) {
      isSubmittingRef.current = false;
      return Alert.alert("Chưa chọn CV", "Hãy chọn CV từ thư viện hoặc tải lên CV mới.");
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
      console.log("🚀 Bắt đầu nộp CV...");

      // ✅ Get CV URL (from library or upload new)
      // Note: Template CVs may return null (will use cv_id instead)
      const url = await getCvUrlForSubmission();

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
        cv_url: url || null, // ✅ Allow null for template CVs
        cv_path: cvSource === 'library' ? `library/${selectedCV?.id}` : uploadRef.current?.snapshot?.ref?.fullPath,
        cv_uploaded: true,
        cv_source: cvSource, // ✅ Track CV source
        cv_id: selectedCV?.id || null, // ✅ Track CV ID if from library
        status: "pending",
        applied_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      };

      if (snap.empty) {
        await addDoc(collection(db, "applied_jobs"), payload);
      } else {
        await updateDoc(snap.docs[0].ref, payload);
      }

      // ✅ Update application with cvUrl (can be null for template CVs)
      console.log('📦 Updating application:', {
        applyDocId,
        cvUrl: url?.substring(0, 30) + '...',
        cvSource,
        selectedCvId: selectedCV?.id,
      });
      
      const updateResult = await applicationApiService.updateApplication(applyDocId, {
        cvUrl: url || undefined, // Use undefined instead of null for API
        cvId: selectedCV?.id || undefined,
        cvSource: cvSource,
      });
      
      console.log('✅ Application updated:', {
        id: updateResult.id,
        status: updateResult.status,
        hasCvUrl: !!updateResult.cvUrl,
      });

Alert.alert("🎉 Thành công", "Bạn đã nộp CV thành công!");
await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
await new Promise((r) => setTimeout(r, 400));

// ✅ Navigate back và force refresh apply status
router.dismissAll(); // Đóng tất cả modal/screen phía trên
router.replace({
  pathname: "/(shared)/jobDescription",
  params: { 
    jobId, 
    success: "true",
    _timestamp: Date.now().toString() // Force re-render
  },
});

    } catch (e: any) {
      console.error("❌ Upload CV error:", e);
      Alert.alert("Lỗi", e.message ?? "Không thể upload CV, thử lại sau.");

      // 🧹 Nếu lỗi giữa chừng, xóa file lỗi
      if (uploadRef.current?.snapshot?.ref) {
        try {
          await deleteObject(uploadRef.current.snapshot.ref);
          console.log("🧹 Đã xóa file lỗi khi upload.");
        } catch (_cleanupErr) { /* ignore cleanup error */ }
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
  // ✅ Get display text for selected CV
  const getCVDisplayText = () => {
    if (cvSource === 'library' && selectedCV) {
      return `📚 ${selectedCV.personalInfo.fullName || selectedCV.fileName || 'CV từ thư viện'}`;
    }
    if (cvSource === 'upload' && cvFile) {
      return `📎 ${cvFile.name}`;
    }
    return 'Chưa chọn CV';
  };

  const { goBack } = useSafeBack();
  const hasSelectedCV = (cvSource === 'library' && selectedCV) || (cvSource === 'upload' && cvFile);

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <TouchableOpacity onPress={goBack} style={styles.back}>
          <Ionicons name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Hồ sơ & Portfolio</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.body}>
          <Text style={styles.label}>CV / Resume</Text>
          <Text style={styles.sub}>Chọn CV để ứng tuyển công việc</Text>

          {/* ✅ NEW: Option 1 - Select from Library */}
          <TouchableOpacity 
            style={[
              styles.optionCard, 
              cvSource === 'library' && selectedCV && styles.optionCardSelected
            ]}
            onPress={() => setShowCVSelector(true)}
            disabled={isUploading}
          >
            <View style={[styles.optionIcon, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="folder-open" size={24} color="#16a34a" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>📚 Chọn từ thư viện CV</Text>
              <Text style={styles.optionDesc}>
                {cvSource === 'library' && selectedCV 
                  ? selectedCV.personalInfo.fullName || selectedCV.fileName
                  : 'CV đã tạo hoặc đã tải lên trước đó'
                }
              </Text>
            </View>
            {cvSource === 'library' && selectedCV ? (
              <Ionicons name="checkmark-circle" size={24} color="#16a34a" />
            ) : (
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            )}
          </TouchableOpacity>

          {/* ✅ NEW: Option 2 - Direct Upload */}
          <TouchableOpacity 
            style={[
              styles.optionCard, 
              cvSource === 'upload' && cvFile && styles.optionCardSelected
            ]}
            onPress={handlePick}
            disabled={isUploading}
          >
            <View style={[styles.optionIcon, { backgroundColor: '#dbeafe' }]}>
              <Ionicons name="cloud-upload" size={24} color="#2563eb" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>📤 Tải lên CV mới</Text>
              <Text style={styles.optionDesc}>
                {cvSource === 'upload' && cvFile 
                  ? cvFile.name 
                  : 'Chọn file PDF / DOCX từ thiết bị'
                }
              </Text>
            </View>
            {cvSource === 'upload' && cvFile ? (
              <Ionicons name="checkmark-circle" size={24} color="#2563eb" />
            ) : (
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            )}
          </TouchableOpacity>

          {/* Progress indicator */}
          {isUploading && (
            <View style={styles.progressBox}>
              <ActivityIndicator color="#28A745" />
              <Text style={styles.progressTxt}>
                {cvSource === 'library' ? 'Đang nộp...' : `Đang tải: ${progress}%`}
              </Text>
            </View>
          )}

          {/* Selected CV Info */}
          {hasSelectedCV && !isUploading && (
            <View style={styles.selectedCVInfo}>
              <Ionicons name="document-text" size={20} color="#10b981" />
              <Text style={styles.selectedCVText}>{getCVDisplayText()}</Text>
              <TouchableOpacity 
                onPress={() => {
                  setCvSource('none');
                  setSelectedCV(null);
                  setCvFile(null);
                }}
              >
                <Ionicons name="close-circle" size={22} color="#ef4444" />
              </TouchableOpacity>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submit, (!hasSelectedCV || isUploading) && { opacity: 0.6 }]}
            disabled={!hasSelectedCV || isUploading}
            onPress={handleSubmit}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={hasSelectedCV ? ['#28A745', '#218838'] : ['#9ca3af', '#6b7280']}
              style={styles.submitGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name={isUploading ? "hourglass" : "paper-plane"} size={20} color="#fff" />
              <Text style={styles.submitTxt}>
                {isUploading ? "Đang nộp..." : "Nộp đơn ứng tuyển"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Info note */}
          <Text style={styles.noteText}>
            💡 Tip: Bạn có thể quản lý CV trong mục "Quản lý CV" để tái sử dụng khi ứng tuyển
          </Text>
        </View>
      </ScrollView>

      {/* CV Selector Modal */}
      <CVSelectorModal
        visible={showCVSelector}
        onClose={() => setShowCVSelector(false)}
        onSelect={handleCVSelection}
        allowNoCV={false}
        title="Chọn CV để ứng tuyển"
      />
    </View>
  );
}

/* ------------------ Styles ------------------ */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  top: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 40,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  title: { flex: 1, textAlign: "center", fontSize: 20, fontWeight: "700" },
  scrollView: {
    flex: 1,
  },
  body: { 
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  label: { fontSize: 18, fontWeight: "700", marginBottom: 5 },
  sub: { fontSize: 14, color: "#666", marginBottom: 16 },

  // ✅ NEW: Option cards
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  optionCardSelected: {
    backgroundColor: '#f0fdf4',
    borderColor: '#10b981',
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionContent: {
    flex: 1,
    marginLeft: 14,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  optionDesc: {
    fontSize: 13,
    color: '#64748b',
  },

  // Progress
  progressBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  progressTxt: { color: "#28A745", fontSize: 14, fontWeight: "600" },

  // Selected CV Info
  selectedCVInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
  },
  selectedCVText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#065f46',
  },

  // Submit button
  submit: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 8,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  submitTxt: { fontSize: 17, color: "#fff", fontWeight: "700" },

  // Note text
  noteText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 20,
  },

  // Legacy styles (kept for compatibility)
  upload: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
    marginBottom: 15,
  },
  uploadTxt: { fontSize: 16, color: "#666" },
});
