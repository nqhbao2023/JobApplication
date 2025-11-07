import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { db } from "@/config/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

type User = {
  name?: string;
  email?: string;
  role?: string;
  isAdmin?: boolean;
  phone?: string;
};

const UserDetailScreen = () => {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [user, setUser] = useState<User>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const snap = await getDoc(doc(db, "users", userId));
      if (snap.exists()) {
        setUser(snap.data() as User);
      }
    } catch (error) {
      console.error("Error loading user:", error);
      Alert.alert("Lỗi", "Không thể tải user");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user.name?.trim() || !user.email?.trim()) {
      Alert.alert("Lỗi", "Tên và email không được để trống");
      return;
    }

    try {
      setSaving(true);
      await updateDoc(doc(db, "users", userId), {
        name: user.name,
        phone: user.phone || "",
        role: user.role || "candidate",
        isAdmin: user.isAdmin || false,
      });
      Alert.alert("Thành công", "Đã cập nhật user", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error("Error saving:", error);
      Alert.alert("Lỗi", "Không thể lưu");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.label}>Tên *</Text>
        <TextInput
          style={styles.input}
          value={user.name}
          onChangeText={(text) => setUser({ ...user, name: text })}
          placeholder="Nhập tên"
        />

        <Text style={styles.label}>Email (không thể sửa)</Text>
        <TextInput
          style={[styles.input, styles.disabled]}
          value={user.email}
          editable={false}
        />

        <Text style={styles.label}>Số điện thoại</Text>
        <TextInput
          style={styles.input}
          value={user.phone}
          onChangeText={(text) => setUser({ ...user, phone: text })}
          placeholder="Nhập số điện thoại"
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Role</Text>
        <View style={styles.roleButtons}>
          {["candidate", "employer", "admin"].map((r) => (
            <TouchableOpacity
              key={r}
              style={[
                styles.roleBtn,
                user.role === r && styles.roleBtnActive,
              ]}
              onPress={() => setUser({ ...user, role: r })}
            >
              <Text
                style={[
                  styles.roleBtnText,
                  user.role === r && styles.roleBtnTextActive,
                ]}
              >
                {r}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.adminToggle}>
          <Text style={styles.label}>Admin</Text>
          <TouchableOpacity
            style={[
              styles.toggle,
              user.isAdmin && styles.toggleActive,
            ]}
            onPress={() => setUser({ ...user, isAdmin: !user.isAdmin })}
          >
            <View
              style={[
                styles.toggleThumb,
                user.isAdmin && styles.toggleThumbActive,
              ]}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>Lưu thay đổi</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default UserDetailScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 16 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  disabled: {
    backgroundColor: "#f1f5f9",
    color: "#64748b",
  },
  roleButtons: {
    flexDirection: "row",
    gap: 8,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e2e8f0",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  roleBtnActive: {
    borderColor: "#3b82f6",
    backgroundColor: "#eff6ff",
  },
  roleBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },
  roleBtnTextActive: {
    color: "#3b82f6",
  },
  adminToggle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },
  toggle: {
    width: 52,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#cbd5e1",
    justifyContent: "center",
    padding: 2,
  },
  toggleActive: {
    backgroundColor: "#3b82f6",
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  toggleThumbActive: {
    alignSelf: "flex-end",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#10b981",
    padding: 16,
    borderRadius: 12,
    marginTop: 32,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});