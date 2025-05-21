import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useRouter } from 'expo-router';
import { collection_applied_jobs_id, collection_user_id, collection_job_id,account, databases, databases_id, Query} from '@/lib/appwrite';
const appliedJob = () => {

  const router = useRouter();
  const [appliedJobs, setAppliedJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string>('')
  const fetchAppliedJobs = async () => {
    try {
      setLoading(true);
      const res = await databases.listDocuments(
        databases_id,
        collection_applied_jobs_id,
        [Query.equal('userId', userId || '')]
      );

      const jobs = await Promise.all(
        res.documents.map(async (doc) => {
          const jobRes = await databases.getDocument(
            databases_id,
            collection_job_id,
            doc.jobId,
          );
          return {
            ...jobRes,
            status: doc.status,
            applied_at: doc.applied_at,
          };
        })
      );

      setAppliedJobs(jobs);
    } catch (err) {
      console.error('Failed to fetch applied jobs:', err);
    } finally {
      setLoading(false);
    }
  };
  const renderItem = ({ item }: { item: any }) => {
    return (
      console.log(item),
      <TouchableOpacity style={styles.jobItem} onPress={() => router.push({ pathname: '/(events)/jobDescription', params: { jobId: item.$id } })}>
        <Image source={{ uri: item.image }} style={styles.jobImage} />
        <View style={styles.jobInfo}>
          <Text style={styles.jobTitle}>{item.title}</Text>
          <Text style={styles.jobCompany}>{item.company?.corp_name}</Text>  
          <Text style={styles.jobLocation}>{item.company?.location}</Text>
          <Text style={styles.jobStatus}>
            Trạng thái: 
            <Text style={{ fontWeight: 'bold', color: item.status === 'Đã duyệt' ? '#34C759' : '#FF9500' }} >
              {' '}{item.status}
            </Text>
          </Text>
        </View>
        <View style={styles.jobRight}>
          <Text style={styles.jobSalary}>{item.salary} $</Text>
          <Text style={styles.jobType}>{item.type}</Text>
          <Ionicons name="checkmark-done" size={24} color="#34C759" />
        </View>
      
      </TouchableOpacity>
    );
  };
  const load_userId = async () => {
      const user = await account.get()
      setUserId(user.$id)
    }
    useEffect(() => {
      if (userId) fetchAppliedJobs();
    }, [userId]);
    useEffect(() => {
      load_userId();
    }, []);
    
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.back_btn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>

        <Text style={styles.headerText}>Applied Job List</Text>
      </View>

      <View style={styles.subHeader}>
        <Text style={styles.savedText}>You Applied {appliedJobs.length} Jobs</Text>
        <Image
          source={{ uri: 'https://via.placeholder.com/30' }}
          style={styles.subHeaderIcon}
        />
      </View>

      {loading ? (
        <Text>Loading...</Text>
      ) : (
        <FlatList
          data={appliedJobs}
          renderItem={renderItem}
          keyExtractor={(item) => item.$id.toString()} // Assuming $id is unique
          contentContainerStyle={{ paddingHorizontal: 16 }}
        />
      )}
    </SafeAreaView>
  );
};

export default appliedJob;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9FB',
  },
  header: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    elevation: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  back_btn: {
    position: 'absolute',
    left: 16,
    padding: 6,
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  savedText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    flex: 1,
  },
  subHeaderIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  jobItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  jobImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  jobInfo: {
    flex: 1,
    marginLeft: 12,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  jobCompany: {
    fontSize: 14,
    color: '#777',
  },
  jobLocation: {
    fontSize: 12,
    color: '#aaa',
  },
  jobStatus: {
    fontSize: 12,
    marginTop: 4,
    color: '#444',
  },
  jobRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingLeft: 8,
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
});
