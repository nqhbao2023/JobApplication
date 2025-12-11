// app/(employer)/findCandidates.tsx
// ✅ NEW: Employer "Tìm ứng viên" page - hiển thị quick-post jobs (candidate_seeking)
import Animated, { FadeInDown } from 'react-native-reanimated';
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Linking,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeBack } from '@/hooks/useSafeBack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { db, auth } from '@/config/firebase';
import { collection, query, where, getDocs, orderBy, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { Job } from '@/types';
import CVTemplateViewer from '@/components/CVTemplateViewer';
import type { CVData } from '@/types/cv.types';

const { width } = Dimensions.get('window');
const HORIZONTAL_PADDING = 20;

export default function FindCandidates() {
  const router = useRouter();
  const { goBack } = useSafeBack({ fallback: '/(employer)' });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [candidates, setCandidates] = useState<Job[]>([]);
  
  // ✅ NEW: State for contact modal
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Job | null>(null);
  
  // ✅ NEW: State for CV viewer modal
  const [cvViewerVisible, setCvViewerVisible] = useState(false);
  const [cvToView, setCvToView] = useState<CVData | null>(null);

  const loadCandidates = useCallback(async () => {
    try {
      // Query jobs where jobType = 'candidate_seeking' (quick-post từ candidate tìm việc)
      // Chỉ lấy jobs đã được duyệt (status = 'active')
      const q = query(
        collection(db, 'jobs'),
        where('jobType', '==', 'candidate_seeking'),
        where('status', '==', 'active')
      );
      
      const snapshot = await getDocs(q);
      const results: Job[] = snapshot.docs.map(doc => ({
        $id: doc.id,
        ...doc.data(),
      } as Job));
      
      // Sort by createdAt descending
      results.sort((a, b) => {
        const aTime = (a.createdAt as any)?.toDate?.()?.getTime?.() || 
                      new Date(a.created_at || 0).getTime();
        const bTime = (b.createdAt as any)?.toDate?.()?.getTime?.() || 
                      new Date(b.created_at || 0).getTime();
        return bTime - aTime;
      });
      
      setCandidates(results);
    } catch (error: any) {
      console.error('Error loading candidates:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách ứng viên');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadCandidates();
  }, [loadCandidates]);

  // ✅ NEW: Open contact modal instead of Alert
  const handleContact = useCallback((candidate: Job) => {
    const contact = candidate.contactInfo;
    if (!contact || (!contact.phone && !contact.zalo && !contact.email)) {
      Alert.alert('Không có thông tin liên hệ', 'Ứng viên chưa cung cấp thông tin liên hệ');
      return;
    }
    setSelectedCandidate(candidate);
    setContactModalVisible(true);
  }, []);

  // ✅ NEW: Handle message candidate (create chat)
  const handleMessageCandidate = useCallback(async (candidate: Job) => {
    const myUid = auth.currentUser?.uid;
    if (!myUid) {
      Alert.alert('Lỗi', 'Vui lòng đăng nhập để nhắn tin');
      return;
    }

    // Candidate's posterId from job (quick-post owner)
    const candidateId = candidate.posterId;
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
          [candidateId]: { displayName: candidate.title || 'Ứng viên', role: 'candidate' },
        },
        updatedAt: serverTimestamp(),
        lastMessage: '',
      }, { merge: true });

      setContactModalVisible(false);
      
      // Navigate to chat
      router.push({
        pathname: '/(shared)/chat',
        params: {
          chatId,
          partnerId: candidateId,
          partnerName: candidate.title || 'Ứng viên',
          role: 'Recruiter',
          from: '/(employer)/chat',
        },
      } as any);
    } catch (error) {
      console.error('Error creating chat:', error);
      Alert.alert('Lỗi', 'Không thể bắt đầu cuộc trò chuyện');
    }
  }, [router]);

  // ✅ NEW: Contact Modal Component
  const ContactModal = () => {
    if (!selectedCandidate) return null;
    const contact = selectedCandidate.contactInfo;
    const cvData = (selectedCandidate as any).cvData; // ✅ Get cvData from job

    // ✅ Function to handle CV viewing
    const handleViewCV = () => {
      console.log('🎯 handleViewCV CALLED - START', {
        hasCvData: !!cvData,
        cvDataType: cvData?.type,
        hasSnapshot: !!cvData?.cvSnapshot,
        hasExternalUrl: !!cvData?.externalUrl
      });

      if (!cvData) {
        console.log('❌ No cvData found');
        Alert.alert('Thông báo', 'Ứng viên chưa đính kèm CV');
        return;
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (cvData.type === 'template' && cvData.cvSnapshot) {
        // ✅ FIXED: Open CV viewer modal directly instead of navigation
        console.log('🔍 Opening template CV viewer (MODAL):', {
          fullName: cvData.cvSnapshot.personalInfo?.fullName,
          hasSnapshot: !!cvData.cvSnapshot
        });
        setCvToView(cvData.cvSnapshot);
        setCvViewerVisible(true);
        setContactModalVisible(false);
      } else if (cvData.type === 'external' && cvData.externalUrl) {
        // External link - open in browser
        console.log('🔗 Opening external CV link:', cvData.externalUrl);
        Linking.openURL(cvData.externalUrl).catch(() => {
          Alert.alert('Lỗi', 'Không thể mở link CV');
        });
      } else if ((selectedCandidate as any).cvUrl) {
        // Fallback: old cvUrl field (backward compatibility)
        const cvUrl = (selectedCandidate as any).cvUrl;
        
        // ✅ CRITICAL: Block file:/// URLs for legacy cvUrl field
        if (cvUrl.startsWith('file:///')) {
          console.error('❌ BLOCKED: file:/// URL detected in findCandidates');
          Alert.alert(
            'Không thể xem CV',
            'CV này chứa đường dẫn file nội bộ không hợp lệ (dữ liệu cũ).\n\n' +
            'Vui lòng yêu cầu ứng viên cập nhật CV.'
          );
          return;
        }
        
        console.log('🔗 Opening legacy CV URL:', cvUrl);
        Linking.openURL(cvUrl).catch(() => {
          Alert.alert('Lỗi', 'Không thể mở link CV');
        });
      } else {
        Alert.alert('Thông báo', 'CV không khả dụng');
      }
    };

    return (
      <Modal
        visible={contactModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setContactModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={() => setContactModalVisible(false)}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            style={styles.modalContent}
            onPress={() => {}} // Prevent closing when tapping content
          >
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Liên hệ ứng viên</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setContactModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Candidate Info */}
            <Text style={styles.modalCandidateName} numberOfLines={2}>
              {selectedCandidate.title || 'Ứng viên'}
            </Text>

            {/* ✅ NEW: CV Section (if available) */}
            {(cvData || (selectedCandidate as any).cvUrl) && (
              <TouchableOpacity
                style={styles.cvSection}
                onPress={handleViewCV}
                activeOpacity={0.7}
              >
                <View style={styles.cvIconContainer}>
                  <Ionicons 
                    name={cvData?.type === 'template' ? 'document-text' : 'link'} 
                    size={24} 
                    color="#3b82f6" 
                  />
                </View>
                <View style={styles.cvTextContainer}>
                  <Text style={styles.cvLabel}>📄 CV của ứng viên</Text>
                  <Text style={styles.cvDesc}>
                    {cvData?.type === 'template' ? 'Xem CV trong ứng dụng' : 
                     cvData?.type === 'external' ? 'Mở link CV' : 
                     'Xem CV'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
              </TouchableOpacity>
            )}

            {/* Contact Options */}
            <View style={styles.contactOptions}>
              {/* ✅ Message Button (NEW) */}
              {selectedCandidate.posterId && (
                <TouchableOpacity
                  style={[styles.contactOption, styles.messageOption]}
                  onPress={() => handleMessageCandidate(selectedCandidate)}
                >
                  <View style={[styles.contactOptionIcon, { backgroundColor: '#dbeafe' }]}>
                    <Ionicons name="chatbubble-ellipses" size={22} color="#2563eb" />
                  </View>
                  <View style={styles.contactOptionText}>
                    <Text style={styles.contactOptionLabel}>NHẮN TIN</Text>
                    <Text style={styles.contactOptionValue}>Trò chuyện qua ứng dụng</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
                </TouchableOpacity>
              )}

              {contact?.email && (
                <TouchableOpacity
                  style={styles.contactOption}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    Linking.openURL(`mailto:${contact.email}`);
                  }}
                >
                  <View style={[styles.contactOptionIcon, { backgroundColor: '#fef3c7' }]}>
                    <Ionicons name="mail" size={22} color="#d97706" />
                  </View>
                  <View style={styles.contactOptionText}>
                    <Text style={styles.contactOptionLabel}>EMAIL</Text>
                    <Text style={styles.contactOptionValue}>{contact.email}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
                </TouchableOpacity>
              )}

              {contact?.zalo && (
                <TouchableOpacity
                  style={styles.contactOption}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    Linking.openURL(`https://zalo.me/${contact.zalo}`);
                  }}
                >
                  <View style={[styles.contactOptionIcon, { backgroundColor: '#dbeafe' }]}>
                    <Ionicons name="chatbubbles" size={22} color="#0068ff" />
                  </View>
                  <View style={styles.contactOptionText}>
                    <Text style={styles.contactOptionLabel}>ZALO</Text>
                    <Text style={styles.contactOptionValue}>{contact.zalo}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
                </TouchableOpacity>
              )}

              {contact?.phone && (
                <TouchableOpacity
                  style={styles.contactOption}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    Linking.openURL(`tel:${contact.phone}`);
                  }}
                >
                  <View style={[styles.contactOptionIcon, { backgroundColor: '#dcfce7' }]}>
                    <Ionicons name="call" size={22} color="#16a34a" />
                  </View>
                  <View style={styles.contactOptionText}>
                    <Text style={styles.contactOptionLabel}>GỌI ĐIỆN</Text>
                    <Text style={styles.contactOptionValue}>{contact.phone}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>

            {/* Close Button */}
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setContactModalVisible(false)}
            >
              <Text style={styles.modalCloseBtnText}>Đóng</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    );
  };

  const CandidateCard = ({ item, index }: { item: Job; index: number }) => {
    const createdAt = (item.createdAt as any)?.toDate?.() || 
                      new Date(item.created_at || Date.now());
    const daysAgo = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const timeText = daysAgo === 0 ? 'Hôm nay' : 
                     daysAgo === 1 ? 'Hôm qua' : 
                     `${daysAgo} ngày trước`;

    return (
      <Animated.View entering={FadeInDown.delay(index * 80).duration(400)}>
        <TouchableOpacity
          style={styles.candidateCard}
          activeOpacity={0.7}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            // Navigate to candidate profile (not jobDescription)
            router.push({
              pathname: '/(shared)/candidateProfile',
              params: { 
                jobId: item.$id,
                from: '/(employer)/findCandidates' // ✅ Pass from param for safe back navigation
              },
            } as any);
          }}
        >
          {/* Avatar/Image */}
          <View style={styles.avatarContainer}>
            {item.image ? (
              <Image
                style={styles.candidateAvatar}
                source={{ uri: item.image }}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={[styles.candidateAvatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={32} color="#94a3b8" />
              </View>
            )}
            {/* Badge: Đang tìm việc */}
            <View style={styles.seekingBadge}>
              <Ionicons name="search" size={10} color="#fff" />
            </View>
          </View>

          <View style={styles.candidateInfo}>
            {/* Title (position looking for) */}
            <Text style={styles.candidateTitle} numberOfLines={2}>
              {item.title || 'Đang tìm việc'}
            </Text>

            {/* Location */}
            {item.location && (
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={14} color="#64748b" />
                <Text style={styles.infoText} numberOfLines={1}>{item.location}</Text>
              </View>
            )}

            {/* Expected Salary */}
            {(item as any).expectedSalary && (
              <View style={styles.salaryRow}>
                <Ionicons name="cash-outline" size={14} color="#059669" />
                <Text style={styles.salaryText}>
                  {(item as any).expectedSalary === 'negotiable' 
                    ? 'Thỏa thuận' 
                    : `${parseInt((item as any).expectedSalary).toLocaleString('vi-VN')}đ/giờ`}
                </Text>
              </View>
            )}

            {/* Contact method indicator + CV badge */}
            <View style={styles.contactMethods}>
              {(item as any).cvUrl && (
                <View style={[styles.contactBadge, styles.cvBadge]}>
                  <Ionicons name="document-text" size={12} color="#3b82f6" />
                  <Text style={styles.cvBadgeText}>CV</Text>
                </View>
              )}
              {item.contactInfo?.phone && (
                <View style={styles.contactBadge}>
                  <Ionicons name="call-outline" size={12} color="#10b981" />
                </View>
              )}
              {item.contactInfo?.zalo && (
                <View style={styles.contactBadge}>
                  <Text style={styles.zaloText}>Zalo</Text>
                </View>
              )}
              {item.contactInfo?.email && (
                <View style={styles.contactBadge}>
                  <Ionicons name="mail-outline" size={12} color="#3b82f6" />
                </View>
              )}
            </View>

            {/* Time posted */}
            <Text style={styles.timeText}>{timeText}</Text>
          </View>

          {/* Contact Button */}
          <TouchableOpacity
            style={styles.contactButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              handleContact(item);
            }}
          >
            <LinearGradient
              colors={['#10b981', '#059669']}
              style={styles.contactGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
              <Text style={styles.contactText}>Liên hệ</Text>
            </LinearGradient>
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="people-outline" size={64} color="#cbd5e1" />
      </View>
      <Text style={styles.emptyTitle}>Chưa có ứng viên nào</Text>
      <Text style={styles.emptySubtitle}>
        Các ứng viên đăng tin tìm việc qua Quick Post sẽ xuất hiện ở đây
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={goBack}
          >
            <Ionicons name="arrow-back" size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tìm ứng viên</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Đang tải danh sách ứng viên...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            goBack();
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tìm ứng viên</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{candidates.length}</Text>
        </View>
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle-outline" size={20} color="#6366f1" />
        <Text style={styles.infoText}>
          Đây là danh sách ứng viên đang tìm việc. Bấm "Liên hệ" để kết nối trực tiếp.
        </Text>
      </View>

      <FlatList
        data={candidates}
        keyExtractor={(item) => item.$id}
        renderItem={({ item, index }) => (
          <CandidateCard item={item} index={index} />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#6366f1']}
          />
        }
        ListEmptyComponent={EmptyState}
      />

      {/* ✅ Contact Modal */}
      <ContactModal />

      {/* ✅ CV Template Viewer Modal */}
      {cvToView && (
        <CVTemplateViewer
          cvData={cvToView}
          visible={cvViewerVisible}
          onClose={() => {
            setCvViewerVisible(false);
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
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  countBadge: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 40,
    alignItems: 'center',
  },
  countText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingVertical: 12,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#4f46e5',
    lineHeight: 18,
  },
  listContent: {
    padding: HORIZONTAL_PADDING,
    paddingBottom: 40,
  },
  candidateCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  avatarContainer: {
    position: 'relative',
  },
  candidateAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  seekingBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#f59e0b',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  candidateInfo: {
    flex: 1,
    marginLeft: 14,
  },
  candidateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  contactMethods: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  contactBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  cvBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    gap: 3,
  },
  cvBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3b82f6',
  },
  salaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  salaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
  },
  zaloText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#0068ff',
  },
  timeText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  contactButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginLeft: 8,
  },
  contactGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  contactText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },
  // ✅ NEW: Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCandidateName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 20,
    lineHeight: 24,
  },
  // ✅ NEW: CV Section styles
  cvSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginBottom: 16,
  },
  cvIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cvTextContainer: {
    flex: 1,
  },
  cvLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: 2,
  },
  cvDesc: {
    fontSize: 12,
    color: '#64748b',
  },
  contactOptions: {
    gap: 12,
  },
  contactOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  messageOption: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  contactOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactOptionText: {
    flex: 1,
  },
  contactOptionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  contactOptionValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  modalCloseBtn: {
    marginTop: 20,
    paddingVertical: 14,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
});
