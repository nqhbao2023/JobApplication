/**
 * CV Selector Modal
 * 
 * Cho phép user:
 * 1. Chọn CV từ library đã tạo/upload
 * 2. Upload CV mới
 * 3. Không dùng CV (optional)
 * 
 * Sử dụng trong: submit.tsx, QuickPostForm.tsx
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import { CVData } from '@/types/cv.types';
import { cvService } from '@/services/cv.service';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_SIZE = 25 * 1024 * 1024; // 25 MB
const ALLOW_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export type CVSelectionResult = {
  type: 'none' | 'existing' | 'new-upload';
  cv?: CVData;
  fileUrl?: string;
  fileName?: string;
};

interface CVSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (result: CVSelectionResult) => void;
  allowNoCV?: boolean; // Cho phép không chọn CV
  title?: string;
}

export default function CVSelectorModal({
  visible,
  onClose,
  onSelect,
  allowNoCV = false,
  title = 'Chọn CV',
}: CVSelectorModalProps) {
  const [cvs, setCvs] = useState<CVData[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedCvId, setSelectedCvId] = useState<string | null>(null);

  // Load CVs when modal opens
  useEffect(() => {
    if (visible) {
      loadCVs();
    }
  }, [visible]);

  const loadCVs = async () => {
    try {
      setLoading(true);
      const userCVs = await cvService.getUserCVs();
      setCvs(userCVs);
      
      // Auto-select default CV if exists
      const defaultCV = userCVs.find(cv => cv.isDefault);
      if (defaultCV?.id) {
        setSelectedCvId(defaultCV.id);
      }
    } catch (error) {
      console.error('Error loading CVs:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách CV');
    } finally {
      setLoading(false);
    }
  };

  // Handle upload new CV
  const handleUploadNew = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const res = await DocumentPicker.getDocumentAsync({
        type: ALLOW_TYPES,
        copyToCacheDirectory: true,
      });

      if (res.canceled) return;

      const file = res.assets?.[0];
      if (!file) return;

      // Validate file size
      if (file.size && file.size > MAX_SIZE) {
        return Alert.alert('❌ File quá lớn', 'Giới hạn tối đa là 25 MB.');
      }

      // Validate file type
      if (!ALLOW_TYPES.includes(file.mimeType ?? '')) {
        return Alert.alert('⚠️ Định dạng không hợp lệ', 'Chỉ chấp nhận PDF, DOC hoặc DOCX.');
      }

      setUploading(true);
      setUploadProgress(0);

      // Upload file and create CV record
      const { cvId, fileUrl } = await cvService.uploadCVFile(
        file.uri,
        file.name!,
        file.mimeType!,
        setUploadProgress
      );

      // Reload CVs
      await loadCVs();

      // Select the newly uploaded CV
      setSelectedCvId(cvId);

      Alert.alert('✅ Thành công', 'CV đã được tải lên và lưu vào thư viện.');
      
      // Return the result
      const uploadedCV = await cvService.loadCV(cvId);
      if (uploadedCV) {
        onSelect({
          type: 'new-upload',
          cv: uploadedCV,
          fileUrl,
          fileName: file.name!,
        });
        onClose();
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tải lên CV');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle select existing CV
  const handleSelectExisting = () => {
    if (!selectedCvId) {
      Alert.alert('Chưa chọn CV', 'Vui lòng chọn một CV từ danh sách');
      return;
    }

    const selectedCV = cvs.find(cv => cv.id === selectedCvId);
    if (!selectedCV) return;

    // ✅ Check if template CV doesn't have PDF URL
    const isTemplateCV = selectedCV.type !== 'uploaded';
    const hasPdfUrl = selectedCV.pdfUrl || selectedCV.fileUrl;
    
    if (isTemplateCV && !hasPdfUrl) {
      Alert.alert(
        'CV chưa có file PDF',
        'CV từ template này chưa được xuất thành file PDF.\n\nĐể nộp CV này, bạn cần:\n1. Vào phần "CV của tôi"\n2. Chọn CV này\n3. Nhấn nút "Xuất PDF" để tạo file',
        [
          { text: 'Để sau', style: 'cancel' },
          { 
            text: 'Chọn CV khác', 
            onPress: () => setSelectedCvId(null)
          }
        ]
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    onSelect({
      type: 'existing',
      cv: selectedCV,
      fileUrl: selectedCV.pdfUrl || selectedCV.fileUrl,
      fileName: selectedCV.fileName || `CV_${selectedCV.personalInfo.fullName}`,
    });
    onClose();
  };

  // Handle no CV option
  const handleNoCV = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect({ type: 'none' });
    onClose();
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Render CV item
  const renderCVItem = ({ item }: { item: CVData }) => {
    const isSelected = selectedCvId === item.id;
    const isUploaded = item.type === 'uploaded';
    // ✅ Check if template CV has PDF URL
    const isTemplateWithoutPdf = !isUploaded && !item.pdfUrl && !item.fileUrl;

    return (
      <TouchableOpacity
        style={[styles.cvItem, isSelected && styles.cvItemSelected]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setSelectedCvId(item.id!);
        }}
        activeOpacity={0.7}
      >
        {/* Icon */}
        <View style={[styles.cvIcon, isUploaded ? styles.cvIconUploaded : styles.cvIconTemplate]}>
          <Ionicons 
            name={isUploaded ? 'document-attach' : 'document-text'} 
            size={24} 
            color={isUploaded ? '#3b82f6' : '#10b981'} 
          />
          {item.isDefault && (
            <View style={styles.defaultBadge}>
              <Ionicons name="star" size={10} color="#fff" />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.cvInfo}>
          <View style={styles.cvTitleRow}>
            <Text style={styles.cvName} numberOfLines={1}>
              {item.personalInfo.fullName || item.fileName || 'CV chưa có tên'}
            </Text>
            {item.isDefault && (
              <View style={styles.defaultTag}>
                <Text style={styles.defaultTagText}>Mặc định</Text>
              </View>
            )}
          </View>
          
          <Text style={styles.cvType}>
            {isUploaded ? '📄 CV tải lên' : '✨ CV từ template'}
          </Text>
          
          {/* ✅ Warning if template without PDF */}
          {isTemplateWithoutPdf ? (
            <Text style={styles.cvWarning}>
              ⚠️ Chưa xuất PDF - Cần xuất trước khi nộp
            </Text>
          ) : (
            <Text style={styles.cvDate}>
              Cập nhật: {formatDate(item.updatedAt)}
            </Text>
          )}
        </View>

        {/* Selection indicator */}
        <View style={[styles.radioButton, isSelected && styles.radioButtonSelected]}>
          {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Upload new CV button */}
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={handleUploadNew}
            disabled={uploading}
          >
            <LinearGradient
              colors={['#3b82f6', '#2563eb']}
              style={styles.uploadGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {uploading ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.uploadText}>Đang tải lên... {uploadProgress}%</Text>
                </>
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={24} color="#fff" />
                  <Text style={styles.uploadText}>📤 Tải lên CV mới</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>hoặc chọn từ thư viện</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* CV List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#10b981" />
              <Text style={styles.loadingText}>Đang tải danh sách CV...</Text>
            </View>
          ) : cvs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>Chưa có CV nào</Text>
              <Text style={styles.emptySubtitle}>
                Tải lên CV mới hoặc tạo CV từ template trong mục Quản lý CV
              </Text>
            </View>
          ) : (
            <FlatList
              data={cvs}
              keyExtractor={(item) => item.id!}
              renderItem={renderCVItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}

          {/* Bottom buttons */}
          <View style={styles.bottomButtons}>
            {allowNoCV && (
              <TouchableOpacity
                style={styles.noCVButton}
                onPress={handleNoCV}
              >
                <Ionicons name="close-circle-outline" size={20} color="#64748b" />
                <Text style={styles.noCVText}>Không dùng CV</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.selectButton,
                (!selectedCvId || cvs.length === 0) && styles.selectButtonDisabled
              ]}
              onPress={handleSelectExisting}
              disabled={!selectedCvId || cvs.length === 0}
            >
              <LinearGradient
                colors={selectedCvId ? ['#10b981', '#059669'] : ['#9ca3af', '#6b7280']}
                style={styles.selectGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.selectText}>Chọn CV này</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.85,
    paddingBottom: 34, // Safe area
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButton: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 14,
    overflow: 'hidden',
  },
  uploadGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#94a3b8',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  cvItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cvItemSelected: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
  },
  cvIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cvIconTemplate: {
    backgroundColor: '#dcfce7',
  },
  cvIconUploaded: {
    backgroundColor: '#dbeafe',
  },
  defaultBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cvInfo: {
    flex: 1,
    marginLeft: 14,
  },
  cvTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cvName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  defaultTag: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#d97706',
  },
  cvType: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 2,
  },
  cvDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  cvWarning: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '500',
  },
  radioButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  radioButtonSelected: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 16,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
  },
  bottomButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  noCVButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    gap: 8,
  },
  noCVText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  selectButton: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  selectButtonDisabled: {
    opacity: 0.5,
  },
  selectGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  selectText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
