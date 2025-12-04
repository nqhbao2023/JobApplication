import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import { router } from "expo-router";
import { useSafeBack } from "@/hooks/useSafeBack";
import { db } from "@/config/firebase";
import { collection, getDocs } from "firebase/firestore";

const { width } = Dimensions.get("window");
const cardSize = width / 2 - 24;

type Company = {
  $id: string;
  corp_name: string;
  nation?: string;
  city?: string;
  image?: string;
  color?: string;
};

type Job = {
  $id: string;
  company?: string;
};

const CompanyList = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCompanyData = async () => {
    try {
      const companiesSnap = await getDocs(collection(db, "companies"));
      const jobsSnap = await getDocs(collection(db, "jobs"));

      const companies: Company[] = companiesSnap.docs.map((doc) => ({
        $id: doc.id,
        ...doc.data(),
      })) as Company[];

      const fetchedJobs: Job[] = jobsSnap.docs.map((doc) => ({
        $id: doc.id,
        ...doc.data(),
      })) as Job[];

      setCompanies(companies);
      setJobs(fetchedJobs);
    } catch (error) {
      console.error("🔥 Lỗi khi lấy dữ liệu:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanyData();
  }, []);

  const handleCompanyPress = (companyId: string) => {
    router.push({ pathname: "/(shared)/companyDescription", params: { companyId } });
  };

  const getContrastColor = (hexColor: string) => {
    if (!hexColor?.startsWith("#")) return "#1e293b";
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? "#000" : "#fff";
  };

  const renderItem = ({ item }: { item: Company }) => {
    const jobCount = jobs.filter((job) => job.company === item.$id).length;
    const textColor = item.color ? getContrastColor(item.color) : "#1e293b";

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: item.color || "#ffffff" }]}
        activeOpacity={0.85}
        onPress={() => handleCompanyPress(item.$id)}
      >
        <View style={styles.contentWrapper}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.companyImage} />
          ) : (
            <View style={styles.iconPlaceholder}>
              <Ionicons name="business-outline" size={30} color={textColor} />
            </View>
          )}
          <Text
            style={[styles.companyName, { color: textColor }]}
            numberOfLines={1}
          >
            {item.corp_name || "Unknown"}
          </Text>
          <Text style={[styles.jobCount, { color: textColor }]}>
            {jobCount} {jobCount === 1 ? "Job" : "Jobs"}
          </Text>
          {!!item.city && (
            <Text style={[styles.location, { color: textColor }]} numberOfLines={1}>
              {item.city}, {item.nation || "—"}
            </Text>
          )}
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
        <Text style={styles.headerTitle}>Danh sách công ty</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A80F0" />
          <Text style={{ color: "#64748b", marginTop: 6 }}>Đang tải dữ liệu...</Text>
        </View>
      ) : (
        <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1 }}>
          <FlatList
            data={companies}
            renderItem={renderItem}
            keyExtractor={(item) => item.$id}
            numColumns={2}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
          />
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

export default CompanyList;

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
  list: {
    paddingHorizontal: 10,
    paddingTop: 16,
    paddingBottom: 80,
  },
  card: {
    width: cardSize,
    borderRadius: 18,
    margin: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  contentWrapper: {
    alignItems: "center",
  },
  companyImage: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  iconPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.3)",
    marginBottom: 10,
  },
  companyName: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  jobCount: {
    fontSize: 13,
    opacity: 0.85,
    textAlign: "center",
    marginTop: 2,
  },
  location: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: "center",
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
