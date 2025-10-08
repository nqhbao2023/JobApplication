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
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { db, auth, storage } from '@/config/firebase';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

type JobOption = { label: string; value: string };

const STEPS = ['Cơ bản', 'Phân loại', 'Công ty', 'Hình ảnh', 'Xem lại'];

const AddJob = () => {
  const router = useRouter();

  // ====== Basic ======
  const [title, setTitle] = useState('');
  const [skillsRequired, setSkillsRequired] = useState('');
  const [responsibilities, setResponsibilities] = useState('');
  const [salary, setSalary] = useState('');
  const [jobDescription, setJobDescription] = useState('');

  // ====== Dropdown data/value/open ======
  const [jobTypeItems, setJobTypeItems] = useState<JobOption[]>([]);
  const [jobCategoryItems, setJobCategoryItems] = useState<JobOption[]>([]);
  const [companyItems, setCompanyItems] = useState<JobOption[]>([]);

  const [selectedJobType, setSelectedJobType] = useState<string | null>(null);
  const [selectedJobCategory, setSelectedJobCategory] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string>('');

  const [openJobType, setOpenJobType] = useState(false);
  const [openJobCategory, setOpenJobCategory] = useState(false);
  const [openCompany, setOpenCompany] = useState(false);

  // ====== Company ======
  const [isAddingNewCompany, setIsAddingNewCompany] = useState(false);
  const [newCompany, setNewCompany] = useState({
    corp_name: '',
    nation: '',
    corp_description: '',
    city: '',
    image: '',
    color: '',
  });

  // ====== Images ======
  const [image, setImage] = useState<string>(''); // URL ảnh job
  const [imageUri, setImageUri] = useState<string | null>(null); // URI ảnh job
  const [newCompanyImageUri, setNewCompanyImageUri] = useState<string | null>(null); // URI ảnh company

  // ====== Others ======
  const [userId, setUserId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // ====== Stepper ======
  const [step, setStep] = useState(0);
  const totalSteps = STEPS.length;

  const canNext = () => {
    if (step === 0) return !!title.trim() && !!jobDescription.trim() && !!salary.trim();
    if (step === 1) return !!selectedJobType && !!selectedJobCategory;
    if (step === 2) return isAddingNewCompany ? !!newCompany.corp_name.trim() : !!selectedCompany.trim();
    if (step === 3) return !!imageUri || !!image.trim();
    return true;
  };
  const onNext = () => { if (step < totalSteps - 1 && canNext()) setStep(s => s + 1); };
  const onBack = () => { if (step > 0) setStep(s => s - 1); };

  // Mở 1 dropdown thì đóng cái khác
  useEffect(() => {
    if (openJobType) { setOpenJobCategory(false); setOpenCompany(false); }
    if (openJobCategory) { setOpenJobType(false); setOpenCompany(false); }
    if (openCompany) { setOpenJobType(false); setOpenJobCategory(false); }
  }, [openJobType, openJobCategory, openCompany]);

  // Fetch options + user id
  useEffect(() => {
    (async () => {
      try {
        const [typesSnap, categoriesSnap, companiesSnap] = await Promise.all([
          getDocs(collection(db, 'job_types')),
          getDocs(collection(db, 'job_categories')),
          getDocs(collection(db, 'companies')),
        ]);
        setJobTypeItems(typesSnap.docs.map(d => ({ label: d.data().type_name, value: d.id })));
        setJobCategoryItems(categoriesSnap.docs.map(d => ({ label: d.data().category_name, value: d.id })));
        setCompanyItems(companiesSnap.docs.map(d => ({ label: d.data().corp_name, value: d.id })));
      } catch {
        Alert.alert('Lỗi', 'Không thể tải dữ liệu lựa chọn');
      }
      const user = auth.currentUser;
      if (user) setUserId(user.uid);
    })();
  }, []);

  // ====== Helpers ======
  const pickImage = async (onPicked: (uri: string) => void) => {
    const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!p.granted) { Alert.alert('Quyền bị từ chối', 'Cần quyền truy cập ảnh.'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 1,
    });
    if (!res.canceled) onPicked(res.assets[0].uri);
  };

  const pickImageForJob = () => pickImage(uri => { setImageUri(uri); setImage(''); });
  const pickImageForCompany = () => pickImage(uri => { setNewCompanyImageUri(uri); setNewCompany({ ...newCompany, image: '' }); });

  const uploadImageToFirebase = async (uri: string, folder: string) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const storageRef = ref(storage, `${folder}/${Date.now()}.jpg`);
    await uploadBytes(storageRef, blob);
    return getDownloadURL(storageRef);
  };

  // ====== Submit ======
  const handleAddJob = async () => {
    if (!title || !salary || !selectedJobType || !selectedJobCategory || (!selectedCompany && !isAddingNewCompany)) {
      Alert.alert('Thiếu thông tin', 'Vui lòng điền đầy đủ thông tin'); return;
    }
    try {
      setLoading(true);

      let companyId = selectedCompany;
      let jobImageUrl = image;

      if (imageUri) jobImageUrl = await uploadImageToFirebase(imageUri, 'jobs');
      else if (!jobImageUrl) { Alert.alert('Thiếu ảnh', 'Vui lòng cung cấp ảnh cho công việc.'); return; }

      if (isAddingNewCompany) {
        let companyImageUrl = newCompany.image;
        if (newCompanyImageUri) companyImageUrl = await uploadImageToFirebase(newCompanyImageUri, 'companies');
        else if (!companyImageUrl) { Alert.alert('Thiếu ảnh', 'Vui lòng cung cấp ảnh cho công ty.'); return; }

        const companyDoc = await addDoc(collection(db, 'companies'), {
          ...newCompany, image: companyImageUrl,
        });
        companyId = companyDoc.id;
      }

      await addDoc(collection(db, 'jobs'), {
        title,
        image: jobImageUrl,
        skills_required: skillsRequired,
        responsibilities,
        salary: parseFloat(salary),
        jobTypes: selectedJobType,
        jobCategories: selectedJobCategory,
        company: companyId,
        users: userId,
        job_Description: jobDescription,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      Alert.alert('Thành công', 'Đã thêm công việc mới');
      router.back();
    } catch {
      Alert.alert('Lỗi', 'Không thể thêm công việc');
    } finally {
      setLoading(false);
    }
  };

  // ====== Small inline components (đặt trong cùng file) ======
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
      <TouchableOpacity style={[styles.footerBtn, step === 0 && styles.footerBtnDisabled]} disabled={step === 0} onPress={onBack}>
        <Text style={styles.footerBtnText}>Quay lại</Text>
      </TouchableOpacity>

      {step < totalSteps - 1 ? (
        <TouchableOpacity
          style={[styles.footerBtnPrimary, !canNext() && styles.footerBtnDisabled]}
          disabled={!canNext()}
          onPress={onNext}
        >
          <Text style={styles.footerBtnPrimaryText}>Tiếp tục</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={[styles.footerBtnPrimary, loading && styles.footerBtnDisabled]} disabled={loading} onPress={handleAddJob}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.footerBtnPrimaryText}>Tạo công việc</Text>}
        </TouchableOpacity>
      )}
    </View>
  ));

  type DropFieldProps = {
    label: string;
    zIndex: number;
    open: boolean;
    setOpen: (v: boolean) => void;
    value: any;
    setValue: any; // để đơn giản hoá type của DropDownPicker
    items: any[];
    setItems: any;
    placeholder: string;
  };
  const DropField = memo((p: DropFieldProps) => (
    <>
      <Text style={styles.label}>{p.label}</Text>
      <View style={{ zIndex: p.zIndex, marginBottom: 12 }}>
        <DropDownPicker
          open={p.open}
          value={p.value}
          items={p.items}
          setOpen={p.setOpen as any}
          setValue={p.setValue as any}
          setItems={p.setItems as any}

          placeholder={p.placeholder}
          listMode="SCROLLVIEW"
          dropDownDirection="AUTO"
          containerStyle={styles.ddContainer}
          style={styles.ddInput}
          dropDownContainerStyle={styles.ddMenu}
          placeholderStyle={styles.ddPlaceholder}
          labelStyle={styles.ddLabel}
          listItemLabelStyle={styles.ddItemLabel}
          selectedItemContainerStyle={styles.ddSelectedItem}
          selectedItemLabelStyle={styles.ddSelectedLabel}
          // ❌ bỏ arrowIconStyle/tickIconStyle để tránh TS mismatch ViewStyle/tintColor
        />
      </View>
    </>
  ));

  const ReviewRow = ({ k, v }: { k: string; v: string }) => (
    <Text style={styles.reviewRow}><Text style={styles.reviewKey}>{k}:</Text> {v || '—'}</Text>
  );

  // ====== RENDER ======
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
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
            <TextInput style={styles.input} placeholder="Tiêu đề công việc" value={title} onChangeText={setTitle} />
            <TextInput style={styles.input} placeholder="Giới thiệu công việc" value={jobDescription} onChangeText={setJobDescription} />
            <TextInput style={styles.input} placeholder="Mức lương (VNĐ)" value={salary} onChangeText={setSalary} keyboardType="numeric" />
            <TextInput style={styles.input} placeholder="Kỹ năng cần thiết" value={skillsRequired} onChangeText={setSkillsRequired} />
            <TextInput style={styles.input} placeholder="Trách nhiệm" value={responsibilities} onChangeText={setResponsibilities} />
          </View>
        )}

        {/* STEP 1: Phân loại */}
        {step === 1 && (
          <View>
            <Text style={styles.sectionTitle}>Phân loại</Text>

            <DropField
              label="Loại công việc"
              zIndex={3000}
              open={openJobType}
              setOpen={setOpenJobType}
              value={selectedJobType}
              setValue={setSelectedJobType}
              items={jobTypeItems}
              setItems={setJobTypeItems}
              placeholder="Chọn loại công việc"
            />

            <DropField
              label="Danh mục công việc"
              zIndex={2000}
              open={openJobCategory}
              setOpen={setOpenJobCategory}
              value={selectedJobCategory}
              setValue={setSelectedJobCategory}
              items={jobCategoryItems}
              setItems={setJobCategoryItems}
              placeholder="Chọn danh mục"
            />
          </View>
        )}

        {/* STEP 2: Công ty */}
        {step === 2 && (
          <View>
            <Text style={styles.sectionTitle}>Công ty</Text>

            <TouchableOpacity onPress={() => setIsAddingNewCompany(!isAddingNewCompany)}>
              <Text style={styles.linkText}>
                {isAddingNewCompany ? '← Chọn công ty có sẵn' : '+ Thêm công ty mới'}
              </Text>
            </TouchableOpacity>

            {!isAddingNewCompany ? (
              <DropField
                label="Chọn công ty"
                zIndex={1000}
                open={openCompany}
                setOpen={setOpenCompany}
                value={selectedCompany}
                setValue={setSelectedCompany}
                items={companyItems}
                setItems={setCompanyItems}
                placeholder="Chọn công ty"
              />
            ) : (
              <View>
                <TextInput style={styles.input} placeholder="Tên công ty" value={newCompany.corp_name} onChangeText={t => setNewCompany({ ...newCompany, corp_name: t })} />
                <TextInput style={styles.input} placeholder="Quốc gia" value={newCompany.nation} onChangeText={t => setNewCompany({ ...newCompany, nation: t })} />
                <TextInput style={styles.input} placeholder="Thành phố" value={newCompany.city} onChangeText={t => setNewCompany({ ...newCompany, city: t })} />
                <TextInput style={styles.input} placeholder="Mô tả" value={newCompany.corp_description} onChangeText={t => setNewCompany({ ...newCompany, corp_description: t })} />
              </View>
            )}
          </View>
        )}

        {/* STEP 3: Hình ảnh */}
        {step === 3 && (
          <View>
            <Text style={styles.sectionTitle}>Hình ảnh</Text>

            <Text style={styles.label}>Ảnh công việc</Text>
            <TouchableOpacity style={[styles.imagePickerButton, image && { opacity: 0.5 }]} onPress={pickImageForJob} disabled={!!image}>
              <Text style={styles.imagePickerText}>Chọn ảnh từ thiết bị</Text>
            </TouchableOpacity>
            {imageUri ? <Image source={{ uri: imageUri }} style={styles.previewImage} /> : null}
            <TextInput
              style={[styles.input, imageUri && { backgroundColor: '#e0e0e0' }]}
              placeholder="Hoặc nhập link ảnh công việc"
              value={image}
              onChangeText={t => { setImage(t); setImageUri(null); }}
              editable={!imageUri}
            />

            {isAddingNewCompany && (
              <>
                <Text style={[styles.label, { marginTop: 12 }]}>Ảnh công ty</Text>
                <TouchableOpacity
                  style={[styles.imagePickerButton, newCompany.image && { opacity: 0.5 }]}
                  onPress={pickImageForCompany}
                  disabled={!!newCompany.image}
                >
                  <Text style={styles.imagePickerText}>Chọn ảnh từ thiết bị</Text>
                </TouchableOpacity>
                {newCompanyImageUri ? <Image source={{ uri: newCompanyImageUri }} style={styles.previewImage} /> : null}
                <TextInput
                  style={[styles.input, newCompanyImageUri && { backgroundColor: '#e0e0e0' }]}
                  placeholder="Hoặc nhập link ảnh công ty"
                  value={newCompany.image}
                  onChangeText={t => { setNewCompany({ ...newCompany, image: t }); setNewCompanyImageUri(null); }}
                  editable={!newCompanyImageUri}
                />
                <TextInput style={styles.input} placeholder="Màu nhận diện (tuỳ chọn)" value={newCompany.color} onChangeText={t => setNewCompany({ ...newCompany, color: t })} />
              </>
            )}
          </View>
        )}

        {/* STEP 4: Xem lại */}
        {step === 4 && (
          <View>
            <Text style={styles.sectionTitle}>Xem lại</Text>
            <View style={styles.reviewCard}>
              <ReviewRow k="Tiêu đề" v={title} />
              <ReviewRow k="Mô tả" v={jobDescription} />
              <ReviewRow k="Lương" v={salary} />
              <ReviewRow k="Kỹ năng" v={skillsRequired} />
              <ReviewRow k="Trách nhiệm" v={responsibilities} />
              <ReviewRow k="Loại công việc" v={selectedJobType || ''} />
              <ReviewRow k="Danh mục" v={selectedJobCategory || ''} />
              <ReviewRow k="Công ty" v={isAddingNewCompany ? newCompany.corp_name : (selectedCompany || '')} />
            </View>
          </View>
        )}
      </ScrollView>

      <StepFooter />
    </View>
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

  // Dropdown (kiểu panel dưới input)
  ddContainer: { marginBottom: 12, zIndex: 1 },
  ddInput: {
    borderColor: '#ccc', borderWidth: 1, borderRadius: 10,
    minHeight: 48, paddingHorizontal: 12, backgroundColor: '#fff', zIndex: 1,
  },
  ddMenu: {
    borderColor: '#ccc', borderWidth: 1, borderTopWidth: 0,
    borderBottomLeftRadius: 10, borderBottomRightRadius: 10,
    maxHeight: 240, backgroundColor: '#fff', elevation: 6, zIndex: 9999,
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
