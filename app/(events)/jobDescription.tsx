import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import { useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import {storage, account, databases, databases_id, collection_saved_jobs_id, ID, Query, collection_job_id, collection_user_id, collection_applied_jobs_id, collection_notifications_id, sendNotification } from '@/lib/appwrite'
import { Image } from 'react-native'
import { router } from 'expo-router'
import { Job } from '@/types/type'
const jobDescription = () => {
  const [selected, setSelected] = useState(0);

  const Switch_Selected = async (index: number) => {
    setSelected(index);
  }
  
  const {jobId} : {jobId: string} = useLocalSearchParams()
  const [userId, setUserId] = useState<string>('')
  const [checkSaveJob, setCheckSaveJob] = useState<boolean>(false)
  const [loadding, setLoadding] = useState<boolean>(false)
  const [jobIdOfUser, setJobIdOfUser] = useState<string>('')
  const [dataJob, setDataJob] = useState<any>(null);
  const [posterInfo, setPosterInfo] = useState<{ name?: string, email?: string }>({});
  const [isApplied, setIsApplied] = useState(false);
  const [applyDocId, setApplyDocId] = useState<string | null>(null);
 
  useEffect(() => {
    load_userId()
    load_data_save_jobs()
  },[userId])
  useEffect(() => {
    if (jobId) {
      load_data(jobId as string);
    }
  }, [jobId]);
  const load_data_save_jobs = async () => {
    try{
      if(userId){
        setLoadding(true)
        const dataSaveJobs = await databases.listDocuments(
          databases_id,
          collection_saved_jobs_id,
          [Query.equal('userId', userId), Query.equal('jobId', jobId)]
        )

        if(dataSaveJobs.documents.length > 0){
          setCheckSaveJob(true)
          setJobIdOfUser(dataSaveJobs.documents[0].$id)
        }else{
          setCheckSaveJob(false)
        }
        setLoadding(false)
      }
    }catch{
      setLoadding(false)
    }
  }
  const load_data = async (id: string) => {

    try {
      const result = await databases.getDocument(
        databases_id,
        collection_job_id,
        id
      );

      if (result.users?.$id) {
        try {

          const userDoc = await databases.getDocument(
            databases_id,
            collection_user_id,
            result.users.$id
          );


          if (userDoc.name) {
            setPosterInfo({
              name: userDoc.name,
              email: userDoc.email
            });
          }
        } catch (dbError) {
          console.log("Không lấy được từ Database:", dbError);
        }
      }
      setDataJob(result);
      console.log(result);
    } catch (error) {
      console.log(error);
    }
  };
  const load_userId = async () => {
    const user = await account.get()
    setUserId(user.$id)
  }

  const add_jobs = async () => {
    try{
      if (userId){
        setLoadding(true)
        await databases.createDocument(
          databases_id,
          collection_saved_jobs_id,
          ID.unique(),
          {
            userId: userId,
            jobId: jobId,
          }
        );
         // Gửi thông báo khi thêm công việc vào yêu thích
        await sendNotification(
          userId,
          `Công việc ${dataJob?.title} đã được thêm vào danh sách yêu thích`,
          'favorited',
          jobId
        );
        await load_data_save_jobs()
      }
    }catch{
      setLoadding(false)
    }
  }

  const delete_jobs = async () => {
    try{
      if (userId){
        setLoadding(true)
        await databases.deleteDocument(
          databases_id,
          collection_saved_jobs_id,
          jobIdOfUser
        )
        await load_data_save_jobs()
        console.log('xoa thanh cong')
      }
    }catch{
      setLoadding(false)
    }
  }
  const checkIfApplied = async () => {
    try {
      const res = await databases.listDocuments(databases_id, collection_applied_jobs_id, [
        Query.equal('userId', userId || ''),
        Query.equal('jobId', jobId),
      ]);
      if (res.documents.length > 0) {
        setIsApplied(true);
        setApplyDocId(res.documents[0].$id);
      } else {
        setIsApplied(false);
        setApplyDocId(null);
      }
    } catch (err) {
      console.error('Check applied error:', err);
    }
  };
  useEffect(() => {
    if (userId && jobId) {
      checkIfApplied();
    }
  }, [userId, jobId]);
 const handleApply = async () => {
  try {
    const applyDoc = await databases.createDocument(
      databases_id,
      collection_applied_jobs_id,
      ID.unique(),
      {
        userId: userId,
        jobId: jobId,
        status: 'pending',
        applied_at: new Date().toISOString(),
      }
    );
    setIsApplied(true);
    await checkIfApplied();
      // Gửi thông báo cho người xin việc
      await sendNotification(
        userId,
        `Bạn đã ứng tuyển công việc ${dataJob?.title}`,
        'applied',
        jobId
      );

      // Gửi thông báo cho nhà tuyển dụng
      if (dataJob?.users?.$id) {
        await sendNotification(
          dataJob.users.$id,
          `Có người ứng tuyển vào công việc ${dataJob?.title}`,
          'applied',
          jobId
        );
      }
    // Chuyển hướng đến trang Submit, truyền jobId và userId
    router.push({
      pathname: '/submit',
      params: { jobId, userId, applyDocId: applyDoc.$id },
    });
  } catch (err) {
    console.error('Apply failed:', err);
  }
};
  
 const handleCancelApply = async () => {
  if (!applyDocId) {
    console.log("No application found to cancel");
    return;
  }

  try {
    setLoadding(true); // show loading state

    // Lấy document để lấy cv_url
    const document = await databases.getDocument(
      databases_id,
      collection_applied_jobs_id,
      applyDocId
    );

    // Trích xuất fileId từ cv_url (nếu có)
    if (document.cv_url) {
      // Giả sử cv_url có dạng: https://cloud.appwrite.io/v1/storage/buckets/<bucketId>/files/<fileId>/view?...
      const urlParts = document.cv_url.split('/files/');
      if (urlParts.length > 1) {
        const fileId = urlParts[1].split('/')[0]; // Lấy fileId
        try {
          await storage.deleteFile('681f22880030984d2260', fileId); // Xóa file trong Storage
          console.log('File deleted successfully:', fileId);
        } catch (storageError) {
          console.error('Failed to delete file:', storageError);
          // Tiếp tục xóa document ngay cả khi xóa file thất bại
        }
      }
    }

    // Xóa document trong collection_applied_jobs_id
    await databases.deleteDocument(databases_id, collection_applied_jobs_id, applyDocId);
    await sendNotification(
          userId,
          `Công việc ${dataJob?.title} đã được hủy bỏ`,
          'cancelled',
          jobId
        );
    console.log('Application cancelled successfully');

    setIsApplied(false);
    setApplyDocId(null);
  } catch (err) {
    console.error('Cancel failed:', err);
    Alert.alert('Lỗi', 'Không thể hủy ứng tuyển, vui lòng thử lại');
  } finally {
    setLoadding(false); // hide loading state
  }
};
  const reloadJobDetails = async () => {
    try {
      const jobDetails = await databases.getDocument(
        databases_id,
        collection_job_id,
        jobId
      );
      setDataJob(jobDetails); 
    } catch (error) {
      console.error('Failed to reload job details:', error);
    }
  };
  
  if (loadding || !dataJob) {
    return (
      <View style={[styles.container, {justifyContent: 'center', alignItems: 'center'}]}>
        <Text>Loading job details...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.topView}>
        <TouchableOpacity style={styles.buttons} onPress={() => router.push("/")}>
          <Ionicons name='arrow-back' size={24} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.buttons} onPress={() => router.push("/")}>
          <Ionicons name='share-social' size={24} />
        </TouchableOpacity>
      </View>
      <View style={styles.headerContainer}>
        <View style={styles.jobImageContainer}>
          <Image
            style={styles.jobImage}
            source={{ uri: dataJob?.image || 'https://placeholder.com/default-image.png' }}
          />
        </View>
        <View style={styles.companyName}>

          <Text style={styles.companyNameText}>{dataJob?.title}</Text>
          <Text style={styles.companyNameText}>{dataJob?.company?.corp_name}</Text>
        </View>
        <View style={styles.jobInfoContainer}>
          <View style={styles.jobInfoBox}>
            <Text style={styles.jobInfoText}>{dataJob?.jobTypes?.type_name || "No Job Type"}</Text>
          </View>
          <View style={styles.jobInfoBox}>
            <Text style={styles.jobInfoText}>{dataJob?.jobCategories?.category_name || "No Job Category"}</Text>
          </View>
        </View>
        <View style={styles.companyInfoBox}>
          <View>
            <Text style={styles.companyInfoText}>$ {dataJob?.salary}</Text>
          </View>
          <View style={styles.companyLocation}>
            <Text style={styles.companyInfoText}>{dataJob?.company?.city} /</Text>
            <Ionicons style={styles.companyInfoText2} name='location' size={24} />
            <Text style={styles.companyInfoText2}>{dataJob?.company?.nation || "No Nation"}</Text>
          </View>
        </View>
      </View>
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tabBox, selected === 0 ? styles.tabActive : styles.tabNormal]} onPress={() => Switch_Selected(0)}>
          <Text style={[selected === 0 ? styles.tabActiveText : styles.tabNormalText]}>About</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBox, selected === 1 ? styles.tabActive : styles.tabNormal]} onPress={() => Switch_Selected(1)}>
          <Text style={[selected === 1 ? styles.tabActiveText : styles.tabNormalText]}>Qualification</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBox, selected === 2 ? styles.tabActive : styles.tabNormal]} onPress={() => Switch_Selected(2)}>
          <Text style={[selected === 2 ? styles.tabActiveText : styles.tabNormalText]}>Responsibility</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.contentTab}>
        {selected === 0 ? (
          <View>
            <Text style={styles.descriptionContent}>
            Người đăng: {posterInfo.name || posterInfo.email || "Ẩn danh"}
            </Text>
            <Text style={styles.descriptionContent}>{dataJob.job_Description}</Text>
            <Text style={styles.descriptionContent}>{dataJob.skills_required}</Text>
            <Text style={styles.descriptionContent}>{dataJob.responsibilities}</Text>

          </View>
        )
          : selected === 1 ? (
            <Text style={styles.descriptionContent}>{dataJob.skills_required}</Text>

          )
            : (
              <Text style={styles.descriptionContent}>{dataJob.responsibilities}</Text>
            )
        }
      </View>
      <View style={styles.bottomContainer}>
        {
          checkSaveJob?(
        <TouchableOpacity style={styles.heartContainer}  onPress={delete_jobs}>
          <Ionicons
            name='heart' size={20} color={'red'}
            style={[
              styles.iconHeart
            ]}
          />
        </TouchableOpacity>
) : (
  <TouchableOpacity style={styles.heartContainer} onPress={add_jobs}>
    <Ionicons name='heart-outline' size={20} color={'red'}
    style={[
      styles.iconHeartActive
    ]}/>
  </TouchableOpacity>
)
}
{isApplied ? (
  <TouchableOpacity
    style={styles.applyContainer}
    onPress={handleCancelApply}
  >
    <Text style={styles.applyText}>Cancel Apply</Text>
  </TouchableOpacity>
) : (
  <TouchableOpacity
    style={styles.applyContainer}
    onPress={handleApply}
  >
    <Text style={styles.applyText}>Apply Now</Text>
  </TouchableOpacity>
)}
      </View>
    </View>
  )
}

export default jobDescription

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 30,
    backgroundColor: '#fff',
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
    alignItems: "center",
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
    justifyContent: 'space-between',


  },
  companyInfoText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  companyInfoText2: {
    fontSize: 15,
    textShadowColor: 'black',
    color: '#a9a9a9'
  },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    alignItems: "center",
    gap: 10,
  },
  tabBox: {
    borderWidth: 0,
    borderRadius: 15,
    height: 50,
    width: "100%",
    justifyContent: 'center',
    alignItems: "center",
    flex: 1,

  },
  tabNormal: {
    backgroundColor: '#EEEEEE'
  },
  tabNormalText: {
    color: '#AAAAAA'
  },
  tabActive: {
    backgroundColor: '#2F264F'
  },
  tabActiveText: {
    color: 'white',
  },

  contentTab: {
    backgroundColor: '#EEEEEE',
    borderRadius: 10,
    padding: 14,
    height: 450,
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
  jobInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'center',

    gap: 10,

  },
  jobInfoBox: {
    backgroundColor: 'blue',
    borderWidth: 0,
    borderRadius: 15,
    padding: 5,
  },
  jobInfoText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: 'white',
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
    alignItems: "center",
    gap: 15,
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  heartContainer: {
    borderWidth: 0,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
    borderRadius: 20,
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconHeart: {
    fontSize: 32,
    color: '#F97459',
  },
  iconHeartActive: {
    color: '#F97459',
    fontSize: 32,
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
  applyText: {
    fontSize: 20,
    color: 'white',
    fontWeight: 'bold',
  },
})