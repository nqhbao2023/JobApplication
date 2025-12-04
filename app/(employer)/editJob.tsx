// app/(employer)/editJob.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeBack } from '@/hooks/useSafeBack';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import DropDownPicker from 'react-native-dropdown-picker';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { SCROLL_BOTTOM_PADDING } from '@/utils/layout.utils';
import { jobApiService } from '@/services/jobApi.service';
import { VIETNAM_CITIES, EXPERIENCE_LEVELS } from '@/constants/locations';

export default function EditJob() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; jobId?: string }>();
  const jobId = (params.id || params.jobId) as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Dropdown states
  const [openTypeDD, setOpenTypeDD] = useState(false);
  const [openCategoryDD, setOpenCategoryDD] = useState(false);
  const [openLocationDD, setOpenLocationDD] = useState(false);
  const [openExperienceDD, setOpenExperienceDD] = useState(false);

  const [jobTypeItems, setJobTypeItems] = useState<Array<{ label: string; value: string }>>([]);
  const [jobCategoryItems, setJobCategoryItems] = useState<Array<{ label: string; value: string }>>([]);
  const [locationItems, setLocationItems] = useState<Array<{ label: string; value: string }>>([]);
  const [experienceItems, setExperienceItems] = useState<Array<{ label: string; value: string }>>([]);

  const [formData, setFormData] = useState({
    title: '',
    jobDescription: '',
    responsibilities: '',
    skillsRequired: '',
    salaryMin: '',
    salaryMax: '',
    location: '',
    benefits: '',
    requirements: '',
    // New fields
    image: '',
    selectedJobType: null as string | null,
    selectedJobCategory: null as string | null,
    experience: '',
    deadline: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
  });

  // Load dropdown data
  const loadDropdowns = useCallback(async () => {
    try {
      const [typesSnap, categoriesSnap] = await Promise.all([
        getDocs(collection(db, 'job_types')),
        getDocs(collection(db, 'job_categories')),
      ]);

      setJobTypeItems(
        typesSnap.docs.map(d => {
          const data = d.data();
          return { 
            label: data.type_name || 'Chưa có tên', 
            value: data.type_name || d.id // Use name as value to match stored data if possible
          };
        })
      );
      
      setJobCategoryItems([
        ...categoriesSnap.docs.map(d => {
          const data = d.data();
          return { 
            label: data.category_name || data.name || 'Chưa có tên', 
            value: data.category_name || d.id // Use name as value
          };
        }),
        { label: '📦 Khác', value: 'Other' },
      ]);

      setLocationItems([
        { label: '🌏 Toàn quốc', value: 'Toàn quốc' },
        ...VIETNAM_CITIES.map(city => ({ label: city, value: city })),
      ]);

      setExperienceItems(
        EXPERIENCE_LEVELS.map(exp => ({ label: exp.label, value: exp.label }))
      );
    } catch (error) {
      console.error('Load dropdowns error:', error);
    }
  }, []);

  const { goBack } = useSafeBack({ fallback: '/(employer)/myJobs' });

  const fetchJobData = useCallback(async () => {
    if (!jobId) {
      Alert.alert('Lỗi', 'Không tìm thấy ID công việc.');
      goBack();
      return;
    }

    try {
      setLoading(true);
      await loadDropdowns(); // Load dropdowns first
      
      const job = await jobApiService.getJobById(jobId);
      console.log('📥 Loaded job data:', JSON.stringify(job, null, 2));

      // Helper to safely get array or string
      const getArrayOrString = (val: any) => {
        if (Array.isArray(val)) return val.join(', ');
        if (typeof val === 'string') return val;
        return '';
      };

      // ✅ Helper để lấy type name từ nhiều format khác nhau
      const getJobType = (job: any): string | null => {
        // Direct type field (most common)
        if (typeof job.type === 'string') return job.type;
        // jobTypes object with type_name
        if (job.jobTypes?.type_name) return job.jobTypes.type_name;
        // Object with type_name
        if (typeof job.type === 'object' && job.type?.type_name) return job.type.type_name;
        return null;
      };

      // ✅ Helper để lấy category name từ nhiều format khác nhau  
      const getJobCategory = (job: any): string | null => {
        // Direct category field (most common)
        if (typeof job.category === 'string') return job.category;
        // jobCategories object with category_name
        if (job.jobCategories?.category_name) return job.jobCategories.category_name;
        // Object with category_name
        if (typeof job.category === 'object' && job.category?.category_name) return job.category.category_name;
        return null;
      };

      // ✅ Helper để lấy salary từ nhiều format
      const getSalary = (salary: any) => {
        if (!salary) return { min: '', max: '' };
        if (typeof salary === 'object') {
          return {
            min: salary.min?.toString() || '',
            max: salary.max?.toString() || '',
          };
        }
        // Nếu salary là string hoặc number
        return { min: salary.toString(), max: '' };
      };

      // ✅ Helper để lấy image từ nhiều nguồn
      const getJobImage = (job: any): string => {
        // Priority: job.image > company_logo > empty
        if (job.image && typeof job.image === 'string') return job.image;
        if (job.company_logo && typeof job.company_logo === 'string') return job.company_logo;
        return '';
      };

      const salary = getSalary(job.salary);
      const jobType = getJobType(job);
      const jobCategory = getJobCategory(job);

      console.log('📊 Parsed data:', { jobType, jobCategory, salary, image: getJobImage(job) });

      setFormData({
        title: job.title || '',
        jobDescription: job.description || (job as any).job_Description || '',
        responsibilities: (job as any).responsibilities || '',
        skillsRequired: getArrayOrString((job as any).skills || (job as any).skills_required),
        salaryMin: salary.min,
        salaryMax: salary.max,
        location: job.location || '',
        benefits: getArrayOrString(job.benefits),
        requirements: getArrayOrString(job.requirements),
        // ✅ Fixed: Load image properly
        image: getJobImage(job),
        // ✅ Fixed: Parse type/category from various formats
        selectedJobType: jobType,
        selectedJobCategory: jobCategory,
        experience: (job as any).experience || '',
        deadline: (job as any).deadline || '',
        contactName: (job as any).contactInfo?.name || '',
        contactEmail: (job as any).contactInfo?.email || '',
        contactPhone: (job as any).contactInfo?.phone || '',
      });
    } catch (error: any) {
      console.error('❌ Fetch job error:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin công việc. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [jobId, loadDropdowns, router]);

  useEffect(() => {
    fetchJobData();
  }, [fetchJobData]);

  const updateField = useCallback((field: keyof typeof formData) => {
    return (text: string) => {
      setFormData(prev => ({ ...prev, [field]: text }));
    };
  }, []);

  const handleSave = async () => {
    const trimmedTitle = formData.title.trim();
    const trimmedDescription = formData.jobDescription.trim();

    // ✅ Chỉ validate các trường bắt buộc cơ bản (không quá nghiêm ngặt khi edit)
    if (!trimmedTitle || trimmedTitle.length < 3) {
      Alert.alert('Lỗi', 'Tiêu đề công việc phải có ít nhất 3 ký tự');
      return;
    }

    if (!trimmedDescription || trimmedDescription.length < 10) {
      Alert.alert('Lỗi', 'Mô tả công việc phải có ít nhất 10 ký tự');
      return;
    }

    // ✅ Skills là optional khi edit (có thể giữ nguyên hoặc để trống)
    const skills = formData.skillsRequired.split(',').map((s) => s.trim()).filter(Boolean);

    try {
      setSaving(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const updateData: any = {
        title: trimmedTitle,
        description: trimmedDescription,
      };

      // ✅ Chỉ thêm các field có giá trị (không ghi đè empty values)
      if (formData.responsibilities.trim()) {
        updateData.responsibilities = formData.responsibilities.trim();
      }
      
      if (skills.length > 0) {
        updateData.skills = skills;
      }
      
      if (formData.requirements.trim()) {
        updateData.requirements = formData.requirements.split(',').map((r) => r.trim()).filter(Boolean);
      }
      
      if (formData.benefits.trim()) {
        updateData.benefits = formData.benefits.split(',').map((b) => b.trim()).filter(Boolean);
      }
      
      if (formData.location.trim()) {
        updateData.location = formData.location.trim();
      }

      // ✅ Image - giữ nguyên hoặc cập nhật
      if (formData.image.trim()) {
        updateData.image = formData.image.trim();
      }

      // ✅ Type & Category - chỉ cập nhật nếu có giá trị
      if (formData.selectedJobType) {
        updateData.type = formData.selectedJobType;
      }
      
      if (formData.selectedJobCategory) {
        updateData.category = formData.selectedJobCategory;
      }
      
      if (formData.experience) {
        updateData.experience = formData.experience;
      }
      
      if (formData.deadline) {
        updateData.deadline = formData.deadline;
      }

      // ✅ Contact info - chỉ cập nhật nếu có ít nhất 1 field
      if (formData.contactName || formData.contactEmail || formData.contactPhone) {
        updateData.contactInfo = {};
        if (formData.contactName) updateData.contactInfo.name = formData.contactName;
        if (formData.contactEmail) updateData.contactInfo.email = formData.contactEmail;
        if (formData.contactPhone) updateData.contactInfo.phone = formData.contactPhone;
      }

      // ✅ Salary - chỉ cập nhật nếu có giá trị
      if (formData.salaryMin || formData.salaryMax) {
        const minSalary = formData.salaryMin ? parseFloat(formData.salaryMin) : 0;
        const maxSalary = formData.salaryMax ? parseFloat(formData.salaryMax) : 0;
        
        if (minSalary > 0 || maxSalary > 0) {
          updateData.salary = {
            min: minSalary,
            max: maxSalary > 0 ? maxSalary : minSalary,
            currency: 'VND',
          };
        }
      }

      console.log('📤 Sending update data:', updateData);
      await jobApiService.updateJob(jobId, updateData);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Thành công', 'Đã cập nhật công việc!', [
        {
          text: 'OK',
          onPress: () => {
            // ✅ Luôn dùng goBack() để giữ navigation stack
            goBack();
          },
        },
      ]);
    } catch (error: any) {
      console.error('❌ Update job error:', error);
      Alert.alert('Lỗi', error?.response?.data?.message || 'Không thể cập nhật công việc.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A80F0" />
          <Text style={styles.loadingText}>Đang tải thông tin công việc...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chỉnh sửa công việc</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Lưu</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Basic Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 Thông tin cơ bản</Text>
            
            <Text style={styles.label}>Tiêu đề công việc *</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập tiêu đề công việc"
              value={formData.title}
              onChangeText={updateField('title')}
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.label}>Mô tả công việc *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Nhập mô tả chi tiết về công việc"
              value={formData.jobDescription}
              onChangeText={updateField('jobDescription')}
              multiline
              numberOfLines={6}
              placeholderTextColor="#94a3b8"
              textAlignVertical="top"
            />

            <Text style={styles.label}>Trách nhiệm</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Nhập các trách nhiệm chính"
              value={formData.responsibilities}
              onChangeText={updateField('responsibilities')}
              multiline
              numberOfLines={4}
              placeholderTextColor="#94a3b8"
              textAlignVertical="top"
            />

            <Text style={styles.label}>Kỹ năng yêu cầu</Text>
            <TextInput
              style={styles.input}
              placeholder="VD: React Native, TypeScript, Firebase (cách nhau bởi dấu phẩy)"
              value={formData.skillsRequired}
              onChangeText={updateField('skillsRequired')}
              placeholderTextColor="#94a3b8"
            />
          </View>

          {/* Classification */}
          <View style={[styles.section, { zIndex: 3000 }]}>
            <Text style={styles.sectionTitle}>🏢 Phân loại</Text>
            
            <Text style={styles.label}>Loại công việc</Text>
            <DropDownPicker
              open={openTypeDD}
              setOpen={setOpenTypeDD}
              value={formData.selectedJobType}
              setValue={(val) => {
                const value = typeof val === 'function' ? val(formData.selectedJobType) : val;
                setFormData(prev => ({ ...prev, selectedJobType: value }));
              }}
              items={jobTypeItems}
              setItems={setJobTypeItems}
              placeholder="Chọn loại công việc"
              listMode="MODAL"
              style={styles.dropdown}
              dropDownContainerStyle={styles.dropdownMenu}
              zIndex={3000}
            />

            <Text style={[styles.label, { marginTop: 12 }]}>Danh mục</Text>
            <DropDownPicker
              open={openCategoryDD}
              setOpen={setOpenCategoryDD}
              value={formData.selectedJobCategory}
              setValue={(val) => {
                const value = typeof val === 'function' ? val(formData.selectedJobCategory) : val;
                setFormData(prev => ({ ...prev, selectedJobCategory: value }));
              }}
              items={jobCategoryItems}
              setItems={setJobCategoryItems}
              placeholder="Chọn danh mục"
              listMode="MODAL"
              searchable={true}
              style={styles.dropdown}
              dropDownContainerStyle={styles.dropdownMenu}
              zIndex={2000}
            />
          </View>

          {/* Salary & Location */}
          <View style={[styles.section, { zIndex: 1000 }]}>
            <Text style={styles.sectionTitle}>💰 Lương & Địa điểm</Text>

            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <Text style={styles.label}>Lương tối thiểu</Text>
                <TextInput
                  style={styles.input}
                  placeholder="VD: 10000000"
                  value={formData.salaryMin}
                  onChangeText={updateField('salaryMin')}
                  keyboardType="numeric"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={styles.halfWidth}>
                <Text style={styles.label}>Lương tối đa</Text>
                <TextInput
                  style={styles.input}
                  placeholder="VD: 20000000"
                  value={formData.salaryMax}
                  onChangeText={updateField('salaryMax')}
                  keyboardType="numeric"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            <Text style={styles.label}>Địa điểm</Text>
            <DropDownPicker
              open={openLocationDD}
              setOpen={setOpenLocationDD}
              value={formData.location}
              setValue={(val) => {
                const value = typeof val === 'function' ? val(formData.location) : val;
                setFormData(prev => ({ ...prev, location: value }));
              }}
              items={locationItems}
              setItems={setLocationItems}
              placeholder="Chọn địa điểm"
              listMode="MODAL"
              searchable={true}
              style={styles.dropdown}
              dropDownContainerStyle={styles.dropdownMenu}
              zIndex={1000}
            />

            <Text style={[styles.label, { marginTop: 12 }]}>Kinh nghiệm</Text>
            <DropDownPicker
              open={openExperienceDD}
              setOpen={setOpenExperienceDD}
              value={formData.experience}
              setValue={(val) => {
                const value = typeof val === 'function' ? val(formData.experience) : val;
                setFormData(prev => ({ ...prev, experience: value }));
              }}
              items={experienceItems}
              setItems={setExperienceItems}
              placeholder="Chọn kinh nghiệm"
              listMode="MODAL"
              style={styles.dropdown}
              dropDownContainerStyle={styles.dropdownMenu}
              zIndex={900}
            />
          </View>

          {/* Benefits & Requirements */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎁 Phúc lợi & Yêu cầu</Text>

            <Text style={styles.label}>Phúc lợi</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="VD: Bảo hiểm, Thưởng (cách nhau bởi dấu phẩy)"
              value={formData.benefits}
              onChangeText={updateField('benefits')}
              multiline
              numberOfLines={3}
              placeholderTextColor="#94a3b8"
              textAlignVertical="top"
            />

            <Text style={styles.label}>Yêu cầu khác</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="VD: Kinh nghiệm 2 năm, Bằng cử nhân (cách nhau bởi dấu phẩy)"
              value={formData.requirements}
              onChangeText={updateField('requirements')}
              multiline
              numberOfLines={3}
              placeholderTextColor="#94a3b8"
              textAlignVertical="top"
            />
          </View>

          {/* Media & Contact */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📸 Hình ảnh & Liên hệ</Text>

            <Text style={styles.label}>Link ảnh công việc</Text>
            <TextInput
              style={styles.input}
              placeholder="https://..."
              value={formData.image}
              onChangeText={updateField('image')}
              placeholderTextColor="#94a3b8"
            />
            {formData.image ? (
              <Image source={{ uri: formData.image }} style={styles.previewImage} resizeMode="cover" />
            ) : null}

            <Text style={styles.label}>Hạn nộp hồ sơ</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={formData.deadline}
              onChangeText={updateField('deadline')}
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.label}>Tên người liên hệ</Text>
            <TextInput
              style={styles.input}
              placeholder="Nguyễn Văn A"
              value={formData.contactName}
              onChangeText={updateField('contactName')}
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.label}>Email liên hệ</Text>
            <TextInput
              style={styles.input}
              placeholder="email@example.com"
              value={formData.contactEmail}
              onChangeText={updateField('contactEmail')}
              keyboardType="email-address"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.label}>Số điện thoại</Text>
            <TextInput
              style={styles.input}
              placeholder="0901234567"
              value={formData.contactPhone}
              onChangeText={updateField('contactPhone')}
              keyboardType="phone-pad"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#4A80F0',
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: '#94a3b8',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  loadingSubText: {
    marginTop: 8,
    fontSize: 12,
    color: '#94a3b8',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SCROLL_BOTTOM_PADDING,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1f2937',
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  dropdown: {
    borderColor: '#e2e8f0',
    borderRadius: 10,
  },
  dropdownMenu: {
    borderColor: '#e2e8f0',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginTop: 12,
    backgroundColor: '#f1f5f9',
  },
});
