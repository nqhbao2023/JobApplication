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
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";

const { width } = Dimensions.get("window");
const CARD_SIZE = width / 2 - 24;

type Category = {
  id: string;
  category_name: string;
  icon_name?: string;
  color?: string;
};

export default function CategoriesListScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const snapshot = await getDocs(collection(db, "job_categories"));
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Category[];
        setCategories(data);
      } catch (e) {
        console.error("❌ Lỗi tải danh mục:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  const getContrastColor = (hexColor?: string) => {
    if (!hexColor || !hexColor.startsWith("#") || hexColor.length < 7)
      return "#1e293b";
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.5 ? "#000" : "#fff";
  };

  const renderItem = ({ item }: { item: Category }) => {
    const bgColor = item.color || "#E8F0FE";
    const textColor = getContrastColor(item.color);
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: bgColor }]}
        onPress={() =>
          router.push({
            pathname: "/(shared)/categoryJobs",
            params: { id: item.id, name: item.category_name },
          })
        }
        activeOpacity={0.85}
      >
        <Ionicons
          name={(item.icon_name as any) || "briefcase-outline"}
          size={40}
          color={textColor}
          style={styles.icon}
        />
        <Text
          style={[styles.name, { color: textColor }]}
          numberOfLines={1}
        >
          {item.category_name}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Danh mục công việc</Text>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4A80F0" />
          <Text style={{ color: "#64748b", marginTop: 6 }}>
            Đang tải danh mục...
          </Text>
        </View>
      ) : categories.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={36} color="#94a3b8" />
          <Text style={styles.emptyText}>Chưa có danh mục nào.</Text>
        </View>
      ) : (
        <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1 }}>
          <FlatList
            data={categories}
            numColumns={2}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9F9FB",
  },
  header: {
    backgroundColor: "#4A80F0",
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    elevation: 2,
  },
  backBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 10,
    padding: 6,
    marginRight: 8,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  listContainer: {
    paddingHorizontal: 10,
    paddingTop: 16,
    paddingBottom: 80,
  },
  card: {
    width: CARD_SIZE,
    height: CARD_SIZE * 0.8,
    borderRadius: 18,
    margin: 8,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  icon: {
    marginBottom: 10,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: "#94a3b8",
    marginTop: 10,
    fontSize: 16,
  },
});
