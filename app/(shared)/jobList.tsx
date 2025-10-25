import React, { useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View, Image, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { db } from "@/config/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";

// Định nghĩa type nếu không import được
type Job = {
  $id: string;
  title: string;
  image?: string;
  salary?: number;
  skills_required?: string;
  responsibilities?: string;
  created_at?: string;
  updated_at?: string;
  jobTypes?: JobType;
  jobCategories?: JobCategory;
  users?: any;
  job_Description?: string;
  company?: any;
};

type JobCategory = {
  $id: string;
  category_name: string;
  icon_name?: string;
  color?: string;
};

type JobType = {
  $id: string;
  type_name: string;
};

const AllJobs = () => {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [categories, setCategories] = useState<JobCategory[]>([]);
  const [types, setTypes] = useState<JobType[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activeType, setActiveType] = useState<string>("all");

  const fetchData = async () => {
    // Lấy jobs
    const jobsSnap = await getDocs(collection(db, "jobs"));
    // Lấy categories
    const categoriesSnap = await getDocs(collection(db, "job_categories"));
    // Lấy types
    const typesSnap = await getDocs(collection(db, "job_types"));

    // Lấy thông tin công ty cho từng job
    const jobs: Job[] = (
      await Promise.all(
        jobsSnap.docs.map(async (jobDoc) => {
          const jobData = jobDoc.data();
          // Nếu không có title thì bỏ qua
          if (!jobData.title) return null;

          let companyData = {};
          if (jobData.company) {
            const companySnap = await getDoc(doc(db, "companies", jobData.company));
            companyData = companySnap.exists() ? companySnap.data() : {};
          }
          // Lấy thông tin category
          let jobCategoryData = undefined;
          if (jobData.jobCategories) {
            const catSnap = await getDoc(doc(db, "job_categories", jobData.jobCategories));
            jobCategoryData = catSnap.exists() ? { $id: catSnap.id, ...catSnap.data() } : undefined;
          }
          // Lấy thông tin type
          let jobTypeData = undefined;
          if (jobData.jobTypes) {
            const typeSnap = await getDoc(doc(db, "job_types", jobData.jobTypes));
            jobTypeData = typeSnap.exists() ? { $id: typeSnap.id, ...typeSnap.data() } : undefined;
          }
          return {
            $id: jobDoc.id,
            ...jobData,
            company: companyData,
            jobCategories: jobCategoryData,
            jobTypes: jobTypeData,
          } as Job;
        })
      )
    ).filter((job): job is Job => job !== null);

    const categories: JobCategory[] = categoriesSnap.docs.map((cat) => ({
      $id: cat.id,
      ...cat.data(),
    })) as JobCategory[];

    const types: JobType[] = typesSnap.docs.map((type) => ({
      $id: type.id,
      ...type.data(),
    })) as JobType[];

    setJobs(jobs);
    setCategories(categories);
    setTypes(types);
    setFilteredJobs(jobs);
  };

  const applyFilters = (categoryId: string, typeId: string) => {
    let tempJobs = [...jobs];

    if (categoryId !== "all") {
      tempJobs = tempJobs.filter((job) =>
        job.jobCategories?.$id === categoryId
      );
    }

    if (typeId !== "all") {
      tempJobs = tempJobs.filter((job) =>
        job.jobTypes?.$id === typeId
      );
    }

    setFilteredJobs(tempJobs);
  };

  const handleCategoryChange = (categoryId: string) => {
    setActiveCategory(categoryId);
    applyFilters(categoryId, activeType);
  };

  const handleTypeChange = (typeId: string) => {
    setActiveType(typeId);
    applyFilters(activeCategory, typeId);
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <View style={styles.container}>
      {/* Tabs lọc theo category */}
      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeCategory === "all" && styles.tabButtonActive,
            ]}
            onPress={() => handleCategoryChange("all")}
          >
            <Text
              style={[
                styles.tabText,
                activeCategory === "all" && styles.tabTextActive,
              ]}
            >
              Tất cả danh mục
            </Text>
          </TouchableOpacity>

          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.$id}
              style={[
                styles.tabButton,
                activeCategory === cat.$id && styles.tabButtonActive,
              ]}
              onPress={() => handleCategoryChange(cat.$id)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeCategory === cat.$id && styles.tabTextActive,
                ]}
              >
                {cat.category_name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Tabs lọc theo jobType */}
      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeType === "all" && styles.tabButtonActive,
            ]}
            onPress={() => handleTypeChange("all")}
          >
            <Text
              style={[
                styles.tabText,
                activeType === "all" && styles.tabTextActive,
              ]}
            >
              Tất cả loại công việc
            </Text>
          </TouchableOpacity>

          {types.map((type) => (
            <TouchableOpacity
              key={type.$id}
              style={[
                styles.tabButton,
                activeType === type.$id && styles.tabButtonActive,
              ]}
              onPress={() => handleTypeChange(type.$id)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeType === type.$id && styles.tabTextActive,
                ]}
              >
                {type.type_name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Danh sách công việc */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {filteredJobs.map((job) => (
          <TouchableOpacity
            key={job.$id}
            onPress={() => router.push({ pathname: '/(shared)/jobDescription', params: { jobId: job.$id } })}
            style={styles.jobItem}
          >
            <Image source={{ uri: job.image }} style={styles.jobImage} />
            <View style={styles.jobInfo}>
              <Text style={styles.jobTitle}>{job.title}</Text>
              <Text style={styles.jobCompany}>{job?.company?.corp_name}</Text>
              <Text style={styles.jobLocation}>{job?.company?.city}, {job?.company?.nation}</Text>
            </View>
          </TouchableOpacity>
        ))}

        {filteredJobs.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="sad-outline" size={40} color="gray" />
            <Text style={styles.emptyText}>Không có công việc phù hợp</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9FB',
  },
  header: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 5,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  tabsWrapper: {
    paddingVertical: 10,
  },
  tabScroll: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  tabButtonActive: {
    backgroundColor: '#34C759',
    borderColor: '#34C759',
  },
  tabText: {
    fontSize: 14,
    color: '#333',
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  jobItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    elevation: 2,
  },
  jobImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  jobInfo: {
    flex: 1,
    marginLeft: 10,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  jobCompany: {
    fontSize: 14,
    color: '#666',
  },
  jobLocation: {
    fontSize: 12,
    color: '#aaa',
  },
  jobRight: {
    alignItems: 'flex-end',
  },
  jobSalary: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  jobType: {
    fontSize: 12,
    color: '#666',
    marginVertical: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
});

export default AllJobs;
