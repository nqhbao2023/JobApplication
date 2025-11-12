import React, { useState } from 'react';
import { View, FlatList, StyleSheet, Alert, Modal, TextInput, Text } from 'react-native';
import { addDoc, collection, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Button } from '@/components/base/Button';
import { EmptyState } from '@/components/base/EmptyState';
import { LoadingSpinner } from '@/components/base/LoadingSpinner';
import { CategoryTypeCard } from '@/components/admin/CategoryTypeCard';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';

type JobType = {
  $id: string;
  type_name: string;
  icon?: string;
  color?: string;
  isSystem?: boolean; // Thêm flag để đánh dấu system type
};

const JobTypesScreen = () => {
  const { data: items, loading, reload } = useFirestoreCollection<JobType>('job_types');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ type_name: '', icon: 'briefcase', color: '#3b82f6' });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!formData.type_name.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên');
      return;
    }

    try {
      setSaving(true);
      if (editingId) {
        await updateDoc(doc(db, 'job_types', editingId), formData);
        Alert.alert('Thành công', 'Đã cập nhật');
      } else {
        await addDoc(collection(db, 'job_types'), {
          ...formData,
          isSystem: false, // Custom types tạo bởi admin không phải system type
          created_at: new Date().toISOString(),
        });
        Alert.alert('Thành công', 'Đã thêm mới');
      }
      setModalVisible(false);
      setFormData({ type_name: '', icon: 'briefcase', color: '#3b82f6' });
      setEditingId(null);
      await reload();
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể lưu');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item: JobType) => {
    // Kiểm tra nếu là system type
    if (item.isSystem) {
      Alert.alert(
        'Không thể xóa',
        'Đây là loại công việc hệ thống và không thể xóa. Các loại này được sử dụng bởi hệ thống và backend validator.',
        [{ text: 'Đã hiểu', style: 'cancel' }]
      );
      return;
    }

    Alert.alert('Xác nhận', `Bạn có chắc muốn xóa "${item.type_name}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'job_types', item.$id));
            await reload();
            Alert.alert('Thành công', 'Đã xóa');
          } catch (error) {
            Alert.alert('Lỗi', 'Không thể xóa');
          }
        },
      },
    ]);
  };

  const openEditModal = (item: JobType) => {
    // Không cho phép edit system types
    if (item.isSystem) {
      Alert.alert(
        'Không thể chỉnh sửa',
        'Đây là loại công việc hệ thống và không thể chỉnh sửa. Các loại này được chuẩn hóa cho backend validator và search engine.',
        [{ text: 'Đã hiểu', style: 'cancel' }]
      );
      return;
    }

    setEditingId(item.$id);
    setFormData({
      type_name: item.type_name,
      icon: item.icon || 'briefcase',
      color: item.color || '#3b82f6',
    });
    setModalVisible(true);
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ type_name: '', icon: 'briefcase', color: '#3b82f6' });
    setModalVisible(true);
  };

  if (loading) return <LoadingSpinner text="Đang tải job types..." />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Button
          title="Thêm Job Type"
          icon="add"
          variant="primary"
          onPress={openAddModal}
          fullWidth
        />
      </View>

      <FlatList
        data={items}
        renderItem={({ item }) => (
          <CategoryTypeCard
            item={item}
            onEdit={() => openEditModal(item)}
            onDelete={() => handleDelete(item)}
          />
        )}
        keyExtractor={(item) => item.$id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState icon="layers-outline" message="Chưa có dữ liệu" />}
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingId ? 'Chỉnh sửa' : 'Thêm mới'}</Text>

            <TextInput
              style={styles.input}
              placeholder="Tên Job Type"
              value={formData.type_name}
              onChangeText={(text) => setFormData({ ...formData, type_name: text })}
              placeholderTextColor="#94a3b8"
            />

            <View style={styles.modalActions}>
              <Button
                title="Hủy"
                variant="ghost"
                onPress={() => setModalVisible(false)}
                disabled={saving}
              />
              <Button
                title="Lưu"
                variant="primary"
                onPress={handleSave}
                loading={saving}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default JobTypesScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  header: { padding: 16, paddingBottom: 0 },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 20,
    color: '#1a1a1a',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
});