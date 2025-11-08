import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { db, auth, storage } from '@/config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, getDocs, serverTimestamp, getDoc, doc } from 'firebase/firestore';
import { DRAFT_KEY, AI_TEMPLATES, type JobFormData, type NewCompanyData, type ExpandedSections } from '@/constants/addJob.constants';

export const useAddJobForm = () => {
  const router = useRouter();
  const saveDraftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [formData, setFormData] = useState<JobFormData>({
    title: '',
    jobDescription: '',
    responsibilities: '',
    skillsRequired: '',
    salaryMin: '',
    salaryMax: '',
    experience: '',
    quantity: '1',
    deadline: '',
    selectedJobType: null,
    selectedJobCategory: null,
    selectedCompany: null,
    customJobCategory: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    imageUri: null,
    image: '',
    workingType: '',
    customJobType: '',
  });

  const [newCompany, setNewCompany] = useState<NewCompanyData>({
    corp_name: '',
    nation: '',
    corp_description: '',
    city: '',
    image: '',
    color: '',
  });

  const [newCompanyImageUri, setNewCompanyImageUri] = useState<string | null>(null);
  const [isAddingNewCompany, setIsAddingNewCompany] = useState(false);

  const [jobTypeItems, setJobTypeItems] = useState<Array<{ label: string; value: string }>>([]);
  const [jobCategoryItems, setJobCategoryItems] = useState<Array<{ label: string; value: string }>>([]);
  const [companyItems, setCompanyItems] = useState<Array<{ label: string; value: string }>>([]);

  const [openTypeDD, setOpenTypeDD] = useState(false);
  const [openCategoryDD, setOpenCategoryDD] = useState(false);
  const [openCompanyDD, setOpenCompanyDD] = useState(false);

  const [expandedSections, setExpandedSections] = useState<ExpandedSections>({
    basic: true,
    details: false,
    classification: false,
    media: false,
    preview: false,
  });

  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [aiModalVisible, setAiModalVisible] = useState(false);

  useEffect(() => {
    if (openTypeDD) { setOpenCategoryDD(false); setOpenCompanyDD(false); }
    if (openCategoryDD) { setOpenTypeDD(false); setOpenCompanyDD(false); }
    if (openCompanyDD) { setOpenTypeDD(false); setOpenCategoryDD(false); }
  }, [openTypeDD, openCategoryDD, openCompanyDD]);

  useEffect(() => {
    if (formData.selectedJobCategory !== 'other') {
      setFormData(prev => ({ ...prev, customJobCategory: '' }));
    }
  }, [formData.selectedJobCategory]);

  useEffect(() => {
    loadDraft();
    loadDropdowns();
  }, []);

  useEffect(() => {
    if (saveDraftTimerRef.current) {
      clearTimeout(saveDraftTimerRef.current);
    }

    saveDraftTimerRef.current = setTimeout(() => {
      saveDraft();
    }, 1000);

    return () => {
      if (saveDraftTimerRef.current) {
        clearTimeout(saveDraftTimerRef.current);
      }
    };
  }, [formData]);

  const loadDraft = async () => {
    try {
      const draft = await AsyncStorage.getItem(DRAFT_KEY);
      if (draft) {
        const data = JSON.parse(draft);
        setFormData(prev => ({
          ...prev,
          title: data.title || '',
          jobDescription: data.jobDescription || '',
          responsibilities: data.responsibilities || '',
          skillsRequired: data.skillsRequired || '',
          salaryMin: data.salaryMin || '',
          salaryMax: data.salaryMax || '',
          experience: data.experience || '',
          quantity: data.quantity || '1',
          deadline: data.deadline || '',
          selectedJobType: data.selectedJobType || null,
          selectedJobCategory: data.selectedJobCategory || null,
          selectedCompany: data.selectedCompany || null,
          contactName: data.contactName || '',
          contactEmail: data.contactEmail || '',
          contactPhone: data.contactPhone || '',
        }));
      }
    } catch (e) {
      console.error('Load draft error:', e);
    }
  };

  const saveDraft = async () => {
    if (!formData.title && !formData.jobDescription) return;
    try {
      setSavingDraft(true);
      await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({
        title: formData.title,
        jobDescription: formData.jobDescription,
        responsibilities: formData.responsibilities,
        skillsRequired: formData.skillsRequired,
        salaryMin: formData.salaryMin,
        salaryMax: formData.salaryMax,
        experience: formData.experience,
        quantity: formData.quantity,
        deadline: formData.deadline,
        selectedJobType: formData.selectedJobType,
        selectedJobCategory: formData.selectedJobCategory,
        selectedCompany: formData.selectedCompany,
        contactName: formData.contactName,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone,
      }));
    } catch (e) {
      console.error('Save draft error:', e);
    } finally {
      setSavingDraft(false);
    }
  };

  const clearDraft = async () => {
    try {
      await AsyncStorage.removeItem(DRAFT_KEY);
    } catch (e) {
      console.error('Clear draft error:', e);
    }
  };

  const loadDropdowns = async () => {
    try {
      const [typesSnap, categoriesSnap, companiesSnap] = await Promise.all([
        getDocs(collection(db, 'job_types')),
        getDocs(collection(db, 'job_categories')),
        getDocs(collection(db, 'companies')),
      ]);

      setJobTypeItems(
        typesSnap.docs.map(d => {
          const data = d.data();
          const icon = data.icon || '';
          const name = data.type_name || 'Chưa có tên';
          return { 
            label: icon ? `${icon} ${name}` : name, 
            value: d.id 
          };
        })
      );
      
      setJobCategoryItems([
        ...categoriesSnap.docs.map(d => {
          const data = d.data();
          const icon = data.icon || '';
          const name = data.category_name || data.name || 'Chưa có tên';
          return { 
            label: icon ? `${icon} ${name}` : name, 
            value: d.id 
          };
        }),
        { label: '📦 Khác', value: 'other' },
      ]);

      setCompanyItems(companiesSnap.docs.map(d => ({ label: d.data().corp_name, value: d.id })));
    } catch {
      Alert.alert('Lỗi', 'Không thể tải dữ liệu lựa chọn');
    }

    const user = auth.currentUser;
    if (user) setUserId(user.uid);
  };

  const updateFormField = useCallback(<K extends keyof JobFormData>(field: K, value: JobFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const toggleSection = useCallback((section: keyof ExpandedSections, force?: boolean) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: force !== undefined ? force : !prev[section],
    }));
  }, []);

  const applyAITemplate = useCallback((templateKey: keyof typeof AI_TEMPLATES) => {
    const template = AI_TEMPLATES[templateKey];
    setFormData(prev => ({
      ...prev,
      title: template.title,
      jobDescription: template.jobDescription,
      responsibilities: template.responsibilities,
      skillsRequired: template.skillsRequired,
      experience: template.experience,
    }));
    setAiModalVisible(false);
    setExpandedSections(prev => ({ ...prev, basic: true }));
  }, []);

  const pickImage = useCallback(async (cb: (uri: string) => void) => {
    const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!p.granted) {
      Alert.alert("Quyền bị từ chối", "Cần quyền truy cập ảnh.");
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      selectionLimit: 1,
    });

    if (!res.canceled && res.assets?.length) {
      cb(res.assets[0].uri);
    }
  }, []);

  const uploadImageToFirebase = async (uri: string, folder: string) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const storageRef = ref(storage, `${folder}/${Date.now()}.jpg`);
    await uploadBytes(storageRef, blob);
    return getDownloadURL(storageRef);
  };

  const validateForm = useCallback(() => {
    if (!formData.title.trim()) return { valid: false, msg: 'Vui lòng nhập tiêu đề công việc' };
    if (!formData.jobDescription.trim()) return { valid: false, msg: 'Vui lòng nhập mô tả công việc' };
    if (!formData.salaryMin.trim()) return { valid: false, msg: 'Vui lòng nhập lương tối thiểu' };

    const min = parseFloat(formData.salaryMin);
    if (Number.isNaN(min) || min < 0) return { valid: false, msg: 'Lương tối thiểu không hợp lệ' };

    const max = formData.salaryMax.trim() ? parseFloat(formData.salaryMax) : undefined;
    if (max !== undefined && (Number.isNaN(max) || max < min)) {
      return { valid: false, msg: 'Lương tối đa phải ≥ lương tối thiểu' };
    }

    if (!formData.selectedJobType) {
      return { valid: false, msg: 'Vui lòng chọn hình thức làm việc' };
    }

    if (!formData.selectedJobCategory || (formData.selectedJobCategory === 'other' && !formData.customJobCategory.trim())) {
      return { valid: false, msg: 'Vui lòng chọn danh mục công việc' };
    }

    if (!isAddingNewCompany && !formData.selectedCompany) {
      return { valid: false, msg: 'Vui lòng chọn công ty' };
    }

    if (isAddingNewCompany && !newCompany.corp_name.trim()) {
      return { valid: false, msg: 'Vui lòng nhập tên công ty' };
    }

    if (!formData.imageUri && !formData.image.trim()) {
      return { valid: false, msg: 'Vui lòng thêm ảnh công việc' };
    }

    return { valid: true };
  }, [formData, isAddingNewCompany, newCompany.corp_name]);

  const handleAddJob = useCallback(async () => {
    const validation = validateForm();
    if (!validation.valid) {
      Alert.alert("Thiếu thông tin", validation.msg);
      return;
    }

    const qty = formData.quantity.trim() ? parseInt(formData.quantity, 10) : 1;
    if (qty <= 0) {
      Alert.alert("Số lượng không hợp lệ", "Số lượng tuyển phải ≥ 1.");
      return;
    }

    try {
      setLoading(true);

      let jobImageUrl = formData.image;
      if (formData.imageUri) jobImageUrl = await uploadImageToFirebase(formData.imageUri, "jobs");
      if (!jobImageUrl) {
        Alert.alert("Thiếu ảnh", "Vui lòng cung cấp ảnh cho công việc.");
        return;
      }

      let companyId = formData.selectedCompany;
      if (isAddingNewCompany) {
        let companyImageUrl = newCompany.image;
        if (newCompanyImageUri)
          companyImageUrl = await uploadImageToFirebase(newCompanyImageUri, "companies");

        const companyDoc = await addDoc(collection(db, "companies"), {
          ...newCompany,
          image: companyImageUrl || "",
          ownerId: userId,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        });
        companyId = companyDoc.id;
      }

      let jobTypeObj: { id: string; type_name: string } = { id: '', type_name: '' };
      if (formData.selectedJobType) {
        const typeSnap = await getDoc(doc(db, "job_types", formData.selectedJobType));
        if (typeSnap.exists()) {
          jobTypeObj = {
            id: typeSnap.id,
            type_name: typeSnap.data()?.type_name || '',
          };
        }
      }

      let jobCategoryObj: { id: string | null; category_name: string } = { id: null, category_name: "" };
      if (formData.selectedJobCategory === "other") {
        jobCategoryObj = { id: null, category_name: formData.customJobCategory.trim() };
      } else if (formData.selectedJobCategory) {
        const catSnap = await getDoc(doc(db, "job_categories", formData.selectedJobCategory));
        jobCategoryObj = {
          id: catSnap.exists() ? catSnap.id : formData.selectedJobCategory,
          category_name: catSnap.exists() ? catSnap.data()?.category_name || "" : formData.selectedJobCategory,
        };
      }

      const min = parseFloat(formData.salaryMin);
      const max = formData.salaryMax.trim() ? parseFloat(formData.salaryMax) : null;

      const jobPayload = {
        title: formData.title,
        job_Description: formData.jobDescription,
        responsibilities: formData.responsibilities,
        skills_required: formData.skillsRequired,
        salaryMin: min,
        salaryMax: max,
        experience: formData.experience,
        quantity: qty,
        deadline: formData.deadline || null,
        jobTypes: jobTypeObj,
        jobCategories: jobCategoryObj,
        jobTypeId: jobTypeObj.id,
        jobCategoryId: jobCategoryObj.id,
        isCustomCategory: formData.selectedJobCategory === "other",
        contact_name: formData.contactName || "",
        contact_email: formData.contactEmail || "",
        contact_phone: formData.contactPhone || "",
        company: companyId,
        image: jobImageUrl,
        ownerId: userId,
        users: userId,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      };

      await addDoc(collection(db, "jobs"), jobPayload);
      await clearDraft();

      Alert.alert("✅ Thành công", "Đã đăng công việc mới!");
      router.back();
    } catch (e) {
      console.error("❌ Lỗi thêm công việc:", e);
      Alert.alert("Lỗi", "Không thể thêm công việc");
    } finally {
      setLoading(false);
    }
  }, [formData, isAddingNewCompany, newCompany, newCompanyImageUri, userId, validateForm, router]);

  const isBasicComplete = !!(formData.title.trim() && formData.jobDescription.trim());
  const isDetailsComplete = !!formData.salaryMin.trim();
  const isClassificationComplete = !!(
    formData.selectedJobType &&
    formData.selectedJobCategory &&
    (formData.selectedCompany || isAddingNewCompany)
  );
  const isMediaComplete = !!(formData.imageUri || formData.image.trim());

  return {
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
  };
};