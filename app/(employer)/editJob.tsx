// app/(employer)/editJob.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SCROLL_BOTTOM_PADDING } from '@/utils/layout.utils';

import { jobApiService } from '@/services/jobApi.service';
import { smartBack } from '@/utils/navigation';

export default function EditJob() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; jobId?: string }>();
  const jobId = (params.id || params.jobId) as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    jobDescription: '',
    responsibilities: '',
    skillsRequired: '',
    salaryMin: '',
    salaryMax: '',
    location: '',
    benefits: '',
    requirements: '',
  });

  const fetchJobData = useCallback(async () => {
    if (!jobId) {
      Alert.alert('Lỗi', 'Không tìm thấy ID công việc.');
      smartBack();
      return;
    }

    try {
      setLoading(true);
      const job = await jobApiService.getJobById(jobId);

      setFormData({
        title: job.title || '',
        jobDescription: job.description || '',
        responsibilities: (job as any).responsibilities || '',
        skillsRequired: Array.isArray((job as any).skills_required)
          ? (job as any).skills_required.join(', ')
          : (job as any).skills_required || '',
        salaryMin: typeof job.salary === 'object' ? job.salary?.min?.toString() || '' : '',
        salaryMax: typeof job.salary === 'object' ? job.salary?.max?.toString() || '' : '',
        location: job.location || '',
        benefits: Array.isArray(job.benefits) ? job.benefits.join(', ') : job.benefits || '',
        requirements: Array.isArray((job as any).requirements)
          ? (job as any).requirements.join(', ')
          : (job as any).requirements || '',
      });
    } catch (error: any) {
      console.error('❌ Fetch job error:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin công việc. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchJobData();
  }, [fetchJobData]);

  // ✅ Optimize: Memoized update handlers to prevent re-renders
  const updateField = useCallback((field: keyof typeof formData) => {
    return (text: string) => {
      setFormData(prev => ({ ...prev, [field]: text }));
    };
  }, []);

  const handleSave = async () => {
    // ✅ Enhanced client-side validation
    const trimmedTitle = formData.title.trim();
    const trimmedDescription = formData.jobDescription.trim();

    if (!trimmedTitle || trimmedTitle.length < 3) {
      Alert.alert('Lỗi', 'Tiêu đề công việc phải có ít nhất 3 ký tự');
      return;
    }

    if (!trimmedDescription || trimmedDescription.length < 20) {
      Alert.alert('Lỗi', 'Mô tả công việc phải có ít nhất 20 ký tự (hiện tại: ' + trimmedDescription.length + ')');
      return;
    }

    const skills = formData.skillsRequired.split(',').map((s) => s.trim()).filter(Boolean);
    if (skills.length === 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập ít nhất 1 kỹ năng yêu cầu');
      return;
    }

    if (!formData.location.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập địa điểm làm việc');
      return;
    }

    try {
      setSaving(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // ✅ Prepare update payload matching backend schema
      const updateData: any = {
        title: trimmedTitle,
        description: trimmedDescription,
        skills: skills,
        requirements: formData.requirements.split(',').map((r) => r.trim()).filter(Boolean),
        location: formData.location.trim(),
      };

      // ✅ Handle salary - only include if values exist
      if (formData.salaryMin || formData.salaryMax) {
        const minSalary = formData.salaryMin ? parseFloat(formData.salaryMin) : 0;
        const maxSalary = formData.salaryMax ? parseFloat(formData.salaryMax) : 0;
        
        if (minSalary > 0 || maxSalary > 0) {
          updateData.salary = {
            min: minSalary,
            max: maxSalary > 0 ? maxSalary : minSalary,
            currency: 'VND',
          };
        }
      }

      console.log('📤 Sending update data:', updateData);
      await jobApiService.updateJob(jobId, updateData);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Thành công', 'Đã cập nhật công việc!', [
        {
          text: 'OK',
          onPress: () => {
            smartBack();
          },
        },
      ]);
    } catch (error: any) {
      console.error('❌ Update job error:', error);
      console.error('❌ Error response:', error?.response?.data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      // ✅ Show detailed validation errors
      const errorData = error?.response?.data;
      let errorMessage = 'Không thể cập nhật công việc. Vui lòng thử lại.';
      
      if (errorData?.details && Array.isArray(errorData.details)) {
        // Show each validation error on a new line
        errorMessage = errorData.details.map((d: any) => `• ${d.field}: ${d.message}`).join('\n');
      } else if (errorData?.message) {
        errorMessage = errorData.message;
      } else if (errorData?.error) {
        errorMessage = errorData.error;
      }
      
      Alert.alert('Lỗi xác thực', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => smartBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chỉnh sửa công việc</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A80F0" />
          <Text style={styles.loadingText}>Đang tải thông tin công việc...</Text>
          <Text style={styles.loadingSubText}>Job ID: {jobId}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => smartBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chỉnh sửa công việc</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Lưu</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Basic Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 Thông tin cơ bản</Text>
            
            <Text style={styles.label}>Tiêu đề công việc *</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập tiêu đề công việc"
              value={formData.title}
              onChangeText={updateField('title')}
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.label}>Mô tả công việc *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Nhập mô tả chi tiết về công việc"
              value={formData.jobDescription}
              onChangeText={updateField('jobDescription')}
              multiline
              numberOfLines={6}
              placeholderTextColor="#94a3b8"
              textAlignVertical="top"
            />

            <Text style={styles.label}>Trách nhiệm</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Nhập các trách nhiệm chính"
              value={formData.responsibilities}
              onChangeText={updateField('responsibilities')}
              multiline
              numberOfLines={4}
              placeholderTextColor="#94a3b8"
              textAlignVertical="top"
            />

            <Text style={styles.label}>Kỹ năng yêu cầu</Text>
            <TextInput
              style={styles.input}
              placeholder="VD: React Native, TypeScript, Firebase (cách nhau bởi dấu phẩy)"
              value={formData.skillsRequired}
              onChangeText={updateField('skillsRequired')}
              placeholderTextColor="#94a3b8"
            />
          </View>

          {/* Salary & Location */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💰 Lương & Địa điểm</Text>

            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <Text style={styles.label}>Lương tối thiểu</Text>
                <TextInput
                  style={styles.input}
                  placeholder="VD: 10000000"
                  value={formData.salaryMin}
                  onChangeText={updateField('salaryMin')}
                  keyboardType="numeric"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={styles.halfWidth}>
                <Text style={styles.label}>Lương tối đa</Text>
                <TextInput
                  style={styles.input}
                  placeholder="VD: 20000000"
                  value={formData.salaryMax}
                  onChangeText={updateField('salaryMax')}
                  keyboardType="numeric"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            <Text style={styles.label}>Địa điểm</Text>
            <TextInput
              style={styles.input}
              placeholder="VD: Hà Nội, Hồ Chí Minh"
              value={formData.location}
              onChangeText={updateField('location')}
              placeholderTextColor="#94a3b8"
            />
          </View>

          {/* Benefits & Requirements */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎁 Phúc lợi & Yêu cầu</Text>

            <Text style={styles.label}>Phúc lợi</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="VD: Bảo hiểm, Thưởng (cách nhau bởi dấu phẩy)"
              value={formData.benefits}
              onChangeText={updateField('benefits')}
              multiline
              numberOfLines={3}
              placeholderTextColor="#94a3b8"
              textAlignVertical="top"
            />

            <Text style={styles.label}>Yêu cầu khác</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="VD: Kinh nghiệm 2 năm, Bằng cử nhân (cách nhau bởi dấu phẩy)"
              value={formData.requirements}
              onChangeText={updateField('requirements')}
              multiline
              numberOfLines={3}
              placeholderTextColor="#94a3b8"
              textAlignVertical="top"
            />
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

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
    borderBottomColor: '#e5e7eb',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#4A80F0',
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: '#94a3b8',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  loadingSubText: {
    marginTop: 8,
    fontSize: 12,
    color: '#94a3b8',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SCROLL_BOTTOM_PADDING,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1f2937',
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
});
