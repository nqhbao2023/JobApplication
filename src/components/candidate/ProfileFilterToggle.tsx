/**
 * Profile Filter Toggle Component
 * 
 * Simple toggle to filter jobs based on student profile.
 * - ON: Jobs filtered by schedule, time slots, location from profile
 * - OFF: Show all jobs
 * 
 * Shows a summary of what will be applied when toggled on.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { StudentProfile } from '@/types';
import { router } from 'expo-router';

interface ProfileFilterToggleProps {
  studentProfile?: StudentProfile;
  isActive: boolean;
  onToggle: (active: boolean) => void;
  matchedJobsCount?: number;
  totalJobsCount?: number;
}

const TIME_SLOT_LABELS: Record<string, string> = {
  morning: 'Sáng',
  afternoon: 'Chiều',
  evening: 'Tối',
  lateNight: 'Đêm khuya',
  weekend: 'Cuối tuần',
};

const DAY_LABELS: Record<string, string> = {
  monday: 'T2',
  tuesday: 'T3',
  wednesday: 'T4',
  thursday: 'T5',
  friday: 'T6',
  saturday: 'T7',
  sunday: 'CN',
};

export const ProfileFilterToggle: React.FC<ProfileFilterToggleProps> = ({
  studentProfile,
  isActive,
  onToggle,
  matchedJobsCount = 0,
  totalJobsCount = 0,
}) => {
  // Check if profile has enough data for filtering
  const hasSchedule = (studentProfile?.availableDays?.length || 0) > 0;
  const hasTimeSlots = studentProfile?.availableTimeSlots && 
    Object.values(studentProfile.availableTimeSlots).some(v => v);
  const hasLocation = !!studentProfile?.schoolLocation?.address;
  
  const hasProfileData = hasSchedule || hasTimeSlots || hasLocation;

  // Generate summary text
  const getSummary = (): string => {
    if (!studentProfile) return '';
    
    const parts: string[] = [];
    
    // Days
    if (hasSchedule && studentProfile.availableDays) {
      const days = studentProfile.availableDays
        .map(d => DAY_LABELS[d] || d)
        .join(', ');
      parts.push(`Ngày: ${days}`);
    }
    
    // Time slots
    if (hasTimeSlots && studentProfile.availableTimeSlots) {
      const slots = Object.entries(studentProfile.availableTimeSlots)
        .filter(([_, v]) => v)
        .map(([k]) => TIME_SLOT_LABELS[k] || k)
        .join(', ');
      if (slots) parts.push(`Ca: ${slots}`);
    }
    
    // Location
    if (hasLocation && studentProfile.schoolLocation?.address) {
      const maxDist = studentProfile.maxDistance || 50;
      parts.push(`Khu vực: ${studentProfile.schoolLocation.address} (${maxDist}km)`);
    }
    
    return parts.join(' • ');
  };

  // No profile data - prompt to update
  if (!hasProfileData) {
    return (
      <TouchableOpacity
        style={styles.emptyContainer}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push('/(candidate)/studentProfile');
        }}
        activeOpacity={0.7}
      >
        <View style={styles.emptyIconContainer}>
          <Ionicons name="person-add-outline" size={20} color="#7c3aed" />
        </View>
        <View style={styles.emptyTextContainer}>
          <Text style={styles.emptyTitle}>Cập nhật hồ sơ sinh viên</Text>
          <Text style={styles.emptySubtitle}>
            Thêm lịch rảnh & khu vực để lọc job phù hợp
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {/* Toggle Button */}
      <TouchableOpacity
        style={[styles.toggleButton, isActive && styles.toggleButtonActive]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onToggle(!isActive);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.toggleLeft}>
          <View style={[styles.iconContainer, isActive && styles.iconContainerActive]}>
            <Ionicons 
              name={isActive ? "funnel" : "funnel-outline"} 
              size={18} 
              color={isActive ? "#fff" : "#7c3aed"} 
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.toggleTitle, isActive && styles.toggleTitleActive]}>
              Lọc theo hồ sơ
            </Text>
            {isActive && matchedJobsCount > 0 && (
              <Text style={styles.matchCount}>
                {matchedJobsCount}/{totalJobsCount} việc phù hợp
              </Text>
            )}
          </View>
        </View>
        
        <View style={[styles.switchTrack, isActive && styles.switchTrackActive]}>
          <View style={[styles.switchThumb, isActive && styles.switchThumbActive]} />
        </View>
      </TouchableOpacity>
      
      {/* Summary (when active) */}
      {isActive && (
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryText} numberOfLines={2}>
            {getSummary()}
          </Text>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/(candidate)/studentProfile');
            }}
          >
            <Text style={styles.editLink}>Sửa</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  toggleButtonActive: {
    backgroundColor: '#faf5ff',
  },
  
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f5f3ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerActive: {
    backgroundColor: '#7c3aed',
  },
  
  textContainer: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  toggleTitleActive: {
    color: '#7c3aed',
  },
  matchCount: {
    fontSize: 12,
    color: '#10b981',
    marginTop: 2,
    fontWeight: '500',
  },
  
  switchTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#cbd5e1',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchTrackActive: {
    backgroundColor: '#7c3aed',
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },
  
  summaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 8,
  },
  summaryText: {
    flex: 1,
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
  editLink: {
    fontSize: 12,
    color: '#7c3aed',
    fontWeight: '600',
  },
  
  // Empty state
  emptyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#faf5ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9d5ff',
    borderStyle: 'dashed',
    gap: 12,
  },
  emptyIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f5f3ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTextContainer: {
    flex: 1,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7c3aed',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
});
