import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSavedJobs } from '@/app/saveJobsContext';
import { databases, databases_id, collection_job_id, collection_saved_jobs_id, collection_jobcategory_id, Query } from '@/lib/appwrite';
import { account } from '@/lib/appwrite';

const Job = () => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [savedJobs, setSavedJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>('')
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    if (userId) {
      fetchSavedJobs()
      fetchCategories();
    }
  }, [userId])
  useEffect(() => {
    
    loadUser()
  }, [])
  const loadUser = async () => {
    try {
      const user = await account.get()
      setUserId(user.$id)
    } catch (error) {
      console.log('Không lấy được user:', error)
    }
  }

  const fetchSavedJobs = async () => {
    try {
      setLoading(true)
      const saved = await databases.listDocuments(
        databases_id,
        collection_saved_jobs_id,
        [Query.equal('userId', userId)]
      )

      const jobIds = saved.documents.map(doc => doc.jobId)
      const jobPromises = jobIds.map((jobId: string) =>
        databases.getDocument(databases_id, collection_job_id, jobId)
      )

      const jobDetails = await Promise.all(jobPromises)
      setSavedJobs(jobDetails)
    } catch (error) {
      console.log('Lỗi khi load saved jobs:', error)
    } finally {
      setLoading(false)
    }
  }
  const fetchCategories = async () => {
    try {
      const response = await databases.listDocuments(databases_id, collection_jobcategory_id);
      setCategories(response.documents);
    } catch (err) {
      console.error('Lỗi khi load category:', err);
    }
  };

  // Get saved jobs
  const savedJobsList = savedJobs;


  // Filter jobs based on selected tab
  const filteredJobs =
  selectedTab === 0
    ? savedJobsList
    : savedJobsList.filter((job) =>
        job.jobCategories?.$id === categories[selectedTab - 1]?.$id
      );

  const renderJobItem = ({ item }: { item: any }) => {
    const isSaved = savedJobs.includes(item.$id);

    return (
      <TouchableOpacity
        style={styles.jobItem}
        onPress={() => router.push(`/jobDescription?jobId=${item.$id}`)}
      >
        <Image source={{ uri: item.image }} style={styles.jobImage} />
        <View style={styles.jobInfo}>
          <Text style={styles.jobTitle}>{item.title}</Text>
          <Text style={styles.jobCompany}>{item.company?.corp_name}</Text>
          <Text style={styles.jobLocation}>{item.company?.city}, {item.company?.nation}</Text>
        </View>
        <View style={styles.jobRight}>
          <Text style={styles.jobSalary}>$ {item.salary}</Text>
          <Text style={styles.jobType}>{item.jobTypes?.type_name}</Text>
          <TouchableOpacity onPress={() => handleSaveJob(item.$id)} style={{ padding: 4 }}>
  <Ionicons
    name={savedJobs.some(job => job.$id === item.$id) ? 'heart' : 'heart-outline'}
    size={24}
    color={savedJobs.some(job => job.$id === item.$id) ? '#FF3B30' : '#999'}
  />
</TouchableOpacity>

        </View>
      </TouchableOpacity>
    );
  };
  const handleSaveJob = async (jobId: string) => {
    if (!userId) return;
  
    const isJobSaved = savedJobs.some(job => job.$id === jobId);
  
    try {
      if (isJobSaved) {
   
        const savedJobDoc = await databases.listDocuments(
          databases_id,
          collection_saved_jobs_id,
          [
            Query.equal('userId', userId),
            Query.equal('jobId', jobId)
          ]
        );
  
        if (savedJobDoc.documents.length > 0) {
          await databases.deleteDocument(
            databases_id,
            collection_saved_jobs_id,
            savedJobDoc.documents[0].$id
          );
        }
      } else {
        // Lưu job vào saved list
        await databases.createDocument(
          databases_id,
          collection_saved_jobs_id,
          'unique()', 
          {
            userId,
            jobId
          }
        );
      }
  
      fetchSavedJobs(); 
    } catch (err) {
      console.error('Lỗi xử lý trái tim:', err);
    }
  };
  

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Save Job List</Text>
      </View>

      <View style={styles.subHeader}>
        <Text style={styles.savedText}>You Saved {savedJobs.length} Jobs</Text>
        <Image
          source={{ uri: 'https://via.placeholder.com/30' }}
          style={styles.subHeaderIcon}
        />
      </View>

      <View style={styles.tabsWrapper}>
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.tabScroll}
  >
    <TouchableOpacity
      style={[styles.tabButton, selectedTab === 0 && styles.tabButtonActive]}
      onPress={() => setSelectedTab(0)}
    >
      <Text style={[styles.tabText, selectedTab === 0 && styles.tabTextActive]}>
        All
      </Text>
    </TouchableOpacity>

    {categories.map((cat, index) => (
      <TouchableOpacity
        key={cat.$id}
        style={[styles.tabButton, selectedTab === index + 1 && styles.tabButtonActive]}
        onPress={() => setSelectedTab(index + 1)}
      >
        <Text style={[styles.tabText, selectedTab === index + 1 && styles.tabTextActive]}>
          {cat.category_name}
        </Text>
      </TouchableOpacity>
    ))}
  </ScrollView>
</View>


      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#34C759" />
        </View>
      ) : filteredJobs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-dislike-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No saved jobs found</Text>
        </View>
      ) : (
        <FlatList
          data={filteredJobs}
          renderItem={renderJobItem}
          keyExtractor={(item) => item.$id}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </SafeAreaView>
  );
};


export default Job;

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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  savedText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
    flex: 1,
  },
  subHeaderIcon: {
    width: 30,
    height: 30,
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
