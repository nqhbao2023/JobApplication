import React, { useEffect, useState, useMemo } from "react";
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
import { useSafeBack } from "@/hooks/useSafeBack";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import { jobMatchesCategory } from "@/utils/categoryMatching.utils";

const { width } = Dimensions.get("window");
const CARD_SIZE = width / 2 - 24;

type Category = {
  id: string;
  category_name: string;
  icon_name?: string;
  color?: string;
  jobCount?: number;
};

type Job = {
  id: string;
  jobCategories?: any;
  status?: string;
  jobType?: string;
  external_url?: string;
};

// 🎨 Mapping category name to beautiful icons
const CATEGORY_ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  'it': 'code-slash',
  'công nghệ thông tin': 'code-slash',
  'phần mềm': 'laptop-outline',
  'lập trình': 'terminal-outline',
  'marketing': 'megaphone-outline',
  'truyền thông': 'share-social-outline',
  'sales': 'cart-outline',
  'kinh doanh': 'briefcase-outline',
  'bán hàng': 'storefront-outline',
  'nhân sự': 'people-outline',
  'hr': 'people-circle-outline',
  'hành chính': 'clipboard-outline',
  'tài chính': 'wallet-outline',
  'kế toán': 'calculator-outline',
  'kiểm toán': 'document-text-outline',
  'ngân hàng': 'card-outline',
  'thiết kế': 'color-palette-outline',
  'design': 'brush-outline',
  'sáng tạo': 'sparkles-outline',
  'y tế': 'medkit-outline',
  'dược': 'flask-outline',
  'kỹ thuật': 'construct-outline',
  'cơ khí': 'cog-outline',
  'xây dựng': 'build-outline',
  'giáo dục': 'school-outline',
  'đào tạo': 'book-outline',
  'nhà hàng': 'restaurant-outline',
  'khách sạn': 'bed-outline',
  'du lịch': 'airplane-outline',
  'vận tải': 'car-outline',
  'logistics': 'cube-outline',
  'bất động sản': 'home-outline',
  'luật': 'shield-checkmark-outline',
};

const getCategoryIcon = (categoryName?: string, iconName?: string): keyof typeof Ionicons.glyphMap => {
  if (iconName && iconName !== 'briefcase-outline') {
    return iconName as keyof typeof Ionicons.glyphMap;
  }
  if (!categoryName) return 'grid-outline';
  const name = categoryName.toLowerCase();
  if (CATEGORY_ICON_MAP[name]) return CATEGORY_ICON_MAP[name];
  for (const [key, icon] of Object.entries(CATEGORY_ICON_MAP)) {
    if (name.includes(key) || key.includes(name)) return icon;
  }
  return 'grid-outline';
};

export default function CategoriesListScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch both categories and jobs in parallel
        const [categoriesSnap, jobsSnap] = await Promise.all([
          getDocs(collection(db, "job_categories")),
          getDocs(collection(db, "jobs")),
        ]);
        
        const categoriesData = categoriesSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Category[];
        
        const jobsData = jobsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Job[];
        
        // Filter active jobs
        const activeJobs = jobsData.filter(job => {
          const status = job.status?.toLowerCase();
          if (status && status !== "active" && status !== "approved" && !job.external_url) {
            return false;
          }
          if (job.jobType === "candidate_seeking") return false;
          return true;
        });
        
        setJobs(activeJobs);
        setCategories(categoriesData);
      } catch (e) {
        console.error("❌ Lỗi tải danh mục:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ✅ Calculate job counts for each category
  const categoriesWithCounts = useMemo(() => {
    return categories.map(cat => ({
      ...cat,
      jobCount: jobs.filter(job => jobMatchesCategory(job, cat.id, cat.category_name)).length,
    }));
  }, [categories, jobs]);

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
    const categoryIcon = getCategoryIcon(item.category_name, item.icon_name);
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
          name={categoryIcon}
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
        {/* ✅ Show job count */}
        <View style={[styles.jobCountBadge, { backgroundColor: textColor === "#fff" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)" }]}>
          <Ionicons name="briefcase" size={12} color={textColor} />

        </View>
      </TouchableOpacity>
    );
  };

  const { goBack } = useSafeBack();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={goBack}
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
            data={categoriesWithCounts}
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
  jobCountBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 8,
    gap: 4,
  },
  jobCountText: {
    fontSize: 11,
    fontWeight: "500",
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
