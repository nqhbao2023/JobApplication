import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Button } from '@/components/base/Button';
import { LoadingSpinner } from '@/components/base/LoadingSpinner';
import { FormInput } from '@/components/admin/FormInput';

type Job = {
  title?: string;
  job_Description?: string;
  salary?: string;
  location?: string;
  skills_required?: string;
  responsibilities?: string;
};

const JobDetailScreen = () => {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const [job, setJob] = useState<Job>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
        salary: job.salary?.trim() || '',
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

  if (loading) return <LoadingSpinner text="Đang tải..." />;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <FormInput
          label="Tiêu đề"
          required
          value={job.title}
          onChangeText={(text) => setJob({ ...job, title: text })}
          placeholder="Nhập tiêu đề"
        />

        <FormInput
          label="Mô tả công việc"
          value={job.job_Description}
          onChangeText={(text) => setJob({ ...job, job_Description: text })}
          placeholder="Nhập mô tả"
          multiline
          numberOfLines={4}
          style={styles.textArea}
        />

        <FormInput
          label="Lương"
          value={job.salary}
          onChangeText={(text) => setJob({ ...job, salary: text })}
          placeholder="VD: 10-15 triệu"
        />

        <FormInput
          label="Địa điểm"
          value={job.location}
          onChangeText={(text) => setJob({ ...job, location: text })}
          placeholder="Nhập địa điểm"
        />

        <FormInput
          label="Kỹ năng yêu cầu"
          value={job.skills_required}
          onChangeText={(text) => setJob({ ...job, skills_required: text })}
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

        <Button
          title="Lưu thay đổi"
          icon="checkmark"
          variant="success"
          onPress={handleSave}
          loading={saving}
          fullWidth
        />
      </View>
    </ScrollView>
  );
};

export default JobDetailScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16, paddingBottom: 40 },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
});