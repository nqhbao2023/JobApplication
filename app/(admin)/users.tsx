import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { db } from "@/config/firebase";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";

type User = {
  $id: string;
  name?: string;
  email?: string;
  role?: string;
  isAdmin?: boolean;
};

const UsersScreen = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const snap = await getDocs(collection(db, "users"));
      const data = snap.docs.map(d => ({ $id: d.id, ...d.data() })) as User[];
      setUsers(data);
    } catch (error) {
      console.error("Error loading users:", error);
      Alert.alert("Lỗi", "Không thể tải danh sách users");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert("Xác nhận", "Bạn có chắc muốn xóa user này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "users", id));
            setUsers(prev => prev.filter(u => u.$id !== id));
            Alert.alert("Thành công", "Đã xóa user");
          } catch (error) {
            Alert.alert("Lỗi", "Không thể xóa user");
          }
        },
      },
    ]);
  };

  const renderUser = ({ item }: { item: User }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name || "N/A"}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
        <View style={styles.badges}>
          <View style={[styles.badge, { backgroundColor: getRoleBadgeColor(item.role) }]}>
            <Text style={styles.badgeText}>{item.role || "candidate"}</Text>
          </View>
          {item.isAdmin && (
            <View style={[styles.badge, { backgroundColor: "#ef4444" }]}>
              <Text style={styles.badgeText}>Admin</Text>
            </View>
          )}
        </View>
      </View>
      <TouchableOpacity onPress={() => handleDelete(item.$id)}>
        <Ionicons name="trash-outline" size={24} color="#ef4444" />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={users}
        renderItem={renderUser}
        keyExtractor={item => item.$id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Không có users</Text>
        }
      />
    </View>
  );
};

const getRoleBadgeColor = (role?: string) => {
  switch (role) {
    case "admin": return "#ef4444";
    case "employer": return "#f59e0b";
    case "candidate": return "#3b82f6";
    default: return "#64748b";
  }
};

export default UsersScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 16 },
  userCard: {
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
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: "700", color: "#1a1a1a", marginBottom: 4 },
  userEmail: { fontSize: 14, color: "#64748b", marginBottom: 8 },
  badges: { flexDirection: "row", gap: 8 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: { fontSize: 12, fontWeight: "600", color: "#fff" },
  emptyText: { textAlign: "center", marginTop: 40, fontSize: 15, color: "#64748b" },
});