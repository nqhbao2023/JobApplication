/**
 * CandidateProfile - Employer xem hồ sơ ứng viên (candidate_seeking)
 * 
 * Khác với jobDescription vì đây là hồ sơ TÌM VIỆC của candidate,
 * không phải tin TUYỂN DỤNG của employer.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeBack } from '@/hooks/useSafeBack';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import type { Job } from '@/types';
import CVViewer from '@/components/CVViewer';
import CVTemplateViewer from '@/components/CVTemplateViewer';
import type { CVData } from '@/types/cv.types';

const { width } = Dimensions.get('window');

export default function CandidateProfile() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const [loading, setLoading] = useState(true);
  const [candidate, setCandidate] = useState<Job | null>(null);
  
  // ✅ NEW: State for CVViewer (external PDF)
  const [cvViewerVisible, setCvViewerVisible] = useState(false);
  
  // ✅ NEW: State for CVTemplateViewer (template CV)
  const [cvTemplateViewerVisible, setCvTemplateViewerVisible] = useState(false);
  const [cvToView, setCvToView] = useState<CVData | null>(null);

  useEffect(() => {
    const loadCandidate = async () => {
      if (!jobId) return;
      
      try {
        const docRef = doc(db, 'jobs', jobId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setCandidate({
            $id: docSnap.id,
            ...docSnap.data(),
          } as Job);
        }
      } catch (error) {
        console.error('Error loading candidate:', error);
        Alert.alert('Lỗi', 'Không thể tải thông tin ứng viên');
      } finally {
        setLoading(false);
      }
    };

    loadCandidate();
  }, [jobId]);

  // ✅ Contact handlers
  const handleCall = useCallback(() => {
    if (candidate?.contactInfo?.phone) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Linking.openURL(`tel:${candidate.contactInfo.phone}`);
    }
  }, [candidate]);

  const handleZalo = useCallback(() => {
    if (candidate?.contactInfo?.zalo) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Linking.openURL(`https://zalo.me/${candidate.contactInfo.zalo}`);
    }
  }, [candidate]);

  const handleEmail = useCallback(() => {
    if (candidate?.contactInfo?.email) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Linking.openURL(`mailto:${candidate.contactInfo.email}?subject=Về hồ sơ tìm việc của bạn trên Job4S`);
    }
  }, [candidate]);

  const handleViewCV = useCallback(() => {
    const cvData = (candidate as any)?.cvData;
    
    console.log('🎯 handleViewCV CALLED in candidateProfile:', {
      hasCvData: !!cvData,
      cvDataType: cvData?.type,
      hasSnapshot: !!cvData?.cvSnapshot,
      hasExternalUrl: !!cvData?.externalUrl,
      hasCvUrl: !!candidate?.cvUrl
    });

    if (!cvData && !candidate?.cvUrl) {
      Alert.alert('Không có CV', 'Ứng viên chưa đính kèm CV');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (cvData?.type === 'template' && cvData.cvSnapshot) {
      // Template CV - open CVTemplateViewer modal
      console.log('🔍 Opening template CV viewer (MODAL):', {
        fullName: cvData.cvSnapshot.personalInfo?.fullName
      });
      setCvToView(cvData.cvSnapshot);
      setCvTemplateViewerVisible(true);
    } else if (cvData?.type === 'external' && cvData.externalUrl) {
      // External URL - open in browser
      console.log('🔗 Opening external CV link:', cvData.externalUrl);
      Linking.openURL(cvData.externalUrl).catch(() => {
        Alert.alert('Lỗi', 'Không thể mở link CV');
      });
    } else if (candidate?.cvUrl) {
      // Legacy: old cvUrl field - check for file:/// URLs
      if (candidate.cvUrl.startsWith('file:///')) {
        console.error('❌ BLOCKED: file:/// URL detected in candidateProfile');
        Alert.alert(
          'Không thể xem CV',
          'CV này chứa đường dẫn file nội bộ không hợp lệ (dữ liệu cũ).\n\n' +
          'Vui lòng yêu cầu ứng viên cập nhật CV.'
        );
        return;
      }
      console.log('📄 Opening legacy CV viewer:', candidate.cvUrl);
      setCvViewerVisible(true);
    } else {
      Alert.alert('Không có CV', 'CV không khả dụng');
    }
  }, [candidate]);

  // ✅ NEW: Handle message candidate (create chat)
  const handleMessageCandidate = useCallback(async () => {
    const myUid = auth.currentUser?.uid;
    if (!myUid) {
      Alert.alert('Lỗi', 'Vui lòng đăng nhập để nhắn tin');
      return;
    }

    // Candidate's posterId from job (quick-post owner)
    const candidateId = candidate?.posterId;
    if (!candidateId) {
      Alert.alert('Không thể nhắn tin', 'Không tìm thấy thông tin người đăng');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Create chatId from sorted user IDs
      const chatId = [myUid, candidateId].sort().join('_');
      
      // Check/create chat document
      const chatRef = doc(db, 'chats', chatId);
      await setDoc(chatRef, {
        participants: [myUid, candidateId],
        participantsInfo: {
          [myUid]: { displayName: 'Nhà tuyển dụng', role: 'employer' },
          [candidateId]: { displayName: candidate?.title || 'Ứng viên', role: 'candidate' },
        },
        updatedAt: serverTimestamp(),
        lastMessage: '',
      }, { merge: true });
      
      // Navigate to chat
      router.push({
        pathname: '/(shared)/chat',
        params: {
          chatId,
          partnerId: candidateId,
          partnerName: candidate?.title || 'Ứng viên',
          role: 'Recruiter',
          from: '/(employer)/chat',
        },
      } as any);
    } catch (error) {
      console.error('Error creating chat:', error);
      Alert.alert('Lỗi', 'Không thể bắt đầu cuộc trò chuyện');
    }
  }, [candidate, router]);

  // ✅ Format date
  const formatDate = (date: any) => {
    if (!date) return 'Không rõ';
    const d = date?.toDate?.() || new Date(date);
    return d.toLocaleDateString('vi-VN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // ✅ Format salary
  const formatExpectedSalary = (salary: string | number | undefined) => {
    if (!salary) return null;
    if (salary === 'negotiable') return 'Thỏa thuận';
    const num = typeof salary === 'string' ? parseInt(salary) : salary;
    if (isNaN(num)) return salary;
    return `${num.toLocaleString('vi-VN')}đ/giờ`;
  };

  const { goBack } = useSafeBack();

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Đang tải hồ sơ...</Text>
      </SafeAreaView>
    );
  }

  if (!candidate) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
        <Text style={styles.errorText}>Không tìm thấy hồ sơ</Text>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Text style={styles.backButtonText}>Quay lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={['#10b981', '#059669']}
        style={styles.header}
      >
        <TouchableOpacity 
          style={styles.headerBackButton} 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            goBack();
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hồ sơ ứng viên</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.profileCard}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            {candidate.image ? (
              <Image
                source={{ uri: candidate.image }}
                style={styles.avatar}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={48} color="#94a3b8" />
              </View>
            )}
            <View style={styles.statusBadge}>
              <Ionicons name="search" size={12} color="#fff" />
              <Text style={styles.statusText}>Đang tìm việc</Text>
            </View>
          </View>

          {/* Title / Position */}
          <Text style={styles.candidateTitle}>{candidate.title || 'Đang tìm việc'}</Text>
          
          {/* Location */}
          {candidate.location && (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={18} color="#64748b" />
              <Text style={styles.infoText}>{candidate.location}</Text>
            </View>
          )}

          {/* Expected Salary */}
          {candidate.expectedSalary && (
            <View style={styles.salaryBadge}>
              <Ionicons name="cash-outline" size={16} color="#059669" />
              <Text style={styles.salaryText}>
                Mong muốn: {formatExpectedSalary(candidate.expectedSalary)}
              </Text>
            </View>
          )}

          {/* Posted date */}
          <Text style={styles.postedDate}>
            Đăng ngày: {formatDate(candidate.createdAt || candidate.created_at)}
          </Text>
        </Animated.View>

        {/* CV Section */}
        {(((candidate as any).cvData && ((candidate as any).cvData.type === 'template' || (candidate as any).cvData.type === 'external')) || candidate.cvUrl) && (
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <TouchableOpacity style={styles.cvCard} onPress={handleViewCV}>
              <LinearGradient
                colors={['#3b82f6', '#2563eb']}
                style={styles.cvGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="document-text" size={28} color="#fff" />
                <View style={styles.cvTextContainer}>
                  <Text style={styles.cvTitle}>Xem CV của ứng viên</Text>
                  <Text style={styles.cvSubtitle}>Nhấn để mở CV</Text>
                </View>
                <Ionicons name="open-outline" size={24} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* About Section */}
        <Animated.View entering={FadeInDown.delay(150).duration(400)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={22} color="#10b981" />
            <Text style={styles.sectionTitle}>Giới thiệu bản thân</Text>
          </View>
          <Text style={styles.description}>
            {candidate.description || 'Ứng viên chưa cung cấp mô tả.'}
          </Text>
        </Animated.View>

        {/* Schedule Section */}
        {candidate.workSchedule && (
          <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="time-outline" size={22} color="#10b981" />
              <Text style={styles.sectionTitle}>Thời gian có thể làm việc</Text>
            </View>
            <View style={styles.scheduleContainer}>
              {candidate.workSchedule.split(',').map((schedule, index) => (
                <View key={index} style={styles.scheduleChip}>
                  <Text style={styles.scheduleText}>{schedule.trim()}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Contact Section */}
        <Animated.View entering={FadeInDown.delay(250).duration(400)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="call-outline" size={22} color="#10b981" />
            <Text style={styles.sectionTitle}>Thông tin liên hệ</Text>
          </View>

          {/* Contact Buttons */}
          <View style={styles.contactGrid}>
            {candidate.contactInfo?.phone && (
              <TouchableOpacity style={styles.contactButton} onPress={handleCall}>
                <View style={[styles.contactIcon, { backgroundColor: '#dcfce7' }]}>
                  <Ionicons name="call" size={22} color="#16a34a" />
                </View>
                <Text style={styles.contactLabel}>Gọi điện</Text>
                <Text style={styles.contactValue}>{candidate.contactInfo.phone}</Text>
              </TouchableOpacity>
            )}

            {candidate.contactInfo?.zalo && (
              <TouchableOpacity style={styles.contactButton} onPress={handleZalo}>
                <View style={[styles.contactIcon, { backgroundColor: '#dbeafe' }]}>
                  <Ionicons name="chatbubble-ellipses" size={22} color="#2563eb" />
                </View>
                <Text style={styles.contactLabel}>Zalo</Text>
                <Text style={styles.contactValue}>{candidate.contactInfo.zalo}</Text>
              </TouchableOpacity>
            )}

            {candidate.contactInfo?.email && (
              <TouchableOpacity style={styles.contactButton} onPress={handleEmail}>
                <View style={[styles.contactIcon, { backgroundColor: '#fef3c7' }]}>
                  <Ionicons name="mail" size={22} color="#d97706" />
                </View>
                <Text style={styles.contactLabel}>Email</Text>
                <Text style={styles.contactValue} numberOfLines={1}>{candidate.contactInfo.email}</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        <View style={{ height: 140 }} />
      </ScrollView>

      {/* Bottom CTA - Enhanced with Message button */}
      <Animated.View entering={FadeInUp.delay(300).duration(400)} style={styles.bottomCTA}>
        {/* Primary Actions Row */}
        <View style={styles.primaryActionsRow}>
          {/* Message Button (NEW) */}
          {candidate.posterId && (
            <TouchableOpacity 
              style={styles.messageButton}
              onPress={handleMessageCandidate}
            >
              <Ionicons name="chatbubble-ellipses" size={22} color="#2563eb" />
              <Text style={styles.messageButtonText}>Nhắn tin</Text>
            </TouchableOpacity>
          )}
          
          {/* Call Button */}
          <TouchableOpacity 
            style={[styles.primaryButton, !candidate.posterId && { flex: 1 }]}
            onPress={handleCall}
          >
            <LinearGradient
              colors={['#10b981', '#059669']}
              style={styles.primaryGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="call" size={22} color="#fff" />
              <Text style={styles.primaryButtonText}>Liên hệ ngay</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* View CV Button */}
        {(((candidate as any).cvData && ((candidate as any).cvData.type === 'template' || (candidate as any).cvData.type === 'external')) || candidate.cvUrl) && (
          <TouchableOpacity style={styles.secondaryButton} onPress={handleViewCV}>
            <Ionicons name="document-text-outline" size={22} color="#3b82f6" />
            <Text style={styles.secondaryButtonText}>Xem CV trong ứng dụng</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* ✅ CV Viewer Modal (for external PDF) */}
      <CVViewer
        visible={cvViewerVisible}
        onClose={() => setCvViewerVisible(false)}
        url={cvViewerVisible ? (candidate.cvUrl || null) : null}
      />

      {/* ✅ CV Template Viewer Modal (for template CV) */}
      {cvToView && (
        <CVTemplateViewer
          cvData={cvToView}
          visible={cvTemplateViewerVisible}
          onClose={() => {
            setCvTemplateViewerVisible(false);
            setCvToView(null);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#64748b',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  // Content
  content: {
    flex: 1,
    padding: 16,
  },
  // Profile Card
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#10b981',
  },
  avatarPlaceholder: {
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    position: 'absolute',
    bottom: 0,
    right: -10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  candidateTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 15,
    color: '#64748b',
  },
  salaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    marginBottom: 12,
  },
  salaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  postedDate: {
    fontSize: 13,
    color: '#94a3b8',
  },
  // CV Card
  cvCard: {
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cvGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  cvTextContainer: {
    flex: 1,
  },
  cvTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  cvSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  // Sections
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: '#475569',
  },
  // Schedule
  scheduleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  scheduleChip: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  scheduleText: {
    fontSize: 14,
    color: '#15803d',
    fontWeight: '500',
  },
  // Contact Grid
  contactGrid: {
    gap: 12,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    gap: 14,
  },
  contactIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  contactValue: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'right',
  },
  // Bottom CTA
  bottomCTA: {
    flexDirection: 'column',
    padding: 16,
    paddingBottom: 24,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 12,
  },
  primaryActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  messageButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2563eb',
  },
  primaryButton: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  primaryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3b82f6',
  },
});
