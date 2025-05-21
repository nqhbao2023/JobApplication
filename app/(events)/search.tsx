import { useLocalSearchParams } from 'expo-router';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useEffect, useState } from 'react';
import {
  databases,
  databases_id,
  collection_job_id,
  collection_jobtype_id,
  collection_jobcategory_id,
  collection_company_id,
  Query
} from '@/lib/appwrite';
import DropDownPicker from 'react-native-dropdown-picker';
import { Provider as PaperProvider } from 'react-native-paper';
import { router } from 'expo-router'
interface Job {
  $id: string;
  title: string;
  
  image: string;
  
  skills_required: string;
  responsibilities: string;
  created_at: string;
  updated_at: string;
  salary: number;
 
  jobTypes: any;
  jobCategories: any;
  company: any;
}

interface JobType {
  $id: string;
  type_name: string;
}

interface JobCategory {
  $id: string;
  category_name: string;
}
interface Company {
  $id: string;
  corp_name: string;
  nation: string;
  corp_description: string;
  city: string;
}

export default function SearchScreen() {
  const { q } = useLocalSearchParams();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [company, setCompany] = useState<Company[]>([]);
  const [jobTypes, setJobTypes] = useState<JobType[]>([]);
  const [jobCategories, setJobCategories] = useState<JobCategory[]>([]);

  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);

  const fetchJobs = async () => {
    try {
      const queries = [];

      if (q) queries.push(Query.search('title', q as string));
      if (selectedTypeId) queries.push(Query.equal('jobTypes', selectedTypeId));
      if (selectedCategoryId) queries.push(Query.equal('jobCategories', selectedCategoryId));
      if (selectedCompanyId) queries.push(Query.equal('company', selectedCompanyId));
      const response = await databases.listDocuments(databases_id, collection_job_id, queries);

      const formattedJobs: Job[] = response.documents.map((doc: any) => ({
        ...doc
      }));

      setJobs(formattedJobs);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const fetchFilters = async () => {
    try {
      const typesRes = await databases.listDocuments(databases_id, collection_jobtype_id);
      const categoriesRes = await databases.listDocuments(databases_id, collection_jobcategory_id);
      const companyRes = await databases.listDocuments(databases_id, collection_company_id);
      setJobTypes(
        typesRes.documents.map((doc: any) => ({
          $id: doc.$id,
          type_name: doc.type_name,
        }))
      );
      
      setJobCategories(
        categoriesRes.documents.map((doc: any) => ({
          $id: doc.$id,
          category_name: doc.category_name,
        }))
      );
      setCompany(
        companyRes.documents.map((doc: any) => ({
          $id: doc.$id,
          corp_name: doc.corp_name,
          nation: doc.nation,
          corp_description: doc.corp_description,
          city: doc.corp_description,
        }))
      );
    } catch (err) {
      console.error('Error loading filters:', err);
    }
  };

  const clearFilters = () => {
    setSelectedTypeId(null);
    setSelectedCategoryId(null);
    setSelectedCompanyId(null);
  };

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [q, selectedTypeId, selectedCategoryId, selectedCompanyId]);

  return (
    <PaperProvider>
      <View style={styles.container}>
        <Text style={styles.heading}>Kết quả cho: "{q}"</Text>

        {/* DropDown Loại công việc */}
        <View style={{ zIndex: 2000 }}>
          <DropDownPicker
            open={typeDropdownOpen}
            setOpen={setTypeDropdownOpen}
            value={selectedTypeId}
            setValue={setSelectedTypeId}
            items={jobTypes.map((type) => ({
              label: type.type_name,
              value: type.$id
            }))}
            placeholder="Loại công việc"
            style={styles.dropdown}
            dropDownContainerStyle={styles.dropdownContainer}
          />
        </View>

        {/* DropDown Danh mục công việc */}
        <View style={{ zIndex: 1000 }}>
          <DropDownPicker
            open={categoryDropdownOpen}
            setOpen={setCategoryDropdownOpen}
            value={selectedCategoryId}
            setValue={setSelectedCategoryId}
            items={jobCategories.map((cat) => ({
              label: cat.category_name,
              value: cat.$id
            }))}
            placeholder="Danh mục công việc"
            style={styles.dropdown}
            dropDownContainerStyle={styles.dropdownContainer}
          />
        </View>
         {/* DropDown Danh mục công ty */}
         <View style={{ zIndex: 800 }}>
          <DropDownPicker
            open={companyDropdownOpen}
            setOpen={setCompanyDropdownOpen}
            value={selectedCompanyId}
            setValue={setSelectedCompanyId}
            items={company.map((com) => ({
              label: com.corp_name,
              value: com.$id
            }))}
            placeholder="Danh mục công ty"
            style={styles.dropdown}
            dropDownContainerStyle={styles.dropdownContainer}
          />
        </View>
        <TouchableOpacity onPress={clearFilters}>
          <Text style={styles.clearButton}> Xóa bộ lọc</Text>
        </TouchableOpacity>

        <Text style={styles.jobListTitle}>Danh sách công việc:</Text>
      
        {jobs.length === 0 ? (
          <Text style={styles.noJobsText}>Không có công việc nào</Text>
        ) : (

    <FlatList
    data={jobs}
    keyExtractor={(item) => item.$id}
    renderItem={({ item }) => (
      <TouchableOpacity
      onPress={() => router.push({ pathname: "/jobDescription", params: { jobId: item.$id } })}
      >
      <View style={styles.jobItem}>
        <Text style={styles.jobTitle}>{item.title}</Text>
        <Text>{item.company?.corp_name} - {item.company?.city}</Text>
      </View>
      </TouchableOpacity>
          )}
          />
          )}
    </View>           
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 50,
    flex: 1,
    backgroundColor: '#f0f4ff', // nền nhẹ tông xanh nhạt
  },
  heading: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#4A80F0',
  },
  dropdown: {
    borderColor: '#4A80F0',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  dropdownContainer: {
    borderColor: '#4A80F0',
    borderRadius: 10,
  },
  clearButton: {
    marginTop: 10,
    marginBottom: 20,
    color: '#e63946',
    fontWeight: 'bold',
    fontSize: 14,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#ffeaea',
  },
  jobListTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1d3557',
  },
  jobItem: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderLeftWidth: 5,
    borderLeftColor: '#4A80F0',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4A80F0',
    marginBottom: 4,
  },
  noJobsText: {
    fontStyle: 'italic',
    color: '#999',
    marginTop: 10,
  },
  
});
