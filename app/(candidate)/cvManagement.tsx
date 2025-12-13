/**
 * CV Management Screen
 * 
 * Quản lý danh sách CV:
 * - Xem tất cả CV đã tạo (template + uploaded)
 * - Tạo CV mới từ template
 * - Upload CV có sẵn
 * - Chỉnh sửa CV
 * - Xóa CV
 * - Đặt CV mặc định
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { CVData } from '@/types/cv.types';
import { cvService } from '@/services/cv.service';
import { cvExportService } from '@/services/cvExport.service';
import { authApiService } from '@/services/authApi.service';
import * as Haptics from 'expo-haptics';
import { DrawerMenuButton } from '@/components/candidate/DrawerMenu';
import { LinearGradient } from 'expo-linear-gradient';

const MAX_SIZE = 25 * 1024 * 1024; // 25 MB
const ALLOW_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const CVManagementScreen = () => {
  const [cvs, setCvs] = useState<CVData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Ref to prevent double-tap on create button
  const isCreatingRef = useRef(false);

  // ✅ FIX: Use useFocusEffect to reload CVs when screen gains focus
  useFocusEffect(
    useCallback(() => {
      loadCVs();
      // Reset creating flag when screen is focused
      isCreatingRef.current = false;
    }, [])
  );

  const loadCVs = async () => {
    try {
      setLoading(true);
      const userCVs = await cvService.getUserCVs();
      setCvs(userCVs);
    } catch (error) {
      console.error('Error loading CVs:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách CV');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCVs();
    setRefreshing(false);
  }, []);

  const handleCreateCV = async () => {
    // ✅ FIX: Use ref to prevent duplicate creation from double-tap
    if (loading || isCreatingRef.current) return;
    
    try {
      isCreatingRef.current = true;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setLoading(true);

      // Get user profile and student profile
      const userProfile = await authApiService.getProfile();
      
      // Create empty CV
      const emptyCV = cvService.createEmptyCV(userProfile.uid || '');
      
      // Auto-fill from profile
      const autoFilledCV = cvService.autoFillFromProfile(
        emptyCV,
        userProfile,
        userProfile.studentProfile
      );

      // ✅ FIX: Don't save to Firestore yet. Pass data to editor.
      // The CV will be saved only when user clicks "Save" in editor.
      
      router.push({
        pathname: '/(candidate)/cvEditor',
        params: { 
          initialData: JSON.stringify(autoFilledCV),
          isNew: 'true',
          from: '/(candidate)/cvManagement' 
        },
      });
    } catch (error) {
      console.error('Error creating CV:', error);
      Alert.alert('Lỗi', 'Không thể tạo CV mới');
      isCreatingRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  // ✅ NEW: Upload CV file
  const handleUploadCV = async () => {
    if (loading || uploading) return;

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

      Alert.alert('✅ Thành công', 'CV đã được tải lên và lưu vào thư viện. Bạn có thể sử dụng CV này khi ứng tuyển.');
    } catch (error: any) {
      console.error('Upload CV error:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tải lên CV');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleEditCV = (cvId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // ✅ FIX: Add 'from' param for proper back navigation
    router.push({
      pathname: '/(candidate)/cvEditor',
      params: { cvId, from: '/(candidate)/cvManagement' },
    });
  };

  const handleSetDefault = async (cvId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await cvService.setDefaultCV(cvId);
      await loadCVs();
      Alert.alert('Thành công', 'Đã đặt làm CV mặc định');
    } catch (error) {
      console.error('Error setting default CV:', error);
      Alert.alert('Lỗi', 'Không thể đặt CV mặc định');
    }
  };

  const handleDuplicateCV = async (cvId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const newCvId = await cvService.duplicateCV(cvId);
      await loadCVs();
      Alert.alert('Thành công', 'Đã tạo bản sao CV', [
        { text: 'OK' },
        { text: 'Chỉnh sửa', onPress: () => handleEditCV(newCvId) },
      ]);
    } catch (error) {
      console.error('Error duplicating CV:', error);
      Alert.alert('Lỗi', 'Không thể sao chép CV');
    }
  };

  const handleExportCV = async (cv: CVData) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await cvExportService.exportToPDF(cv);
    } catch (error) {
      console.error('Error exporting CV:', error);
      Alert.alert('Lỗi', 'Không thể xuất CV');
    }
  };

  const handleDeleteCV = (cvId: string, isDefault: boolean) => {
    if (isDefault) {
      Alert.alert('Không thể xóa', 'CV mặc định không thể xóa. Hãy đặt CV khác làm mặc định trước.');
      return;
    }

    Alert.alert(
      'Xác nhận xóa',
      'Bạn có chắc chắn muốn xóa CV này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              await cvService.deleteCV(cvId);
              await loadCVs();
              Alert.alert('Thành công', 'Đã xóa CV');
            } catch (error) {
              console.error('Error deleting CV:', error);
              Alert.alert('Lỗi', 'Không thể xóa CV');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (loading && cvs.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A80F0" />
          <Text style={styles.loadingText}>Đang tải CV...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <DrawerMenuButton />
        <Text style={styles.headerTitle}>Quản lý CV</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle" size={20} color="#4A80F0" />
        <Text style={styles.infoText}>
          Tạo nhiều CV cho các vị trí khác nhau. CV mặc định sẽ dùng khi ứng tuyển.
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* ✅ IMPROVED: Action Buttons Row */}
        <View style={styles.actionButtonsContainer}>
          <Text style={styles.sectionTitle}>Thêm CV mới</Text>
          <View style={styles.actionButtonsRow}>
            {/* Create New CV from Template */}
            <TouchableOpacity
              style={[styles.createActionCard, (loading || uploading) && styles.cardDisabled]}
              onPress={handleCreateCV}
              activeOpacity={0.8}
              disabled={loading || uploading}
            >
              <LinearGradient
                colors={['#10b981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionCardGradient}
              >
                <View style={styles.actionCardIcon}>
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="sparkles" size={24} color="#fff" />
                  )}
                </View>
                <View style={styles.actionCardContent}>
                  <Text style={styles.actionCardTitle}>Tạo từ template</Text>
                  <Text style={styles.actionCardSubtitle}>Tự động điền từ profile</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
              </LinearGradient>
            </TouchableOpacity>

            {/* Upload Existing CV */}
            <TouchableOpacity
              style={[styles.uploadActionCard, (loading || uploading) && styles.cardDisabled]}
              onPress={handleUploadCV}
              activeOpacity={0.8}
              disabled={loading || uploading}
            >
              <LinearGradient
                colors={['#3b82f6', '#2563eb']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionCardGradient}
              >
                <View style={styles.actionCardIcon}>
                  {uploading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="cloud-upload" size={24} color="#fff" />
                  )}
                </View>
                <View style={styles.actionCardContent}>
                  <Text style={styles.actionCardTitle}>
                    {uploading ? `Đang tải ${uploadProgress}%` : 'Upload CV'}
                  </Text>
                  <Text style={styles.actionCardSubtitle}>PDF, DOC, DOCX</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* CV List Section */}
        <View style={styles.cvListSection}>
          <Text style={styles.sectionTitle}>CV của bạn ({cvs.length})</Text>
        {cvs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>Chưa có CV</Text>
            <Text style={styles.emptySubtitle}>
              Tạo CV từ template hoặc tải lên CV có sẵn
            </Text>
          </View>
        ) : (
          cvs.map((cv) => (
            <View key={cv.id} style={styles.cvCard}>
              {/* CV Header */}
              <TouchableOpacity
                style={styles.cvHeader}
                onPress={() => cv.type !== 'uploaded' && handleEditCV(cv.id!)}
                activeOpacity={cv.type === 'uploaded' ? 1 : 0.8}
              >
                <View style={[
                  styles.cvIconContainer, 
                  cv.type === 'uploaded' && { backgroundColor: '#dbeafe' }
                ]}>
                  <Ionicons 
                    name={cv.type === 'uploaded' ? 'document-attach' : 'document-text'} 
                    size={28} 
                    color={cv.type === 'uploaded' ? '#3b82f6' : '#4A80F0'} 
                  />
                  {cv.isDefault && (
                    <View style={styles.defaultBadge}>
                      <Ionicons name="star" size={12} color="#fff" />
                    </View>
                  )}
                </View>
                
                <View style={styles.cvInfo}>
                  <View style={styles.cvTitleRow}>
                    <Text style={styles.cvTitle} numberOfLines={1}>
                      {cv.type === 'uploaded' 
                        ? (cv.fileName || 'CV đã tải lên')
                        : (cv.personalInfo.fullName || 'CV chưa có tên')
                      }
                    </Text>
                    {cv.isDefault && (
                      <View style={styles.defaultTag}>
                        <Text style={styles.defaultTagText}>Mặc định</Text>
                      </View>
                    )}
                  </View>
                  
                  {/* ✅ NEW: CV Type Badge */}
                  <View style={[
                    styles.cvTypeBadge,
                    cv.type === 'uploaded' 
                      ? { backgroundColor: '#dbeafe' }
                      : { backgroundColor: '#dcfce7' }
                  ]}>
                    <Ionicons 
                      name={cv.type === 'uploaded' ? 'cloud-upload' : 'create'} 
                      size={10} 
                      color={cv.type === 'uploaded' ? '#3b82f6' : '#10b981'} 
                    />
                    <Text style={[
                      styles.cvTypeBadgeText,
                      { color: cv.type === 'uploaded' ? '#3b82f6' : '#10b981' }
                    ]}>
                      {cv.type === 'uploaded' ? 'CV tải lên' : 'CV từ template'}
                    </Text>
                  </View>
                  
                  <Text style={styles.cvDate}>
                    Cập nhật: {formatDate(cv.updatedAt)}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* CV Actions */}
              <View style={styles.cvActions}>
                {/* Edit - only for template CVs */}
                {cv.type !== 'uploaded' && (
                  <TouchableOpacity
                    style={styles.cvActionButton}
                    onPress={() => handleEditCV(cv.id!)}
                  >
                    <Ionicons name="create-outline" size={18} color="#4A80F0" />
                    <Text style={styles.actionText}>Sửa</Text>
                  </TouchableOpacity>
                )}
                
                {/* View - for uploaded CVs */}
                {cv.type === 'uploaded' && cv.pdfUrl && (
                  <TouchableOpacity
                    style={styles.cvActionButton}
                    onPress={() => {
                      // Open PDF in browser
                      import('expo-linking').then(({ openURL }) => {
                        openURL(cv.pdfUrl!);
                      });
                    }}
                  >
                    <Ionicons name="eye-outline" size={18} color="#4A80F0" />
                    <Text style={styles.actionText}>Xem</Text>
                  </TouchableOpacity>
                )}

                {!cv.isDefault && (
                  <TouchableOpacity
                    style={styles.cvActionButton}
                    onPress={() => handleSetDefault(cv.id!)}
                  >
                    <Ionicons name="star-outline" size={18} color="#f59e0b" />
                    <Text style={[styles.actionText, { color: '#f59e0b' }]}>
                      Mặc định
                    </Text>
                  </TouchableOpacity>
                )}

                {cv.type !== 'uploaded' && (
                  <TouchableOpacity
                    style={styles.cvActionButton}
                    onPress={() => handleDuplicateCV(cv.id!)}
                  >
                    <Ionicons name="copy-outline" size={18} color="#64748b" />
                    <Text style={styles.actionText}>Sao chép</Text>
                  </TouchableOpacity>
                )}

                {cv.type !== 'uploaded' && (
                  <TouchableOpacity
                    style={styles.cvActionButton}
                    onPress={() => handleExportCV(cv)}
                  >
                    <Ionicons name="download-outline" size={18} color="#10b981" />
                    <Text style={[styles.actionText, { color: '#10b981' }]}>
                      Xuất
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.cvActionButton}
                  onPress={() => handleDeleteCV(cv.id!, cv.isDefault || false)}
                >
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  <Text style={[styles.actionText, { color: '#ef4444' }]}>
                    Xóa
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default CVManagementScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#dbeafe',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  createButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#10b981',
    borderStyle: 'dashed',
  },
  createButtonDisabled: {
    opacity: 0.6,
    borderColor: '#94a3b8',
  },
  createIconContainer: {
    marginRight: 12,
  },
  createTextContainer: {
    flex: 1,
  },
  createTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4A80F0',
    marginBottom: 2,
  },
  createSubtitle: {
    fontSize: 13,
    color: '#64748b',
  },
  cvCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cvHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  cvIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    position: 'relative',
  },
  defaultBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cvInfo: {
    flex: 1,
  },
  cvTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cvTitle: {
    fontSize: 16,
    fontWeight: '700',
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
    fontSize: 11,
    fontWeight: '600',
    color: '#d97706',
  },
  cvTemplate: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 2,
  },
  cvDate: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  cvActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  // Old actionButton style (kept for compatibility)
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  // ✅ NEW: CV Action Button (for CV card actions)
  cvActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 8,
    paddingHorizontal: 10,
    minWidth: 65,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  // ✅ NEW: Section styles
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
  },
  actionButtonsContainer: {
    marginBottom: 8,
  },
  // ✅ NEW: Action Buttons Row styles
  actionButtonsRow: {
    flexDirection: 'column',
    gap: 10,
  },
  cardDisabled: {
    opacity: 0.6,
  },
  // ✅ NEW: Action Card styles
  createActionCard: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  uploadActionCard: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  actionCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  actionCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCardContent: {
    flex: 1,
    marginLeft: 14,
  },
  actionCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  actionCardSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  // ✅ CV List Section
  cvListSection: {
    marginTop: 16,
  },
  // Legacy styles (kept for compatibility)
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionButtonTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 2,
  },
  actionButtonSubtitle: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
  },
  uploadButton: {
    borderColor: '#3b82f6',
  },
  // ✅ CV Type Badge
  cvTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
    marginTop: 6,
  },
  cvTypeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
});
