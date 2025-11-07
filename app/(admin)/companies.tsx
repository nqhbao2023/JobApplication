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
import { Image } from "expo-image";
import { db } from "@/config/firebase";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";

type Company = {
  $id: string;
  corp_name?: string;
  nation?: string;
  image?: string;
  color?: string;
};

const CompaniesScreen = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const snap = await getDocs(collection(db, "companies"));
      const data = snap.docs.map(d => ({ $id: d.id, ...d.data() })) as Company[];
      setCompanies(data);
    } catch (error) {
      console.error("Error loading companies:", error);
      Alert.alert("Lỗi", "Không thể tải danh sách companies");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert("Xác nhận", "Bạn có chắc muốn xóa company này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "companies", id));
            setCompanies(prev => prev.filter(c => c.$id !== id));
            Alert.alert("Thành công", "Đã xóa company");
          } catch (error) {
            Alert.alert("Lỗi", "Không thể xóa company");
          }
        },
      },
    ]);
  };

  const renderCompany = ({ item }: { item: Company }) => (
    <View style={styles.companyCard}>
      <Image
        style={styles.companyImage}
        source={{ uri: item.image || "https://via.placeholder.com/60" }}
        contentFit="cover"
      />
      <View style={styles.companyInfo}>
        <Text style={styles.companyName}>{item.corp_name || "N/A"}</Text>
        <Text style={styles.companyNation}>🌍 {item.nation || "Việt Nam"}</Text>
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
        data={companies}
        renderItem={renderCompany}
        keyExtractor={item => item.$id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Không có companies</Text>
        }
      />
    </View>
  );
};

export default CompaniesScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 16 },
  companyCard: {
    flexDirection: "row",
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
  companyImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    marginRight: 16,
  },
  companyInfo: { flex: 1 },
  companyName: { fontSize: 16, fontWeight: "700", color: "#1a1a1a", marginBottom: 4 },
  companyNation: { fontSize: 14, color: "#64748b" },
  emptyText: { textAlign: "center", marginTop: 40, fontSize: 15, color: "#64748b" },
});

