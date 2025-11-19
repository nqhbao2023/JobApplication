/**
 * CV Management Screen
 * 
 * Quản lý danh sách CV:
 * - Xem tất cả CV đã tạo
 * - Tạo CV mới
 * - Chỉnh sửa CV
 * - Xóa CV
 * - Đặt CV mặc định
 */

import React, { useState, useEffect, useCallback } from 'react';
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
import { router } from 'expo-router';
import { CVData } from '@/types/cv.types';
import { cvService } from '@/services/cv.service';
import { cvExportService } from '@/services/cvExport.service';
import { authApiService } from '@/services/authApi.service';
import * as Haptics from 'expo-haptics';
import { DrawerMenuButton } from '@/components/candidate/DrawerMenu';

const CVManagementScreen = () => {
  const [cvs, setCvs] = useState<CVData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCVs();
  }, []);

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
    // Prevent duplicate creation
    if (loading) return;
    
    try {
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

      // Save to Firestore
      const cvId = await cvService.saveCV(autoFilledCV);

      // Navigate to editor
      router.push({
        pathname: '/(candidate)/cvEditor',
        params: { cvId },
      });
    } catch (error) {
      console.error('Error creating CV:', error);
      Alert.alert('Lỗi', 'Không thể tạo CV mới');
    } finally {
      setLoading(false);
    }
  };

  const handleEditCV = (cvId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/(candidate)/cvEditor',
      params: { cvId },
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
        {/* Create New CV Button */}
        <TouchableOpacity
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={handleCreateCV}
          activeOpacity={0.8}
          disabled={loading}
        >
          <View style={styles.createIconContainer}>
            {loading ? (
              <ActivityIndicator size="small" color="#4A80F0" />
            ) : (
              <Ionicons name="add-circle-outline" size={32} color="#4A80F0" />
            )}
          </View>
          <View style={styles.createTextContainer}>
            <Text style={styles.createTitle}>
              {loading ? 'Đang tạo CV...' : 'Tạo CV mới'}
            </Text>
            <Text style={styles.createSubtitle}>
              Tự động điền từ hồ sơ sinh viên
            </Text>
          </View>
          {!loading && (
            <Ionicons name="chevron-forward" size={24} color="#94a3b8" />
          )}
        </TouchableOpacity>

        {/* CV List */}
        {cvs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>Chưa có CV</Text>
            <Text style={styles.emptySubtitle}>
              Tạo CV đầu tiên để bắt đầu ứng tuyển
            </Text>
          </View>
        ) : (
          cvs.map((cv) => (
            <View key={cv.id} style={styles.cvCard}>
              {/* CV Header */}
              <TouchableOpacity
                style={styles.cvHeader}
                onPress={() => handleEditCV(cv.id!)}
                activeOpacity={0.8}
              >
                <View style={styles.cvIconContainer}>
                  <Ionicons name="document-text" size={28} color="#4A80F0" />
                  {cv.isDefault && (
                    <View style={styles.defaultBadge}>
                      <Ionicons name="star" size={12} color="#fff" />
                    </View>
                  )}
                </View>
                
                <View style={styles.cvInfo}>
                  <View style={styles.cvTitleRow}>
                    <Text style={styles.cvTitle} numberOfLines={1}>
                      {cv.personalInfo.fullName || 'CV chưa có tên'}
                    </Text>
                    {cv.isDefault && (
                      <View style={styles.defaultTag}>
                        <Text style={styles.defaultTagText}>Mặc định</Text>
                      </View>
                    )}
                  </View>
                  
                  <Text style={styles.cvTemplate}>
                    {cv.templateId === 'student-basic' && 'Template: Cơ bản'}
                    {cv.templateId === 'student-modern' && 'Template: Hiện đại'}
                    {cv.templateId === 'student-creative' && 'Template: Sáng tạo'}
                  </Text>
                  
                  <Text style={styles.cvDate}>
                    Cập nhật: {formatDate(cv.updatedAt)}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* CV Actions */}
              <View style={styles.cvActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEditCV(cv.id!)}
                >
                  <Ionicons name="create-outline" size={20} color="#4A80F0" />
                  <Text style={styles.actionText}>Sửa</Text>
                </TouchableOpacity>

                {!cv.isDefault && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleSetDefault(cv.id!)}
                  >
                    <Ionicons name="star-outline" size={20} color="#f59e0b" />
                    <Text style={[styles.actionText, { color: '#f59e0b' }]}>
                      Mặc định
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDuplicateCV(cv.id!)}
                >
                  <Ionicons name="copy-outline" size={20} color="#64748b" />
                  <Text style={styles.actionText}>Sao chép</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleExportCV(cv)}
                >
                  <Ionicons name="download-outline" size={20} color="#10b981" />
                  <Text style={[styles.actionText, { color: '#10b981' }]}>
                    Xuất
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDeleteCV(cv.id!, cv.isDefault || false)}
                >
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                  <Text style={[styles.actionText, { color: '#ef4444' }]}>
                    Xóa
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#4A80F0',
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
  },
  cvActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  actionText: {
    fontSize: 13,
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
});
