import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { router } from 'expo-router';
import { useState } from 'react';
import { Company, Job } from '@/types/type';
import { getAllDocuments } from "@/lib/appwrite";
import { databases, databases_id, collection_company_id, collection_job_id } from '@/lib/appwrite';
import { useEffect } from 'react';
import { Image } from 'react-native';


const { width } = Dimensions.get('window');
const cardSize = width / 2 - 32;

const companyList = () => {

  const [jobs, setJobs] = useState<Job[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]); // Sử dụng kiểu dữ liệu Company
  const [loading, setLoading] = useState(true);

  const fetchCompanyData = async () => {
    // Lấy dữ liệu từ Appwrite
    const companiesResult = await getAllDocuments(databases_id, collection_company_id);
    const jobsResult = await getAllDocuments(databases_id, collection_job_id);
    if (companiesResult) {
      // Chuyển đổi Document thành Company
      const companies: Company[] = companiesResult.map((company: any) => ({
        $id: company.$id,
        corp_name: company.corp_name,
        nation: company.nation,
        corp_description: company.corp_description,
        city: company.city,
        image: company.image,
        color: company.color,
      }));

      setCompanies(companies); // Cập nhật state với danh sách công ty
      console.log(companies); // Kiểm tra dữ liệu công ty
    }
    if (jobsResult) {
      const fetchedJobs: Job[] = jobsResult.map((job: any) => ({
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
      setJobs(fetchedJobs); // Lưu công việc vào state
    }
  };


  useEffect(() => {
    fetchCompanyData();
  }, []);

  const handleCompanyPress = (companyId: string) => {
    router.push({ pathname: '/companyDescription', params: { companyId } });
  };

  const renderItem = ({ item }: { item: Company }) => {
    const jobCount = jobs.filter((job: Job) => job.company?.$id === item.$id).length;
    
    // Determine text color based on background color
    const textColor = item.color ? getContrastColor(item.color) : '#1e293b';
  
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: item.color || '#e2e8f0' }]}
        activeOpacity={0.85}
        onPress={() => handleCompanyPress(item.$id)}
      >
        <View style={styles.contentWrapper}>
          <View style={styles.iconContainer}>
            {item.image ? (
              <Image
                source={{ uri: item.image }}
                style={styles.companyImage}
              />
            ) : (
              <MaterialCommunityIcons 
                name="office-building" 
                size={24} 
                color={textColor} 
              />
            )}
          </View>
          <Text style={[styles.companyName, { color: textColor }]}>
            {item.corp_name || 'Unknown Company'}
          </Text>
          <Text style={[styles.jobCount, { color: textColor }]}>
            {jobCount} {jobCount === 1 ? 'job' : 'jobs'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };
  
  // Helper function to determine contrasting text color
  const getContrastColor = (hexColor: string) => {
    // Convert hex to RGB
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return black or white depending on luminance
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  };



  return (
    <View style={styles.container}>
      {/* Back button */}
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <MaterialCommunityIcons name="arrow-left" size={24} color="#1e293b" />
        <Text style={styles.backText}>Back to home</Text>
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
    </View>
  );
};
export default companyList;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  backText: {
    marginLeft: 6,
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 20,
    textAlign: 'center',
    marginTop: 10,
  },
  list: {
    paddingBottom: 80,
  },







  contentContainer: {
    backgroundColor: '#ffffff', // Màu nền trắng cho phần nội dung
    width: '100%',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },


  card: {
    width: cardSize,
    borderRadius: 16,
    padding: 16, // Tăng padding để màu nền tràn đều
    margin: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  contentWrapper: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)', // Nền trong suốt cho logo
  },
  companyImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    resizeMode: 'cover',
  },
  companyName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  jobCount: {
    fontSize: 14,
    textAlign: 'center',
  },
});

