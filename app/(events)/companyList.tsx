import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { db } from '@/config/firebase';
import { collection, getDocs } from 'firebase/firestore';

const { width } = Dimensions.get('window');
const cardSize = width / 2 - 32;

// Định nghĩa type nếu không import được
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
  const [jobs, setJobs] = useState<Job[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCompanyData = async () => {
    try {
      // Lấy dữ liệu từ Firestore
      const companiesSnap = await getDocs(collection(db, 'companies'));
      const jobsSnap = await getDocs(collection(db, 'jobs'));

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
      setLoading(false);
    } catch (error) {
      setLoading(false);
      console.error('Lỗi khi lấy dữ liệu công ty hoặc công việc:', error);
    }
  };

  useEffect(() => {
    fetchCompanyData();
  }, []);

  const handleCompanyPress = (companyId: string) => {
    router.push({ pathname: '/companyDescription', params: { companyId } });
  };

  const renderItem = ({ item }: { item: Company }) => {
    const jobCount = jobs.filter((job: Job) => job.company === item.$id).length;
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
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  };

return (
  <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
    {/* Back button */}
    <TouchableOpacity onPress={() => router.push("/")} style={styles.backButton}>
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
  </SafeAreaView>
);

};

export default CompanyList;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
  },
backButton: {
  flexDirection: 'row',
  alignItems: 'center',
  alignSelf: 'flex-start',   // không chiếm hết chiều ngang
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 12,
  backgroundColor: '#e2e8f0', // nền xám nhạt cho giống button
  marginBottom: 16,
},
backText: {
  marginLeft: 6,
  fontSize: 15,
  color: '#1e293b',
  fontWeight: '600',
},

title: {
  fontSize: 26,
  fontWeight: '700',
  color: '#0f172a',
  marginBottom: 20,
  textAlign: 'center',
  letterSpacing: 0.8,
  textTransform: 'uppercase', // tiêu đề in hoa cho mạnh mẽ
},

  list: {
    paddingBottom: 80,
  },
  contentContainer: {
    backgroundColor: '#ffffff',
    width: '100%',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  card: {
    width: cardSize,
    borderRadius: 16,
    padding: 16,
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
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

