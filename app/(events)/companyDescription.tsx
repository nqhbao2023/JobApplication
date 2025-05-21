import { StyleSheet, Text, TouchableOpacity, View, Image, FlatList } from 'react-native';
import React, { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { databases, databases_id, collection_company_id, collection_job_id } from '@/lib/appwrite';
import { useLocalSearchParams } from 'expo-router';

const CompanyDescription = () => {
  const [selected, setSelected] = useState(0);
  const { companyId } = useLocalSearchParams();
  const [dataCompany, setDataCompany] = useState<any>(null);
  const [companyJobs, setCompanyJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<any>(null); // State để lưu công việc được chọn

  const Switch_Selected = async (index: number) => {
    setSelected(index);
  };

  useEffect(() => {
    if (companyId) {
      load_company_data(companyId as string);
      load_company_jobs(companyId as string);

    }
    
  }, [companyId]);
  
  const load_company_data = async (id: string) => {
    try {
      const result = await databases.getDocument(databases_id, collection_company_id, id);
     
     
      setDataCompany(result);
      console.log(result);

    } catch (error) {
      console.log(error);
    }
  };

  const load_company_jobs = async (id: string) => {
    try {
      const result = await databases.listDocuments(databases_id, collection_job_id);
      const filteredJobs = result.documents.filter((job: any) => job.company?.$id === id);
      setCompanyJobs(filteredJobs);
    } catch (error) {
      console.log(error);
    }
  };

  const handleJobSelect = (job: any) => {
    setSelectedJob(job); // Cập nhật công việc được chọn
  };

  const handleApply = () => {
    if (selectedJob) {
      router.push({ pathname: '/(events)/submit', params: { companyId, jobId: selectedJob.$id } });
    } else {
      alert('Please select a job to apply for.');
    }
  };

  if (!dataCompany) return <Text>Loading...</Text>;

  return (
    <View style={styles.container}>
      <View style={styles.topView}>
        <TouchableOpacity style={styles.buttons} onPress={() => router.push("/")}>
          <Ionicons name="arrow-back" size={24} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.buttons} onPress={() => router.push("/")}>
          <Ionicons name="share-social" size={24} />
        </TouchableOpacity>
      </View>
      <View style={styles.headerContainer}>
        <View style={styles.jobImageContainer}>
          <Image style={styles.jobImage} source={{ uri: dataCompany.image || 'default_image_url' }} />
        </View>
        <View style={styles.companyName}>
          <Text style={styles.companyNameText}>{dataCompany.corp_name}</Text>
        </View>
        <View style={styles.companyInfoBox}>
          <View style={styles.companyLocation}>
            <Text style={styles.companyInfoText}>{dataCompany.city} /</Text>
            <Ionicons style={styles.companyInfoText2} name="location" size={24} />
            <Text style={styles.companyInfoText2}>{dataCompany.nation || "No Nation"}</Text>
          </View>
        </View>
      </View>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tabBox, selected === 0 ? styles.tabActive : styles.tabNormal]}
          onPress={() => Switch_Selected(0)}
        >
          <Text style={[selected === 0 ? styles.tabActiveText : styles.tabNormalText]}>Company Info</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBox, selected === 1 ? styles.tabActive : styles.tabNormal]}
          onPress={() => Switch_Selected(1)}
        >
          <Text style={[selected === 1 ? styles.tabActiveText : styles.tabNormalText]}>Jobs</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.contentTab}>
        {selected === 0 ? (
          <View>
            <Text style={styles.descriptionContent}>{dataCompany.corp_description || "No description available"}</Text>
          </View>
        ) : (
          <FlatList
            data={companyJobs}
            keyExtractor={(item) => item.$id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.jobItem, selectedJob?.$id === item.$id ? styles.jobItemSelected : null]}
                onPress={() => handleJobSelect(item)}
              >
                <Text style={styles.jobTitle}>{item.title}</Text>
                <Text style={styles.jobInfo}>{item.jobTypes?.type_name || "No Job Type"}</Text>
                <Text style={styles.jobInfo}>$ {item.salary}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.descriptionContent}>No jobs available</Text>}
          />
        )}
      </View>
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.applyContainer, !selectedJob ? styles.applyContainerDisabled : null]}
          onPress={handleApply}
          disabled={!selectedJob}
        >
          <Text style={styles.applyText}>Apply Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default CompanyDescription;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 30,
    backgroundColor: '#fff',
    flex: 1,
  },
  topView: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  buttons: {
    borderWidth: 0,
    height: 40,
    width: 40,
    backgroundColor: 'white',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jobImage: {
    height: '100%',
    width: 100,
    alignContent: 'center',
    justifyContent: 'center',
    borderRadius: 50,
  },
  jobImageContainer: {
    marginTop: 10,
    height: 100,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EBF2FC',
  },
  companyName: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EBF2FC',
  },
  companyNameText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  companyInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EBF2FC',
  },
  companyInfoText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  companyInfoText2: {
    fontSize: 15,
    color: '#a9a9a9',
  },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    alignItems: 'center',
    gap: 10,
  },
  tabBox: {
    borderWidth: 0,
    borderRadius: 15,
    height: 50,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  tabNormal: {
    backgroundColor: '#EEEEEE',
  },
  tabNormalText: {
    color: '#AAAAAA',
  },
  tabActive: {
    backgroundColor: '#2F264F',
  },
  tabActiveText: {
    color: 'white',
  },
  contentTab: {
    backgroundColor: '#EEEEEE',
    borderRadius: 10,
    padding: 14,
    flex: 1,
  },
  descriptionContent: {
    fontSize: 15,
    color: 'black',
    textAlign: 'justify',
  },
  companyLocation: {
    justifyContent: 'center',
    flexDirection: 'row',
    backgroundColor: '#EBF2FC',
  },
  headerContainer: {
    marginBottom: 20,
    borderBottomRightRadius: 10,
    borderBottomLeftRadius: 10,
    backgroundColor: '#EBF2FC',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  bottomContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  applyContainer: {
    flex: 1,
    height: 60,
    backgroundColor: '#F97459',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F97459',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  applyContainerDisabled: {
    backgroundColor: '#cccccc',
    shadowColor: '#cccccc',
  },
  applyText: {
    fontSize: 20,
    color: 'white',
    fontWeight: 'bold',
  },
  jobItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    marginBottom: 10,
    borderRadius: 5,
  },
  jobItemSelected: {
    backgroundColor: '#d3e3fd',
    borderColor: '#2F264F',
    borderWidth: 1,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  jobInfo: {
    fontSize: 14,
    color: '#666',
  },
});