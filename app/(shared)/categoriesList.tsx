import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/config/firebase";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");
const CARD_SIZE = width / 2 - 24;

export default function CategoriesListScreen() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const snapshot = await getDocs(collection(db, "job_categories"));
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCategories(data);
      } catch (e) {
        console.error("❌ Lỗi tải danh mục:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );

  if (categories.length === 0)
    return (
      <View style={styles.center}>
        <Text>Chưa có danh mục nào.</Text>
      </View>
    );

  return (
    <FlatList
      data={categories}
      numColumns={2}
      contentContainerStyle={styles.listContainer}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => {
        const bgColor = item.color || "#E8F0FE";
        const textColor = "#222";
        return (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: bgColor }]}
            onPress={() => router.push(`/categoryJobs?id=${item.id}&name=${item.category_name}`)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={item.icon_name || "briefcase"}
              size={40}
              color={textColor}
              style={styles.icon}
            />
            <Text style={[styles.name, { color: textColor }]}>
              {item.category_name}
            </Text>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  listContainer: {
    padding: 12,
  },
  card: {
    width: CARD_SIZE,
    height: CARD_SIZE * 0.75,
    borderRadius: 16,
    margin: 8,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    backgroundColor: "#E8F0FE",
  },
  icon: {
    marginBottom: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
