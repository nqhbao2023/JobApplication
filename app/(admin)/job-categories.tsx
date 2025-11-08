import React, { useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Button } from '@/components/base/Button';
import { EmptyState } from '@/components/base/EmptyState';
import { LoadingSpinner } from '@/components/base/LoadingSpinner';
import { CategoryTypeCard } from '@/components/admin/CategoryTypeCard';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';

const ICONS = [
  'code-slash',
  'color-palette',
  'megaphone',
  'trending-up',
  'cash',
  'people',
  'settings',
  'headset',
  'briefcase',
  'rocket',
  'bulb',
  'heart',
  'star',
  'home',
  'globe',
];

const COLORS = [
  '#3b82f6',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#8b5cf6',
  '#06b6d4',
  '#64748b',
  '#f43f5e',
  '#ef4444',
  '#14b8a6',
];

type JobCategory = {
  $id: string;
  category_name: string;
  icon_name: string;
  color: string;
};

const JobCategoriesScreen = () => {
  const { data: items, loading, reload } = useFirestoreCollection<JobCategory>('job_categories');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    category_name: '',
    icon_name: 'code-slash',
    color: '#3b82f6',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!formData.category_name.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên danh mục');
      return;
    }

    try {
      setSaving(true);
      if (editingId) {
        await updateDoc(doc(db, 'job_categories', editingId), formData);
        Alert.alert('Thành công', 'Đã cập nhật');
      } else {
        await addDoc(collection(db, 'job_categories'), {
          ...formData,
          created_at: new Date().toISOString(),
        });
        Alert.alert('Thành công', 'Đã thêm mới');
      }
      setModalVisible(false);
      setFormData({ category_name: '', icon_name: 'code-slash', color: '#3b82f6' });
      setEditingId(null);
      await reload();
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể lưu');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item: JobCategory) => {
    Alert.alert('Xác nhận', `Bạn có chắc muốn xóa "${item.category_name}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'job_categories', item.$id));
            await reload();
            Alert.alert('Thành công', 'Đã xóa');
          } catch (error) {
            Alert.alert('Lỗi', 'Không thể xóa');
          }
        },
      },
    ]);
  };

  const openEditModal = (item: JobCategory) => {
    setEditingId(item.$id);
    setFormData({
      category_name: item.category_name,
      icon_name: item.icon_name,
      color: item.color,
    });
    setModalVisible(true);
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ category_name: '', icon_name: 'code-slash', color: '#3b82f6' });
    setModalVisible(true);
  };

  if (loading) return <LoadingSpinner text="Đang tải categories..." />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Button
          title="Thêm Category"
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
        ListEmptyComponent={<EmptyState icon="apps-outline" message="Chưa có dữ liệu" />}
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{editingId ? 'Chỉnh sửa' : 'Thêm mới'}</Text>

              <TextInput
                style={styles.input}
                placeholder="Tên danh mục"
                value={formData.category_name}
                onChangeText={(text) => setFormData({ ...formData, category_name: text })}
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.sectionLabel}>Chọn Icon</Text>
              <View style={styles.iconGrid}>
                {ICONS.map((icon) => (
                  <TouchableOpacity
                    key={icon}
                    style={[
                      styles.iconOption,
                      formData.icon_name === icon && styles.iconOptionSelected,
                    ]}
                    onPress={() => setFormData({ ...formData, icon_name: icon })}
                  >
                    <Ionicons name={icon as any} size={24} color="#1a1a1a" />
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sectionLabel}>Chọn Màu</Text>
              <View style={styles.colorGrid}>
                {COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      formData.color === color && styles.colorOptionSelected,
                    ]}
                    onPress={() => setFormData({ ...formData, color })}
                  />
                ))}
              </View>

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
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default JobCategoriesScreen;

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
    maxHeight: '80%',
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
    marginBottom: 16,
    color: '#1a1a1a',
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOptionSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#1a1a1a',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
});