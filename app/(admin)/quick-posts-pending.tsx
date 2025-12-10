// app/(admin)/quick-posts-pending.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { auth } from '@/config/firebase';
import { API_BASE_URL } from '@/config/api';

const API_URL = API_BASE_URL;

interface QuickPost {
  id: string;
  title: string;
  description: string;
  company?: string;
  location?: string;
  salary?: string;
  hourlyRate?: number;
  workSchedule?: string;
  type?: string;
  image?: string; // ✅ NEW: Optional image
  contactInfo?: {
    phone?: string;
    email?: string;
    zalo?: string;
    facebook?: string;
  };
  metadata?: {
    ip: string;
    userAgent: string;
    timestamp: string;
  };
  spamScore?: number;
  createdAt: any;
}

const QuickPostsPending = () => {
  const [posts, setPosts] = useState<QuickPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // ✅ FIX: State cho Reject Modal (hoạt động trên cả Android và iOS)
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectingPost, setRejectingPost] = useState<QuickPost | null>(null);
  const [rejectReason, setRejectReason] = useState('Nội dung không phù hợp với chính sách của Job4S');
  const [isRejecting, setIsRejecting] = useState(false);

  const fetchPendingPosts = async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await axios.get(`${API_URL}/api/quick-posts/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPosts(response.data.jobs || []);
    } catch (error) {
      console.error('Error fetching pending posts:', error);
      Alert.alert('Error', 'Failed to load pending posts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPendingPosts();
  }, []);

  const handleApprove = async (postId: string) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      await axios.patch(
        `${API_URL}/api/quick-posts/${postId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert('Success', 'Job approved and published!');
      fetchPendingPosts();
    } catch (error) {
      console.error('Error approving post:', error);
      Alert.alert('Error', 'Failed to approve job');
    }
  };

  const handleReject = async (postId: string, jobTitle?: string) => {
    // ✅ FIX: Tìm post và mở modal thay vì dùng Alert.prompt (không hoạt động trên Android)
    const post = posts.find(p => p.id === postId);
    if (post) {
      setRejectingPost(post);
      setRejectReason('Nội dung không phù hợp với chính sách của Job4S');
      setRejectModalVisible(true);
    }
  };

  // ✅ FIX: Thực hiện reject qua modal
  const executeReject = async () => {
    if (!rejectingPost) return;
    
    setIsRejecting(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      await axios.patch(
        `${API_URL}/api/quick-posts/${rejectingPost.id}/reject`,
        { reason: rejectReason || 'Nội dung không phù hợp với chính sách của Job4S' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRejectModalVisible(false);
      setRejectingPost(null);
      Alert.alert('Thành công', 'Tin đã bị từ chối và người đăng đã được thông báo');
      fetchPendingPosts();
    } catch (error) {
      console.error('Error rejecting post:', error);
      Alert.alert('Lỗi', 'Không thể từ chối tin');
    } finally {
      setIsRejecting(false);
    }
  };

  const renderPost = ({ item }: { item: QuickPost }) => {
    const spamColor = 
      (item.spamScore || 0) >= 50 ? '#EF4444' :
      (item.spamScore || 0) >= 30 ? '#F59E0B' : '#10B981';

    // Build detail message for full view
    const detailMessage = [
      item.company ? `🏢 ${item.company}` : '',
      item.location ? `📍 ${item.location}` : '',
      item.workSchedule ? `⏰ ${item.workSchedule}` : '',
      item.hourlyRate ? `💰 ${item.hourlyRate.toLocaleString('vi-VN')} VNĐ/giờ` : '',
      item.type ? `📋 ${item.type}` : '',
      `\n📝 Mô tả:\n${item.description}`,
      `\n📞 Liên hệ:`,
      item.contactInfo?.phone ? `Phone: ${item.contactInfo.phone}` : '',
      item.contactInfo?.email ? `Email: ${item.contactInfo.email}` : '',
      item.contactInfo?.zalo ? `Zalo: ${item.contactInfo.zalo}` : '',
      item.contactInfo?.facebook ? `Facebook: ${item.contactInfo.facebook}` : '',
      `\n⚠️ Spam Score: ${item.spamScore || 0}`,
      `\n🌐 IP: ${item.metadata?.ip || 'N/A'}`,
      item.metadata?.timestamp ? `📅 ${new Date(item.metadata.timestamp).toLocaleString('vi-VN')}` : '',
    ].filter(Boolean).join('\n');

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          Alert.alert(
            item.title,
            detailMessage,
            [
              { text: 'Đóng', style: 'cancel' },
              { 
                text: '✓ Approve', 
                style: 'default',
                onPress: () => handleApprove(item.id)
              },
              { 
                text: '✗ Reject', 
                style: 'destructive',
                onPress: () => handleReject(item.id, item.title)
              },
            ]
          );
        }}
      >
        {/* Image Preview if available */}
        {item.image && (
          <Image 
            source={{ uri: item.image }} 
            style={styles.postImage}
            resizeMode="cover"
          />
        )}

        {/* Header */}
        <View style={styles.cardHeader}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={[styles.spamBadge, { backgroundColor: spamColor }]}>
            <Text style={styles.spamScore}>{item.spamScore || 0}</Text>
          </View>
        </View>

        {/* Quick Info Row */}
        <View style={styles.quickInfoRow}>
          {item.company && (
            <View style={styles.quickInfoItem}>
              <Ionicons name="business-outline" size={14} color="#666" />
              <Text style={styles.quickInfoText} numberOfLines={1}>{item.company}</Text>
            </View>
          )}
          {item.location && (
            <View style={styles.quickInfoItem}>
              <Ionicons name="location-outline" size={14} color="#666" />
              <Text style={styles.quickInfoText} numberOfLines={1}>{item.location}</Text>
            </View>
          )}
          {item.hourlyRate && (
            <View style={styles.quickInfoItem}>
              <Ionicons name="cash-outline" size={14} color="#10B981" />
              <Text style={[styles.quickInfoText, { color: '#10B981', fontWeight: '600' }]}>
                {item.hourlyRate.toLocaleString('vi-VN')}đ/h
              </Text>
            </View>
          )}
        </View>

        {/* Description */}
        <Text style={styles.description} numberOfLines={3}>
          {item.description}
        </Text>

        {/* Contact Info */}
        <View style={styles.contactSection}>
          <Text style={styles.contactLabel}>Liên hệ:</Text>
          <View style={styles.contactRow}>
            {item.contactInfo?.phone && (
              <Text style={styles.contactText}>📞 {item.contactInfo.phone}</Text>
            )}
            {item.contactInfo?.email && (
              <Text style={styles.contactText}>📧 {item.contactInfo.email}</Text>
            )}
          </View>
        </View>

        {/* Metadata */}
        {item.metadata && (
          <View style={styles.metadata}>
            <Text style={styles.metaText}>IP: {item.metadata.ip}</Text>
            <Text style={styles.metaText}>
              {item.metadata.timestamp ? new Date(item.metadata.timestamp).toLocaleString('vi-VN') : ''}
            </Text>
          </View>
        )}

        {/* Tap to view detail hint */}
        <Text style={styles.tapHint}>Nhấn để xem chi tiết đầy đủ</Text>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.approveButton]}
            onPress={(e) => {
              e.stopPropagation();
              handleApprove(item.id);
            }}
          >
            <Ionicons name="checkmark-circle" size={20} color="#FFF" />
            <Text style={styles.buttonText}>Duyệt</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.rejectButton]}
            onPress={(e) => {
              e.stopPropagation();
              handleReject(item.id, item.title);
            }}
          >
            <Ionicons name="close-circle" size={20} color="#FFF" />
            <Text style={styles.buttonText}>Từ chối</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A80F0" />
        <Text style={styles.loadingText}>Đang tải danh sách...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Ionicons name="document-text" size={18} color="#4A80F0" />
          <Text style={styles.statText}>
            <Text style={styles.statNumber}>{posts.length}</Text> tin chờ duyệt
          </Text>
        </View>
        <TouchableOpacity onPress={fetchPendingPosts} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={20} color="#4A80F0" />
        </TouchableOpacity>
      </View>

      {/* List */}
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchPendingPosts} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="checkmark-done-circle" size={64} color="#10B981" />
            <Text style={styles.emptyTitle}>Không có tin chờ duyệt</Text>
            <Text style={styles.emptyText}>Tất cả Quick Posts đã được xử lý</Text>
          </View>
        }
      />

      {/* ✅ FIX: Reject Modal (hoạt động trên cả Android và iOS) */}
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !isRejecting && setRejectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalIconContainer}>
                <Ionicons name="close-circle" size={32} color="#ef4444" />
              </View>
              <Text style={styles.modalTitle}>Từ chối tin tuyển dụng</Text>
              {rejectingPost && (
                <Text style={styles.modalSubtitle} numberOfLines={2}>
                  "{rejectingPost.title}"
                </Text>
              )}
            </View>

            {/* Reason Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Lý do từ chối (sẽ gửi email cho người đăng):</Text>
              <TextInput
                style={styles.reasonInput}
                value={rejectReason}
                onChangeText={setRejectReason}
                placeholder="Nhập lý do từ chối..."
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => setRejectModalVisible(false)}
                disabled={isRejecting}
              >
                <Text style={styles.cancelModalButtonText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmRejectButton, isRejecting && styles.buttonDisabled]}
                onPress={executeReject}
                disabled={isRejecting}
              >
                {isRejecting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="close-circle" size={18} color="#fff" />
                    <Text style={styles.confirmRejectButtonText}>Từ chối</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    fontSize: 14,
    color: '#64748b',
  },
  statNumber: {
    fontWeight: '700',
    color: '#1F2937',
  },
  refreshBtn: {
    padding: 8,
  },
  list: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  // ✅ NEW: Image preview for quick posts
  postImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#F3F4F6',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginRight: 8,
  },
  // ✅ NEW: Quick info row
  quickInfoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 10,
  },
  quickInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quickInfoText: {
    fontSize: 12,
    color: '#666',
  },
  spamBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  spamScore: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  contactSection: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  contactLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 4,
  },
  // ✅ NEW: Contact row for inline display
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  contactText: {
    fontSize: 13,
    color: '#1F2937',
    marginBottom: 2,
  },
  metadata: {
    backgroundColor: '#FEF3C7',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  metaText: {
    fontSize: 11,
    color: '#92400E',
    marginBottom: 2,
  },
  tapHint: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  approveButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  // ✅ FIX: Modal styles for reject functionality
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    padding: 24,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1F2937',
    minHeight: 80,
    backgroundColor: '#F9FAFB',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  cancelModalButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelModalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  confirmRejectButton: {
    backgroundColor: '#EF4444',
  },
  confirmRejectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default QuickPostsPending;
