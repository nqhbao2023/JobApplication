import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { db, storage } from '../../src/config/firebase';
import { uploadBytes } from 'firebase/storage';
import { File } from 'expo-file-system';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import * as FileSystem from 'expo-file-system/legacy';

import { doc, updateDoc } from "firebase/firestore";

type PickedFile = {
  uri: string;
  name: string;
  type?: string | null;  // mimeType
  size?: number | null;
};

const MAX_SIZE = 25 * 1024 * 1024; // 25MB

// Chắc chắn convert được uri -> Blob (ổn định cho file:// và content://)
const uriToBlob = (uri: string): Promise<Blob> =>
  new Promise((resolve, reject) => {
    try {
      const xhr = new XMLHttpRequest();
      xhr.onerror = () => reject(new Error('Không thể đọc file từ URI (XHR failed)'));
      xhr.onload = () => {
        const blob = xhr.response;
        if (!blob) {
          reject(new Error('Blob rỗng'));
        } else {
          resolve(blob);
        }
      };
      xhr.responseType = 'blob';
      xhr.open('GET', uri, true);
      xhr.send(null);
    } catch (e) {
      reject(e);
    }
  });

const guessMimeFromName = (name?: string) => {
  if (!name) return 'application/octet-stream';
  const lower = name.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.doc')) return 'application/msword';
  if (lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  return 'application/octet-stream';
};

const Submit = () => {
  const { jobId, userId, applyDocId } = useLocalSearchParams<{
    jobId: string;
    userId: string;
    applyDocId?: string;
  }>();

  const [cvFile, setCvFile] = useState<PickedFile | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleCvUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        // Để true (mặc định) để Android trả về file:// trong cache, tránh content:// khó xử lý
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        console.log('❌ No file selected');
        return;
      }

      const asset = result.assets?.[0];
      if (!asset) {
        console.log('❌ No asset returned');
        return;
      }

      const picked: PickedFile = {
        uri: asset.uri,
        name: asset.name ?? 'cv.pdf',
        type: asset.mimeType ?? null,
        size: asset.size ?? null,
      };

      // Cảnh báo kích thước file lớn
      if (picked.size && picked.size > MAX_SIZE) {
        Alert.alert('File quá lớn', 'Vui lòng chọn file nhỏ hơn 25MB.');
        return;
      }

      setCvFile(picked);
      console.log('📄 File selected:', picked.uri);
    } catch (error) {
      console.error('❌ Error picking file:', error);
      Alert.alert('Lỗi', 'Không thể chọn file. Vui lòng thử lại.');
    }
  };
   const guessMimeFromName = (name?: string) => {
  if (!name) return 'application/octet-stream';
  const lower = name.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.doc')) return 'application/msword';
  if (lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  return 'application/octet-stream';
};

const uploadToFirebase = async () => {
  if (!cvFile || !jobId || !userId) {
    Alert.alert('Lỗi', 'Vui lòng chọn CV và đảm bảo thông tin công việc hợp lệ');
    return;
  }

  try {
    setUploading(true);

    const response = await fetch(cvFile.uri);
    const blob = await response.blob();
    const contentType = cvFile.type ?? 'application/pdf';

    // 🔹 Đường dẫn upload file lên Storage
    const storageRefPath = `cvs/${userId}_${Date.now()}_${cvFile.name}`;
    const fileRef = ref(storage, storageRefPath);

    await uploadBytes(fileRef, blob, { contentType });
    const fileUrl = await getDownloadURL(fileRef);

    console.log("🔥 File uploaded URL:", fileUrl);

    // 🔹 Cập nhật vào Firestore
    if (applyDocId) {
      const docRef = doc(db, "applied_jobs", applyDocId);
      await updateDoc(docRef, {
        cv_url: fileUrl,
        cv_uploaded: true, // ✅ để jobDescription check được
        status: "pending",
        applied_at: serverTimestamp(),
      });
    } else {
      await addDoc(collection(db, "applied_jobs"), {
        userId,
        jobId,
        cv_url: fileUrl,
        cv_uploaded: true,
        status: "pending",
        applied_at: serverTimestamp(),
      });
    }

    Alert.alert('🎉 Thành công', 'Đã upload CV lên Firebase Storage!');
    // ✅ Quay lại jobDescription và báo success
    router.replace(`/jobDescription?jobId=${jobId}&success=true`);
  } catch (error: any) {
    console.error('❌ Upload failed:', error);
    Alert.alert('Lỗi', error.message || 'Không thể upload CV');
  } finally {
    setUploading(false);
  }
};

  return (
    <View style={styles.container}>
      <View style={styles.topView}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerText}>Hồ sơ & Portfolio</Text>
      </View>

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>CV hoặc Resume</Text>
        <Text style={styles.sectionSubtitle}>Tải lên hồ sơ cá nhân để ứng tuyển công việc</Text>
        <TouchableOpacity style={styles.uploadButton} onPress={handleCvUpload}>
          <Text style={styles.uploadButtonText}>
            {cvFile ? cvFile.name : 'Tải file Doc/Docx/PDF'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.applyButton, uploading && styles.disabledButton]}
          onPress={uploadToFirebase}
          disabled={uploading}
        >
          <Text style={styles.applyButtonText}>
            {uploading ? 'Đang tải lên...' : 'Nộp đơn'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* phần Portfolio demo / tuỳ bạn giữ hay bỏ */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Portfolio (Không bắt buộc)</Text>
        <View style={styles.portfolioButtonsContainer}>
          <TouchableOpacity style={styles.portfolioButton} onPress={() => {}}>
            <Text style={styles.portfolioButtonText}>Thêm link Portfolio</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.portfolioButton} onPress={() => {}}>
            <Text style={styles.portfolioButtonText}>Thêm Slide</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.portfolioButtonsContainer}>
          <TouchableOpacity style={styles.portfolioButton} onPress={() => {}}>
            <Text style={styles.portfolioButtonText}>Thêm PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.portfolioButton} onPress={() => {}}>
            <Text style={styles.portfolioButtonText}>Thêm Hình ảnh</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default Submit;

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, backgroundColor: '#fff' },
  topView: { flexDirection: 'row', alignItems: 'center', marginTop: 40, marginBottom: 20 },
  backButton: {
    height: 40, width: 40, backgroundColor: 'white', borderRadius: 4,
    alignItems: 'center', justifyContent: 'center',
  },
  headerText: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: 'bold', color: '#2F264F' },
  sectionContainer: { marginBottom: 30 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  sectionSubtitle: { fontSize: 14, color: '#666', marginBottom: 10 },
  uploadButton: {
    borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 15,
    alignItems: 'center', marginBottom: 15,
  },
  uploadButtonText: { fontSize: 16, color: '#666' },
  applyButton: { backgroundColor: '#28A745', borderRadius: 10, padding: 15, alignItems: 'center' },
  applyButtonText: { fontSize: 18, color: 'white', fontWeight: 'bold' },
  portfolioButtonsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  portfolioButton: {
    flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 15,
    alignItems: 'center', marginHorizontal: 5,
  },
  portfolioButtonText: { fontSize: 16, color: '#666' },
  disabledButton: {
    opacity: 0.6,
  },
});