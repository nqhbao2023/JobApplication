/**
 * Student Profile Settings Component
 * For configuring preferences for AI Job Matching
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authApiService } from '@/services/authApi.service';
import { StudentProfile } from '@/types';
import Slider from '@react-native-community/slider';
import { eventBus, EVENTS } from '@/utils/eventBus';

interface Props {
  visible: boolean;
  onClose: () => void;
  currentProfile?: StudentProfile;
  onSave?: (profile: StudentProfile) => void;
}

const WEEKDAYS = [
  { key: 'monday', label: 'Thứ 2' },
  { key: 'tuesday', label: 'Thứ 3' },
  { key: 'wednesday', label: 'Thứ 4' },
  { key: 'thursday', label: 'Thứ 5' },
  { key: 'friday', label: 'Thứ 6' },
  { key: 'saturday', label: 'Thứ 7' },
  { key: 'sunday', label: 'CN' },
];

const JOB_TYPES = ['part-time', 'full-time', 'internship', 'freelance', 'remote'];

// ✅ NEW: Popular locations in Vietnam for job seekers
const POPULAR_LOCATIONS = [
  'Hồ Chí Minh',
  'Hà Nội',
  'Bình Dương',
  'Đồng Nai',
  'Đà Nẵng',
  'Cần Thơ',
  'Hải Phòng',
  'Long An',
  'Bà Rịa - Vũng Tàu',
  'Thủ Dầu Một',
];

const StudentProfileSettings: React.FC<Props> = ({ visible, onClose, currentProfile, onSave }) => {
  const [profile, setProfile] = useState<StudentProfile>({
    availableDays: currentProfile?.availableDays || [],
    availableTimeSlots: currentProfile?.availableTimeSlots || {
      morning: false,
      afternoon: false,
      evening: false,
      lateNight: false,
      weekend: false,
    },
    maxDistance: currentProfile?.maxDistance || 10,
    preferredLocations: currentProfile?.preferredLocations || [], // ✅ NEW
    desiredSalary: currentProfile?.desiredSalary || {
      hourly: 25000,
    },
    skills: currentProfile?.skills || [],
    preferredJobTypes: currentProfile?.preferredJobTypes || [],
    hasExperience: currentProfile?.hasExperience || false,
    experienceMonths: currentProfile?.experienceMonths || 0,
  });

  const [skillInput, setSkillInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentProfile) {
      setProfile({
        availableDays: currentProfile.availableDays || [],
        availableTimeSlots: currentProfile.availableTimeSlots || {
          morning: false,
          afternoon: false,
          evening: false,
          lateNight: false,
          weekend: false,
        },
        maxDistance: currentProfile.maxDistance || 10,
        preferredLocations: currentProfile.preferredLocations || [], // ✅ NEW
        desiredSalary: currentProfile.desiredSalary || { hourly: 25000 },
        skills: currentProfile.skills || [],
        preferredJobTypes: currentProfile.preferredJobTypes || [],
        hasExperience: currentProfile.hasExperience || false,
        experienceMonths: currentProfile.experienceMonths || 0,
      });
    }
  }, [currentProfile]);

  const toggleDay = (day: string) => {
    const days = profile.availableDays || [];
    if (days.includes(day)) {
      setProfile({ ...profile, availableDays: days.filter(d => d !== day) });
    } else {
      setProfile({ ...profile, availableDays: [...days, day] });
    }
  };

  const toggleTimeSlot = (slot: 'morning' | 'afternoon' | 'evening' | 'lateNight' | 'weekend') => {
    setProfile({
      ...profile,
      availableTimeSlots: {
        ...profile.availableTimeSlots,
        [slot]: !profile.availableTimeSlots?.[slot],
      },
    });
  };

  const toggleJobType = (type: string) => {
    const types = profile.preferredJobTypes || [];
    if (types.includes(type)) {
      setProfile({ ...profile, preferredJobTypes: types.filter(t => t !== type) });
    } else {
      setProfile({ ...profile, preferredJobTypes: [...types, type] });
    }
  };

  // ✅ NEW: Toggle preferred location
  const toggleLocation = (location: string) => {
    const locations = profile.preferredLocations || [];
    if (locations.includes(location)) {
      setProfile({ ...profile, preferredLocations: locations.filter(l => l !== location) });
    } else {
      setProfile({ ...profile, preferredLocations: [...locations, location] });
    }
  };

  const addSkill = () => {
    if (!skillInput.trim()) return;
    const skills = profile.skills || [];
    if (!skills.includes(skillInput.trim())) {
      setProfile({ ...profile, skills: [...skills, skillInput.trim()] });
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => {
    setProfile({
      ...profile,
      skills: (profile.skills || []).filter(s => s !== skill),
    });
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      const updatedProfile = {
        ...profile,
        updatedAt: new Date().toISOString(),
        completionRate: calculateCompletionRate(profile),
      };
      
      // Update profile via API
      await authApiService.updateProfile({
        studentProfile: updatedProfile,
      });

      // ✅ Emit event để các component khác biết profile đã update
      eventBus.emit(EVENTS.PROFILE_UPDATED, { 
        profile: updatedProfile,
        timestamp: Date.now() 
      });

      Alert.alert('Thành công', 'Thông tin tìm việc đã được cập nhật!');
      
      if (onSave) {
        onSave(updatedProfile);
      }
      
      onClose();
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể cập nhật thông tin');
    } finally {
      setLoading(false);
    }
  };

  const calculateCompletionRate = (p: StudentProfile): number => {
    let completed = 0;
    let total = 7;

    if ((p.availableDays?.length || 0) > 0) completed++;
    if (Object.values(p.availableTimeSlots || {}).some(v => v)) completed++;
    if (p.maxDistance) completed++;
    if ((p.preferredLocations?.length || 0) > 0) completed++; // ✅ NEW
    if (p.desiredSalary?.hourly) completed++;
    if ((p.skills?.length || 0) > 0) completed++;
    if ((p.preferredJobTypes?.length || 0) > 0) completed++;
    if (p.hasExperience !== undefined) completed++;

    return Math.round((completed / total) * 100);
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Thông tin tìm việc</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Available Days */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ngày rảnh trong tuần</Text>
            <View style={styles.dayGrid}>
              {WEEKDAYS.map(({ key, label }) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.dayChip,
                    profile.availableDays?.includes(key) && styles.dayChipActive,
                  ]}
                  onPress={() => toggleDay(key)}
                >
                  <Text
                    style={[
                      styles.dayChipText,
                      profile.availableDays?.includes(key) && styles.dayChipTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Time Slots */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Khung giờ có thể làm</Text>
            <View style={styles.timeSlotContainer}>
              {[
                { key: 'morning' as const, label: '🌅 Sáng (6h-12h)', icon: 'sunny-outline' },
                { key: 'afternoon' as const, label: '☀️ Chiều (12h-18h)', icon: 'partly-sunny-outline' },
                { key: 'evening' as const, label: '🌆 Tối (18h-22h)', icon: 'moon-outline' },
                { key: 'lateNight' as const, label: '🌙 Khuya (22h-6h)', icon: 'moon' },
                { key: 'weekend' as const, label: '📅 Cuối tuần', icon: 'calendar-outline' },
              ].map(({ key, label }) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.timeSlot,
                    profile.availableTimeSlots?.[key] && styles.timeSlotActive,
                  ]}
                  onPress={() => toggleTimeSlot(key)}
                >
                  <Text
                    style={[
                      styles.timeSlotText,
                      profile.availableTimeSlots?.[key] && styles.timeSlotTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ✅ NEW: Preferred Locations */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Khu vực làm việc mong muốn</Text>
            <Text style={styles.sectionHint}>Chọn các tỉnh/thành phố bạn muốn làm việc</Text>
            <View style={styles.locationGrid}>
              {POPULAR_LOCATIONS.map((location) => (
                <TouchableOpacity
                  key={location}
                  style={[
                    styles.locationChip,
                    profile.preferredLocations?.includes(location) && styles.locationChipActive,
                  ]}
                  onPress={() => toggleLocation(location)}
                >
                  <Ionicons
                    name={profile.preferredLocations?.includes(location) ? 'checkmark-circle' : 'location-outline'}
                    size={16}
                    color={profile.preferredLocations?.includes(location) ? '#fff' : '#666'}
                  />
                  <Text
                    style={[
                      styles.locationChipText,
                      profile.preferredLocations?.includes(location) && styles.locationChipTextActive,
                    ]}
                  >
                    {location}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Max Distance */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Khoảng cách tối đa từ trường</Text>
            <View style={styles.sliderContainer}>
              <Slider
                style={styles.slider}
                minimumValue={1}
                maximumValue={30}
                step={1}
                value={profile.maxDistance || 10}
                onValueChange={(value) => setProfile({ ...profile, maxDistance: value })}
                minimumTrackTintColor="#4A80F0"
                maximumTrackTintColor="#ddd"
              />
              <Text style={styles.sliderValue}>{profile.maxDistance || 10} km</Text>
            </View>
          </View>

          {/* Desired Salary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lương mong muốn (VNĐ/giờ)</Text>
            <TextInput
              style={styles.input}
              value={(profile.desiredSalary?.hourly || 25000).toString()}
              onChangeText={(text) =>
                setProfile({
                  ...profile,
                  desiredSalary: { ...profile.desiredSalary, hourly: parseInt(text) || 0 },
                })
              }
              keyboardType="numeric"
              placeholder="VD: 25000"
            />
          </View>

          {/* Skills */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kỹ năng</Text>
            <View style={styles.skillInputContainer}>
              <TextInput
                style={styles.skillInput}
                value={skillInput}
                onChangeText={setSkillInput}
                placeholder="Nhập kỹ năng..."
                onSubmitEditing={addSkill}
              />
              <TouchableOpacity style={styles.addButton} onPress={addSkill}>
                <Ionicons name="add" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.skillTags}>
              {(profile.skills || []).map((skill) => (
                <View key={skill} style={styles.skillTag}>
                  <Text style={styles.skillTagText}>{skill}</Text>
                  <TouchableOpacity onPress={() => removeSkill(skill)}>
                    <Ionicons name="close-circle" size={16} color="#666" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>

          {/* Preferred Job Types */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Loại công việc ưu tiên</Text>
            <View style={styles.jobTypeGrid}>
              {JOB_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.jobTypeChip,
                    profile.preferredJobTypes?.includes(type) && styles.jobTypeChipActive,
                  ]}
                  onPress={() => toggleJobType(type)}
                >
                  <Text
                    style={[
                      styles.jobTypeChipText,
                      profile.preferredJobTypes?.includes(type) && styles.jobTypeChipTextActive,
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Experience */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kinh nghiệm làm việc</Text>
            <TouchableOpacity
              style={styles.experienceToggle}
              onPress={() =>
                setProfile({ ...profile, hasExperience: !profile.hasExperience })
              }
            >
              <Ionicons
                name={profile.hasExperience ? 'checkbox' : 'square-outline'}
                size={24}
                color="#4A80F0"
              />
              <Text style={styles.experienceText}>Đã có kinh nghiệm làm việc</Text>
            </TouchableOpacity>
            
            {profile.hasExperience && (
              <TextInput
                style={styles.input}
                value={(profile.experienceMonths || 0).toString()}
                onChangeText={(text) =>
                  setProfile({ ...profile, experienceMonths: parseInt(text) || 0 })
                }
                keyboardType="numeric"
                placeholder="Số tháng kinh nghiệm"
              />
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Hủy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxHeight: '85%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dayChipActive: {
    backgroundColor: '#4A80F0',
    borderColor: '#4A80F0',
  },
  dayChipText: {
    fontSize: 14,
    color: '#666',
  },
  dayChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  timeSlotContainer: {
    gap: 8,
  },
  timeSlot: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  timeSlotActive: {
    backgroundColor: '#E8F2FF',
    borderColor: '#4A80F0',
  },
  timeSlotText: {
    fontSize: 14,
    color: '#666',
  },
  timeSlotTextActive: {
    color: '#4A80F0',
    fontWeight: '600',
  },
  sliderContainer: {
    alignItems: 'center',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4A80F0',
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#f9f9f9',
  },
  skillInputContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  skillInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#f9f9f9',
  },
  addButton: {
    backgroundColor: '#4A80F0',
    borderRadius: 8,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skillTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#E8F2FF',
    borderWidth: 1,
    borderColor: '#4A80F0',
  },
  skillTagText: {
    fontSize: 13,
    color: '#4A80F0',
    fontWeight: '500',
  },
  jobTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  jobTypeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  jobTypeChipActive: {
    backgroundColor: '#4A80F0',
    borderColor: '#4A80F0',
  },
  jobTypeChipText: {
    fontSize: 13,
    color: '#666',
  },
  jobTypeChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  // ✅ NEW: Location styles
  sectionHint: {
    fontSize: 12,
    color: '#888',
    marginBottom: 12,
  },
  locationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  locationChipActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  locationChipText: {
    fontSize: 13,
    color: '#666',
  },
  locationChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  experienceToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  experienceText: {
    fontSize: 14,
    color: '#333',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#4A80F0',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default StudentProfileSettings;
