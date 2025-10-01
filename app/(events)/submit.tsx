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
import * as FileSystem from 'expo-file-system';
import { db, storage } from '../../src/config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
const Submit = () => {
  const { jobId, userId, applyDocId } = useLocalSearchParams<{
    jobId: string;
    userId: string;
    applyDocId: string;
  }>();
  const [cvFile, setCvFile] = useState<{ uri: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [portfolioLink, setPortfolioLink] = useState<string>('');
  const [portfolioSlides, setPortfolioSlides] = useState<string[]>([]);
  const [portfolioPdfs, setPortfolioPdfs] = useState<string[]>([]);
  const [portfolioPhotos, setPortfolioPhotos] = useState<string[]>([]);

  const handleCvUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        copyToCacheDirectory: false,
      });

      if (result.assets && result.assets.length > 0) {
        const pickedFile = result.assets[0];
        const fileName = pickedFile.name;
        const fileUri = pickedFile.uri;

        const cvFolder = FileSystem.documentDirectory + 'cv/';
        const destPath = cvFolder + fileName;

        const folderInfo = await FileSystem.getInfoAsync(cvFolder);
        if (!folderInfo.exists) {
          await FileSystem.makeDirectoryAsync(cvFolder, { intermediates: true });
        }

        const existing = await FileSystem.getInfoAsync(destPath);
        if (existing.exists) {
          await FileSystem.deleteAsync(destPath);
        }

        await FileSystem.copyAsync({ from: fileUri, to: destPath });

        setCvFile({ uri: destPath, name: fileName });
        console.log('📄 File saved to:', destPath);
      } else {
        console.log('❌ No file selected');
      }
    } catch (error) {
      console.error('❌ Error picking file:', error);
    }
  };

  const handlePortfolioLink = () => {
    setPortfolioLink('https://myportfolio.com');
  };

  const handleAddSlide = () => {
    setPortfolioSlides([...portfolioSlides, 'slide1.pptx']);
  };

  const handleAddPdf = () => {
    setPortfolioPdfs([...portfolioPdfs, 'portfolio.pdf']);
  };

  const handleAddPhotos = () => {
    setPortfolioPhotos([...portfolioPhotos, 'photo1.jpg']);
  };

const uploadToFirebase = async () => {
  if (!cvFile || !jobId || !userId) {
    Alert.alert('Lỗi', 'Vui lòng chọn CV và đảm bảo thông tin công việc hợp lệ');
    return;
  }
  try {
    setUploading(true);

    // upload CV lên storage...
    const storageRef = ref(storage, `cvs/${userId}_${Date.now()}_${cvFile.name}`);
    const fileContent = await FileSystem.readAsStringAsync(cvFile.uri, { encoding: FileSystem.EncodingType.Base64 });
    const fileBlob = new Blob(
      [Uint8Array.from(atob(fileContent), c => c.charCodeAt(0))],
      { type: 'application/pdf' }
    );

    await uploadBytes(storageRef, fileBlob);
    const fileUrl = await getDownloadURL(storageRef);

    // 👉 Chỉ khi user bấm "Nộp đơn" mới tạo doc
    await addDoc(collection(db, 'applied_jobs'), {
      userId,
      jobId,
      cv_url: fileUrl,
      status: 'pending',
      applied_at: serverTimestamp(),
    });

    Alert.alert('Thành công', 'Bạn đã nộp CV!');
    router.back(); // quay lại JobDescription
  } catch (error) {
    console.error("❌ Upload failed:", error);
    Alert.alert("Lỗi", "Không thể tải CV lên, vui lòng thử lại");
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

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Portfolio (Không bắt buộc)</Text>
        <View style={styles.portfolioButtonsContainer}>
          <TouchableOpacity style={styles.portfolioButton} onPress={handlePortfolioLink}>
            <Text style={styles.portfolioButtonText}>Thêm link Portfolio</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.portfolioButton} onPress={handleAddSlide}>
            <Text style={styles.portfolioButtonText}>Thêm Slide</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.portfolioButtonsContainer}>
          <TouchableOpacity style={styles.portfolioButton} onPress={handleAddPdf}>
            <Text style={styles.portfolioButtonText}>Thêm PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.portfolioButton} onPress={handleAddPhotos}>
            <Text style={styles.portfolioButtonText}>Thêm Hình ảnh</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.addPdfButton} onPress={handleAddPdf}>
        <Text style={styles.addPdfButtonText}>Thêm PDF</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Submit;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  topView: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  backButton: {
    height: 40,
    width: 40,
    backgroundColor: 'white',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2F264F',
  },
  sectionContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  uploadButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  uploadButtonText: {
    fontSize: 16,
    color: '#666',
  },
  applyButton: {
    backgroundColor: '#28A745',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
  },
  portfolioButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  portfolioButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  portfolioButtonText: {
    fontSize: 16,
    color: '#666',
  },
  addPdfButton: {
    backgroundColor: '#28A745',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  addPdfButtonText: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
});