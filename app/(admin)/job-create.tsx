import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import { Button } from '@/components/base/Button';
import { FormInput } from '@/components/admin/FormInput';

type Job = {
  title: string;
  job_Description: string;
  salary: string;
  location: string;
  skills_required: string;
  responsibilities: string;
};

const JobCreateScreen = () => {
  const [job, setJob] = useState<Job>({
    title: '',
    job_Description: '',
    salary: '',
    location: '',
    skills_required: '',
    responsibilities: '',
  });
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!job.title?.trim()) {
      Alert.alert('Lỗi', 'Tiêu đề không được để trống');
      return;
    }

    try {
      setSaving(true);

      const jobData = {
        title: job.title.trim(),
        job_Description: job.job_Description.trim() || '',
        salary: job.salary.trim() || '',
        location: job.location.trim() || '',
        skills_required: job.skills_required.trim() || '',
        responsibilities: job.responsibilities.trim() || '',
        created_at: new Date().toISOString(),
        ownerId: auth.currentUser?.uid || '',
        status: 'active',
      };

      await addDoc(collection(db, 'jobs'), jobData);

      Alert.alert('Thành công', 'Đã tạo job mới', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Error creating job:', error);
      Alert.alert('Lỗi', 'Không thể tạo job');
    } finally {
      setSaving(false);
    }
  };

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
          title="Tạo Job"
          icon="add"
          variant="success"
          onPress={handleCreate}
          loading={saving}
          fullWidth
        />
      </View>
    </ScrollView>
  );
};

export default JobCreateScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16, paddingBottom: 40 },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
});