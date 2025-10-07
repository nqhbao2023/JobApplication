import { 
  Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, Image, Platform, StatusBar 
} from 'react-native';
import React, { useEffect, useState, useCallback } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { db, auth, storage } from '../../src/config/firebase';
import { ref as storageRef, deleteObject } from 'firebase/storage';
import { collection, addDoc, deleteDoc, doc, query, where, getDocs, getDoc } from 'firebase/firestore';
import { useFocusEffect } from '@react-navigation/native';

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
  company?: any;
};

const JobDescription = () => {
  const [selected, setSelected] = useState(0);
  const { jobId, success }: { jobId: string; success?: string } = useLocalSearchParams();

  const [userId, setUserId] = useState<string>('');
  const [checkSaveJob, setCheckSaveJob] = useState<boolean>(false);
  const [loadding, setLoadding] = useState<boolean>(false);
  const [jobIdOfUser, setJobIdOfUser] = useState<string>('');
  const [dataJob, setDataJob] = useState<any>(null);
  const [posterInfo, setPosterInfo] = useState<{ name?: string; email?: string }>({});
  const [isApplied, setIsApplied] = useState(false);
  const [applyDocId, setApplyDocId] = useState<string | null>(null);

  // ✅ Load user & saved jobs
  useEffect(() => {
    load_userId();
    load_data_save_jobs();
  }, [userId]);

  // ✅ Load job detail
  useEffect(() => {
    if (jobId) load_data(jobId as string);
  }, [jobId]);

  // ✅ Khi quay lại focus trang
  useFocusEffect(
    useCallback(() => {
      if (userId && jobId) {
        console.log('🔁 Refreshing applied status...');
        checkIfApplied();
      }
    }, [userId, jobId])
  );

  // ✅ Khi success=true (upload CV thành công)
  useEffect(() => {
    if (success === 'true') {
      console.log('✅ CV upload success, refreshing applied status...');
      setTimeout(() => {
        checkIfApplied();
        Alert.alert('🎉 Thành công', 'Bạn đã nộp CV thành công!');
      }, 800);
    }
  }, [success]);

  // ✅ Check nếu user đã apply
  const checkIfApplied = async () => {
    try {
      const q = query(
        collection(db, 'applied_jobs'),
        where('userId', '==', userId),
        where('jobId', '==', jobId)
      );
      const res = await getDocs(q);
      console.log('📦 Applied job query result:', res.size);

      if (!res.empty) {
        const docData = res.docs[0].data();
        console.log('🔥 Applied job data:', docData);
        setApplyDocId(res.docs[0].id);

        if (docData.cv_url || docData.cv_uploaded) {
          console.log('✅ Found CV uploaded -> applied = true');
          setIsApplied(true);
        } else {
          console.log('⚠️ No cv_url yet -> applied = false');
          setIsApplied(false);
        }
      } else {
        console.log('❌ No applied job found for user/job');
        setIsApplied(false);
        setApplyDocId(null);
      }
    } catch (err) {
      console.error('Check applied error:', err);
    }
  };

  // ✅ Delay nhẹ khi mount
  useEffect(() => {
    if (userId && jobId) {
      console.log('🔁 Running initial applied check...');
      setTimeout(() => checkIfApplied(), 800);
    }
  }, [userId, jobId]);

  const load_userId = async () => {
    const user = auth.currentUser;
    if (user) setUserId(user.uid);
  };

  const load_data_save_jobs = async () => {
    try {
      if (userId && jobId) {
        setLoadding(true);
        const q = query(collection(db, 'saved_jobs'), where('userId', '==', userId), where('jobId', '==', jobId));
        const res = await getDocs(q);
        if (!res.empty) {
          setCheckSaveJob(true);
          setJobIdOfUser(res.docs[0].id);
        } else {
          setCheckSaveJob(false);
        }
        setLoadding(false);
      }
    } catch {
      setLoadding(false);
    }
  };

  const load_data = async (id: string) => {
    try {
      const docRef = doc(db, 'jobs', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const result = docSnap.data();
        setDataJob(result);

        if (result.users?.id) {
          const userRef = doc(db, 'users', result.users.id);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userDoc = userSnap.data();
            setPosterInfo({
              name: userDoc.name,
              email: userDoc.email,
            });
          }
        }
      } else {
        setDataJob(null);
      }
    } catch (error) {
      console.error('Load job error:', error);
      setDataJob(null);
    }
  };

  const add_jobs = async () => {
    try {
      if (userId) {
        setLoadding(true);
        await addDoc(collection(db, 'saved_jobs'), { userId, jobId, created_at: new Date().toISOString() });
        await load_data_save_jobs();
      }
    } catch {
      setLoadding(false);
    }
  };

  const delete_jobs = async () => {
    try {
      if (userId) {
        setLoadding(true);
        await deleteDoc(doc(db, 'saved_jobs', jobIdOfUser));
        await load_data_save_jobs();
      }
    } catch {
      setLoadding(false);
    }
  };

  const handleApply = async () => {
    if (!userId) {
      Alert.alert("Thông báo", "Bạn cần đăng nhập trước khi ứng tuyển");
      return;
    }
    if (!jobId) {
      Alert.alert("Lỗi", "Thiếu Job ID");
      return;
    }

    try {
      console.log("🚀 Apply with:", { userId, jobId });

      // 🔥 Xóa các applied_jobs cũ trùng userId + jobId (nếu có)
      const q = query(collection(db, "applied_jobs"), where("userId", "==", userId), where("jobId", "==", jobId));
      const res = await getDocs(q);
      const deletePromises = res.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(deletePromises);

      // 🔹 Tạo document mới
      const docRef = await addDoc(collection(db, "applied_jobs"), {
        userId,
        jobId,
        cv_uploaded: false,
        status: "draft",
        applied_at: new Date().toISOString(),
      });

      // ✅ Chuyển sang màn submit để upload CV
      router.push(`/submit?jobId=${jobId}&userId=${userId}&applyDocId=${docRef.id}`);
    } catch (err) {
      console.error("❌ Apply failed:", err);
    }
  };

  const handleCancelApply = async () => {
    if (!applyDocId) return;
    try {
      setLoadding(true);
      const applyRef = doc(db, 'applied_jobs', applyDocId);
      const applySnap = await getDoc(applyRef);
      if (applySnap.exists()) {
        const data = applySnap.data();
        if (data.cv_url) {
          const fileRef = storageRef(storage, data.cv_url);
          await deleteObject(fileRef)
            .then(() => console.log('🗑️ CV file deleted from Storage'))
            .catch((err) => console.warn('⚠️ Storage delete failed:', err));
        }
      }
      await deleteDoc(applyRef);
      setIsApplied(false);
      setApplyDocId(null);
      Alert.alert('✅ Thành công', 'Đã hủy ứng tuyển và xóa file CV.');
    } catch (err) {
      console.error('❌ Cancel failed:', err);
      Alert.alert('Lỗi', 'Không thể hủy ứng tuyển hoặc xóa file CV.');
    } finally {
      setLoadding(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContent} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header */}
        <View style={styles.topView}>
          <TouchableOpacity style={styles.buttons} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.buttons} onPress={() => router.push('/')}>
            <Ionicons name="share-social" size={24} />
          </TouchableOpacity>
        </View>

        {/* Job Info */}
        <View style={styles.headerContainer}>
          <View style={styles.jobImageContainer}>
            <Image style={styles.jobImage} source={{ uri: dataJob?.image || 'https://placeholder.com/default-image.png' }} />
          </View>
          <View style={styles.companyName}>
            <Text style={styles.companyNameText}>{dataJob?.title}</Text>
            <Text style={styles.companyNameText}>{dataJob?.company?.corp_name}</Text>
          </View>
          <View style={styles.jobInfoContainer}>
            <View style={styles.jobInfoBox}>
              <Text style={styles.jobInfoText}>{dataJob?.jobTypes?.type_name || 'No Job Type'}</Text>
            </View>
            <View style={styles.jobInfoBox}>
              <Text style={styles.jobInfoText}>{dataJob?.jobCategories?.category_name || 'No Job Category'}</Text>
            </View>
          </View>
          <View style={styles.companyInfoBox}>
            <Text style={styles.companyInfoText}>$ {dataJob?.salary}</Text>
            <View style={styles.companyLocation}>
              <Text style={styles.companyInfoText}>{dataJob?.company?.city} / </Text>
              <Ionicons style={styles.companyInfoText2} name="location" size={20} />
              <Text style={styles.companyInfoText2}>{dataJob?.company?.nation || 'No Nation'}</Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity style={[styles.tabBox, selected === 0 ? styles.tabActive : styles.tabNormal]} onPress={() => setSelected(0)}>
            <Text style={[selected === 0 ? styles.tabActiveText : styles.tabNormalText]}>About</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBox, selected === 1 ? styles.tabActive : styles.tabNormal]} onPress={() => setSelected(1)}>
            <Text style={[selected === 1 ? styles.tabActiveText : styles.tabNormalText]}>Qualification</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBox, selected === 2 ? styles.tabActive : styles.tabNormal]} onPress={() => setSelected(2)}>
            <Text style={[selected === 2 ? styles.tabActiveText : styles.tabNormalText]}>Responsibility</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.contentTab}>
          {selected === 0 ? (
            <View>
              <Text style={styles.descriptionContent}>Người đăng: {posterInfo.name || posterInfo.email || 'Ẩn danh'}</Text>
              <Text style={styles.descriptionContent}>{dataJob?.job_Description || 'Không có mô tả công việc'}</Text>
              <Text style={styles.descriptionContent}>{dataJob?.skills_required || 'Không có kỹ năng yêu cầu'}</Text>
              <Text style={styles.descriptionContent}>{dataJob?.responsibilities || 'Không có trách nhiệm công việc'}</Text>
            </View>
          ) : selected === 1 ? (
            <Text style={styles.descriptionContent}>{dataJob.skills_required}</Text>
          ) : (
            <Text style={styles.descriptionContent}>{dataJob.responsibilities}</Text>
          )}
        </View>
      </ScrollView>

      {/* Bottom Buttons */}
      <View style={styles.bottomContainer}>
        {checkSaveJob ? (
          <TouchableOpacity style={styles.heartContainer} onPress={delete_jobs}>
            <Ionicons name="heart" size={24} color="red" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.heartContainer} onPress={add_jobs}>
            <Ionicons name="heart-outline" size={24} color="red" />
          </TouchableOpacity>
        )}
        {isApplied ? (
          <TouchableOpacity style={styles.applyContainer} onPress={handleCancelApply}>
            <Text style={styles.applyText}>Cancel Apply</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.applyContainer} onPress={handleApply}>
            <Text style={styles.applyText}>Apply Now</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default JobDescription;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { flex: 1 },

  // ✅ Header tránh bị taskbar Android che
  topView: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 10,
    zIndex: 10,
  },

  buttons: {
    height: 40,
    width: 40,
    backgroundColor: 'white',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  jobImage: { height: 100, width: 100, borderRadius: 50 },
  jobImageContainer: { marginTop: 10, height: 120, justifyContent: 'center', alignItems: 'center', backgroundColor: '#EBF2FC' },
  companyName: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#EBF2FC', padding: 10 },
  companyNameText: { fontSize: 20, fontWeight: 'bold' },
  companyInfoBox: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginVertical: 10 },
  companyInfoText: { fontSize: 15, fontWeight: 'bold' },
  companyInfoText2: { fontSize: 15, color: '#a9a9a9' },
  tabs: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 20, marginBottom: 10, gap: 10 },
  tabBox: { borderRadius: 15, height: 40, flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabNormal: { backgroundColor: '#EEEEEE' },
  tabNormalText: { color: '#AAAAAA' },
  tabActive: { backgroundColor: '#2F264F' },
  tabActiveText: { color: 'white', fontWeight: 'bold' },
  contentTab: { backgroundColor: '#EEEEEE', borderRadius: 10, padding: 14, marginHorizontal: 20, marginBottom: 20 },
  descriptionContent: { fontSize: 15, color: 'black', textAlign: 'justify', marginBottom: 8 },
  bottomContainer: { flexDirection: 'row', alignItems: 'center', gap: 15, padding: 15, borderTopWidth: 1, borderTopColor: '#eee', backgroundColor: '#fff' },
  heartContainer: { width: 55, height: 55, borderRadius: 28, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 5 },
  applyContainer: { flex: 1, height: 55, backgroundColor: '#F97459', borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  applyText: { fontSize: 18, color: 'white', fontWeight: 'bold' },
  headerContainer: { margin: 20, padding: 15, borderRadius: 10, backgroundColor: '#EBF2FC' },
  jobInfoContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginVertical: 10 },
  jobInfoBox: { backgroundColor: '#2F80ED', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15 },
  jobInfoText: { fontSize: 14, color: '#fff', fontWeight: 'bold' },
  companyLocation: { flexDirection: 'row', alignItems: 'center', gap: 5 },
});
