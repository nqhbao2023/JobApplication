import React, { useEffect, useState, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Image,
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { db, auth, storage } from '@/config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, getDocs } from 'firebase/firestore';

type JobOption = { label: string; value: string };

const STEPS = [
  'Cơ bản',
  'Chi tiết tuyển dụng',
  'Phân loại & công ty',
  'Hình ảnh & liên hệ',
  'Xem lại & đăng',
];

const AddJob = () => {
  const router = useRouter();

  // ====== A. THÔNG TIN CƠ BẢN ======
  const [title, setTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [responsibilities, setResponsibilities] = useState('');
  const [skillsRequired, setSkillsRequired] = useState('');

  // ====== B. CHI TIẾT TUYỂN DỤNG ======
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [workingType, setWorkingType] = useState('Full-time');
  const [experience, setExperience] = useState('');
  const [quantity, setQuantity] = useState('');
  const [deadline, setDeadline] = useState(''); // YYYY-MM-DD (optional)

  // ====== C. PHÂN LOẠI & CÔNG TY ======
  const [jobTypeItems, setJobTypeItems] = useState<JobOption[]>([]);
  const [jobCategoryItems, setJobCategoryItems] = useState<JobOption[]>([]);
  const [companyItems, setCompanyItems] = useState<JobOption[]>([]);

  const [selectedJobType, setSelectedJobType] = useState<string | null>(null);
  const [selectedJobCategory, setSelectedJobCategory] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);

  const [openTypeDD, setOpenTypeDD] = useState(false);
  const [openCategoryDD, setOpenCategoryDD] = useState(false);
  const [openCompanyDD, setOpenCompanyDD] = useState(false);

  const [customJobType, setCustomJobType] = useState('');
  const [customJobCategory, setCustomJobCategory] = useState('');

  const [isAddingNewCompany, setIsAddingNewCompany] = useState(false);
  const [newCompany, setNewCompany] = useState({
    corp_name: '',
    nation: '',
    corp_description: '',
    city: '',
    image: '',
    color: '',
  });

  // ====== D. HÌNH ẢNH & LIÊN HỆ ======
  const [imageUri, setImageUri] = useState<string | null>(null); // local
  const [image, setImage] = useState(''); // direct URL
  const [newCompanyImageUri, setNewCompanyImageUri] = useState<string | null>(null);

  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // ====== OTHERS ======
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);

  // ====== STEPPER ======
  const [step, setStep] = useState(0);
  const totalSteps = STEPS.length;

  // close other dropdowns when one opens
  useEffect(() => {
    if (openTypeDD) { setOpenCategoryDD(false); setOpenCompanyDD(false); }
    if (openCategoryDD) { setOpenTypeDD(false); setOpenCompanyDD(false); }
    if (openCompanyDD) { setOpenTypeDD(false); setOpenCategoryDD(false); }
  }, [openTypeDD, openCategoryDD, openCompanyDD]);

  // clear custom text if no longer "Khác"
  useEffect(() => { if (selectedJobType !== 'other') setCustomJobType(''); }, [selectedJobType]);
  useEffect(() => { if (selectedJobCategory !== 'other') setCustomJobCategory(''); }, [selectedJobCategory]);

  // Fetch dropdown data + user
  useEffect(() => {
    (async () => {
      try {
        const [typesSnap, categoriesSnap, companiesSnap] = await Promise.all([
          getDocs(collection(db, 'job_types')),
          getDocs(collection(db, 'job_categories')),
          getDocs(collection(db, 'companies')),
        ]);

        setJobTypeItems([
          ...typesSnap.docs.map(d => ({ label: d.data().type_name, value: d.id })),
          { label: 'Khác', value: 'other' },
        ]);

        setJobCategoryItems([
          ...categoriesSnap.docs.map(d => ({ label: d.data().category_name, value: d.id })),
          { label: 'Khác', value: 'other' },
        ]);

        setCompanyItems(companiesSnap.docs.map(d => ({ label: d.data().corp_name, value: d.id })));
      } catch {
        Alert.alert('Lỗi', 'Không thể tải dữ liệu lựa chọn');
      }

      const user = auth.currentUser;
      if (user) setUserId(user.uid);
    })();
  }, []);

  // Helpers
const pickImage = async (cb: (uri: string) => void) => {
  const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!p.granted) {
    Alert.alert('Quyền bị từ chối', 'Cần quyền truy cập ảnh.');
    return;
  }

  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    // ❌ Bỏ dòng này vì gây che nút OK trên Android:
    // allowsEditing: true,
    // aspect: [4, 3],
    quality: 1,
    selectionLimit: 1, // ✅ chỉ chọn 1 ảnh
  });

  if (!res.canceled && res.assets && res.assets.length > 0) {
    cb(res.assets[0].uri);
  }
};

  const pickImageForJob = () => pickImage(setImageUri);
  const pickImageForCompany = () => pickImage(setNewCompanyImageUri);

  const uploadImageToFirebase = async (uri: string, folder: string) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const storageRef = ref(storage, `${folder}/${Date.now()}.jpg`);
    await uploadBytes(storageRef, blob);
    return getDownloadURL(storageRef);
  };

  // Step gating
  const canNext = () => {
    if (step === 0) return !!title.trim() && !!jobDescription.trim();
    if (step === 1) return !!salaryMin.trim(); // min bắt buộc, max optional
    if (step === 2) {
      const typeOk = !!selectedJobType && (selectedJobType !== 'other' || !!customJobType.trim());
      const catOk = !!selectedJobCategory && (selectedJobCategory !== 'other' || !!customJobCategory.trim());
      const companyOk = isAddingNewCompany ? !!newCompany.corp_name.trim() : !!selectedCompany;
      return typeOk && catOk && companyOk;
    }
    if (step === 3) return !!imageUri || !!image.trim(); // yêu cầu có ảnh job
    return true;
  };

  // ====== Submit ======
  const handleAddJob = async () => {
    // Validate hard checks
    if (!canNext()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng hoàn thành các trường bắt buộc.');
      return;
    }

    // numeric & logic checks
    const min = parseFloat(salaryMin);
    const max = salaryMax.trim() ? parseFloat(salaryMax) : undefined;
    if (Number.isNaN(min) || min < 0) {
      Alert.alert('Lương không hợp lệ', 'Lương tối thiểu phải là số dương.');
      return;
    }
    if (max !== undefined && (Number.isNaN(max) || max < min)) {
      Alert.alert('Lương không hợp lệ', 'Lương tối đa phải là số và ≥ lương tối thiểu.');
      return;
    }
    const qty = quantity.trim() ? parseInt(quantity, 10) : 1;
    if (qty <= 0) {
      Alert.alert('Số lượng không hợp lệ', 'Số lượng tuyển phải ≥ 1.');
      return;
    }

    try {
      setLoading(true);

      // upload job image (required)
      let jobImageUrl = image;
      if (imageUri) jobImageUrl = await uploadImageToFirebase(imageUri, 'jobs');
      if (!jobImageUrl) {
        Alert.alert('Thiếu ảnh', 'Vui lòng cung cấp ảnh cho công việc.');
        return;
      }

      // company
      let companyId = selectedCompany;
      if (isAddingNewCompany) {
        // company image optional
        let companyImageUrl = newCompany.image;
        if (newCompanyImageUri) companyImageUrl = await uploadImageToFirebase(newCompanyImageUri, 'companies');

        if (!newCompany.corp_name.trim()) {
          Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên công ty khi thêm công ty mới.');
          return;
        }

        const companyDoc = await addDoc(collection(db, 'companies'), {
          ...newCompany,
          image: companyImageUrl || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        companyId = companyDoc.id;
      }

      // job type / category (ID or text “Khác”)
      const jobTypeValue = selectedJobType === 'other' ? customJobType.trim() : selectedJobType;
      const jobCategoryValue = selectedJobCategory === 'other' ? customJobCategory.trim() : selectedJobCategory;

      // save job
      await addDoc(collection(db, 'jobs'), {
        title,
        job_Description: jobDescription,
        responsibilities,
        skills_required: skillsRequired,

        salaryMin: min,
        salaryMax: max ?? null,
        workingType,
        experience,
        quantity: qty,
        deadline: deadline || null,

        jobTypes: jobTypeValue,          // ID hoặc text
  jobCategories: selectedJobCategory, // ✅ Lưu ID thay vì tên
        isCustomType: selectedJobType === 'other',
        isCustomCategory: selectedJobCategory === 'other',

        contact_name: contactName || '',
        contact_email: contactEmail || '',
        contact_phone: contactPhone || '',

        company: companyId,
        image: jobImageUrl,

        users: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      Alert.alert('✅ Thành công', 'Đã đăng công việc mới!');
      router.back();
    } catch (e) {
      console.error('❌ Lỗi thêm công việc:', e);
      Alert.alert('Lỗi', 'Không thể thêm công việc');
    } finally {
      setLoading(false);
    }
  };

  // ====== Small inline components ======
  const StepHeader = memo(() => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Tạo công việc</Text>
      <Text style={styles.headerStep}>{STEPS[step]}</Text>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${(step / (totalSteps - 1)) * 100}%` }]} />
      </View>
    </View>
  ));

  const StepFooter = memo(() => (
    <View style={styles.footer}>
      <TouchableOpacity
        style={[styles.footerBtn, step === 0 && styles.footerBtnDisabled]}
        disabled={step === 0}
        onPress={() => setStep(s => Math.max(0, s - 1))}
      >
        <Text style={styles.footerBtnText}>Quay lại</Text>
      </TouchableOpacity>

      {step < totalSteps - 1 ? (
        <TouchableOpacity
          style={[styles.footerBtnPrimary, !canNext() && styles.footerBtnDisabled]}
          disabled={!canNext()}
          onPress={() => setStep(s => Math.min(totalSteps - 1, s + 1))}
        >
          <Text style={styles.footerBtnPrimaryText}>Tiếp tục</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.footerBtnPrimary, loading && styles.footerBtnDisabled]}
          disabled={loading}
          onPress={handleAddJob}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.footerBtnPrimaryText}>Đăng công việc</Text>}
        </TouchableOpacity>
      )}
    </View>
  ));

  type DropFieldProps = {
    label: string;
    zIndex: number;
    open: boolean;
    setOpen: (v: boolean) => void;
    value: string | null;
    setValue: React.Dispatch<React.SetStateAction<string | null>>;
    items: JobOption[];
    setItems: React.Dispatch<React.SetStateAction<JobOption[]>>;
    placeholder: string;
  };

  const DropField = memo((p: DropFieldProps) => (
    <>
      <Text style={styles.label}>{p.label}</Text>
      <View style={{ zIndex: p.zIndex, marginBottom: 12 }}>
        <DropDownPicker<string>
          open={p.open}
          setOpen={p.setOpen as any}
          value={p.value}
          setValue={p.setValue}
          items={p.items}
          setItems={p.setItems}
          multiple={false}
          placeholder={p.placeholder}
          listMode="SCROLLVIEW"
          dropDownDirection="AUTO"
          style={styles.ddInput}
          dropDownContainerStyle={styles.ddMenu}
          placeholderStyle={styles.ddPlaceholder}
          labelStyle={styles.ddLabel}
          listItemLabelStyle={styles.ddItemLabel}
          selectedItemContainerStyle={styles.ddSelectedItem}
          selectedItemLabelStyle={styles.ddSelectedLabel}
          zIndex={p.zIndex}
          zIndexInverse={p.zIndex}
        />
      </View>
    </>
  ));

  const ReviewRow = ({ k, v }: { k: string; v: string }) => (
    <Text style={styles.reviewRow}><Text style={styles.reviewKey}>{k}:</Text> {v || '—'}</Text>
  );

  // ====== RENDER ======
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <StepHeader />

      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: 140 }]}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
      >
        {/* STEP 0: Cơ bản */}
        {step === 0 && (
          <View>
            <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>
            <TextInput style={styles.input} placeholder="Tiêu đề công việc *" value={title} onChangeText={setTitle} />
            <TextInput
              style={[styles.input, { minHeight: 80 }]}
              placeholder="Mô tả công việc *"
              value={jobDescription}
              onChangeText={setJobDescription}
              multiline
            />
            <TextInput style={styles.input} placeholder="Trách nhiệm" value={responsibilities} onChangeText={setResponsibilities} />
            <TextInput style={styles.input} placeholder="Kỹ năng yêu cầu" value={skillsRequired} onChangeText={setSkillsRequired} />
          </View>
        )}

        {/* STEP 1: Chi tiết tuyển dụng */}
        {step === 1 && (
          <View>
            <Text style={styles.sectionTitle}>Chi tiết tuyển dụng</Text>
            <TextInput style={styles.input} placeholder="Lương tối thiểu (VNĐ) *" value={salaryMin} onChangeText={setSalaryMin} keyboardType="numeric" />
            <TextInput style={styles.input} placeholder="Lương tối đa (VNĐ)" value={salaryMax} onChangeText={setSalaryMax} keyboardType="numeric" />
            <TextInput style={styles.input} placeholder="Loại hình (VD: Full-time, Part-time)" value={workingType} onChangeText={setWorkingType} />
            <TextInput style={styles.input} placeholder="Kinh nghiệm yêu cầu" value={experience} onChangeText={setExperience} />
            <TextInput style={styles.input} placeholder="Số lượng tuyển" value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
            <TextInput style={styles.input} placeholder="Hạn nộp hồ sơ (YYYY-MM-DD)" value={deadline} onChangeText={setDeadline} />
          </View>
        )}

        {/* STEP 2: Phân loại & công ty */}
        {step === 2 && (
          <View>
            <Text style={styles.sectionTitle}>Phân loại & công ty</Text>

            <DropField
              label="Loại công việc *"
              zIndex={3000}
              open={openTypeDD}
              setOpen={setOpenTypeDD}
              value={selectedJobType}
              setValue={setSelectedJobType}
              items={jobTypeItems}
              setItems={setJobTypeItems}
              placeholder="Chọn loại công việc"
            />
            {selectedJobType === 'other' && (
              <TextInput
                style={styles.input}
                placeholder="Nhập loại công việc khác…"
                value={customJobType}
                onChangeText={setCustomJobType}
              />
            )}

            <DropField
              label="Danh mục công việc *"
              zIndex={2000}
              open={openCategoryDD}
              setOpen={setOpenCategoryDD}
              value={selectedJobCategory}
              setValue={setSelectedJobCategory}
              items={jobCategoryItems}
              setItems={setJobCategoryItems}
              placeholder="Chọn danh mục"
            />
            {selectedJobCategory === 'other' && (
              <TextInput
                style={styles.input}
                placeholder="Nhập danh mục công việc khác…"
                value={customJobCategory}
                onChangeText={setCustomJobCategory}
              />
            )}

            <TouchableOpacity onPress={() => setIsAddingNewCompany((prev: boolean) => !prev)}>

              <Text style={styles.linkText}>
                {isAddingNewCompany ? '← Chọn công ty có sẵn' : '+ Thêm công ty mới'}
              </Text>
            </TouchableOpacity>

            {!isAddingNewCompany ? (
              <DropField
                label="Chọn công ty *"
                zIndex={1000}
                open={openCompanyDD}
                setOpen={setOpenCompanyDD}
                value={selectedCompany}
                setValue={setSelectedCompany}
                items={companyItems}
                setItems={setCompanyItems}
                placeholder="Chọn công ty"
              />
            ) : (
              <View>
                <TextInput style={styles.input} placeholder="Tên công ty *" value={newCompany.corp_name} onChangeText={t => setNewCompany({ ...newCompany, corp_name: t })} />
                <TextInput style={styles.input} placeholder="Quốc gia" value={newCompany.nation} onChangeText={t => setNewCompany({ ...newCompany, nation: t })} />
                <TextInput style={styles.input} placeholder="Thành phố" value={newCompany.city} onChangeText={t => setNewCompany({ ...newCompany, city: t })} />
                <TextInput
                  style={[styles.input, { minHeight: 80 }]}
                  placeholder="Mô tả công ty"
                  value={newCompany.corp_description}
                  onChangeText={t => setNewCompany({ ...newCompany, corp_description: t })}
                  multiline
                />
              </View>
            )}
          </View>
        )}

        {/* STEP 3: Hình ảnh & liên hệ */}
        {step === 3 && (
          <View>
            <Text style={styles.sectionTitle}>Hình ảnh & liên hệ</Text>

            <Text style={styles.label}>Ảnh công việc *</Text>
            <TouchableOpacity style={[styles.imagePickerButton, image && { opacity: 0.6 }]} onPress={pickImageForJob} disabled={!!image}>
              <Text style={styles.imagePickerText}>Chọn ảnh từ thiết bị</Text>
            </TouchableOpacity>
            {imageUri ? <Image source={{ uri: imageUri }} style={styles.previewImage} /> : null}
            <TextInput
              style={[styles.input, imageUri && { backgroundColor: '#e0e0e0' }]}
              placeholder="Hoặc dán link ảnh công việc"
              value={image}
              onChangeText={t => { setImage(t); setImageUri(null); }}
              editable={!imageUri}
            />

            {isAddingNewCompany && (
              <>
                <Text style={[styles.label, { marginTop: 12 }]}>Ảnh công ty (tuỳ chọn)</Text>
                <TouchableOpacity
                  style={[styles.imagePickerButton, newCompany.image && { opacity: 0.6 }]}
                  onPress={pickImageForCompany}
                  disabled={!!newCompany.image}
                >
                  <Text style={styles.imagePickerText}>Chọn ảnh công ty</Text>
                </TouchableOpacity>
                {newCompanyImageUri ? <Image source={{ uri: newCompanyImageUri }} style={styles.previewImage} /> : null}
                <TextInput
                  style={[styles.input, newCompanyImageUri && { backgroundColor: '#e0e0e0' }]}
                  placeholder="Hoặc dán link ảnh công ty"
                  value={newCompany.image}
                  onChangeText={t => setNewCompany({ ...newCompany, image: t })}
                  editable={!newCompanyImageUri}
                />
              </>
            )}

            <TextInput style={styles.input} placeholder="Tên người liên hệ" value={contactName} onChangeText={setContactName} />
            <TextInput style={styles.input} placeholder="Email liên hệ" value={contactEmail} onChangeText={setContactEmail} keyboardType="email-address" />
            <TextInput style={styles.input} placeholder="Số điện thoại liên hệ" value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" />
          </View>
        )}

        {/* STEP 4: Xem lại & đăng */}
        {step === 4 && (
          <View>
            <Text style={styles.sectionTitle}>Xem lại</Text>
            <View style={styles.reviewCard}>
              <ReviewRow k="Tiêu đề" v={title} />
              <ReviewRow k="Mô tả" v={jobDescription} />
              <ReviewRow k="Trách nhiệm" v={responsibilities} />
              <ReviewRow k="Kỹ năng" v={skillsRequired} />
              <ReviewRow k="Lương" v={`${salaryMin}${salaryMax ? ' - ' + salaryMax : ''}`} />
              <ReviewRow k="Loại hình" v={workingType} />
              <ReviewRow k="Kinh nghiệm" v={experience} />
              <ReviewRow k="Số lượng" v={(quantity || '1').toString()} />
              <ReviewRow k="Hạn nộp" v={deadline || '—'} />
              <ReviewRow k="Loại công việc" v={selectedJobType === 'other' ? customJobType : (selectedJobType || '')} />
              <ReviewRow k="Danh mục" v={selectedJobCategory === 'other' ? customJobCategory : (selectedJobCategory || '')} />
              <ReviewRow k="Công ty" v={isAddingNewCompany ? newCompany.corp_name : (selectedCompany || '')} />
              <ReviewRow k="Liên hệ" v={[contactName, contactEmail, contactPhone].filter(Boolean).join(' • ')} />
            </View>
          </View>
        )}
      </ScrollView>

      <StepFooter />
    </SafeAreaView>
  );
};

export default AddJob;

// ================== STYLES ==================
const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#fff' },

  input: {
    borderWidth: 1, borderColor: '#ccc', borderRadius: 10,
    padding: 10, marginBottom: 12, fontSize: 16, backgroundColor: '#fff'
  },

  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, marginTop: 12 },
  label: { fontSize: 14, color: '#444', marginBottom: 6, marginTop: 6 },
  linkText: { color: '#007AFF', marginBottom: 18, fontSize: 16 },

  imagePickerButton: {
    backgroundColor: '#007AFF', padding: 10, borderRadius: 10,
    alignItems: 'center', marginBottom: 12,
  },
  imagePickerText: { color: '#fff', fontSize: 16 },
  previewImage: { width: 100, height: 100, borderRadius: 10, marginBottom: 12 },

  // Header + progress
  header: { paddingHorizontal: 16, paddingTop: 12, backgroundColor: '#fff' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerStep: { marginTop: 4, color: '#666' },
  progressBar: { height: 6, backgroundColor: '#eee', borderRadius: 999, marginTop: 8, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#4CAF50' },

  // Footer
  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: '#fff', padding: 12, borderTopWidth: 1, borderTopColor: '#eee',
    flexDirection: 'row', gap: 10, justifyContent: 'space-between'
  },
  footerBtn: {
    flex: 1, height: 44, borderRadius: 10, borderWidth: 1, borderColor: '#ddd',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff'
  },
  footerBtnText: { color: '#333', fontWeight: '600' },
  footerBtnPrimary: { flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#4CAF50' },
  footerBtnPrimaryText: { color: '#fff', fontWeight: '700' },
  footerBtnDisabled: { opacity: 0.5 },

  // Dropdown
  ddInput: {
    borderColor: '#ccc', borderWidth: 1, borderRadius: 10,
    minHeight: 48, paddingHorizontal: 12, backgroundColor: '#fff',
  },
  ddMenu: {
    borderColor: '#ccc', borderWidth: 1, borderTopWidth: 0,
    borderBottomLeftRadius: 10, borderBottomRightRadius: 10,
    maxHeight: 260, backgroundColor: '#fff', elevation: 6,
  },
  ddPlaceholder: { color: '#999' },
  ddLabel: { fontSize: 16 },
  ddItemLabel: { fontSize: 16 },
  ddSelectedItem: { backgroundColor: '#f2f2f2' },
  ddSelectedLabel: { fontWeight: '600' },

  // review card
  reviewCard: { backgroundColor: '#fafafa', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#eee' },
  reviewRow: { marginBottom: 8, lineHeight: 20 },
  reviewKey: { fontWeight: '700' },
});
