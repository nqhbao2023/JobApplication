import React, { useState, useEffect } from 'react';
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
import { db, storage } from '@/config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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
} from 'firebase/firestore';

const MAX_SIZE = 25 * 1024 * 1024; // 25MB

const guessMimeFromName = (name?: string) => {
  if (!name) return 'application/octet-stream';
  const lower = name.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.doc')) return 'application/msword';
  if (lower.endsWith('.docx'))
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  return 'application/octet-stream';
};

const Submit = () => {
  const { jobId, userId } = useLocalSearchParams<{ jobId: string; userId: string }>();
  const [cvFile, setCvFile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [employerId, setEmployerId] = useState<string | null>(null);

  // 🧠 Lấy thông tin employer của job
  useEffect(() => {
    const getJobOwner = async () => {
      if (!jobId) return;
      const jobSnap = await getDoc(doc(db, 'jobs', jobId));
      if (jobSnap.exists()) {
        const data = jobSnap.data();
        setEmployerId(data.users || data.ownerId || null);
      }
    };
    getJobOwner();
  }, [jobId]);

  // 🧩 Chọn CV
  const handleCvUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset) return;

      if (asset.size && asset.size > MAX_SIZE) {
        Alert.alert('File quá lớn', 'Vui lòng chọn file nhỏ hơn 25MB.');
        return;
      }

      setCvFile({
        uri: asset.uri,
        name: asset.name ?? 'cv.pdf',
        type: asset.mimeType ?? guessMimeFromName(asset.name),
      });

      console.log('📄 File selected:', asset.uri);
    } catch (error) {
      console.error('❌ Error picking file:', error);
      Alert.alert('Lỗi', 'Không thể chọn file. Vui lòng thử lại.');
    }
  };

  // ☁️ Upload CV lên Firebase Storage + lưu Firestore
  const uploadToFirebase = async () => {
    if (!cvFile || !jobId || !userId) {
      Alert.alert('Lỗi', 'Vui lòng chọn CV và đảm bảo thông tin hợp lệ.');
      return;
    }

    try {
      setUploading(true);
      const blob = await (await fetch(cvFile.uri)).blob();
      const contentType = cvFile.type ?? guessMimeFromName(cvFile.name);
      const fileName = `${userId}_${Date.now()}_${cvFile.name}`;
      const storageRef = ref(storage, `cvs/${fileName}`);

      await uploadBytes(storageRef, blob, { contentType });
      const downloadUrl = await getDownloadURL(storageRef);
      console.log('🔥 Uploaded URL:', downloadUrl);

      // 🔎 Kiểm tra xem đã apply chưa
      const q = query(
        collection(db, 'applied_jobs'),
        where('userId', '==', userId),
        where('jobId', '==', jobId)
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        // 🔄 Cập nhật lại CV
        const existing = snapshot.docs[0].ref;
        await updateDoc(existing, {
          cv_url: downloadUrl,
          cv_uploaded: true,
          updated_at: serverTimestamp(),
        });
        console.log('🌀 CV updated for existing application');
      } else {
        // ➕ Tạo mới application
        await addDoc(collection(db, 'applied_jobs'), {
          userId,
          jobId,
          employerId: employerId ?? null,
          cv_url: downloadUrl,
          cv_uploaded: true,
          status: 'pending',
          applied_at: serverTimestamp(),
        });
        console.log('✅ New application added');
      }

      Alert.alert('🎉 Thành công', 'CV của bạn đã được tải lên!');
router.replace({
  pathname: '/(shared)/jobDescription',
  params: { jobId, success: 'true' },
});
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
    </View>
  );
};

export default Submit;

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, backgroundColor: '#fff' },
  topView: { flexDirection: 'row', alignItems: 'center', marginTop: 40, marginBottom: 20 },
  backButton: {
    height: 40,
    width: 40,
    backgroundColor: 'white',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: 'bold', color: '#2F264F' },
  sectionContainer: { marginBottom: 30 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  sectionSubtitle: { fontSize: 14, color: '#666', marginBottom: 10 },
  uploadButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  uploadButtonText: { fontSize: 16, color: '#666' },
  applyButton: { backgroundColor: '#28A745', borderRadius: 10, padding: 15, alignItems: 'center' },
  applyButtonText: { fontSize: 18, color: 'white', fontWeight: 'bold' },
  disabledButton: { opacity: 0.6 },
});
