Phân tích hiện trạng:
Quick Post hiện tại:

Candidate tạo quick post → chỉ attach được PDF
Employer xem → chỉ thấy PDF

Vấn đề:

Nếu candidate chỉ có CV template (chưa export) → phải export mới tạo quick post được
Mất thời gian, không linh hoạt

Giải pháp đề xuất:
1. Quick Post Structure (Firestore)
typescriptinterface QuickPost {
  // ... existing fields
  cvData: {
    type: 'pdf' | 'template';
    
    // Nếu type = 'pdf'
    pdfUrl?: string;
    pdfPath?: string;
    
    // Nếu type = 'template'
    cvId?: string; // ref to user_cvs collection
    cvSnapshot?: {
      // Copy toàn bộ CV template data vào đây
      personalInfo: {...};
      education: [...];
      skills: [...];
      // ... etc
    };
  };
}
```

**Lý do lưu cvSnapshot:**
- Candidate có thể sửa/xóa CV sau khi post
- Employer cần xem đúng version lúc candidate nộp
- Không cần query thêm `user_cvs` collection

### 2. UI Flow Candidate (Create Quick Post)

**Screen: QuickPostForm**
```
┌─────────────────────────────────────┐
│ [Back] Đăng tin tìm việc            │
├─────────────────────────────────────┤
│                                     │
│ Chọn CV để đính kèm:                │
│                                     │
│ ○ Sử dụng CV từ template            │
│   [Dropdown: Chọn CV]               │
│   CV Template 1 ✓ (Default)        │
│   CV Template 2                     │
│                                     │
│ ○ Tải lên file PDF                  │
│   [📎 Chọn file PDF]                │
│   resume.pdf (uploaded)             │
│                                     │
│ Mô tả:                              │
│ [Text area]                         │
│                                     │
│ [Đăng tin]                          │
└─────────────────────────────────────┘
```

### 3. UI Flow Employer (View Quick Post)

**Screen: FindCandidates → QuickPostDetail**
```
┌─────────────────────────────────────┐
│ [Back] Chi tiết ứng viên            │
├─────────────────────────────────────┤
│ Nguyễn Văn A                        │
│ Marketing, TP.HCM                   │
│                                     │
│ Mô tả: Tìm việc part-time...       │
│                                     │
│ ─────────────────────────────────── │
│                                     │
│ 📄 Hồ sơ ứng viên:                  │
│                                     │
│ [Xem CV Template] [Tải PDF]        │
│ (Show nếu type = 'template')       │
│ (Show nếu type = 'pdf')            │
│                                     │
│ Contact: ...                        │
└─────────────────────────────────────┘
Khi click "Xem CV Template":

Navigate to CVPreviewScreen với cvData.cvSnapshot
Render giống như CVDetailScreen nhưng read-only

Khi click "Tải PDF":

Open PDF viewer hoặc download

4. Implementation Steps:
Step 1: Update Quick Post Creation
typescript// app/(candidate)/quick-post/create.tsx

// Add state for CV selection
const [cvType, setCvType] = useState<'template' | 'pdf'>('template');
const [selectedCvId, setSelectedCvId] = useState<string>('');
const [pdfFile, setPdfFile] = useState<File | null>(null);

// Load user CVs
const { data: userCVs } = useQuery({
  queryKey: ['user-cvs', user.uid],
  queryFn: () => fetchUserCVs(user.uid)
});

// On submit
const handleSubmit = async () => {
  let cvData: any;
  
  if (cvType === 'template') {
    // Get full CV data
    const selectedCV = userCVs.find(cv => cv.id === selectedCvId);
    cvData = {
      type: 'template',
      cvId: selectedCV.id,
      cvSnapshot: selectedCV // Copy toàn bộ
    };
  } else {
    // Upload PDF
    const pdfUrl = await uploadPDF(pdfFile);
    cvData = {
      type: 'pdf',
      pdfUrl,
      pdfPath: `quick-posts/${user.uid}/${Date.now()}.pdf`
    };
  }
  
  await createQuickPost({
    ...formData,
    cvData
  });
};
Step 2: Update Employer View
typescript// app/(employer)/find-candidates/[id].tsx

const QuickPostDetailScreen = () => {
  const { quickPost } = useLocalSearchParams();
  const post = JSON.parse(quickPost);
  
  return (
    <View>
      {/* ... existing UI */}
      
      <View style={styles.cvSection}>
        <Text style={styles.sectionTitle}>📄 Hồ sơ ứng viên</Text>
        
        {post.cvData.type === 'template' && (
          <Button
            title="Xem CV Template"
            onPress={() => router.push({
              pathname: '/cv-preview',
              params: { 
                cvData: JSON.stringify(post.cvData.cvSnapshot) 
              }
            })}
          />
        )}
        
        {post.cvData.type === 'pdf' && (
          <Button
            title="Tải CV PDF"
            onPress={() => Linking.openURL(post.cvData.pdfUrl)}
          />
        )}
      </View>
    </View>
  );
};
Step 3: Create CV Preview Screen
typescript// app/(shared)/cv-preview.tsx

const CVPreviewScreen = () => {
  const { cvData } = useLocalSearchParams();
  const cv = JSON.parse(cvData);
  
  return (
    <ScrollView style={styles.container}>
      <CVTemplate1 data={cv} editable={false} />
    </ScrollView>
  );
};
5. Backend Changes:
Server validation:
typescript// server/src/services/quickpost.service.ts

const validateQuickPost = (data: any) => {
  // Validate cvData structure
  if (!data.cvData || !data.cvData.type) {
    throw new Error('CV data is required');
  }
  
  if (data.cvData.type === 'template') {
    if (!data.cvData.cvSnapshot) {
      throw new Error('CV snapshot is required');
    }
  } else if (data.cvData.type === 'pdf') {
    if (!data.cvData.pdfUrl) {
      throw new Error('PDF URL is required');
    }
  }
};
6. Ưu điểm:
✅ Candidate:

Không cần export PDF → nhanh hơn
Linh hoạt: dùng template hoặc PDF
Có thể edit template sau khi post (không ảnh hưởng snapshot)

✅ Employer:

Xem được 2 loại CV
CV template render đẹp hơn PDF
Không cần download nếu chỉ xem nhanh

✅ Technical:

Data consistency (snapshot)
No additional queries
Backward compatible (existing PDF posts vẫn work)

7. Cần thêm:

CVPreviewScreen shared component
CV snapshot logic trong create quick post
Conditional rendering trong employer view
Validation cho cả 2 loại CV


Bạn muốn tôi implement luôn không? Tôi sẽ tạo:

Updated QuickPostForm với CV selection
Updated QuickPostDetail với dual CV view
New CVPreviewScreen component
Backend validation