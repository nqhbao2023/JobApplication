import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { auth, db } from '@/config/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function Applications() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  // 🧠 Lấy danh sách job mà user đã apply
  const fetchApplications = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) return;

      // ✅ Query từ collection "applied_jobs" (ví dụ)
      const q = query(collection(db, 'applied_jobs'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);

      // ✅ Lấy thông tin job kèm theo
      const appsData = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          const jobRef = doc(db, 'jobs', data.jobId);
          const jobSnap = await getDoc(jobRef);
          const jobData = jobSnap.exists() ? jobSnap.data() : {};
          return { id: docSnap.id, ...data, job: jobData };
        })
      );

      setApplications(appsData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchApplications();
  };

  const renderItem = ({ item }: any) => {
    const job = item.job || {};
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => router.push({ pathname: '/(shared)/jobDescription', params: { jobId: item.jobId } })}
      >
        {job.image ? (
          <Image source={{ uri: job.image }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Ionicons name="briefcase-outline" size={26} color="#999" />
          </View>
        )}

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{job.title || 'Không rõ công việc'}</Text>
          <Text style={styles.company}>{job.companyName || '—'}</Text>
          <Text style={styles.status}>
            Trạng thái: {item.status || 'Đang chờ phản hồi'}
          </Text>
          <Text style={styles.date}>
            Ngày nộp: {new Date(item.appliedAt?.seconds * 1000 || Date.now()).toLocaleDateString('vi-VN')}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (applications.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="file-tray-outline" size={50} color="#aaa" />
        <Text style={styles.emptyText}>Bạn chưa ứng tuyển công việc nào</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={applications}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 12 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fafafa',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    elevation: 2,
    alignItems: 'center',
  },
  image: { width: 60, height: 60, borderRadius: 8, marginRight: 12 },
  imagePlaceholder: { backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 15, fontWeight: '600', color: '#222' },
  company: { fontSize: 13, color: '#555', marginVertical: 2 },
  status: { fontSize: 13, color: '#4CAF50' },
  date: { fontSize: 12, color: '#999', marginTop: 4 },
  emptyText: { color: '#777', marginTop: 10, fontSize: 15 },
});
