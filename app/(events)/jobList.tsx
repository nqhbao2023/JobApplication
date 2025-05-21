import React, { useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View, Image } from "react-native";
import { useRouter } from "expo-router";
import { getAllDocuments } from "@/lib/appwrite";
import { Job, JobCategory, JobType } from "@/types/type";
import { Ionicons } from "@expo/vector-icons";
import { databases, databases_id, collection_job_id, collection_jobcategory_id, collection_jobtype_id } from "@/lib/appwrite";
import { StyleSheet } from "react-native";
const AllJobs = () => {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]); 
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [categories, setCategories] = useState<JobCategory[]>([]); 
  const [types, setTypes] = useState<JobType[]>([]); 
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activeType, setActiveType] = useState<string>("all"); 

  const fetchData = async () => {
    const jobsResult = await getAllDocuments(databases_id, collection_job_id);
    const categoriesResult = await getAllDocuments(databases_id, collection_jobcategory_id);
    const typesResult = await getAllDocuments(databases_id, collection_jobtype_id);
    
    if (jobsResult && categoriesResult && typesResult) {
      // Chuyển đổi Document thành Job
      const jobs: Job[] = jobsResult.map((job: any) => ({
        $id: job.$id,
        title: job.title,
        image: job.image,
        salary: job.salary,
        skills_required: job.skills_required,
        responsibilities: job.responsibilities,
        created_at: job.created_at,
        updated_at: job.updated_at,
        jobTypes: job.jobTypes,
        jobCategories: job.jobCategories,
        users: job.users,
        job_Description: job.job_Description,
        company: job.company
      }));

      const categories: JobCategory[] = categoriesResult.map((category: any) => ({
        $id: category.$id,
        category_name: category.category_name,
        icon_name: category.icon_name,
        color: category.color,
      }));

      const types: JobType[] = typesResult.map((type: any) => ({
        $id: type.$id,
        type_name: type.type_name,
      }));

      
      setJobs(jobs); 
      setCategories(categories); 
      setTypes(types); 
      setFilteredJobs(jobs); 
      console.log(jobs)
      console.log(categories)
    }
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
            onPress={() => router.push({ pathname: '/(events)/jobDescription', params: { jobId: job.$id } })}

            style={styles.jobItem}
          >
            <Image source={{ uri: job.image }} style={styles.jobImage} />
            <View style={styles.jobInfo}>
              <Text style={styles.jobTitle}>{job.title}</Text>
              <Text style={styles.jobCompany}>{job?.company.corp_name}</Text>
              <Text style={styles.jobLocation}>{job?.company.city}, {job?.company.nation}</Text>
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
}
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
