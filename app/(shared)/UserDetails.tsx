// app/(shared)/UserDetails.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { db } from '@/config/firebase';
import { doc, getDoc } from 'firebase/firestore';

const UserDetails = () => {
  const { userId, cv_url } = useLocalSearchParams<{ userId: string; cv_url: string }>();
  const [userDetails, setUserDetails] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        // 🔥 Lấy document trong collection "users"
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          setUserDetails(userSnap.data());
        } else {
          setUserDetails(null);
        }
      } catch (err) {
        console.error("Lỗi khi lấy thông tin user:", err);
        setUserDetails(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, [userId]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết ứng viên</Text>
      </View>

      {userDetails ? (
        <View style={styles.details}>
          <Text style={styles.label}>Tên: {userDetails.name || 'Không có'}</Text>
          <Text style={styles.label}>Email: {userDetails.email || 'Không có'}</Text>
          {/* Thêm field khác nếu cần */}
        </View>
      ) : (
        <Text style={styles.label}>Không tìm thấy thông tin user</Text>
      )}

      {cv_url ? (
        <TouchableOpacity
          style={styles.cvButton}
          onPress={() => Linking.openURL(cv_url)}
        >
          <Text style={styles.cvButtonText}>Xem CV</Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.label}>Không có CV</Text>
      )}
    </View>
  );
};

export default UserDetails;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f2f2f2' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 20, fontWeight: '700', marginLeft: 10 },
  details: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: { fontSize: 16, marginBottom: 8, color: '#333' },
  cvButton: {
    backgroundColor: '#28A745',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cvButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
