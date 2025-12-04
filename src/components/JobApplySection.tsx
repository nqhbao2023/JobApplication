import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ApplyButton from '@/components/ApplyButton';
import { Job } from '@/types';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';

interface JobApplySectionProps {
  job: Job;
  onApplyFeatured?: () => void;
  onApplyQuickPost?: () => void; // NEW: For quick-post CV submission
  onCancel?: () => void; // ✅ NEW: Hủy ứng tuyển
  onChat?: () => void; // ✅ NEW: Nhắn tin với employer
  isSaved?: boolean;
  saveLoading?: boolean;
  onToggleSave?: () => void;
  isApplied?: boolean; // NEW: Đã nộp CV hay chưa
  applyLoading?: boolean; // NEW: Đang xử lý nộp CV
  applicationStatus?: string; // ✅ NEW: Trạng thái ứng tuyển (accepted, rejected, pending)
}

const JobApplySection: React.FC<JobApplySectionProps> = ({ 
  job, 
  onApplyFeatured,
  onApplyQuickPost,
  onCancel,
  onChat,
  isSaved = false,
  saveLoading = false,
  onToggleSave,
  isApplied = false,
  applyLoading = false,
  applicationStatus,
}) => {
  // Map 'source' field to 'jobSource' for backward compatibility
  // source='viecoi' -> jobSource='crawled'
  // source='quick-post' -> jobSource='quick-post'  
  // otherwise use jobSource field or default to 'featured'
  let jobSource: 'crawled' | 'quick-post' | 'featured' | 'internal' = 'featured';
  
  if (job.source === 'viecoi') {
    jobSource = 'crawled';
  } else if (job.source === 'quick-post' || job.jobSource === 'quick-post') {
    jobSource = 'quick-post';
  } else if (job.source === 'internal') {
    jobSource = 'internal';
  } else if (job.jobSource) {
    jobSource = job.jobSource;
  }

  return (
    <View style={styles.container}>
      {/* Compact Badge Row */}
      {(jobSource === 'crawled' || jobSource === 'quick-post' || (jobSource === 'featured' && job.isFeatured)) && (
        <View style={styles.badgeRow}>
          {jobSource === 'crawled' && (
            <View style={[styles.badge, styles.crawledBadge]}>
              <Text style={styles.badgeText}>📱 viecoi.vn</Text>
            </View>
          )}
          {jobSource === 'quick-post' && (
            <View style={[styles.badge, styles.quickPostBadge]}>
              <Text style={styles.badgeText}>⚡ Quick Post</Text>
            </View>
          )}
          {jobSource === 'featured' && job.isFeatured && (
            <View style={[styles.badge, styles.featuredBadge]}>
              <Text style={styles.badgeText}>⭐ Nổi bật</Text>
            </View>
          )}
        </View>
      )}

      {/* Button Row - Compact */}
      <View style={styles.buttonRow}>
        {/* ✅ Main Apply/Status Button */}
        <ApplyButton
          jobSource={jobSource}
          sourceUrl={job.external_url || job.sourceUrl}
          contactInfo={job.contactInfo}
          onApplyFeatured={onApplyFeatured}
          onApplyQuickPost={onApplyQuickPost}
          jobId={job.$id || job.id}
          compact={true}
          isApplied={isApplied}
          applyLoading={applyLoading}
          applicationStatus={applicationStatus}
        />

        {/* ✅ NEW: Chat button - hiển thị khi được chấp nhận */}
        {applicationStatus === 'accepted' && onChat && (
          <TouchableOpacity
            style={styles.chatBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onChat();
            }}
          >
            <Ionicons name="chatbubble-ellipses" size={20} color="#fff" />
          </TouchableOpacity>
        )}

        {/* ✅ NEW: Cancel/Withdraw button - hiển thị khi đang pending hoặc draft */}
        {(applicationStatus === 'pending' || applicationStatus === 'draft') && onCancel && (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              Alert.alert(
                'Hủy ứng tuyển?',
                applicationStatus === 'draft' 
                  ? 'Bạn chưa hoàn thành nộp CV. Bạn có muốn hủy không?'
                  : 'Bạn có chắc muốn rút hồ sơ ứng tuyển?',
                [
                  { text: 'Không', style: 'cancel' },
                  { 
                    text: 'Hủy ứng tuyển', 
                    style: 'destructive',
                    onPress: onCancel 
                  },
                ]
              );
            }}
          >
            <Ionicons name="close-circle" size={20} color="#fff" />
          </TouchableOpacity>
        )}
        
        {onToggleSave && (
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onToggleSave();
            }}
            disabled={saveLoading}
          >
            <Ionicons
              name={isSaved ? "heart" : "heart-outline"}
              size={20}
              color={isSaved ? "#F97459" : "#999"}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  crawledBadge: {
    backgroundColor: '#E3F2FD',
  },
  quickPostBadge: {
    backgroundColor: '#E8F5E9',
  },
  featuredBadge: {
    backgroundColor: '#FFF3E0',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  // ✅ NEW: Chat button style
  chatBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#10B981', // Green for chat
    justifyContent: 'center',
    alignItems: 'center',
  },
  // ✅ NEW: Cancel button style
  cancelBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EF4444', // Red for cancel
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default JobApplySection;
