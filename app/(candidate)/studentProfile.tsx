/**
 * Student Profile Settings Screen
 * 
 * Màn hình để sinh viên nhập:
 * - Lịch học (ngày rảnh)
 * - Kỹ năng
 * - Vị trí trường
 * - Lương mong muốn
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeBack } from '@/hooks/useSafeBack';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { auth } from '@/config/firebase';
import { authApiService } from '@/services/authApi.service';
import { StudentProfile } from '@/types';
import { SCROLL_BOTTOM_PADDING } from '@/utils/layout.utils';
import { DrawerMenuButton } from '@/components/candidate/DrawerMenu';

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'T2', fullName: 'Thứ 2' },
  { key: 'tuesday', label: 'T3', fullName: 'Thứ 3' },
  { key: 'wednesday', label: 'T4', fullName: 'Thứ 4' },
  { key: 'thursday', label: 'T5', fullName: 'Thứ 5' },
  { key: 'friday', label: 'T6', fullName: 'Thứ 6' },
  { key: 'saturday', label: 'T7', fullName: 'Thứ 7' },
  { key: 'sunday', label: 'CN', fullName: 'Chủ nhật' },
];

const COMMON_SKILLS = [
  'Microsoft Office',
  'Tiếng Anh',
  'Photoshop',
  'Video Editing',
  'Sales',
  'Marketing',
  'Customer Service',
  'Kế toán',
  'Lái xe',
  'Nấu ăn',
];

const StudentProfileSettings = () => {
  const { goBack } = useSafeBack({ fallback: '/(candidate)/profile' });
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<StudentProfile>({
    availableDays: [],
    availableTimeSlots: {
      morning: false,
      afternoon: false,
      evening: false,
      weekend: false,
    },
    schoolLocation: {
      latitude: 10.9804,
      longitude: 106.6759,
      address: 'Đại học Thủ Dầu Một, Bình Dương',
    },
    maxDistance: 5,
    desiredSalary: {
      hourly: 25000,
      daily: 200000,
      monthly: 5000000,
    },
    skills: [],
    hasExperience: false,
    experienceMonths: 0,
    preferredJobTypes: [],
    preferredCategories: [],
  });

  const [customSkill, setCustomSkill] = useState('');
  const [schoolAddress, setSchoolAddress] = useState(profile.schoolLocation?.address || '');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const userProfile = await authApiService.getProfile();
      if (userProfile.studentProfile) {
        setProfile({
          ...profile,
          ...userProfile.studentProfile,
        });
        if (userProfile.studentProfile.schoolLocation?.address) {
          setSchoolAddress(userProfile.studentProfile.schoolLocation.address);
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const saveProfile = async () => {
    try {
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const completionRate = calculateCompletionRate();
      const updatedProfile: StudentProfile = {
        ...profile,
        schoolLocation: {
          ...profile.schoolLocation!,
          address: schoolAddress,
        },
        completionRate,
        updatedAt: new Date().toISOString(),
      };

      // Update user profile in Firestore
      await authApiService.updateProfile({
        studentProfile: updatedProfile,
      });

      Alert.alert('Thành công', 'Đã lưu thông tin cá nhân', [
        {
          text: 'OK',
          onPress: () => goBack(),
        },
      ]);
    } catch (error: any) {
      console.error('Error saving profile:', error);
      Alert.alert('Lỗi', error.message || 'Không thể lưu thông tin');
    } finally {
      setLoading(false);
    }
  };

  const calculateCompletionRate = (): number => {
    let completed = 0;
    const total = 6;

    if (profile.availableDays && profile.availableDays.length > 0) completed++;
    if (Object.values(profile.availableTimeSlots || {}).some(v => v)) completed++;
    if (profile.schoolLocation) completed++;
    if (profile.desiredSalary?.hourly || profile.desiredSalary?.monthly) completed++;
    if (profile.skills && profile.skills.length > 0) completed++;
    if (profile.hasExperience !== undefined) completed++;

    return Math.round((completed / total) * 100);
  };

  const toggleDay = (day: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newDays = profile.availableDays?.includes(day)
      ? profile.availableDays.filter(d => d !== day)
      : [...(profile.availableDays || []), day];
    setProfile({ ...profile, availableDays: newDays });
  };

  const toggleTimeSlot = (slot: 'morning' | 'afternoon' | 'evening' | 'weekend') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setProfile({
      ...profile,
      availableTimeSlots: {
        ...profile.availableTimeSlots,
        [slot]: !profile.availableTimeSlots?.[slot],
      },
    });
  };

  const toggleSkill = (skill: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const skills = profile.skills || [];
    const newSkills = skills.includes(skill)
      ? skills.filter(s => s !== skill)
      : [...skills, skill];
    setProfile({ ...profile, skills: newSkills });
  };

  const addCustomSkill = () => {
    if (!customSkill.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const skills = profile.skills || [];
    if (!skills.includes(customSkill.trim())) {
      setProfile({
        ...profile,
        skills: [...skills, customSkill.trim()],
      });
    }
    setCustomSkill('');
  };

  const getCurrentLocation = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Check if location services are available
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        Alert.alert(
          'Dịch vụ vị trí chưa bật',
          'Bạn có thể nhập địa chỉ thủ công bên trên, hoặc bật dịch vụ vị trí trong Cài đặt.',
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Cần quyền truy cập vị trí',
          'Bạn có thể nhập địa chỉ thủ công bên trên, hoặc cấp quyền vị trí trong Cài đặt.',
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const fullAddress = [
        address.street,
        address.district,
        address.city,
      ].filter(Boolean).join(', ');

      setProfile({
        ...profile,
        schoolLocation: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          address: fullAddress,
        },
      });
      setSchoolAddress(fullAddress);
      
      Alert.alert('Thành công', 'Đã lấy vị trí hiện tại');
    } catch (error: any) {
      console.error('Error getting location:', error);
      // User-friendly message
      Alert.alert(
        'Không thể lấy vị trí',
        'Vui lòng nhập địa chỉ thủ công bên trên.\n\n(Lỗi: ' + (error?.message || 'Không xác định') + ')',
        [{ text: 'OK', style: 'default' }]
      );
    }
  };

  const completionRate = calculateCompletionRate();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <DrawerMenuButton />
        <Text style={styles.headerTitle}>Hồ sơ sinh viên</Text>
        <TouchableOpacity onPress={saveProfile} disabled={loading}>
          <Text style={[styles.saveText, loading && { opacity: 0.5 }]}>
            {loading ? 'Đang lưu...' : 'Lưu'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Completion Progress */}
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>Hoàn thiện hồ sơ</Text>
          <Text style={styles.progressPercent}>{completionRate}%</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBar, { width: `${completionRate}%` }]} />
        </View>
        <Text style={styles.progressHint}>
          Hồ sơ hoàn thiện giúp tìm việc phù hợp hơn
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Available Days */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar-outline" size={22} color="#4A80F0" />
            <Text style={styles.sectionTitle}>Ngày có thể làm việc</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Chọn những ngày bạn rảnh (dựa vào lịch học)
          </Text>
          <View style={styles.daysGrid}>
            {DAYS_OF_WEEK.map(day => (
              <TouchableOpacity
                key={day.key}
                style={[
                  styles.dayChip,
                  profile.availableDays?.includes(day.key) && styles.dayChipActive,
                ]}
                onPress={() => toggleDay(day.key)}
              >
                <Text
                  style={[
                    styles.dayChipText,
                    profile.availableDays?.includes(day.key) && styles.dayChipTextActive,
                  ]}
                >
                  {day.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Time Slots */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time-outline" size={22} color="#4A80F0" />
            <Text style={styles.sectionTitle}>Khung giờ làm việc</Text>
          </View>
          <Text style={styles.sectionSubtitle}>Chọn ca bạn có thể làm</Text>

          <View style={styles.timeSlotRow}>
            <View style={styles.timeSlotInfo}>
              <Ionicons name="sunny-outline" size={20} color="#f59e0b" />
              <Text style={styles.timeSlotLabel}>Sáng (6h-12h)</Text>
            </View>
            <Switch
              value={profile.availableTimeSlots?.morning}
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
              value={profile.availableTimeSlots?.afternoon}
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
              value={profile.availableTimeSlots?.evening}
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
              value={profile.availableTimeSlots?.weekend}
              onValueChange={() => toggleTimeSlot('weekend')}
              trackColor={{ false: '#cbd5e1', true: '#4A80F0' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* School Location */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location-outline" size={22} color="#4A80F0" />
            <Text style={styles.sectionTitle}>Vị trí trường/nhà</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Để tìm việc gần bạn nhất
          </Text>
          <TextInput
            style={styles.input}
            value={schoolAddress}
            onChangeText={setSchoolAddress}
            placeholder="Nhập địa chỉ trường hoặc nhà"
            placeholderTextColor="#94a3b8"
          />
          <TouchableOpacity style={styles.locationButton} onPress={getCurrentLocation}>
            <Ionicons name="navigate" size={18} color="#4A80F0" />
            <Text style={styles.locationButtonText}>Dùng vị trí hiện tại</Text>
          </TouchableOpacity>
        </View>

        {/* Max Distance */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="car-outline" size={22} color="#4A80F0" />
            <Text style={styles.sectionTitle}>Khoảng cách tối đa</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            <Text style={styles.valueText}>{profile.maxDistance} km</Text>
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={50}
            step={1}
            value={profile.maxDistance || 5}
            onValueChange={(value) => setProfile({ ...profile, maxDistance: value })}
            minimumTrackTintColor="#4A80F0"
            maximumTrackTintColor="#cbd5e1"
            thumbTintColor="#4A80F0"
          />
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>1 km</Text>
            <Text style={styles.sliderLabel}>50 km</Text>
          </View>
        </View>

        {/* Desired Salary */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cash-outline" size={22} color="#4A80F0" />
            <Text style={styles.sectionTitle}>Lương mong muốn</Text>
          </View>
          
          <Text style={styles.sectionSubtitle}>
            Theo giờ: <Text style={styles.valueText}>
              {(profile.desiredSalary?.hourly || 0).toLocaleString('vi-VN')} VNĐ/giờ
            </Text>
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={100000}
            step={5000}
            value={profile.desiredSalary?.hourly || 25000}
            onValueChange={(value) =>
              setProfile({
                ...profile,
                desiredSalary: { ...profile.desiredSalary, hourly: value },
              })
            }
            minimumTrackTintColor="#4A80F0"
            maximumTrackTintColor="#cbd5e1"
            thumbTintColor="#4A80F0"
          />
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>0</Text>
            <Text style={styles.sliderLabel}>100k/h</Text>
          </View>

          <Text style={[styles.sectionSubtitle, { marginTop: 16 }]}>
            Theo tháng: <Text style={styles.valueText}>
              {((profile.desiredSalary?.monthly || 0) / 1000000).toFixed(1)} triệu VNĐ
            </Text>
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={15000000}
            step={500000}
            value={profile.desiredSalary?.monthly || 5000000}
            onValueChange={(value) =>
              setProfile({
                ...profile,
                desiredSalary: { ...profile.desiredSalary, monthly: value },
              })
            }
            minimumTrackTintColor="#4A80F0"
            maximumTrackTintColor="#cbd5e1"
            thumbTintColor="#4A80F0"
          />
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>0</Text>
            <Text style={styles.sliderLabel}>15 triệu</Text>
          </View>
        </View>

        {/* Skills */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="bulb-outline" size={22} color="#4A80F0" />
            <Text style={styles.sectionTitle}>Kỹ năng</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Chọn hoặc thêm kỹ năng của bạn
          </Text>
          
          <View style={styles.skillsGrid}>
            {COMMON_SKILLS.map(skill => (
              <TouchableOpacity
                key={skill}
                style={[
                  styles.skillChip,
                  profile.skills?.includes(skill) && styles.skillChipActive,
                ]}
                onPress={() => toggleSkill(skill)}
              >
                <Text
                  style={[
                    styles.skillChipText,
                    profile.skills?.includes(skill) && styles.skillChipTextActive,
                  ]}
                >
                  {skill}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom Skills */}
          {profile.skills && profile.skills.filter(s => !COMMON_SKILLS.includes(s)).length > 0 && (
            <View style={styles.customSkillsContainer}>
              <Text style={styles.customSkillsTitle}>Kỹ năng khác:</Text>
              <View style={styles.skillsGrid}>
                {profile.skills
                  .filter(s => !COMMON_SKILLS.includes(s))
                  .map(skill => (
                    <TouchableOpacity
                      key={skill}
                      style={[styles.skillChip, styles.skillChipActive]}
                      onPress={() => toggleSkill(skill)}
                    >
                      <Text style={styles.skillChipTextActive}>{skill}</Text>
                      <Ionicons name="close-circle" size={16} color="#fff" />
                    </TouchableOpacity>
                  ))}
              </View>
            </View>
          )}

          <View style={styles.addSkillContainer}>
            <TextInput
              style={styles.skillInput}
              value={customSkill}
              onChangeText={setCustomSkill}
              placeholder="Thêm kỹ năng khác..."
              placeholderTextColor="#94a3b8"
              onSubmitEditing={addCustomSkill}
            />
            <TouchableOpacity style={styles.addButton} onPress={addCustomSkill}>
              <Ionicons name="add-circle" size={24} color="#4A80F0" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Experience */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="briefcase-outline" size={22} color="#4A80F0" />
            <Text style={styles.sectionTitle}>Kinh nghiệm làm việc</Text>
          </View>
          
          <View style={styles.experienceRow}>
            <Text style={styles.experienceLabel}>Đã có kinh nghiệm?</Text>
            <Switch
              value={profile.hasExperience}
              onValueChange={(value) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setProfile({ ...profile, hasExperience: value });
              }}
              trackColor={{ false: '#cbd5e1', true: '#4A80F0' }}
              thumbColor="#fff"
            />
          </View>

          {profile.hasExperience && (
            <View style={styles.experienceMonthsContainer}>
              <Text style={styles.sectionSubtitle}>
                Số tháng kinh nghiệm: <Text style={styles.valueText}>
                  {profile.experienceMonths || 0} tháng
                </Text>
              </Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={60}
                step={1}
                value={profile.experienceMonths || 0}
                onValueChange={(value) =>
                  setProfile({ ...profile, experienceMonths: value })
                }
                minimumTrackTintColor="#4A80F0"
                maximumTrackTintColor="#cbd5e1"
                thumbTintColor="#4A80F0"
              />
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabel}>0 tháng</Text>
                <Text style={styles.sliderLabel}>5 năm</Text>
              </View>
            </View>
          )}
        </View>

        {/* Save Button - Inline trong scroll */}
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={saveProfile}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? 'Đang lưu...' : 'Lưu thông tin'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default StudentProfileSettings;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
    textAlign: 'center',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A80F0',
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#f8fafc',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4A80F0',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4A80F0',
    borderRadius: 4,
  },
  progressHint: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 6,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: SCROLL_BOTTOM_PADDING,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12,
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
  input: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    fontSize: 15,
    color: '#1e293b',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 8,
  },
  locationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A80F0',
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
  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  skillChipActive: {
    backgroundColor: '#4A80F0',
    borderColor: '#4A80F0',
  },
  skillChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
  },
  skillChipTextActive: {
    color: '#fff',
  },
  customSkillsContainer: {
    marginTop: 12,
  },
  customSkillsTitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 8,
  },
  addSkillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  skillInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    fontSize: 14,
    color: '#1e293b',
  },
  addButton: {
    padding: 4,
  },
  experienceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  experienceLabel: {
    fontSize: 15,
    color: '#334155',
    fontWeight: '500',
  },
  experienceMonthsContainer: {
    marginTop: 12,
  },
  saveButton: {
    backgroundColor: '#4A80F0',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 16,
    shadowColor: '#4A80F0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
