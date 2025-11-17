import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Image,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAddJobForm } from '@/hooks/addJob/useAddJobForm';
import { SectionCard, AITemplateModal } from '@/components/employer/AddJobSections';
import { SCROLL_BOTTOM_PADDING } from '@/utils/layout.utils';

const AddJob = () => {
  const scrollRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const {
    formData,
    updateFormField,
    newCompany,
    setNewCompany,
    newCompanyImageUri,
    setNewCompanyImageUri,
    isAddingNewCompany,
    setIsAddingNewCompany,
    jobTypeItems,
    setJobTypeItems,
    jobCategoryItems,
    setJobCategoryItems,
    companyItems,
    setCompanyItems,
    openTypeDD,
    setOpenTypeDD,
    openCategoryDD,
    setOpenCategoryDD,
    openCompanyDD,
    setOpenCompanyDD,
    expandedSections,
    toggleSection,
    loading,
    savingDraft,
    aiModalVisible,
    setAiModalVisible,
    applyAITemplate,
    pickImage,
    handleAddJob,
    isBasicComplete,
    isDetailsComplete,
    isClassificationComplete,
    isMediaComplete,
    router,
  } = useAddJobForm();

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backBtnText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Tạo công việc</Text>
            <TouchableOpacity onPress={() => setAiModalVisible(true)} style={styles.aiBtn}>
              <Text style={styles.aiBtnText}>✨ AI</Text>
            </TouchableOpacity>
          </View>
          {savingDraft && <Text style={styles.draftIndicator}>💾 Đang lưu nháp...</Text>}
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <SectionCard
            title="📝 Thông tin cơ bản"
            section="basic"
            isComplete={isBasicComplete}
            expandedSections={expandedSections}
            toggleSection={toggleSection}
          >
            <TextInput
              style={styles.input}
              placeholder="Tiêu đề công việc *"
              value={formData.title}
              onChangeText={(text) => updateFormField('title', text)}
              placeholderTextColor="#999"
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Mô tả công việc *"
              value={formData.jobDescription}
              onChangeText={(text) => updateFormField('jobDescription', text)}
              multiline
              numberOfLines={4}
              placeholderTextColor="#999"
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Trách nhiệm (tùy chọn)"
              value={formData.responsibilities}
              onChangeText={(text) => updateFormField('responsibilities', text)}
              multiline
              numberOfLines={3}
              placeholderTextColor="#999"
            />
            <TextInput
              style={styles.input}
              placeholder="Kỹ năng yêu cầu (tùy chọn)"
              value={formData.skillsRequired}
              onChangeText={(text) => updateFormField('skillsRequired', text)}
              placeholderTextColor="#999"
            />
          </SectionCard>

          <SectionCard
            title="💰 Chi tiết tuyển dụng"
            section="details"
            isComplete={isDetailsComplete}
            expandedSections={expandedSections}
            toggleSection={toggleSection}
          >
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="Lương tối thiểu *"
                value={formData.salaryMin}
                onChangeText={(text) => updateFormField('salaryMin', text)}
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="Lương tối đa"
                value={formData.salaryMax}
                onChangeText={(text) => updateFormField('salaryMax', text)}
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
            </View>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="Loại hình"
                value={formData.workingType}
                onChangeText={(text) => updateFormField('workingType', text)}
                placeholderTextColor="#999"
              />
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="Kinh nghiệm"
                value={formData.experience}
                onChangeText={(text) => updateFormField('experience', text)}
                placeholderTextColor="#999"
              />
            </View>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="Số lượng"
                value={formData.quantity}
                onChangeText={(text) => updateFormField('quantity', text)}
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="Hạn nộp (YYYY-MM-DD)"
                value={formData.deadline}
                onChangeText={(text) => updateFormField('deadline', text)}
                placeholderTextColor="#999"
              />
            </View>
          </SectionCard>

          <SectionCard
            title="🏢 Phân loại & công ty"
            section="classification"
            isComplete={isClassificationComplete}
            expandedSections={expandedSections}
            toggleSection={toggleSection}
          >
            <Text style={styles.label}>Loại công việc *</Text>
            <View style={{ zIndex: 3000, marginBottom: 12 }}>
              <DropDownPicker
                open={openTypeDD}
                setOpen={setOpenTypeDD}
                value={formData.selectedJobType}
                setValue={(callback) => {
                  const value = typeof callback === 'function' ? callback(formData.selectedJobType) : callback;
                  updateFormField('selectedJobType', value);
                }}
                items={jobTypeItems}
                setItems={setJobTypeItems}
                placeholder="Chọn loại công việc"
                listMode="MODAL"
                searchable={true}
                searchPlaceholder="Tìm loại công việc..."
                modalTitle="Chọn loại công việc"
                modalAnimationType="slide"
                style={styles.dropdown}
                dropDownContainerStyle={styles.dropdownMenu}
                placeholderStyle={styles.dropdownPlaceholder}
                searchTextInputStyle={styles.searchInput}
                modalContentContainerStyle={styles.modalContent}
                zIndex={3000}
              />
            </View>
            {formData.selectedJobType === 'other' && (
              <TextInput
                style={styles.input}
                placeholder="Nhập loại công việc khác..."
                value={formData.customJobType}
                onChangeText={(text) => updateFormField('customJobType', text)}
                placeholderTextColor="#999"
              />
            )}

            <Text style={styles.label}>Danh mục công việc *</Text>
            <View style={{ zIndex: 2000, marginBottom: 12 }}>
              <DropDownPicker
                open={openCategoryDD}
                setOpen={setOpenCategoryDD}
                value={formData.selectedJobCategory}
                setValue={(callback) => {
                  const value = typeof callback === 'function' ? callback(formData.selectedJobCategory) : callback;
                  updateFormField('selectedJobCategory', value);
                }}
                items={jobCategoryItems}
                setItems={setJobCategoryItems}
                placeholder="Chọn danh mục"
                listMode="MODAL"
                searchable={true}
                searchPlaceholder="Tìm danh mục..."
                modalTitle="Chọn danh mục công việc"
                modalAnimationType="slide"
                style={styles.dropdown}
                dropDownContainerStyle={styles.dropdownMenu}
                placeholderStyle={styles.dropdownPlaceholder}
                searchTextInputStyle={styles.searchInput}
                modalContentContainerStyle={styles.modalContent}
                zIndex={2000}
              />
            </View>
            {formData.selectedJobCategory === 'other' && (
              <TextInput
                style={styles.input}
                placeholder="Nhập danh mục công việc khác..."
                value={formData.customJobCategory}
                onChangeText={(text) => updateFormField('customJobCategory', text)}
                placeholderTextColor="#999"
              />
            )}

            <TouchableOpacity
              onPress={() => setIsAddingNewCompany((prev) => !prev)}
              style={styles.toggleCompanyBtn}
            >
              <Text style={styles.toggleCompanyText}>
                {isAddingNewCompany ? '← Chọn công ty có sẵn' : '+ Thêm công ty mới'}
              </Text>
            </TouchableOpacity>

            {!isAddingNewCompany ? (
              <View style={{ zIndex: 1000 }}>
                <Text style={styles.label}>Chọn công ty *</Text>
                <DropDownPicker
                  open={openCompanyDD}
                  setOpen={setOpenCompanyDD}
                  value={formData.selectedCompany}
                  setValue={(callback) => {
                    const value = typeof callback === 'function' ? callback(formData.selectedCompany) : callback;
                    updateFormField('selectedCompany', value);
                  }}
                  items={companyItems}
                  setItems={setCompanyItems}
                  placeholder="Chọn công ty"
                  listMode="MODAL"
                  searchable={true}
                  searchPlaceholder="Tìm công ty..."
                  modalTitle="Chọn công ty"
                  modalAnimationType="slide"
                  style={styles.dropdown}
                  dropDownContainerStyle={styles.dropdownMenu}
                  placeholderStyle={styles.dropdownPlaceholder}
                  searchTextInputStyle={styles.searchInput}
                  modalContentContainerStyle={styles.modalContent}
                  zIndex={1000}
                />
              </View>
            ) : (
              <View>
                <TextInput
                  style={styles.input}
                  placeholder="Tên công ty *"
                  value={newCompany.corp_name}
                  onChangeText={(t) => setNewCompany({ ...newCompany, corp_name: t })}
                  placeholderTextColor="#999"
                />
                <View style={styles.row}>
                  <TextInput
                    style={[styles.input, styles.halfInput]}
                    placeholder="Quốc gia"
                    value={newCompany.nation}
                    onChangeText={(t) => setNewCompany({ ...newCompany, nation: t })}
                    placeholderTextColor="#999"
                  />
                  <TextInput
                    style={[styles.input, styles.halfInput]}
                    placeholder="Thành phố"
                    value={newCompany.city}
                    onChangeText={(t) => setNewCompany({ ...newCompany, city: t })}
                    placeholderTextColor="#999"
                  />
                </View>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Mô tả công ty"
                  value={newCompany.corp_description}
                  onChangeText={(t) => setNewCompany({ ...newCompany, corp_description: t })}
                  multiline
                  numberOfLines={3}
                  placeholderTextColor="#999"
                />
              </View>
            )}
          </SectionCard>

          <SectionCard
            title="📸 Hình ảnh & liên hệ"
            section="media"
            isComplete={isMediaComplete}
            expandedSections={expandedSections}
            toggleSection={toggleSection}
          >
            <Text style={styles.label}>Ảnh công việc *</Text>
            <TouchableOpacity
              style={styles.imageBtn}
              onPress={() => pickImage((uri) => updateFormField('imageUri', uri))}
            >
              <Text style={styles.imageBtnText}>
                {formData.imageUri ? '✓ Đã chọn ảnh' : '📷 Chọn ảnh'}
              </Text>
            </TouchableOpacity>
            {formData.imageUri && (
              <Image source={{ uri: formData.imageUri }} style={styles.previewImage} />
            )}

            <TextInput
              style={styles.input}
              placeholder="Hoặc dán link ảnh"
              value={formData.image}
              onChangeText={(t) => {
                updateFormField('image', t);
                updateFormField('imageUri', null);
              }}
              editable={!formData.imageUri}
              placeholderTextColor="#999"
            />

            {isAddingNewCompany && (
              <>
                <Text style={[styles.label, { marginTop: 16 }]}>Ảnh công ty (tùy chọn)</Text>
                <TouchableOpacity
                  style={styles.imageBtn}
                  onPress={() => pickImage(setNewCompanyImageUri)}
                >
                  <Text style={styles.imageBtnText}>
                    {newCompanyImageUri ? '✓ Đã chọn ảnh công ty' : '🏢 Chọn ảnh công ty'}
                  </Text>
                </TouchableOpacity>
                {newCompanyImageUri && (
                  <Image source={{ uri: newCompanyImageUri }} style={styles.previewImage} />
                )}
              </>
            )}

            <Text style={[styles.label, { marginTop: 16 }]}>Thông tin liên hệ</Text>
            <TextInput
              style={styles.input}
              placeholder="Tên người liên hệ"
              value={formData.contactName}
              onChangeText={(text) => updateFormField('contactName', text)}
              placeholderTextColor="#999"
            />
            <TextInput
              style={styles.input}
              placeholder="Email liên hệ"
              value={formData.contactEmail}
              onChangeText={(text) => updateFormField('contactEmail', text)}
              keyboardType="email-address"
              placeholderTextColor="#999"
            />
            <TextInput
              style={styles.input}
              placeholder="Số điện thoại liên hệ"
              value={formData.contactPhone}
              onChangeText={(text) => updateFormField('contactPhone', text)}
              keyboardType="phone-pad"
              placeholderTextColor="#999"
            />
          </SectionCard>

          <SectionCard
            title="👀 Xem trước"
            section="preview"
            expandedSections={expandedSections}
            toggleSection={toggleSection}
          >
            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>{formData.title || 'Chưa có tiêu đề'}</Text>
              <Text style={styles.previewText} numberOfLines={3}>
                {formData.jobDescription || 'Chưa có mô tả'}
              </Text>
              <View style={styles.previewMeta}>
                <Text style={styles.previewMetaText}>
                  💰{' '}
                  {formData.salaryMin
                    ? `${formData.salaryMin}${formData.salaryMax ? ` - ${formData.salaryMax}` : ''}`
                    : 'Chưa có lương'}
                </Text>
                <Text style={styles.previewMetaText}>📍 {formData.workingType || 'Full-time'}</Text>
              </View>
            </View>
          </SectionCard>

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            disabled={loading}
            onPress={handleAddJob}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>🚀 Đăng công việc</Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <AITemplateModal
        visible={aiModalVisible}
        onClose={() => setAiModalVisible(false)}
        onSelectTemplate={applyAITemplate}
      />
    </SafeAreaView>
  );
};

export default AddJob;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: { fontSize: 20, color: '#333' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a1a' },
  aiBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#7c3aed',
  },
  aiBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  draftIndicator: {
    fontSize: 12,
    color: '#10b981',
    marginTop: 4,
    textAlign: 'center',
  },
  scrollContent: { padding: 16, paddingBottom: SCROLL_BOTTOM_PADDING },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    marginBottom: 12,
    backgroundColor: '#fff',
    color: '#1a1a1a',
    minHeight: 50,
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: { flex: 1 },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  dropdown: {
    borderColor: '#e0e0e0',
    borderRadius: 12,
    minHeight: 50,
    backgroundColor: '#fff',
  },
  dropdownMenu: {
    borderColor: '#e0e0e0',
    borderRadius: 12,
    marginTop: 4,
    maxHeight: 300,
  },
  dropdownPlaceholder: { 
    color: '#999',
    fontSize: 15,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  searchInput: {
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  toggleCompanyBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  toggleCompanyText: {
    color: '#7c3aed',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  imageBtn: {
    backgroundColor: '#eff6ff',
    borderWidth: 2,
    borderColor: '#3b82f6',
    borderRadius: 12,
    borderStyle: 'dashed',
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  imageBtnText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
  },
  previewCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  previewText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  previewMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  previewMetaText: {
    fontSize: 14,
    color: '#4b5563',
  },
  submitBtn: {
    backgroundColor: '#10b981',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});