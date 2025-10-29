import { View, Text, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import React, { useEffect, useState } from 'react';
import { db, auth } from '@/config/firebase';
import { collection, getDocs, query, where, doc, getDoc, updateDoc, addDoc } from 'firebase/firestore';
import Application from '@/components/Application';
import { router } from 'expo-router';

const AppliedList = () => {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          setUserId(user.uid);
        }
      } catch (err) {
        console.error('Lỗi khi lấy user:', err);
      }
    };

    getCurrentUser();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!userId || userId.trim() === '') {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const q = query(collection(db, 'applied_jobs'), where('employerId', '==', userId));
        const querySnapshot = await getDocs(q);
        const apps = querySnapshot.docs.map(doc => ({ $id: doc.id, ...doc.data() }));
        setApplications(apps);
      } catch (error) {
        console.error('Lỗi khi lấy danh sách ứng tuyển:', error);
      }
      setLoading(false);
    };

    fetchData();
  }, [userId]);

  const handleStatusChange = async (appId: string, status: string) => {
    try {
      // Cập nhật trạng thái đơn ứng tuyển
      const appRef = doc(db, 'applied_jobs', appId);
      await updateDoc(appRef, { status });

      // Lấy thông tin ứng tuyển để gửi thông báo
      const appSnap = await getDoc(appRef);
      const app = appSnap.data();
      if (!app) return;

      // Lấy thông tin công việc để lấy tiêu đề công việc
      const jobSnap = await getDoc(doc(db, 'jobs', app.jobId));
      const job = jobSnap.data();

      // Gửi thông báo cho người xin việc
      const message =
        status === 'accepted'
          ? `Đơn ứng tuyển của bạn cho công việc ${job?.title || ''} đã được chấp nhận`
          : `Đơn ứng tuyển của bạn cho công việc ${job?.title || ''} đã bị từ chối`;
      const type = status === 'accepted' ? 'accepted' : 'rejected';

      await addDoc(collection(db, 'notifications'), {
        userId: app.userId,
        message,
        type,
        jobId: app.jobId,
        read: false,
        created_at: new Date().toISOString(),
      });

      // Cập nhật danh sách ứng tuyển trên giao diện
      const updated = applications.map((a) =>
        a.$id === appId ? { ...a, status } : a
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