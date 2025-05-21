import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import React, { useEffect, useState } from 'react';
import { getAppliedJobs, updateApplicationStatus, databases, databases_id, collection_job_id, sendNotification } from '@/lib/appwrite';
import Application from '@/components/Application';
import { account } from '@/lib/appwrite';
import { router } from 'expo-router';
import { TouchableOpacity } from 'react-native';

const AppliedList = () => {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const user = await account.get();
        console.log('Đăng nhập với user ID:', user.$id);
        setUserId(user.$id);
      } catch (err) {
        console.error('Lỗi khi lấy user:', err);
      }
    };

    getCurrentUser();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!userId || userId.trim() === '') {
        console.log('No valid userId available, skipping fetchData:', userId);
        setLoading(false);
        return;
      }

      setLoading(true);
      console.log('Fetching applied jobs for userId:', userId);
      const apps = await getAppliedJobs(userId);
      setApplications(apps);
      setLoading(false);
    };

    fetchData();
  }, [userId]);

  const handleStatusChange = async (appId: string, status: string) => {
    try {
      // Cập nhật trạng thái đơn ứng tuyển
      await updateApplicationStatus(appId, status);

      // Lấy thông tin ứng tuyển để gửi thông báo
      const app = applications.find((a) => a.$id === appId);
      if (!app) return;

      // Lấy thông tin công việc để lấy tiêu đề công việc
      const job = await databases.getDocument(
        databases_id,
        collection_job_id,
        app.jobId
      );

      // Gửi thông báo cho người xin việc
      const message =
        status === 'accepted'
          ? `Đơn ứng tuyển của bạn cho công việc ${job.title} đã được chấp nhận`
          : `Đơn ứng tuyển của bạn cho công việc ${job.title} đã bị từ chối`;
      const type = status === 'accepted' ? 'accepted' : 'rejected';

      await sendNotification(
        app.userId, // ID của người xin việc
        message,
        type,
        app.jobId
      );

      // Cập nhật danh sách ứng tuyển trên giao diện
      const updated = applications.map((app) =>
        app.$id === appId ? { ...app, status } : app
      );
      setApplications(updated);
    } catch (error) {
      console.error('Failed to update status or send notification:', error);
    }
  };

  const handleSelectApp = (app: any) => {
    router.push({
      pathname: '../UserDetails',
      params: {
        userId: app.userId,
        cv_url: app.cv_url || '',
      },
    });
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Danh sách ứng viên</Text>
      <FlatList
        data={applications}
        keyExtractor={(item) => item.$id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handleSelectApp(item)}>
            <Application
              app={item}
              onStatusChange={(status) => handleStatusChange(item.$id, status)}
            />
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

export default AppliedList;

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f2f2f2',
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
  },
});