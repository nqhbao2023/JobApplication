import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { quickPostService, QuickPostJobData } from '@/services/quickPostApi.service';
import { auth } from '@/config/firebase';
import { LinearGradient } from 'expo-linear-gradient';

export type QuickPostMode = 'candidate_seeking' | 'employer_seeking';

interface QuickPostFormProps {
  mode?: QuickPostMode;
}

// ✅ Danh sách khu vực gợi ý
const LOCATION_SUGGESTIONS = [
  'TP. Thủ Dầu Một, Bình Dương',
  'TP. Dĩ An, Bình Dương',
  'TP. Thuận An, Bình Dương',
  'TX. Bến Cát, Bình Dương',
  'TX. Tân Uyên, Bình Dương',
  'Quận 1, TP.HCM',
  'Quận 7, TP.HCM',
  'Quận Bình Thạnh, TP.HCM',
  'Quận Thủ Đức, TP.HCM',
  'Quận Gò Vấp, TP.HCM',
  'Quận Tân Bình, TP.HCM',
  'TP. Biên Hòa, Đồng Nai',
];

// ✅ Các khung giờ làm việc
const SCHEDULE_OPTIONS = [
  { id: 'morning', label: 'Sáng (6h-12h)', icon: '🌅' },
  { id: 'afternoon', label: 'Chiều (12h-18h)', icon: '☀️' },
  { id: 'evening', label: 'Tối (18h-22h)', icon: '🌙' },
  { id: 'night', label: 'Đêm (22h-6h)', icon: '🌃' },
  { id: 'weekend', label: 'Cuối tuần', icon: '📅' },
  { id: 'flexible', label: 'Linh hoạt', icon: '⏰' },
];

// ✅ Mức lương gợi ý
const SALARY_OPTIONS = [
  { value: '20000', label: '20,000đ/giờ' },
  { value: '25000', label: '25,000đ/giờ' },
  { value: '30000', label: '30,000đ/giờ' },
  { value: '35000', label: '35,000đ/giờ' },
  { value: '40000', label: '40,000đ/giờ' },
  { value: '50000', label: '50,000+đ/giờ' },
  { value: 'negotiable', label: 'Thỏa thuận' },
];

const QuickPostForm = ({ mode = 'employer_seeking' }: QuickPostFormProps) => {
  const isCandidateSeeking = mode === 'candidate_seeking';
  const currentUser = auth.currentUser;
  
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [cvUrl, setCvUrl] = useState<string>(''); // ✅ NEW: CV URL
  const [showImageInput, setShowImageInput] = useState(false);
  const [showCvInput, setShowCvInput] = useState(false);
  const [selectedSchedules, setSelectedSchedules] = useState<string[]>([]); // ✅ Multiple select
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [expectedSalary, setExpectedSalary] = useState<string>(''); // ✅ NEW
  
  const [formData, setFormData] = useState<QuickPostJobData>({
    title: '',
    description: '',
    company: '',
    location: '',
    workSchedule: '',
    hourlyRate: undefined,
    type: 'part-time',
    category: '',
    image: undefined,
    contactInfo: {
      phone: '',
      zalo: '',
      email: currentUser?.email || '',
    },
  });

  // ✅ Filter location suggestions based on input
  const filteredLocations = useMemo(() => {
    if (!formData.location) return LOCATION_SUGGESTIONS;
    const search = formData.location.toLowerCase();
    return LOCATION_SUGGESTIONS.filter(loc => 
      loc.toLowerCase().includes(search)
    );
  }, [formData.location]);

  // ✅ Toggle schedule selection
  const toggleSchedule = (scheduleId: string) => {
    setSelectedSchedules(prev => {
      if (prev.includes(scheduleId)) {
        return prev.filter(id => id !== scheduleId);
      }
      return [...prev, scheduleId];
    });
  };

  const isValidUrl = (url: string): boolean => {
    if (!url) return true;
    return url.startsWith('https://') || url.startsWith('http://');
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.title || !formData.description || !formData.location) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    if (formData.title.length < 10) {
      Alert.alert('Lỗi', 'Tiêu đề phải có ít nhất 10 ký tự');
      return;
    }

    if (formData.description.length < 20) {
      Alert.alert('Lỗi', isCandidateSeeking ? 'Mô tả bản thân phải có ít nhất 20 ký tự' : 'Mô tả công việc phải có ít nhất 20 ký tự');
      return;
    }

    if (!formData.contactInfo.phone && !formData.contactInfo.email) {
      Alert.alert('Lỗi', 'Vui lòng nhập ít nhất số điện thoại hoặc email');
      return;
    }

    // Validate URLs
    if (imageUrl && !isValidUrl(imageUrl)) {
      Alert.alert('Lỗi', 'Link ảnh không hợp lệ');
      return;
    }

    if (cvUrl && !isValidUrl(cvUrl)) {
      Alert.alert('Lỗi', 'Link CV không hợp lệ');
      return;
    }

    try {
      setLoading(true);

      // Build schedule string from selections
      const scheduleText = selectedSchedules.length > 0
        ? selectedSchedules.map(id => {
            const option = SCHEDULE_OPTIONS.find(o => o.id === id);
            return option?.label || id;
          }).join(', ')
        : formData.workSchedule;

      const finalFormData: QuickPostJobData = { 
        ...formData,
        image: imageUrl.trim() || undefined,
        jobType: mode,
        posterId: currentUser?.uid || undefined,
        workSchedule: scheduleText,
        // ✅ NEW: Candidate specific fields
        ...(isCandidateSeeking && {
          cvUrl: cvUrl.trim() || undefined,
          expectedSalary: expectedSalary || undefined,
          availableSchedule: selectedSchedules.length > 0 ? selectedSchedules : undefined,
        }),
      };

      await quickPostService.createQuickPost(finalFormData);
      
      const successMessage = isCandidateSeeking
        ? 'Hồ sơ tìm việc của bạn đã được gửi! Admin sẽ duyệt trong vòng 24h. Sau khi duyệt, nhà tuyển dụng có thể xem và liên hệ với bạn.'
        : 'Tin tuyển dụng của bạn đã được gửi. Admin sẽ duyệt trong vòng 24h.';
      
      Alert.alert('🎉 Thành công!', successMessage, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể tạo tin');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Render Schedule Chip
  const renderScheduleChip = (option: typeof SCHEDULE_OPTIONS[0]) => {
    const isSelected = selectedSchedules.includes(option.id);
    return (
      <TouchableOpacity
        key={option.id}
        style={[styles.scheduleChip, isSelected && styles.scheduleChipSelected]}
        onPress={() => toggleSchedule(option.id)}
      >
        <Text style={styles.scheduleChipIcon}>{option.icon}</Text>
        <Text style={[styles.scheduleChipText, isSelected && styles.scheduleChipTextSelected]}>
          {option.label}
        </Text>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={16} color="#10b981" style={{ marginLeft: 4 }} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        {isCandidateSeeking ? (
          <LinearGradient
            colors={['#10b981', '#059669']}
            style={styles.headerGradient}
          >
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitleWhite}>⚡ Đăng tin tìm việc</Text>
              <Text style={styles.headerSubtitle}>Để nhà tuyển dụng tìm thấy bạn</Text>
            </View>
            <View style={{ width: 24 }} />
          </LinearGradient>
        ) : (
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Đăng tin tuyển dụng</Text>
            <View style={{ width: 24 }} />
          </View>
        )}

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Progress indicator for candidate */}
          {isCandidateSeeking && (
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>📝 Điền thông tin để nhà tuyển dụng liên hệ</Text>
            </View>
          )}

          {/* ===== SECTION: Ảnh đại diện ===== */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              {isCandidateSeeking ? '📸 Ảnh đại diện' : 'Hình ảnh'} (không bắt buộc)
            </Text>
            {!showImageInput ? (
              <TouchableOpacity 
                style={styles.imagePicker} 
                onPress={() => setShowImageInput(true)}
              >
                <Ionicons name={isCandidateSeeking ? "person-circle-outline" : "image-outline"} size={40} color="#10b981" />
                <Text style={styles.imagePickerText}>
                  {isCandidateSeeking ? 'Thêm ảnh đại diện' : 'Thêm ảnh minh họa'}
                </Text>
                <Text style={styles.imagePickerHint}>Dán link từ Facebook, Google Photos...</Text>
              </TouchableOpacity>
            ) : (
              <View>
                <TextInput
                  style={styles.input}
                  placeholder="https://drive.google.com/..."
                  value={imageUrl}
                  onChangeText={setImageUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {imageUrl && isValidUrl(imageUrl) && (
                  <View style={styles.imagePreviewContainer}>
                    <Image 
                      source={{ uri: imageUrl }} 
                      style={styles.imagePreview}
                    />
                    <TouchableOpacity 
                      style={styles.removeButton} 
                      onPress={() => { setImageUrl(''); setShowImageInput(false); }}
                    >
                      <Ionicons name="close-circle" size={28} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* ===== SECTION: CV (Candidate only) ===== */}
          {isCandidateSeeking && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>📄 CV của bạn (khuyến khích)</Text>
              {!showCvInput ? (
                <TouchableOpacity 
                  style={[styles.imagePicker, styles.cvPicker]} 
                  onPress={() => setShowCvInput(true)}
                >
                  <Ionicons name="document-text-outline" size={40} color="#3b82f6" />
                  <Text style={styles.imagePickerText}>Thêm link CV</Text>
                  <Text style={styles.imagePickerHint}>Google Drive, Dropbox, hoặc link CV online</Text>
                </TouchableOpacity>
              ) : (
                <View>
                  <TextInput
                    style={styles.input}
                    placeholder="https://drive.google.com/file/d/..."
                    value={cvUrl}
                    onChangeText={setCvUrl}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Text style={styles.cvHint}>
                    💡 Tip: Upload CV lên Google Drive → Click phải → Lấy đường liên kết → Dán vào đây
                  </Text>
                  {cvUrl && (
                    <TouchableOpacity 
                      style={styles.cvPreviewButton}
                      onPress={() => Alert.alert('CV đã thêm', `Link: ${cvUrl}`)}
                    >
                      <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                      <Text style={styles.cvPreviewText}>CV đã được thêm</Text>
                      <TouchableOpacity onPress={() => { setCvUrl(''); setShowCvInput(false); }}>
                        <Ionicons name="close" size={20} color="#ef4444" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          )}

          {/* ===== SECTION: Vị trí mong muốn / Tiêu đề ===== */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              {isCandidateSeeking ? '💼 Vị trí mong muốn' : 'Tiêu đề'} <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder={isCandidateSeeking 
                ? "VD: Tìm việc phục vụ quán cafe, bán hàng..." 
                : "VD: Tuyển nhân viên phục vụ quán cafe"}
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
            />
          </View>

          {/* ===== SECTION: Giới thiệu / Mô tả ===== */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              {isCandidateSeeking ? '📝 Giới thiệu bản thân' : 'Mô tả công việc'} <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={isCandidateSeeking 
                ? "Mô tả về bản thân:\n- Bạn là sinh viên năm mấy?\n- Kỹ năng, kinh nghiệm?\n- Điểm mạnh của bạn?" 
                : "Mô tả chi tiết công việc, yêu cầu..."}
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          {/* ===== SECTION: Khu vực với suggestions ===== */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              📍 {isCandidateSeeking ? 'Khu vực mong muốn' : 'Địa điểm'} <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập khu vực..."
              value={formData.location}
              onChangeText={(text) => {
                setFormData({ ...formData, location: text });
                setShowLocationSuggestions(true);
              }}
              onFocus={() => setShowLocationSuggestions(true)}
            />
            {showLocationSuggestions && filteredLocations.length > 0 && (
              <View style={styles.suggestionsContainer}>
                <Text style={styles.suggestionsTitle}>Gợi ý:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {filteredLocations.slice(0, 6).map((loc, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.suggestionChip}
                      onPress={() => {
                        setFormData({ ...formData, location: loc });
                        setShowLocationSuggestions(false);
                      }}
                    >
                      <Text style={styles.suggestionText}>{loc}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* ===== SECTION: Thời gian làm việc (Multi-select chips) ===== */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              ⏰ {isCandidateSeeking ? 'Thời gian có thể làm việc' : 'Lịch làm việc'}
            </Text>
            <View style={styles.scheduleContainer}>
              {SCHEDULE_OPTIONS.map(renderScheduleChip)}
            </View>
            {selectedSchedules.length === 0 && (
              <TextInput
                style={[styles.input, { marginTop: 8 }]}
                placeholder="Hoặc nhập chi tiết: VD: Thứ 2,4,6 tối sau 17h"
                value={formData.workSchedule}
                onChangeText={(text) => setFormData({ ...formData, workSchedule: text })}
              />
            )}
          </View>

          {/* ===== SECTION: Lương mong muốn (Candidate) ===== */}
          {isCandidateSeeking && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>💰 Mức lương mong muốn</Text>
              <View style={styles.salaryContainer}>
                {SALARY_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.salaryChip,
                      expectedSalary === option.value && styles.salaryChipSelected
                    ]}
                    onPress={() => setExpectedSalary(option.value)}
                  >
                    <Text style={[
                      styles.salaryChipText,
                      expectedSalary === option.value && styles.salaryChipTextSelected
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* ===== SECTION: Lương (Employer) ===== */}
          {!isCandidateSeeking && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>💰 Lương theo giờ (VNĐ)</Text>
              <TextInput
                style={styles.input}
                placeholder="VD: 25000"
                value={formData.hourlyRate?.toString() || ''}
                onChangeText={(text) =>
                  setFormData({ ...formData, hourlyRate: parseInt(text) || undefined })
                }
                keyboardType="numeric"
              />
            </View>
          )}

          {/* ===== SECTION: Company (Employer only) ===== */}
          {!isCandidateSeeking && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>🏢 Tên công ty/Cửa hàng</Text>
              <TextInput
                style={styles.input}
                placeholder="VD: Cafe Highlands"
                value={formData.company}
                onChangeText={(text) => setFormData({ ...formData, company: text })}
              />
            </View>
          )}

          {/* ===== SECTION: Thông tin liên hệ ===== */}
          <View style={styles.sectionHeader}>
            <Ionicons name="call-outline" size={20} color="#10b981" />
            <Text style={styles.sectionTitle}>Thông tin liên hệ</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>📞 Số điện thoại</Text>
            <TextInput
              style={styles.input}
              placeholder="0909123456"
              value={formData.contactInfo.phone}
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  contactInfo: { ...formData.contactInfo, phone: text },
                })
              }
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>💬 Zalo</Text>
            <TextInput
              style={styles.input}
              placeholder="Số Zalo (thường trùng SĐT)"
              value={formData.contactInfo.zalo}
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  contactInfo: { ...formData.contactInfo, zalo: text },
                })
              }
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>📧 Email</Text>
            <TextInput
              style={styles.input}
              placeholder="email@example.com"
              value={formData.contactInfo.email}
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  contactInfo: { ...formData.contactInfo, email: text },
                })
              }
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* ===== SUBMIT BUTTON ===== */}
          <TouchableOpacity
            style={[
              styles.submitButton, 
              loading && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <LinearGradient
              colors={isCandidateSeeking ? ['#10b981', '#059669'] : ['#3b82f6', '#2563eb']}
              style={styles.submitGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading ? (
                <Text style={styles.submitButtonText}>Đang gửi...</Text>
              ) : (
                <>
                  <Ionicons name={isCandidateSeeking ? "rocket" : "paper-plane"} size={20} color="#fff" />
                  <Text style={styles.submitButtonText}>
                    {isCandidateSeeking ? 'Đăng hồ sơ tìm việc' : 'Đăng tin tuyển dụng'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.note}>
            {isCandidateSeeking 
              ? '⏱️ Hồ sơ sẽ được duyệt trong 24h. Nhà tuyển dụng sẽ xem được và liên hệ bạn.' 
              : '⏱️ Tin tuyển dụng sẽ được duyệt trong vòng 24h'}
          </Text>
          
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 8,
  },
  backButton: {
    padding: 4,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  headerTitleWhite: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  progressContainer: {
    backgroundColor: '#ecfdf5',
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  progressText: {
    color: '#065f46',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    color: '#334155',
  },
  required: {
    color: '#ef4444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    backgroundColor: '#fff',
    color: '#1e293b',
  },
  textArea: {
    height: 140,
    paddingTop: 14,
  },
  // Image picker
  imagePicker: {
    borderWidth: 2,
    borderColor: '#d1fae5',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0fdf4',
  },
  cvPicker: {
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
  },
  imagePickerText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginTop: 8,
  },
  imagePickerHint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 10,
  },
  imagePreview: {
    width: '100%',
    height: 180,
    borderRadius: 12,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 14,
  },
  cvHint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  cvPreviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
    gap: 8,
  },
  cvPreviewText: {
    flex: 1,
    color: '#065f46',
    fontWeight: '500',
  },
  // Suggestions
  suggestionsContainer: {
    marginTop: 8,
  },
  suggestionsTitle: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 6,
  },
  suggestionChip: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  suggestionText: {
    fontSize: 13,
    color: '#0369a1',
    fontWeight: '500',
  },
  // Schedule chips
  scheduleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  scheduleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  scheduleChipSelected: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
  },
  scheduleChipIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  scheduleChipText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  scheduleChipTextSelected: {
    color: '#065f46',
  },
  // Salary chips
  salaryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  salaryChip: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  salaryChipSelected: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
  },
  salaryChipText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  salaryChipTextSelected: {
    color: '#92400e',
  },
  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
  },
  // Submit button
  submitButton: {
    marginTop: 24,
    marginBottom: 12,
    borderRadius: 14,
    overflow: 'hidden',
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  note: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default QuickPostForm;
