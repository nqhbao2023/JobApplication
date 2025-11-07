import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { db } from "@/config/firebase";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";

type JobType = {
  $id: string;
  type_name: string;
  icon?: string;
  color?: string;
};

const JobTypesScreen = () => {
  const [items, setItems] = useState<JobType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ type_name: "", icon: "briefcase", color: "#3b82f6" });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const snap = await getDocs(collection(db, "job_types"));
      const data = snap.docs.map(d => ({ $id: d.id, ...d.data() })) as JobType[];
      setItems(data);
    } catch (error) {
      console.error("Error loading:", error);
      Alert.alert("Lỗi", "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.type_name.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên");
      return;
    }

    try {
      setLoading(true);
      if (editingId) {
        await updateDoc(doc(db, "job_types", editingId), formData);
        Alert.alert("Thành công", "Đã cập nhật");
      } else {
        await addDoc(collection(db, "job_types"), {
          ...formData,
          created_at: new Date().toISOString(),
        });
        Alert.alert("Thành công", "Đã thêm mới");
      }
      setModalVisible(false);
      setFormData({ type_name: "", icon: "briefcase", color: "#3b82f6" });
      setEditingId(null);
      loadData();
    } catch (error) {
      Alert.alert("Lỗi", "Không thể lưu");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert("Xác nhận", "Bạn có chắc muốn xóa?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "job_types", id));
            Alert.alert("Thành công", "Đã xóa");
            loadData();
          } catch (error) {
            Alert.alert("Lỗi", "Không thể xóa");
          }
        },
      },
    ]);
  };

  const openEditModal = (item: JobType) => {
    setEditingId(item.$id);
    setFormData({
      type_name: item.type_name,
      icon: item.icon || "briefcase",
      color: item.color || "#3b82f6",
    });
    setModalVisible(true);
  };

  const renderItem = ({ item }: { item: JobType }) => (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <View style={[styles.iconBadge, { backgroundColor: item.color || "#3b82f6" }]}>
          <Ionicons name={(item.icon as any) || "briefcase"} size={20} color="#fff" />
        </View>
        <Text style={styles.cardTitle}>{item.type_name}</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => openEditModal(item)}>
          <Ionicons name="pencil" size={22} color="#3b82f6" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item.$id)}>
          <Ionicons name="trash-outline" size={22} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading && items.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => {
          setEditingId(null);
          setFormData({ type_name: "", icon: "briefcase", color: "#3b82f6" });
          setModalVisible(true);
        }}
      >
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Thêm Job Type</Text>
      </TouchableOpacity>

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={item => item.$id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>Chưa có dữ liệu</Text>}
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingId ? "Chỉnh sửa" : "Thêm mới"}</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Tên Job Type"
              value={formData.type_name}
              onChangeText={text => setFormData({ ...formData, type_name: text })}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#64748b" }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#3b82f6" }]}
                onPress={handleSave}
              >
                <Text style={styles.modalButtonText}>Lưu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default JobTypesScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#3b82f6",
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  addButtonText: { fontSize: 16, fontWeight: "600", color: "#fff" },
  list: { padding: 16, paddingTop: 0 },
  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardContent: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 16, fontWeight: "600", color: "#1a1a1a" },
  actions: { flexDirection: "row", gap: 16 },
  emptyText: { textAlign: "center", marginTop: 40, fontSize: 15, color: "#64748b" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  modalActions: { flexDirection: "row", gap: 12 },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalButtonText: { fontSize: 16, fontWeight: "600", color: "#fff" },
});