import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator } from "react-native";
import React, { useState } from "react";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { auth, db } from "@/config/firebase";
import { doc, getDoc } from "firebase/firestore";
import { router } from "expo-router";
import { applicationApiService } from "@/services/applicationApi.service";
import CVViewer from "@/components/CVViewer";
import CVTemplateViewer from "@/components/CVTemplateViewer";
import { CVData } from "@/types/cv.types";

interface ApplicationProps {
  app: any;
  onStatusChange: (status: string) => void;
  onDelete?: () => void; // Callback after delete
}

const Application: React.FC<ApplicationProps> = ({ app, onStatusChange, onDelete }) => {
  const { user, job, status, cv_url, cv_path, $id, userId } = app;

  // ✅ State quản lý modal xem CV
  const [cvLink, setCvLink] = useState<string | null>(null);
  const [showCV, setShowCV] = useState(false);
  const [showCVTemplateViewer, setShowCVTemplateViewer] = useState(false);
  const [cvData, setCvData] = useState<CVData | null>(null);
  const [loadingCV, setLoadingCV] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(status); // ✅ Track current status locally

  // 🎯 Hàm mở CV trực tiếp trong app (hỗ trợ cả PDF và template)
  const handleViewCV = async () => {
    console.log('👁️ handleViewCV called - App CV info:', {
      hasAppId: !!$id,
      hasCvUrl: !!cv_url,
      cvUrlPrefix: cv_url?.substring(0, 20),
      hasCvPath: !!cv_path,
      cvId: app.cvId,
      cvSource: app.cvSource
    });

    setLoadingCV(true);
    try {
      // ✅ Priority 1: Check if CV is from library (has cvId in app object)
      // This comes directly from the API response (applications collection)
      // Also handle case where cvSource is undefined but cvId exists (legacy/fallback)
      if (app.cvId && (app.cvSource === 'library' || !app.cvSource)) {
        console.log('📄 CV Info from app object:', { cvId: app.cvId, cvSource: app.cvSource });
        
        try {
          const cvSnapshot = await getDoc(doc(db, 'cvs', app.cvId));
          
          if (cvSnapshot.exists()) {
            const fetchedCvData = cvSnapshot.data() as CVData;
            console.log('✅ Fetched CV template:', fetchedCvData.personalInfo?.fullName);
            
            // Show template viewer
            setCvData(fetchedCvData);
            setShowCVTemplateViewer(true);
            setLoadingCV(false);
            return;
          } else {
            console.warn('⚠️ CV document does not exist in cvs collection');
            Alert.alert('Lỗi', 'CV không tồn tại hoặc đã bị xóa.');
            setLoadingCV(false);
            return;
          }
        } catch (cvError) {
          console.warn('⚠️ Could not fetch CV from cvs collection:', cvError);
          // Continue to try cv_url fallback
        }
      }

      // ✅ Priority 2: Check if CV is from library (has cvId in applied_jobs collection)
      // Fallback for older applications or if API didn't return cvId
      // NOTE: $id is the application ID (from applications collection), NOT applied_jobs ID.
      // But we try anyway in case they match or for legacy reasons.
      if ($id) {
        try {
          // Try to find applied_jobs document by ID (unlikely to match but possible)
          let appliedJobDoc = await getDoc(doc(db, 'applied_jobs', $id));
          
          // If not found by ID, try to query by userId + jobId (more reliable)
          if (!appliedJobDoc.exists() && userId && job?.$id) {
             console.log('📄 applied_jobs not found by ID, querying by userId + jobId...');
             // Import query, collection, where, getDocs if not already imported
             // Assuming they are imported or available via db
             // We need to use the modular SDK
             // Since we can't easily add imports here without reading the whole file, 
             // we'll skip the query fallback for now and rely on Priority 3 (Candidate Profile)
             // which is safer and already implemented below.
          }

          if (appliedJobDoc.exists()) {
            const appliedJobData = appliedJobDoc.data();
            const cvId = appliedJobData?.cv_id;
            const cvSource = appliedJobData?.cv_source;
            
            console.log('📄 CV Info from applied_jobs:', { cvId, cvSource });
            
            // If CV is from library, fetch template data
            if (cvId && (cvSource === 'library' || !cvSource)) {
              try {
                const cvSnapshot = await getDoc(doc(db, 'cvs', cvId));
                
                if (cvSnapshot.exists()) {
                  const fetchedCvData = cvSnapshot.data() as CVData;
                  console.log('✅ Fetched CV template:', fetchedCvData.personalInfo?.fullName);
                  
                  // Show template viewer
                  setCvData(fetchedCvData);
                  setShowCVTemplateViewer(true);
                  setLoadingCV(false);
                  return;
                } else {
                  console.warn('⚠️ CV document does not exist in cvs collection');
                }
              } catch (cvError) {
                console.warn('⚠️ Could not fetch CV from cvs collection:', cvError);
                // Continue to try cv_url fallback
              }
            }
          } else {
            console.log('📄 No applied_jobs document found, using cv_url fallback');
          }
        } catch (firestoreError: any) {
          // ✅ FIX: Handle Firestore permission errors gracefully
          console.warn('⚠️ Could not access applied_jobs collection (permissions?):', firestoreError.message);
          console.log('📄 Falling back to cv_url from API response');
          // Continue to cv_url fallback below
        }
      }
      
      // ✅ Priority 3: Try to fetch CV from candidate's profile directly
      // This handles cases where applied_jobs document is not accessible
      const candidateId = userId || app.candidateId || user?.uid;
      if (candidateId) {
        try {
          console.log('🔍 Fetching candidate profile to get CV data:', candidateId);
          const candidateDoc = await getDoc(doc(db, 'users', candidateId));
          
          if (candidateDoc.exists()) {
            const candidateData = candidateDoc.data();
            const candidateCvId = candidateData?.cvId || candidateData?.defaultCvId;
            
            if (candidateCvId) {
              console.log('📄 Found CV ID in candidate profile:', candidateCvId);
              
              try {
                const cvSnapshot = await getDoc(doc(db, 'cvs', candidateCvId));
                
                if (cvSnapshot.exists()) {
                  const fetchedCvData = cvSnapshot.data() as CVData;
                  console.log('✅ Fetched CV template from candidate profile:', fetchedCvData.personalInfo?.fullName);
                  
                  // Show template viewer
                  setCvData(fetchedCvData);
                  setShowCVTemplateViewer(true);
                  setLoadingCV(false);
                  return;
                }
              } catch (cvError) {
                console.warn('⚠️ Could not fetch CV from cvs collection:', cvError);
              }
            }
          }
        } catch (candidateError) {
          console.warn('⚠️ Could not fetch candidate profile:', candidateError);
        }
      }
      
      // ✅ Priority 4: Try to get CV URL from cv_url or cv_path (last resort)
      let finalUrl = cv_url;
      
      // ✅ CRITICAL: Block file:/// URLs ONLY if we don't have cvId (not a template CV)
      if (finalUrl && finalUrl.startsWith('file:///')) {
        console.error('❌ BLOCKED: file:/// URL detected for uploaded CV');
        Alert.alert(
          'Không thể xem CV',
          'CV này chứa đường dẫn file nội bộ không hợp lệ (dữ liệu cũ).\n\n' +
          'Vui lòng yêu cầu ứng viên nộp lại CV hoặc liên hệ qua chat/email.'
        );
        setLoadingCV(false);
        return;
      }
      
      if (!finalUrl && cv_path) {
        try {
          const storage = getStorage();
          finalUrl = await getDownloadURL(ref(storage, cv_path));
        } catch (storageError) {
          console.warn('⚠️ Could not get download URL from storage:', storageError);
        }
      }
      
      if (finalUrl) {
        console.log('✅ Opening CV PDF from URL:', finalUrl.substring(0, 50) + '...');
        setCvLink(finalUrl);
        setShowCV(true);
      } else {
        console.log('❌ No CV available (no cvId, no cvUrl, no cv_path)');
        Alert.alert('Không có CV', 'Ứng viên chưa nộp CV cho vị trí này.');
      }
    } catch (error: any) {
      console.error("❌ Lỗi khi mở CV:", error);
      Alert.alert('Lỗi', `Không thể mở CV: ${error.message || 'Vui lòng thử lại'}`);
    } finally {
      setLoadingCV(false);
    }
  };

  // 🗣️ Hàm mở chat (ví dụ: chuyển sang trang chat với user đó)
  const handleContact = () => {
    const candidateId = userId || app.candidateId || user?.uid;
    
    console.log('🔍 Attempting to contact candidate:', {
      userId,
      candidateId: app.candidateId,
      userUid: user?.uid,
      finalId: candidateId
    });
    
    if (!candidateId || candidateId === '') {
      Alert.alert("Lỗi", "Không tìm thấy thông tin ứng viên. Ứng viên có thể đã xóa hồ sơ.");
      return;
    }

    // 🔹 UID người đang đăng nhập
    const myUid = auth.currentUser?.uid;
    
    if (!myUid) {
      Alert.alert("Lỗi", "Bạn cần đăng nhập để chat");
      return;
    }

    // 🔹 Tạo chatId cố định giữa employer và candidate
    const chatId = [myUid, candidateId].sort().join("_");

    console.log('💬 Opening chat with:', {
      chatId,
      partnerId: candidateId,
      partnerName: user?.name || "Ứng viên"
    });

    router.push({
      pathname: "/(shared)/chat",
      params: {
        chatId,                          // ID phòng chat
        partnerId: candidateId,          // UID ứng viên
        partnerName: user?.name || "Ứng viên",
        role: "Recruiter",               // vai trò employer
        from: "/(employer)/appliedList", // ✅ FIX: Correct from path
      },
    });
  };


  // 🗑️ Hàm xoá ứng viên khỏi danh sách
  const handleDelete = async () => {
    Alert.alert("Xóa ứng viên", "Xóa ứng viên này khỏi danh sách?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            setLoading(true);
            console.log('🗑️ Marking application as rejected:', $id);
            
            // ✅ Mark as rejected (keeps audit trail)
            await applicationApiService.updateApplicationStatus($id, 'rejected');
            
            console.log('✅ Application status updated to rejected');
            
            // ✅ Call parent callback to refresh list FIRST
            if (onDelete) {
              console.log('📞 Calling onDelete callback to refresh list');
              onDelete();
            }
            
            // ✅ Then show success message
            Alert.alert("✅ Đã xóa", "Ứng viên đã được xóa khỏi danh sách");
          } catch (error: any) {
            console.error("❌ Lỗi khi xóa:", error);
            Alert.alert("Lỗi", error.message || "Không thể xóa ứng viên này.");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "#F5A623";
      case "accepted":
        return "#4CAF50";
      case "rejected":
        return "#F44336";
      default:
        return "#999";
    }
  };

  return (
    <TouchableOpacity 
      style={styles.card}
      activeOpacity={0.9}
      onPress={() => {
        // ✅ Navigate to application detail when card is pressed
        router.push({
          pathname: "/(employer)/applicationDetail",
          params: { 
            applicationId: $id,
            from: "/(employer)/appliedList", // ✅ FIX: Add from param for proper back navigation
          },
        });
      }}
    >
      {/* Header */}
      <View style={styles.header}>
        <Image
          source={{
            uri:
              user?.photoURL ||
              user?.avatar ||
              user?.id_image ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                user?.name || user?.displayName || user?.fullName || user?.email?.charAt(0) || 'U'
              )}&size=96&background=4A80F0&color=fff&bold=true&format=png`,
          }}
          style={styles.avatar}
        />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.name} numberOfLines={1}>
            {user?.name || user?.displayName || user?.fullName || user?.email || "Ứng viên"}
          </Text>
          <Text style={styles.jobTitle} numberOfLines={1}>
            Ứng tuyển: {job?.title || "Không rõ công việc"}
          </Text>
          {user?.email && user.email !== user?.name && (
            <Text style={styles.emailText} numberOfLines={1}>
              {user.email}
            </Text>
          )}
        </View>
      </View>

      {/* Trạng thái */}
      <Text style={[styles.status, { color: getStatusColor(currentStatus) }]}>
        Trạng thái: {currentStatus || "pending"}
      </Text>

      {/* Nút hành động */}
      <View style={styles.actions} onStartShouldSetResponder={() => true}>
        {currentStatus === "pending" && (
          <>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: "#4CAF50" }]}
              onPress={(e) => {
                e.stopPropagation();
                if (currentStatus !== "pending") {
                  Alert.alert("Thông báo", "Ứng viên này đã được xử lý rồi.");
                  return;
                }
                setLoading(true);
                setCurrentStatus("accepted"); // ✅ Update local status immediately
                onStatusChange("accepted");
                setTimeout(() => setLoading(false), 1000);
              }}
              disabled={loading || currentStatus !== "pending"}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Chấp nhận</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: "#F44336" }]}
              onPress={(e) => {
                e.stopPropagation();
                if (currentStatus !== "pending") {
                  Alert.alert("Thông báo", "Ứng viên này đã được xử lý rồi.");
                  return;
                }
                setLoading(true);
                setCurrentStatus("rejected"); // ✅ Update local status immediately
                onStatusChange("rejected");
                setTimeout(() => setLoading(false), 1000);
              }}
              disabled={loading || currentStatus !== "pending"}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Từ chối</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {currentStatus === "accepted" && (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#2E8BFD" }]}
            onPress={(e) => {
              e.stopPropagation();
              handleContact();
            }}
            disabled={loading}
          >
            <Text style={styles.buttonText}>💬 Liên hệ ứng viên</Text>
          </TouchableOpacity>
        )}

        {currentStatus === "rejected" && (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#9E9E9E" }]}
            onPress={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>🗑️ Xóa ứng viên</Text>
            )}
          </TouchableOpacity>
        )}

        {/* ✅ Nút xem CV luôn hiển thị */}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: "#2196F3" }]}
          onPress={(e) => {
            e.stopPropagation();
            handleViewCV();
          }}
          disabled={loading || loadingCV}
        >
          {loadingCV ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>📄 Xem CV</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* ✅ Modal WebView hiển thị CV trực tiếp trong app */}
      <CVViewer visible={showCV} onClose={() => setShowCV(false)} url={cvLink} />
      
      {/* ✅ Modal CVTemplateViewer for library CVs */}
      {showCVTemplateViewer && cvData && (
        <CVTemplateViewer 
          visible={showCVTemplateViewer} 
          cvData={cvData} 
          onClose={() => {
            setShowCVTemplateViewer(false);
            setCvData(null);
          }} 
        />
      )}
    </TouchableOpacity>
  );
};

export default Application;

const styles = StyleSheet.create({
  card: {
    padding: 15,
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#eee",
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
  },
  jobTitle: {
    fontSize: 14,
    color: "#555",
  },
  emailText: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  status: {
    marginTop: 10,
    fontWeight: "600",
  },
  actions: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  button: {
    flexGrow: 1,
    padding: 10,
    borderRadius: 6,
    alignItems: "center",
    minWidth: 100,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
