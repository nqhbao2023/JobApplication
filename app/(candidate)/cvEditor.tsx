/**
 * CV Editor Screen
 * 
 * Màn hình chỉnh sửa CV với các section:
 * - Personal Info
 * - Objective
 * - Education
 * - Skills
 * - Experience
 * - Projects
 * - Export PDF
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { CVData, EducationEntry, SkillCategory, ExperienceEntry } from '@/types/cv.types';
import { cvService } from '@/services/cv.service';
import { cvExportService } from '@/services/cvExport.service';
import CVPreviewModal from '@/components/CVPreviewModal';
import * as Haptics from 'expo-haptics';
import { AddressInput } from '@/components/cv/AddressInput';
import { EducationSection } from '@/components/cv/EducationSection';

const CVEditorScreen = () => {
  const params = useLocalSearchParams();
  const cvId = params.cvId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cvData, setCvData] = useState<CVData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    personal: true,
    objective: true,
    education: true,
    skills: true,
    experience: false,
    projects: false,
  });

  useEffect(() => {
    loadCV();
  }, [cvId]);

  const loadCV = async () => {
    try {
      setLoading(true);
      const cv = await cvService.loadCV(cvId);
      if (!cv) {
        Alert.alert('Lỗi', 'Không tìm thấy CV');
        router.back();
        return;
      }
      setCvData(cv);
    } catch (error) {
      console.error('Error loading CV:', error);
      Alert.alert('Lỗi', 'Không thể tải CV');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!cvData) return;

    try {
      setSaving(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      await cvService.saveCV(cvData);
      
      Alert.alert('Thành công', 'Đã lưu CV', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Error saving CV:', error);
      Alert.alert('Lỗi', 'Không thể lưu CV');
    } finally {
      setSaving(false);
    }
  };

  const handleExportPDF = async () => {
    if (!cvData) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      // Show preview modal instead of directly exporting
      setShowPreview(true);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      Alert.alert('Lỗi', 'Không thể xuất CV');
    }
  };

  const handleOpenInBrowser = async () => {
    if (!cvData) return;
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await cvExportService.openInBrowser(cvData);
    } catch (error) {
      console.error('Error opening in browser:', error);
      Alert.alert('Lỗi', 'Không thể mở trình duyệt');
    }
  };

  const handleShareCV = async () => {
    if (!cvData) return;
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await cvExportService.shareCV(cvData);
    } catch (error) {
      console.error('Error sharing CV:', error);
      Alert.alert('Lỗi', 'Không thể chia sẻ CV');
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const updatePersonalInfo = (field: string, value: string) => {
    if (!cvData) return;
    setCvData({
      ...cvData,
      personalInfo: {
        ...cvData.personalInfo,
        [field]: value,
      },
    });
  };

  const updateObjective = (value: string) => {
    if (!cvData) return;
    setCvData({ ...cvData, objective: value });
  };

  const addEducation = () => {
    if (!cvData) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const newEducation: EducationEntry = {
      id: `edu-${Date.now()}`,
      school: '',
      degree: '',
      startDate: '',
    };

    setCvData({
      ...cvData,
      education: [...cvData.education, newEducation],
    });
  };

  const updateEducation = (id: string, field: string, value: any) => {
    if (!cvData) return;
    setCvData({
      ...cvData,
      education: cvData.education.map(edu =>
        edu.id === id ? { ...edu, [field]: value } : edu
      ),
    });
  };

  const removeEducation = (id: string) => {
    if (!cvData) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setCvData({
      ...cvData,
      education: cvData.education.filter(edu => edu.id !== id),
    });
  };

  const addExperience = () => {
    if (!cvData) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const newExperience: ExperienceEntry = {
      id: `exp-${Date.now()}`,
      position: '',
      company: '',
      startDate: '',
    };

    setCvData({
      ...cvData,
      experience: [...cvData.experience, newExperience],
    });
  };

  const updateExperience = (id: string, field: string, value: any) => {
    if (!cvData) return;
    setCvData({
      ...cvData,
      experience: cvData.experience.map(exp =>
        exp.id === id ? { ...exp, [field]: value } : exp
      ),
    });
  };

  const removeExperience = (id: string) => {
    if (!cvData) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setCvData({
      ...cvData,
      experience: cvData.experience.filter(exp => exp.id !== id),
    });
  };

  if (loading || !cvData) {
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chỉnh sửa CV</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            <Text style={[styles.saveText, saving && { opacity: 0.5 }]}>
              {saving ? 'Đang lưu...' : 'Lưu'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Personal Information */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection('personal')}
              activeOpacity={0.7}
            >
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="person" size={20} color="#4A80F0" />
                <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
              </View>
              <Ionicons
                name={expandedSections.personal ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#64748b"
              />
            </TouchableOpacity>

            {expandedSections.personal && (
              <View style={styles.sectionContent}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Họ và tên *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Nguyễn Văn A"
                    value={cvData.personalInfo.fullName}
                    onChangeText={(text) => updatePersonalInfo('fullName', text)}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="email@example.com"
                    value={cvData.personalInfo.email}
                    onChangeText={(text) => updatePersonalInfo('email', text)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Số điện thoại *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0909123456"
                    value={cvData.personalInfo.phone}
                    onChangeText={(text) => updatePersonalInfo('phone', text)}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Địa chỉ</Text>
                  <AddressInput
                    value={cvData.personalInfo.address || ''}
                    onChangeText={(text) => updatePersonalInfo('address', text)}
                    placeholder="Thành phố Thủ Dầu Một, Bình Dương"
                  />
                  <Text style={styles.hint}>💡 Gợi ý tự động 63 tỉnh thành VN</Text>
                </View>
              </View>
            )}
          </View>

          {/* Objective */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection('objective')}
              activeOpacity={0.7}
            >
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="flag" size={20} color="#4A80F0" />
                <Text style={styles.sectionTitle}>Mục tiêu nghề nghiệp</Text>
              </View>
              <Ionicons
                name={expandedSections.objective ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#64748b"
              />
            </TouchableOpacity>

            {expandedSections.objective && (
              <View style={styles.sectionContent}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Mô tả ngắn gọn về mục tiêu nghề nghiệp của bạn..."
                  value={cvData.objective}
                  onChangeText={updateObjective}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            )}
          </View>

          {/* Education */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection('education')}
              activeOpacity={0.7}
            >
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="school" size={20} color="#4A80F0" />
                <Text style={styles.sectionTitle}>Học vấn</Text>
              </View>
              <Ionicons
                name={expandedSections.education ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#64748b"
              />
            </TouchableOpacity>

            {expandedSections.education && (
              <View style={styles.sectionContent}>
                <EducationSection
                  education={cvData.education}
                  onAdd={addEducation}
                  onUpdate={updateEducation}
                  onRemove={removeEducation}
                />
              </View>
            )}
          </View>

          {/* Experience */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection('experience')}
              activeOpacity={0.7}
            >
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="briefcase" size={20} color="#4A80F0" />
                <Text style={styles.sectionTitle}>Kinh nghiệm làm việc</Text>
              </View>
              <Ionicons
                name={expandedSections.experience ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#64748b"
              />
            </TouchableOpacity>

            {expandedSections.experience && (
              <View style={styles.sectionContent}>
                {cvData.experience.length === 0 ? (
                  <Text style={styles.emptyText}>
                    Chưa có kinh nghiệm? Không sao, hãy thêm dự án hoặc hoạt động ngoại khóa!
                  </Text>
                ) : (
                  cvData.experience.map((exp, index) => (
                    <View key={exp.id} style={styles.entryCard}>
                      <View style={styles.entryHeader}>
                        <Text style={styles.entryIndex}>Kinh nghiệm {index + 1}</Text>
                        <TouchableOpacity
                          onPress={() => removeExperience(exp.id)}
                          style={styles.removeButton}
                        >
                          <Ionicons name="trash-outline" size={18} color="#ef4444" />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Vị trí *</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="Nhân viên part-time"
                          value={exp.position}
                          onChangeText={(text) => updateExperience(exp.id, 'position', text)}
                        />
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Công ty *</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="Highlands Coffee"
                          value={exp.company}
                          onChangeText={(text) => updateExperience(exp.id, 'company', text)}
                        />
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Mô tả công việc</Text>
                        <TextInput
                          style={[styles.input, styles.textArea]}
                          placeholder="Mô tả công việc và trách nhiệm..."
                          value={exp.description || ''}
                          onChangeText={(text) => updateExperience(exp.id, 'description', text)}
                          multiline
                          numberOfLines={3}
                          textAlignVertical="top"
                        />
                      </View>

                      <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                          <Text style={styles.label}>Từ</Text>
                          <TextInput
                            style={styles.input}
                            placeholder="2023-06"
                            value={exp.startDate}
                            onChangeText={(text) => updateExperience(exp.id, 'startDate', text)}
                          />
                        </View>

                        <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                          <Text style={styles.label}>Đến</Text>
                          <TextInput
                            style={styles.input}
                            placeholder="Hiện tại"
                            value={exp.endDate || ''}
                            onChangeText={(text) => updateExperience(exp.id, 'endDate', text)}
                          />
                        </View>
                      </View>
                    </View>
                  ))
                )}

                <TouchableOpacity
                  style={styles.addButton}
                  onPress={addExperience}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#4A80F0" />
                  <Text style={styles.addButtonText}>Thêm kinh nghiệm</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Info about skills */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color="#4A80F0" />
            <Text style={styles.infoText}>
              Kỹ năng được tự động điền từ Hồ sơ sinh viên. Vui lòng cập nhật ở mục Hồ sơ sinh viên.
            </Text>
          </View>

          {/* Export PDF Button */}
          <TouchableOpacity
            style={styles.exportButton}
            onPress={handleExportPDF}
            activeOpacity={0.8}
          >
            <Ionicons name="eye-outline" size={20} color="#4A80F0" />
            <Text style={styles.exportButtonText}>Xem trước & Xuất CV</Text>
          </TouchableOpacity>

          {/* Save Button Bottom */}
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Đang lưu...' : 'Lưu CV'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* CV Preview Modal */}
      <CVPreviewModal
        visible={showPreview}
        onClose={() => setShowPreview(false)}
        cvData={cvData}
        onOpenBrowser={handleOpenInBrowser}
        onShare={handleShareCV}
      />
    </SafeAreaView>
  );
};

export default CVEditorScreen;

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
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A80F0',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  sectionContent: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1e293b',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
  },
  entryCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  entryIndex: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4A80F0',
  },
  removeButton: {
    padding: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#4A80F0',
    borderRadius: 8,
    borderStyle: 'dashed',
    marginTop: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A80F0',
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 16,
  },
  infoCard: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
  saveButton: {
    backgroundColor: '#4A80F0',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4A80F0',
    marginTop: 16,
  },
  exportButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4A80F0',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
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
  hint: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    fontStyle: 'italic',
  },
});
