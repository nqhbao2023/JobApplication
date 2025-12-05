import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Button } from '@/components/base/Button';
import { LoadingSpinner } from '@/components/base/LoadingSpinner';
import { FormInput } from '@/components/admin/FormInput';
import { formatSalary as formatSalaryUtil } from '@/utils/salary.utils';
import { jobApiService } from '@/services/jobApi.service';
import { Ionicons } from '@expo/vector-icons';

type Job = {
  title?: string;
  job_Description?: string;
  description?: string;
  salary?: string | { min?: number; max?: number; currency?: string };
  salary_text?: string;
  salary_min?: number;
  salary_max?: number;
  location?: string;
  skills_required?: string;
  skills?: string[];
  requirements?: string[];
  responsibilities?: string;
  benefits?: string[];
  company_name?: string;
  job_type_id?: string;
  category?: string;
  source?: string;
  external_url?: string;
  status?: string;
  contact_email?: string;
  contact_phone?: string;
};

const JobDetailScreen = () => {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const [job, setJob] = useState<Job>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // ✅ Delete modal states
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (jobId) {
      loadJob();
    }
  }, [jobId]);

  const loadJob = async () => {
    try {
      const snap = await getDoc(doc(db, 'jobs', jobId));
      if (snap.exists()) {
        setJob(snap.data() as Job);
      } else {
        Alert.alert('Lỗi', 'Không tìm thấy job');
        router.back();
      }
    } catch (error) {
      console.error('Error loading job:', error);
      Alert.alert('Lỗi', 'Không thể tải job');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!job.title?.trim()) {
      Alert.alert('Lỗi', 'Tiêu đề không được để trống');
      return;
    }

    try {
      setSaving(true);

      const updateData = {
        title: job.title.trim(),
        job_Description: job.job_Description?.trim() || '',
        salary: typeof job.salary === 'string' ? job.salary.trim() : job.salary,
        location: job.location?.trim() || '',
        skills_required: job.skills_required?.trim() || '',
        responsibilities: job.responsibilities?.trim() || '',
        updated_at: new Date().toISOString(),
      };

      await updateDoc(doc(db, 'jobs', jobId), updateData);

      Alert.alert('Thành công', 'Đã cập nhật job', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Error saving:', error);
      Alert.alert('Lỗi', 'Không thể lưu');
    } finally {
      setSaving(false);
    }
  };

  // ✅ NEW: Handle delete job with API (auto-sync Firebase + Algolia)
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await jobApiService.deleteJob(jobId);
      setDeleteModalVisible(false);
      
      Alert.alert(
        '✅ Xóa thành công',
        `Job "${job.title}" đã được xóa khỏi hệ thống và tìm kiếm.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      console.error('Delete job error:', error);
      Alert.alert(
        '❌ Lỗi xóa job',
        error?.message || 'Không thể xóa job. Vui lòng thử lại.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) return <LoadingSpinner text="Đang tải..." />;

  // Helper để format array thành string
  const formatArray = (arr?: string[]): string => {
    if (!arr || arr.length === 0) return '';
    return arr.join('\n• ');
  };

  // Helper để format salary
  const formatSalary = (): string => {
    if (job.salary_text) return job.salary_text;
    if (job.salary_min && job.salary_max) {
      return `${(job.salary_min / 1_000_000).toFixed(0)}-${(job.salary_max / 1_000_000).toFixed(0)} triệu`;
    }
    // Use utility function for safe formatting
    if (job.salary) return formatSalaryUtil(job.salary) || '';
    return '';
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Source Info */}
        {job.source && (
          <View style={styles.sourceCard}>
            <Text style={styles.sourceLabel}>Nguồn: {job.source.toUpperCase()}</Text>
            {job.external_url && (
              <Text style={styles.sourceUrl} numberOfLines={1}>{job.external_url}</Text>
            )}
            {job.status && (
              <Text style={styles.statusText}>Trạng thái: {job.status}</Text>
            )}
          </View>
        )}

        <FormInput
          label="Tiêu đề"
          required
          value={job.title}
          onChangeText={(text) => setJob({ ...job, title: text })}
          placeholder="Nhập tiêu đề"
        />

        {job.company_name && (
          <FormInput
            label="Công ty"
            value={job.company_name}
            onChangeText={(text) => setJob({ ...job, company_name: text })}
            placeholder="Nhập tên công ty"
          />
        )}

        <FormInput
          label="Mô tả công việc"
          value={job.job_Description || job.description}
          onChangeText={(text) => setJob({ ...job, description: text, job_Description: text })}
          placeholder="Nhập mô tả"
          multiline
          numberOfLines={6}
          style={styles.textArea}
        />

        {job.requirements && job.requirements.length > 0 && (
          <FormInput
            label="Yêu cầu"
            value={formatArray(job.requirements)}
            onChangeText={(text) => setJob({ ...job, requirements: text.split('\n•').map(s => s.trim()).filter(Boolean) })}
            placeholder="Nhập yêu cầu (mỗi dòng 1 yêu cầu)"
            multiline
            numberOfLines={4}
            style={styles.textArea}
          />
        )}

        {job.benefits && job.benefits.length > 0 && (
          <FormInput
            label="Quyền lợi"
            value={formatArray(job.benefits)}
            onChangeText={(text) => setJob({ ...job, benefits: text.split('\n•').map(s => s.trim()).filter(Boolean) })}
            placeholder="Nhập quyền lợi (mỗi dòng 1 quyền lợi)"
            multiline
            numberOfLines={4}
            style={styles.textArea}
          />
        )}

        <FormInput
          label="Lương"
          value={formatSalary()}
          onChangeText={(text) => setJob({ ...job, salary: text, salary_text: text })}
          placeholder="VD: 10-15 triệu"
        />

        <FormInput
          label="Địa điểm"
          value={job.location}
          onChangeText={(text) => setJob({ ...job, location: text })}
          placeholder="Nhập địa điểm"
        />

        {job.job_type_id && (
          <FormInput
            label="Loại công việc"
            value={job.job_type_id}
            onChangeText={(text) => setJob({ ...job, job_type_id: text })}
            placeholder="full-time, part-time, intern..."
          />
        )}

        {job.category && (
          <FormInput
            label="Danh mục"
            value={job.category}
            onChangeText={(text) => setJob({ ...job, category: text })}
            placeholder="IT, Marketing, Sales..."
          />
        )}

        <FormInput
          label="Kỹ năng yêu cầu"
          value={job.skills_required || formatArray(job.skills)}
          onChangeText={(text) => setJob({ 
            ...job, 
            skills_required: text,
            skills: text.split('\n').map(s => s.trim()).filter(Boolean)
          })}
          placeholder="Nhập kỹ năng"
          multiline
          numberOfLines={3}
          style={styles.textArea}
        />

        <FormInput
          label="Trách nhiệm"
          value={job.responsibilities}
          onChangeText={(text) => setJob({ ...job, responsibilities: text })}
          placeholder="Nhập trách nhiệm"
          multiline
          numberOfLines={3}
          style={styles.textArea}
        />

        {job.contact_email && (
          <FormInput
            label="Email liên hệ"
            value={job.contact_email}
            onChangeText={(text) => setJob({ ...job, contact_email: text })}
            placeholder="contact@example.com"
            keyboardType="email-address"
          />
        )}

        {job.contact_phone && (
          <FormInput
            label="Số điện thoại liên hệ"
            value={job.contact_phone}
            onChangeText={(text) => setJob({ ...job, contact_phone: text })}
            placeholder="0123456789"
            keyboardType="phone-pad"
          />
        )}

        <Button
          title="Lưu thay đổi"
          icon="checkmark"
          variant="success"
          onPress={handleSave}
          loading={saving}
          fullWidth
        />

        {/* ✅ DELETE BUTTON */}
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => setDeleteModalVisible(true)}
        >
          <Ionicons name="trash" size={20} color="#ef4444" />
          <Text style={styles.deleteButtonText}>Xóa job này</Text>
        </TouchableOpacity>
      </View>

      {/* ✅ DELETE CONFIRMATION MODAL */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !isDeleting && setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalIconContainer}>
                <Ionicons name="trash" size={32} color="#ef4444" />
              </View>
              <Text style={styles.modalTitle}>Xóa Job</Text>
              <Text style={styles.modalSubtitle}>Hành động này không thể hoàn tác</Text>
            </View>

            {/* Job Info */}
            <View style={styles.jobInfoCard}>
              <Text style={styles.jobInfoTitle} numberOfLines={2}>
                {job.title || 'Không có tiêu đề'}
              </Text>
              {job.location && (
                <View style={styles.jobInfoRow}>
                  <Ionicons name="location-outline" size={16} color="#64748b" />
                  <Text style={styles.jobInfoValue}>{job.location}</Text>
                </View>
              )}
              {job.source && (
                <View style={styles.jobInfoRow}>
                  <Ionicons name="globe-outline" size={16} color="#8b5cf6" />
                  <Text style={[styles.jobInfoValue, { color: '#8b5cf6' }]}>
                    Nguồn: {job.source.toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            {/* Warning */}
            <View style={styles.warningBox}>
              <Ionicons name="warning" size={20} color="#f59e0b" />
              <Text style={styles.warningText}>
                Job sẽ bị xóa vĩnh viễn khỏi Firebase và Algolia Search. Tất cả dữ liệu liên quan sẽ bị mất.
              </Text>
            </View>

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => setDeleteModalVisible(false)}
                disabled={isDeleting}
              >
                <Text style={styles.cancelModalButtonText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmDeleteButton, isDeleting && styles.buttonDisabled]}
                onPress={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="trash" size={18} color="#fff" />
                    <Text style={styles.confirmDeleteButtonText}>Xóa vĩnh viễn</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default JobDetailScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16, paddingBottom: 40 },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  sourceCard: {
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  sourceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 4,
  },
  sourceUrl: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  
  // ✅ Delete Button
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    paddingVertical: 14,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ef4444',
  },

  // ✅ Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  modalHeader: {
    alignItems: 'center',
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  
  // Job Info Card
  jobInfoCard: {
    backgroundColor: '#f8fafc',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  jobInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  jobInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  jobInfoValue: {
    fontSize: 13,
    color: '#64748b',
    flex: 1,
  },

  // Warning Box
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#fffbeb',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    gap: 10,
    alignItems: 'flex-start',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
    lineHeight: 18,
  },

  // Modal Actions
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  cancelModalButton: {
    backgroundColor: '#f1f5f9',
  },
  cancelModalButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  confirmDeleteButton: {
    backgroundColor: '#ef4444',
  },
  confirmDeleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});