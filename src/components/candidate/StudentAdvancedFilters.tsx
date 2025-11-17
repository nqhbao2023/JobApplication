/**
 * Student Advanced Filters Component
 * 
 * Filter đặc trưng cho sinh viên:
 * - Lịch rảnh (days of week)
 * - Thời gian ca (morning/evening/weekend)
 * - Khoảng cách (GPS-based)
 * - Lương tối thiểu
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';

export interface StudentFilterState {
  // Schedule
  availableDays: string[];
  timeSlots: {
    morning: boolean;
    afternoon: boolean;
    evening: boolean;
    weekend: boolean;
  };
  
  // Location
  maxDistance: number; // km
  
  // Salary
  minHourlyRate: number; // VNĐ/giờ
  
  // Active state
  isActive: boolean; // Whether filters are applied
}

interface StudentAdvancedFiltersProps {
  filters: StudentFilterState;
  onFiltersChange: (filters: StudentFilterState) => void;
}

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'T2', fullName: 'Thứ 2' },
  { key: 'tuesday', label: 'T3', fullName: 'Thứ 3' },
  { key: 'wednesday', label: 'T4', fullName: 'Thứ 4' },
  { key: 'thursday', label: 'T5', fullName: 'Thứ 5' },
  { key: 'friday', label: 'T6', fullName: 'Thứ 6' },
  { key: 'saturday', label: 'T7', fullName: 'Thứ 7' },
  { key: 'sunday', label: 'CN', fullName: 'Chủ nhật' },
];

export const StudentAdvancedFilters: React.FC<StudentAdvancedFiltersProps> = ({
  filters,
  onFiltersChange,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [tempFilters, setTempFilters] = useState<StudentFilterState>(filters);

  const activeFilterCount = (): number => {
    let count = 0;
    if (tempFilters.availableDays.length > 0) count++;
    if (Object.values(tempFilters.timeSlots).some(v => v)) count++;
    if (tempFilters.maxDistance < 50) count++;
    if (tempFilters.minHourlyRate > 0) count++;
    return count;
  };

  const handleApply = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onFiltersChange({ ...tempFilters, isActive: activeFilterCount() > 0 });
    setModalVisible(false);
  };

  const handleReset = () => {
    const defaultFilters: StudentFilterState = {
      availableDays: [],
      timeSlots: {
        morning: false,
        afternoon: false,
        evening: false,
        weekend: false,
      },
      maxDistance: 50,
      minHourlyRate: 0,
      isActive: false,
    };
    setTempFilters(defaultFilters);
  };

  const toggleDay = (day: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newDays = tempFilters.availableDays.includes(day)
      ? tempFilters.availableDays.filter(d => d !== day)
      : [...tempFilters.availableDays, day];
    setTempFilters({ ...tempFilters, availableDays: newDays });
  };

  const toggleTimeSlot = (slot: keyof StudentFilterState['timeSlots']) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTempFilters({
      ...tempFilters,
      timeSlots: {
        ...tempFilters.timeSlots,
        [slot]: !tempFilters.timeSlots[slot],
      },
    });
  };

  return (
    <View>
      {/* Filter Trigger Button */}
      <TouchableOpacity
        style={styles.triggerButton}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setModalVisible(true);
        }}
      >
        <Ionicons
          name="options-outline"
          size={20}
          color={filters.isActive ? '#4A80F0' : '#64748b'}
        />
        <Text style={[styles.triggerText, filters.isActive && styles.triggerTextActive]}>
          Lọc nâng cao
        </Text>
        {filters.isActive && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{activeFilterCount()}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Filter Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color="#1e293b" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Lọc công việc phù hợp</Text>
            <TouchableOpacity onPress={handleReset}>
              <Text style={styles.resetText}>Đặt lại</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Available Days Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📅 Ngày có thể làm việc</Text>
              <Text style={styles.sectionSubtitle}>
                Chọn những ngày bạn rảnh (dựa vào lịch học)
              </Text>
              <View style={styles.daysGrid}>
                {DAYS_OF_WEEK.map(day => (
                  <TouchableOpacity
                    key={day.key}
                    style={[
                      styles.dayChip,
                      tempFilters.availableDays.includes(day.key) && styles.dayChipActive,
                    ]}
                    onPress={() => toggleDay(day.key)}
                  >
                    <Text
                      style={[
                        styles.dayChipText,
                        tempFilters.availableDays.includes(day.key) && styles.dayChipTextActive,
                      ]}
                    >
                      {day.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Time Slots Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>⏰ Khung giờ làm việc</Text>
              <Text style={styles.sectionSubtitle}>Chọn ca bạn có thể làm</Text>
              
              <View style={styles.timeSlotRow}>
                <View style={styles.timeSlotInfo}>
                  <Ionicons name="sunny-outline" size={20} color="#f59e0b" />
                  <Text style={styles.timeSlotLabel}>Sáng (6h-12h)</Text>
                </View>
                <Switch
                  value={tempFilters.timeSlots.morning}
                  onValueChange={() => toggleTimeSlot('morning')}
                  trackColor={{ false: '#cbd5e1', true: '#4A80F0' }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.timeSlotRow}>
                <View style={styles.timeSlotInfo}>
                  <Ionicons name="partly-sunny-outline" size={20} color="#fb923c" />
                  <Text style={styles.timeSlotLabel}>Chiều (12h-18h)</Text>
                </View>
                <Switch
                  value={tempFilters.timeSlots.afternoon}
                  onValueChange={() => toggleTimeSlot('afternoon')}
                  trackColor={{ false: '#cbd5e1', true: '#4A80F0' }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.timeSlotRow}>
                <View style={styles.timeSlotInfo}>
                  <Ionicons name="moon-outline" size={20} color="#6366f1" />
                  <Text style={styles.timeSlotLabel}>Tối (18h-22h)</Text>
                </View>
                <Switch
                  value={tempFilters.timeSlots.evening}
                  onValueChange={() => toggleTimeSlot('evening')}
                  trackColor={{ false: '#cbd5e1', true: '#4A80F0' }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.timeSlotRow}>
                <View style={styles.timeSlotInfo}>
                  <Ionicons name="calendar-outline" size={20} color="#10b981" />
                  <Text style={styles.timeSlotLabel}>Cuối tuần</Text>
                </View>
                <Switch
                  value={tempFilters.timeSlots.weekend}
                  onValueChange={() => toggleTimeSlot('weekend')}
                  trackColor={{ false: '#cbd5e1', true: '#4A80F0' }}
                  thumbColor="#fff"
                />
              </View>
            </View>

            {/* Distance Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📍 Khoảng cách tối đa</Text>
              <Text style={styles.sectionSubtitle}>
                Từ trường/nhà của bạn: <Text style={styles.valueText}>{tempFilters.maxDistance} km</Text>
              </Text>
              <Slider
                style={styles.slider}
                minimumValue={1}
                maximumValue={50}
                step={1}
                value={tempFilters.maxDistance}
                onValueChange={(value) =>
                  setTempFilters({ ...tempFilters, maxDistance: value })
                }
                minimumTrackTintColor="#4A80F0"
                maximumTrackTintColor="#cbd5e1"
                thumbTintColor="#4A80F0"
              />
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabel}>1 km</Text>
                <Text style={styles.sliderLabel}>50 km</Text>
              </View>
            </View>

            {/* Salary Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>💰 Lương tối thiểu</Text>
              <Text style={styles.sectionSubtitle}>
                Theo giờ: <Text style={styles.valueText}>
                  {tempFilters.minHourlyRate > 0
                    ? `${tempFilters.minHourlyRate.toLocaleString('vi-VN')} VNĐ/giờ`
                    : 'Không yêu cầu'}
                </Text>
              </Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={100000}
                step={5000}
                value={tempFilters.minHourlyRate}
                onValueChange={(value) =>
                  setTempFilters({ ...tempFilters, minHourlyRate: value })
                }
                minimumTrackTintColor="#4A80F0"
                maximumTrackTintColor="#cbd5e1"
                thumbTintColor="#4A80F0"
              />
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabel}>0</Text>
                <Text style={styles.sliderLabel}>100k VNĐ/h</Text>
              </View>
            </View>
          </ScrollView>

          {/* Apply Button */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
              <Text style={styles.applyButtonText}>
                Áp dụng ({activeFilterCount()} bộ lọc)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  triggerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  triggerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  triggerTextActive: {
    color: '#4A80F0',
  },
  badge: {
    backgroundColor: '#4A80F0',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },

  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  resetText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },

  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },

  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 16,
  },
  valueText: {
    color: '#4A80F0',
    fontWeight: '600',
  },

  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minWidth: 50,
    alignItems: 'center',
  },
  dayChipActive: {
    backgroundColor: '#4A80F0',
    borderColor: '#4A80F0',
  },
  dayChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  dayChipTextActive: {
    color: '#fff',
  },

  timeSlotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  timeSlotInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeSlotLabel: {
    fontSize: 15,
    color: '#334155',
    fontWeight: '500',
  },

  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },

  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  applyButton: {
    backgroundColor: '#4A80F0',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
