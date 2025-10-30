import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import React from 'react';

interface ApplicationProps {
  app: any;
  onStatusChange: (status: string) => void;
  onViewCV?: () => void; // ✅ callback mở CV
}

const Application: React.FC<ApplicationProps> = ({ app, onStatusChange, onViewCV }) => {
  const { user, job, status, cv_url } = app;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#F5A623';
      case 'accepted':
        return '#4CAF50';
      case 'rejected':
        return '#F44336';
      default:
        return '#999';
    }
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Image
          source={{
            uri:
              user?.photoURL ||
              user?.id_image ||
              'https://randomuser.me/api/portraits/men/1.jpg',
          }}
          style={styles.avatar}
        />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.name}>{user?.name || 'Ứng viên ẩn danh'}</Text>
          <Text style={styles.jobTitle}>Ứng tuyển: {job?.title || 'Không rõ công việc'}</Text>
        </View>
      </View>

      {/* Trạng thái */}
      <Text style={[styles.status, { color: getStatusColor(status) }]}>
        Trạng thái: {status || 'pending'}
      </Text>

      {/* Nút hành động */}
      <View style={styles.actions}>
        {status === 'pending' && (
          <>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#4CAF50' }]}
              onPress={() => onStatusChange('accepted')}
            >
              <Text style={styles.buttonText}>Chấp nhận</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#F44336' }]}
              onPress={() => onStatusChange('rejected')}
            >
              <Text style={styles.buttonText}>Từ chối</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ✅ Nút xem CV */}
        {cv_url && (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#2196F3' }]}
            onPress={onViewCV}
          >
            <Text style={styles.buttonText}>Xem CV</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default Application;

const styles = StyleSheet.create({
  card: {
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eee',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  jobTitle: {
    fontSize: 14,
    color: '#555',
  },
  status: {
    marginTop: 10,
    fontWeight: '600',
  },
  actions: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  button: {
    flexGrow: 1,
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    minWidth: 100,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
