import { 
  Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, Image, Platform, StatusBar 
} from 'react-native';
import React, { useEffect, useState, useCallback } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { db, auth, storage } from '../../src/config/firebase';
import { ref as storageRef, deleteObject } from 'firebase/storage';
import { collection, addDoc, deleteDoc, doc, query, where, getDocs, getDoc,writeBatch } from 'firebase/firestore';
import { useFocusEffect } from '@react-navigation/native';
import { useRole } from '@/contexts/RoleContext';
import { smartBack } from "@/utils/navigation";
import { ActivityIndicator } from 'react-native-paper';
import { useRef } from "react";
import { useJobStatus } from "@/hooks/useJobStatus";
import { onAuthStateChanged } from "firebase/auth";
import ContactEmployerButton from "@/components/ContactEmployerButton";
const JobDescription = () => {
  const [selected, setSelected] = useState(0);

const params = useLocalSearchParams<{
  id?: string;
  jobId?: string;
  success?: string;
  fromApplied?: string;
  status?: string;
  appliedAt?: string;
}>();

// CHỈ dùng biến jobId này trong file
const jobId = (params.jobId || params.id || "") as string;
const { success, fromApplied, status, appliedAt } = params;

  
  const [userId, setUserId] = useState<string>('');
  const [loadding, setLoadding] = useState<boolean>(false);
  const [dataJob, setDataJob] = useState<any>(null);
  const [posterInfo, setPosterInfo] = useState<{ name?: string; email?: string }>({});
  const [isApplied, setIsApplied] = useState(false);
  const [applyDocId, setApplyDocId] = useState<string | null>(null);
  const [appliedLoading, setAppliedLoading] = useState(true);
  const { isSaved, saveLoading, toggleSave } = useJobStatus(jobId || undefined as any);
  const [fromAppliedImmediate, setFromAppliedImmediate] = useState(false);
const checkingRef = useRef(false);
const [jobData, setJobData] = useState<any>(null);

const { role: userRole, loading: roleLoading } = useRole();
// ✅ gom các khả năng đặt field owner trong job
const resolveOwnerId = (job: any): string | null => {
  const v =
    job?.ownerId ??
    job?.userId ??
    job?.createdBy ??
    job?.created_by ??
    job?.uid ??
    job?.posterId ??
    job?.users ?? null; // có nơi lưu thẳng 'users' = string/object

  if (!v) return null;
  if (typeof v === 'string') return v;
  if (typeof v === 'object') {
    if (typeof v.id === 'string') return v.id;
    if (typeof v.uid === 'string') return v.uid;
  }
  return null;
};

const jobOwnerId = resolveOwnerId(dataJob);
const isOwner = !!userId && !!jobOwnerId && jobOwnerId === userId;

// 🔐 Candidate chỉ khi không phải chủ job
const showCandidateUI = userRole === 'candidate' && !isOwner;
// 🛠 Employer chỉ khi là chủ job
const showEmployerUI = userRole === 'employer' && isOwner;
  // ✅ Load user & saved jobs
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (user) {
      setUserId(user.uid);
      // ✅ Gọi check ngay khi userId có thật
      if (jobId) checkIfApplied();
    } else {
      setUserId("");
    }
  });
  return unsubscribe;
}, [jobId]);



useEffect(() => {
  if (!userId || !jobId) return;
  checkIfApplied();
}, [userId, jobId, success]);

useEffect(() => {
  if (fromApplied && fromApplied === 'true') {
    setFromAppliedImmediate(true);
  }
}, [fromApplied]);

//useEffect(() => {
//if (userId) load_data_save_jobs();
//}, [userId]);
useEffect(() => {
  if (jobId) load_data(jobId as string);
}, [jobId]);


  // ✅ Check nếu user đã apply
const checkIfApplied = async () => {
  // chặn gọi khi chưa sẵn sàng
  if (!userId || !jobId) {
    setAppliedLoading(false);
    return;
  }
  // chặn gọi trùng
  if (checkingRef.current) return;
  checkingRef.current = true;

  setAppliedLoading(true);
  try {
    const q = query(
      collection(db, "applied_jobs"),
      where("userId", "==", userId),
      where("jobId", "==", jobId)
    );
    const res = await getDocs(q);
    console.log(`📦 Applied job found: ${res.size > 0 ? "YES" : "NO"}`);

    if (!res.empty) {
      const docData = res.docs[0].data();
      setApplyDocId(res.docs[0].id);
      setIsApplied(!!(docData.cv_url || docData.cv_uploaded));
    } else {
      setIsApplied(false);
      setApplyDocId(null);
    }
  } catch (err) {
    console.error("Check applied error:", err);
  } finally {
    setAppliedLoading(false);
    checkingRef.current = false; // ✅ reset flag
  }
};


  // ✅ Khi quay lại focus trang
useFocusEffect(
  useCallback(() => {
    if (!userId || !jobId) return;
    console.log('🔁 Refreshing applied status...');
    const timer = setTimeout(() => {
      checkIfApplied();
    }, 200);
    return () => clearTimeout(timer);
  }, [userId, jobId])
);


useEffect(() => {
  // Chỉ log khi userId đã có giá trị thật
  if (!userId) return;
  console.log(
    '🔎 role:', userRole,
    'loading:', roleLoading,
    'userId:', userId,
    'jobOwnerId:', jobOwnerId,
    'isOwner:', isOwner,
    'showCandidateUI:', showCandidateUI,
    'showEmployerUI:', showEmployerUI
  );
}, [userRole, roleLoading, userId, jobOwnerId, isOwner, showCandidateUI, showEmployerUI]);


  // ✅ Khi success=true (upload CV thành công)
useEffect(() => {
  if (success === 'true') {
    Alert.alert('🎉 Thành công', 'Bạn đã nộp CV thành công!');
    if (userId) {
      checkIfApplied();        // Gọi ngay khi đã có userId
    }
  }
}, [success, userId]);         // ⬅️ thêm userId vào deps

  const load_userId = async () => {
    const user = auth.currentUser;
    if (user) setUserId(user.uid);
  };

  const load_data = async (id: string) => {
    try {
      const docRef = doc(db, 'jobs', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const result = docSnap.data();
        setDataJob(result);
        setJobData(result);

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

    // 🔹 1️⃣ Xóa mọi applied_jobs cũ của user với job này (đề phòng apply lại)
    const q = query(
      collection(db, "applied_jobs"),
      where("userId", "==", userId),
      where("jobId", "==", jobId)
    );
    const res = await getDocs(q);
    const deletePromises = res.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletePromises);

    // 🔹 2️⃣ Lấy dữ liệu job để đính kèm thêm vào bản ghi ứng tuyển
    const jobRef = doc(db, "jobs", jobId);
    const jobSnap = await getDoc(jobRef);
    const jobData = jobSnap.exists() ? jobSnap.data() : null;
    setJobData(jobData);

    // 🔹 3️⃣ Lấy thêm thông tin người dùng (để employer xem dễ)
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.exists() ? userSnap.data() : null;

    // 🔹 4️⃣ Tạo document applied_jobs mới
    const docRef = await addDoc(collection(db, "applied_jobs"), {
      userId,
      employerId: jobOwnerId || "",
      jobId,
      cv_uploaded: false,
      cv_url: null, // ⚡ reset để tránh link CV cũ lỗi
      status: "pending", // ✅ chuyển sang pending để employer thấy đúng nút Duyệt
      applied_at: new Date().toISOString(),

      // ⚙️ Thông tin bổ sung để employer hiển thị nhanh hơn
      jobInfo: {
        title: jobData?.title || "",
        company: jobData?.company?.corp_name || "",
        salary: jobData?.salary || "",
      },
      userInfo: {
        name: userData?.name || "",
        email: userData?.email || "",
        photoURL: userData?.photoURL || null,
      },
    });

    // 🔹 5️⃣ Cập nhật UI ngay lập tức
    setIsApplied(true);
    setAppliedLoading(false);


    // 🔹 6️⃣ Điều hướng sang trang submit (upload CV)
    router.replace(
      `/submit?jobId=${jobId}&userId=${userId}&applyDocId=${docRef.id}` as any
    );

    console.log("✅ Applied job created:", docRef.id);
  } catch (err) {
    console.error("❌ Apply failed:", err);
    Alert.alert("Lỗi", "Không thể ứng tuyển công việc này, thử lại sau!");
  }
};


const handleCancelApply = async () => {
  try {
    setLoadding(true);

    // 🔎 Truy vấn chính xác hồ sơ ứng tuyển hiện tại
    const q = query(
      collection(db, "applied_jobs"),
      where("userId", "==", userId),
      where("jobId", "==", jobId)
    );
    const res = await getDocs(q);

    if (res.empty) {
      Alert.alert("⚠️ Không tìm thấy hồ sơ ứng tuyển để hủy.");
      return;
    }

    // ✅ Xóa từng hồ sơ tìm thấy
    for (const docSnap of res.docs) {
      const data = docSnap.data();

      // 🗑️ Nếu có file CV thì xóa trên Storage
      if (data.cv_url) {
        try {
          // 👉 Phải chuyển URL về path tương đối
          const decodedPath = decodeURIComponent(
            data.cv_url.split("/o/")[1].split("?")[0]
          );
          const fileRef = storageRef(storage, decodedPath);
          await deleteObject(fileRef);
          console.log(`🗑️ CV file deleted from Storage: ${decodedPath}`);
        } catch (err) {
          console.warn("⚠️ Không thể xóa file trên Storage:", err);
        }
      }
      // 🧹 Xóa document Firestore
      await deleteDoc(docSnap.ref);
      console.log(`🔥 Deleted applied_jobs document: ${docSnap.id}`);
    }

    // ✅ Cập nhật UI
    setIsApplied(false);
    setAppliedLoading(false);
    setApplyDocId(null);

    Alert.alert("✅ Thành công", "Đã hủy ứng tuyển và xóa CV.");
  } catch (err) {
    console.error("❌ Cancel failed:", err);
    Alert.alert("Lỗi", "Không thể hủy ứng tuyển hoặc xóa file CV.");
  } finally {
    setLoadding(false);
  }
};

const handleDeleteJob = async () => {
  Alert.alert(
    "Xóa công việc?",
    // Thêm cảnh báo rõ ràng hơn
    "Bạn có chắc muốn xóa bài đăng này? Mọi dữ liệu (lượt apply, lượt save) liên quan cũng sẽ bị xóa.", 
    [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          // Đây là phần 'cà phê' mình thêm vào nè!
          try {
            setLoadding(true); // Bật loading
            console.log(`🔥 Bắt đầu xóa Job ID: ${jobId}`);

            const jobRef = doc(db, 'jobs', jobId);
            
            // 1. Tìm tất cả 'applied_jobs' liên quan
            const appliedQuery = query(collection(db, 'applied_jobs'), where('jobId', '==', jobId));
            const appliedSnap = await getDocs(appliedQuery);
            
            // 2. Tìm tất cả 'saved_jobs' liên quan
            // (Anh giả sử collection tên là 'saved_jobs', em chỉnh lại nếu tên khác nhé)
            const savedQuery = query(collection(db, 'saved_jobs'), where('jobId', '==', jobId));
            const savedSnap = await getDocs(savedQuery);

            // 3. Dùng WriteBatch cho an toàn (all or nothing)
            const batch = writeBatch(db);

            // Thêm job chính vào batch
            batch.delete(jobRef);

            // Thêm tất cả applied docs vào batch
            appliedSnap.forEach(d => batch.delete(d.ref));

            // Thêm tất cả saved docs vào batch
            savedSnap.forEach(d => batch.delete(d.ref));

            // 4. Thực thi batch!
            await batch.commit();

            Alert.alert("✅ Đã xóa!", "Công việc và dữ liệu liên quan đã được xóa.");
            console.log(`✅ Xóa thành công Job ID: ${jobId} (và ${appliedSnap.size} applied, ${savedSnap.size} saved)`);
            
            // Xóa xong thì 'lượn' (quay về trang trước)
            smartBack(); 

          } catch (err) {
            console.error("Lỗi khi xóa job:", err);
            Alert.alert("Lỗi", "Không thể xóa công việc. Vui lòng thử lại.");
          } finally {
            setLoadding(false); // Tắt loading dù thành công hay thất bại
          }
        },
      },
    ]
  );
};
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContent} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header */}
        <View style={styles.topView}>
<TouchableOpacity
  style={styles.buttons}
  onPress={() => {
    if (fromApplied === "true") {
      // 👇 Nếu đến từ trang AppliedJob
      router.replace("/(candidate)/appliedJob");
    } else {
      // 👇 Ngược lại, dùng smartBack như bình thường (về Home)
      smartBack();
    }
  }}
>
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
            <Text style={styles.companyNameText}>{dataJob?.company?.corp_name ?? 'Đang tải...'}</Text>
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
        {(fromAppliedImmediate || isApplied) && (
  <View style={styles.appliedInfoBox}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Ionicons name="checkmark-done" size={18} color="#34C759" />
      <Text style={styles.appliedInfoText}>Đã ứng tuyển</Text>
    </View>
    {!!status && <Text style={styles.appliedInfoStatus}>Trạng thái: {String(status)}</Text>}
    {!!appliedAt && (
      <Text style={styles.appliedInfoDate}>
        Ngày nộp: {new Date(appliedAt).toLocaleDateString('vi-VN')}
      </Text>
    )}
  </View>
)}


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
{/* --- BOTTOM ACTION BAR --- */}
<View style={styles.bottomBar}>
  {/* ❤️ Save */}
  {showCandidateUI && (
    <TouchableOpacity
      style={styles.saveBtn}
      onPress={toggleSave}
      disabled={saveLoading}
      activeOpacity={0.8}
    >
      <Ionicons
        name={isSaved ? "heart" : "heart-outline"}
        size={24}
        color={isSaved ? "#F97459" : "#999"}
      />
    </TouchableOpacity>
  )}

  {/* 🚀 Apply / Cancel */}
  {showCandidateUI && (
    !userId ? (
      <TouchableOpacity style={[styles.actionBtn, styles.disabledBtn]} disabled>
        <ActivityIndicator size="small" color="#F97459" />
      </TouchableOpacity>
    ) : appliedLoading ? (
      <TouchableOpacity style={[styles.actionBtn, styles.disabledBtn]} disabled>
        <ActivityIndicator size="small" color="#F97459" />
      </TouchableOpacity>
    ) : (fromAppliedImmediate || isApplied) ? (
      <TouchableOpacity
        style={[styles.actionBtn, styles.cancelBtn]}
        onPress={handleCancelApply}
      >
        <Text style={styles.actionText}>Cancel Apply</Text>
      </TouchableOpacity>
    ) : (
      <TouchableOpacity
        style={[styles.actionBtn, styles.applyBtn]}
        onPress={handleApply}
      >
        <Text style={styles.actionText}>Apply Now</Text>
      </TouchableOpacity>
    )
  )}

  {/* 💬 Contact Employer */}
  {dataJob && (
    <ContactEmployerButton
      employerId={dataJob.ownerId}
      employerName={dataJob.contact_name || "Nhà tuyển dụng"}
      role="Candidate"
      style={styles.chatBtn}
    />
  )}
</View>

{/* ✏️ Employer actions */}
{showEmployerUI && (
  <View style={styles.employerButtons}>
    <TouchableOpacity
      style={[styles.editButton, { backgroundColor: '#4A80F0' }]}
      onPress={() =>
        router.push({ pathname: '/employer/editJob', params: { id: jobId as string } } as any)
      }
    >
      <Ionicons name="create-outline" size={20} color="#fff" />
      <Text style={styles.employerText}>Edit Job</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={[styles.editButton, { backgroundColor: '#EF4444' }]}
      onPress={handleDeleteJob}
    >
      <Ionicons name="trash-outline" size={20} color="#fff" />
      <Text style={styles.employerText}>Delete</Text>
    </TouchableOpacity>
  </View>
)}
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
  bottomContainer: { flexDirection: 'row', alignItems: 'center', gap: 15, padding: 15, borderTopWidth: 1, borderTopColor: '#eee', backgroundColor: '#fff', elevation: 8, zIndex: 2,},
  heartContainer: { width: 55, height: 55, borderRadius: 28, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 5 },
  applyContainer: { flex: 1, height: 55, backgroundColor: '#F97459', borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  applyText: { fontSize: 18, color: 'white', fontWeight: 'bold' },
  headerContainer: { margin: 20, padding: 15, borderRadius: 10, backgroundColor: '#EBF2FC' },
  jobInfoContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginVertical: 10 },
  jobInfoBox: { backgroundColor: '#2F80ED', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15 },
  jobInfoText: { fontSize: 14, color: '#fff', fontWeight: 'bold' },
  companyLocation: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  employerButtons: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 10,
},
editButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 12,
  paddingHorizontal: 18,
  borderRadius: 14,
  flex: 1,
},
employerText: {
  color: '#fff',
  fontWeight: '600',
  marginLeft: 6,
},
appliedInfoBox: {
  backgroundColor: '#E8FFF2',
  padding: 12,
  borderRadius: 10,
  marginHorizontal: 16,
  marginTop: 10,
  borderWidth: 1,
  borderColor: '#B2F2BB',
  gap: 4,
},
appliedInfoText: {
  color: '#2E7D32',
  fontWeight: 'bold',
  fontSize: 14,
},
appliedInfoStatus: {
  fontSize: 13,
  color: '#333',
},
appliedInfoDate: {
  fontSize: 12,
  color: '#666',
},
bottomBar: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: 16,
  paddingVertical: Platform.OS === 'android' ? 10 : 20,
  backgroundColor: '#fff',
  borderTopWidth: 1,
  borderTopColor: '#eee',
  gap: 10,
  elevation: 10,
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowOffset: { width: 0, height: -1 },
  shadowRadius: 4,
},

saveBtn: {
  width: 55,
  height: 55,
  borderRadius: 16,
  backgroundColor: '#fff',
  justifyContent: 'center',
  alignItems: 'center',
  borderWidth: 1,
  borderColor: '#ddd',
  elevation: 3,
  shadowColor: '#000',
  shadowOpacity: 0.1,
  shadowRadius: 4,
},

actionBtn: {
  flex: 1,
  height: 55,
  borderRadius: 14,
  justifyContent: 'center',
  alignItems: 'center',
},

applyBtn: {
  backgroundColor: '#F97459',
},

cancelBtn: {
  backgroundColor: '#ccc',
},

disabledBtn: {
  backgroundColor: '#eee',
},

chatBtn: {
  flex: 1,
  backgroundColor: '#4A80F0',
  height: 55,
  borderRadius: 14,
  justifyContent: 'center',
  alignItems: 'center',
  flexDirection: 'row',
  gap: 6,
},

actionText: {
  fontSize: 16,
  fontWeight: '600',
  color: '#fff',
},

});
