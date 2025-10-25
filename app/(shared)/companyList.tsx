import React, { useEffect, useState } from "react";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { db } from "@/config/firebase";
import { collection, getDocs } from "firebase/firestore";

const { width } = Dimensions.get("window");
const cardSize = width / 2 - 24; // Giảm margin cho vừa màn hơn

type Company = {
  $id: string;
  corp_name: string;
  nation?: string;
  corp_description?: string;
  city?: string;
  image?: string;
  color?: string;
};

type Job = {
  $id: string;
  title: string;
  image?: string;
  salary?: number;
  skills_required?: string;
  responsibilities?: string;
  created_at?: string;
  updated_at?: string;
  jobTypes?: any;
  jobCategories?: any;
  users?: any;
  job_Description?: string;
  company?: string;
};

const CompanyList = () => {
  const insets = useSafeAreaInsets(); // ✅ gọi bên trong component
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
      console.error("Lỗi khi lấy dữ liệu:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanyData();
  }, []);

  const handleCompanyPress = (companyId: string) => {
    router.push({ pathname: "/companyDescription", params: { companyId } });
  };

  const getContrastColor = (hexColor: string) => {
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
        style={[styles.card, { backgroundColor: item.color || "#e2e8f0" }]}
        activeOpacity={0.85}
        onPress={() => handleCompanyPress(item.$id)}
      >
        <View style={styles.contentWrapper}>
          <View style={styles.iconContainer}>
            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.companyImage} />
            ) : (
              <MaterialCommunityIcons
                name="office-building"
                size={30}
                color={textColor}
              />
            )}
          </View>
          <Text style={[styles.companyName, { color: textColor }]}>
            {item.corp_name || "Unknown Company"}
          </Text>
          <Text style={[styles.jobCount, { color: textColor }]}>
            {jobCount} {jobCount === 1 ? "job" : "jobs"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { paddingTop: Platform.OS === "android" ? insets.top + 10 : insets.top },
      ]}
    >
      {/* Back button */}
<TouchableOpacity
  onPress={() => {
    if (router.canGoBack()) router.back();
    else router.replace("/"); // về trang home chính, không phải employer
  }}
  style={styles.backButton}
  activeOpacity={0.8}
>
  <MaterialCommunityIcons name="arrow-left" size={22} color="#1e293b" />
  <Text style={styles.backText}>Back</Text>
</TouchableOpacity>


      <Text style={styles.title}>Company List</Text>

      <FlatList
        data={companies}
        renderItem={renderItem}
        keyExtractor={(item) => item.$id}
        numColumns={2}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

export default CompanyList;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 12,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
    marginLeft: 4,
  },
  backText: {
    marginLeft: 6,
    fontSize: 15,
    color: "#1e293b",
    fontWeight: "600",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 14,
    textAlign: "center",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  list: {
    paddingBottom: 80,
    justifyContent: "center",
  },
  card: {
    width: cardSize,
    borderRadius: 14,
    paddingVertical: 20,
    margin: 8,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  contentWrapper: {
    alignItems: "center",
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  companyImage: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    resizeMode: "cover",
  },
  companyName: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
  jobCount: {
    fontSize: 13,
    textAlign: "center",
    opacity: 0.8,
  },
});
