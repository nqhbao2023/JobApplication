import React, { useEffect, useState } from 'react';
import { 
  View, Text, FlatList, TouchableOpacity, Image, 
  StyleSheet, RefreshControl, Alert, ActivityIndicator 
} from 'react-native';
import { useRouter } from 'expo-router';
import { auth, db } from '@/config/firebase';
import { collection, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

export default function MyJobs() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  // Lấy job của user hiện tại
  const fetchJobs = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) return;
      const q = query(collection(db, 'jobs'), where('users', '==', user.uid));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setJobs(data);
    } catch (error) {
      console.error(error);
      Alert.alert('Lỗi', 'Không thể tải danh sách công việc');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  // Xóa job
  const handleDelete = async (id: string) => {
    Alert.alert(
      'Xác nhận xóa',
      'Bạn có chắc muốn xóa công việc này không?',
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Xóa', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'jobs', id));
              setJobs(prev => prev.filter(job => job.id !== id));
              Alert.alert('✅ Đã xóa công việc');
            } catch (err) {
              Alert.alert('Lỗi', 'Không thể xóa công việc');
            }
          } 
        }
      ]
    );
  };

  // Làm mới danh sách
  const onRefresh = () => {
    setRefreshing(true);
    fetchJobs();
  };

  const renderJob = ({ item }: any) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => router.push({ pathname: '/(events)/jobDescription', params: { id: item.id } })}
      activeOpacity={0.8}
    >
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.image} />
      ) : (
        <View style={[styles.image, { backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' }]}>
          <Ionicons name="briefcase-outline" size={30} color="#999" />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.salary}>{item.salary?.toLocaleString('vi-VN')} đ/tháng</Text>
        <Text style={styles.category}>{item.jobCategories || '—'}</Text>
        <Text style={styles.date}>Đăng ngày: {new Date(item.created_at).toLocaleDateString('vi-VN')}</Text>
      </View>
      <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
        <Ionicons name="trash-outline" size={22} color="#ff4444" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Công việc của tôi</Text>
        <TouchableOpacity onPress={() => router.push('/(events)/addJob')}>
          <Ionicons name="add-circle-outline" size={28} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      ) : jobs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="file-tray-outline" size={48} color="#aaa" />
          <Text style={styles.emptyText}>Chưa có công việc nào được đăng</Text>
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          renderItem={renderJob}
          contentContainerStyle={{ padding: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderColor: '#eee',
    backgroundColor: '#fff',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#333' },

  card: {
    flexDirection: 'row', backgroundColor: '#fafafa', borderRadius: 10,
    padding: 10, marginBottom: 12, elevation: 2, alignItems: 'center',
  },
  image: { width: 70, height: 70, borderRadius: 8, marginRight: 12 },
  title: { fontSize: 16, fontWeight: '600', color: '#222' },
  salary: { fontSize: 14, color: '#4CAF50', marginVertical: 2 },
  category: { fontSize: 13, color: '#555' },
  date: { fontSize: 12, color: '#999', marginTop: 4 },
  deleteBtn: { padding: 6 },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { marginTop: 8, color: '#777', fontSize: 15 },
});
