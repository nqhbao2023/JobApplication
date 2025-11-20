# 📚 LEARNING - Toàn bộ kiến thức cần thiết để hiểu dự án Job4S

## 🎯 Mục lục
1. [JavaScript/TypeScript Cơ bản](#1-javascripttypescript-cơ-bản)
2. [React Native & Expo](#2-react-native--expo)
3. [Kiến trúc dự án](#3-kiến-trúc-dự-án)
4. [Quy trình làm việc](#4-quy-trình-làm-việc)
5. [Backend & API](#5-backend--api)
6. [Web Crawler](#6-web-crawler)
7. [Firebase & Database](#7-firebase--database)
8. [Debugging & Testing](#8-debugging--testing)

---

## 1. JavaScript/TypeScript Cơ bản

### 1.1 JavaScript ES6+ (Những gì bạn PHẢI biết)

```javascript
// 1. BIẾN: const (không đổi), let (đổi được), KHÔNG dùng var
const name = "John";  // Không thay đổi
let age = 25;         // Có thể thay đổi
age = 26;             // OK

// 2. ARROW FUNCTION (=>)
// Cách cũ:
function greet(name) {
  return "Hello " + name;
}
// Cách mới (dùng arrow):
const greet = (name) => {
  return "Hello " + name;
};
// Hoặc ngắn gọn hơn:
const greet = (name) => "Hello " + name;

// 3. TEMPLATE LITERALS (dấu backtick `)
const name = "John";
const age = 25;
// Cách cũ:
const message = "My name is " + name + " and I'm " + age;
cosnt mesgage = " My name is" + name + " and I'm " + age;

// Cách mới:
const message = `My name is ${name} and I'm ${age}`;
const message = `My name is ${name} and I;m ${age}`; 
// 4. DESTRUCTURING (tách object/array)
const user = { name: "John", age: 25, email: "john@gmail.com" };
const user = { name: "John", age : 25, email: "john@gmail,com" }
// Lấy ra name và age:
const { name, age} =user;
console.log(name);

const { name, age } = user;
console.log(name); // "John"

const numbers = [1,2,3,4];
const [first, second, third,four] =numbers;
console.log(third); //3

const numbers = [1, 2, 3];
const [first, second] = numbers;
console.log(first); // 1

// 5. SPREAD OPERATOR (...)
const arr1 = [1, 2, 3];
const arr2 = [...arr1, 4, 5]; // [1, 2, 3, 4, 5]

const obj1 = { name: "John" };
const obj2 = { ...obj1, age: 25 }; // { name: "John", age: 25 }

// 6. ASYNC/AWAIT (Xử lý bất đồng bộ)
// Thay vì dùng .then():
fetch('/api/jobs')
  .then(response => response.json())
  .then(data => console.log(data));

// Dùng async/await (dễ đọc hơn):
const fetchJobs = async () => {
  const response = await fetch('/api/jobs');
  const data = await response.json();
  console.log(data);
};

// 7. ARRAY METHODS (quan trọng!)
const jobs = [
  { id: 1, title: "Developer", salary: 1000 },
  { id: 2, title: "Designer", salary: 800 },
  { id: 3, title: "Manager", salary: 1200 }
];

// map: Biến đổi mỗi phần tử
const titles = jobs.map(job => job.title);
// ["Developer", "Designer", "Manager"]

// filter: Lọc phần tử
const highPay = jobs.filter(job => job.salary > 900);
// [{ id: 1, ... }, { id: 3, ... }]

// find: Tìm 1 phần tử
const dev = jobs.find(job => job.title === "Developer");
// { id: 1, title: "Developer", salary: 1000 }

// forEach: Lặp qua từng phần tử
jobs.forEach(job => {
  console.log(job.title);
});
```

### 1.2 TypeScript (JavaScript + kiểu dữ liệu)

```typescript
// 1. KHAI BÁO KIỂU
let name: string = "John";
let age: number = 25;
let isActive: boolean = true;
let skills: string[] = ["React", "Node.js"];

// 2. INTERFACE (định nghĩa cấu trúc object)
interface Job {
  id: string;
  title: string;
  salary: string;
  company: Company;
}

interface Company {
  name: string;
  logo: string;
}

// Sử dụng:
const job: Job = {
  id: "123",
  title: "Developer",
  salary: "1000 USD",
  company: {
    name: "ABC Corp",
    logo: "logo.png"
  }
};

// 3. TYPE (tương tự interface)
type User = {
  id: string;
  name: string;
  email: string;
};

// 4. OPTIONAL (?) - Thuộc tính không bắt buộc
interface User {
  id: string;
  name: string;
  phone?: string;  // Có thể có hoặc không
}

// 5. UNION TYPE (|) - Nhiều kiểu
type Status = "pending" | "approved" | "rejected";
let jobStatus: Status = "pending"; // Chỉ được 3 giá trị này

// 6. GENERIC <T> - Kiểu động
interface ApiResponse<T> {
  data: T;
  error: string | null;
}

const jobResponse: ApiResponse<Job[]> = {
  data: [job1, job2],
  error: null
};
```

**TẠI SAO DÙNG TYPESCRIPT?**
- Bắt lỗi ngay khi code (không phải chờ chạy)
- Gợi ý code tự động (autocomplete)
- Dễ maintain code khi dự án lớn

---

## 2. React Native & Expo

### 2.1 React Cơ bản

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, Button } from 'react-native';

// 1. COMPONENT - Khối xây dựng của UI
// Component = Function trả về JSX (giống HTML)
const JobCard = () => {
  return (
    <View>
      <Text>Software Developer</Text>
      <Text>$1000/month</Text>
    </View>
  );
};

// 2. PROPS - Truyền dữ liệu từ component cha xuống con
interface JobCardProps {
  title: string;
  salary: string;
}

const JobCard = ({ title, salary }: JobCardProps) => {
  return (
    <View>
      <Text>{title}</Text>
      <Text>{salary}</Text>
    </View>
  );
};

// Sử dụng:
<JobCard title="Developer" salary="$1000" />

// 3. STATE - Dữ liệu thay đổi trong component
const JobList = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Thay đổi state:
  const addJob = (newJob: Job) => { 
    setJobs([...jobs, newJob]); // Thêm job mới
  };
  
  return (
    <View>
      {jobs.map(job => (
        <JobCard key={job.id} title={job.title} salary={job.salary} />
      ))}
    </View>
  );
};

// 4. USEEFFECT - Chạy code khi component mount/update
const JobList = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  
  // Chạy 1 lần khi component load
  useEffect(() => {
    fetchJobs();
  }, []); // [] = chỉ chạy 1 lần
  
  // Chạy mỗi khi jobs thay đổi
  useEffect(() => {
    console.log("Jobs updated:", jobs);
  }, [jobs]); // Theo dõi jobs
  
  const fetchJobs = async () => {
    const response = await fetch('/api/jobs');
    const data = await response.json();
    setJobs(data);
  };
  
  return <View>...</View>;
};
```

### 2.2 Expo Router (Điều hướng)

```typescript
// CẤU TRÚC FOLDER = CẤU TRÚC URL
app/
  (auth)/          -> Nhóm routes liên quan auth
    login.tsx      -> /login
    register.tsx   -> /register
  (candidate)/     -> Routes cho ứng viên
    index.tsx      -> /candidate (trang chủ)
    profile.tsx    -> /candidate/profile
  (employer)/      -> Routes cho nhà tuyển dụng
    index.tsx      -> /employer
    addJob.tsx     -> /employer/addJob

// NAVIGATION - Di chuyển giữa các màn hình
import { router } from 'expo-router';

// Chuyển màn hình:
router.push('/candidate/profile');
router.replace('/login'); // Thay thế, không back được
router.back(); // Quay lại

// Truyền params:
router.push({
  pathname: '/jobDescription',
  params: { jobId: '123' }
});

// Nhận params:
import { useLocalSearchParams } from 'expo-router';
const { jobId } = useLocalSearchParams();
```

### 2.3 React Native Components

```typescript
// 1. VIEW - Container (như <div> trong HTML)
<View style={{ padding: 10, backgroundColor: 'white' }}>
  <Text>Content</Text>
</View>

// 2. TEXT - Hiển thị text
<Text style={{ fontSize: 16, color: 'black' }}>Hello</Text>

// 3. BUTTON - Nút bấm
<Button title="Click me" onPress={() => console.log('Clicked')} />
// 4. TEXTINPUT - Nhập liệu
<TextInput
  value={email}
  onChangeText={setEmail}
  placeholder="Enter email"
/>

// 5. FLATLIST - Danh sách (hiệu năng cao)
<FlatList
  data={jobs}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <JobCard job={item} />}
/>

// 6. TOUCHABLEOPACITY - Vùng bấm có hiệu ứng
<TouchableOpacity onPress={() => router.push('/detail')}>
  <View>
    <Text>View Details</Text>
  </View>
</TouchableOpacity>

// 7. IMAGE - Hiển thị ảnh
<Image
  source={{ uri: 'https://example.com/logo.png' }}
  style={{ width: 100, height: 100 }}
/>
```

---

## 3. Kiến trúc dự án

### 3.1 Cấu trúc Folder & Vai trò

```
JobApplication/
├── app/                    # 📱 FRONTEND - React Native
│   ├── (auth)/            # Màn hình đăng nhập, đăng ký
│   ├── (candidate)/       # Màn hình của ứng viên
│   ├── (employer)/        # Màn hình của nhà tuyển dụng
│   ├── (admin)/           # Màn hình của admin
│   └── _layout.tsx        # Layout chung
│
├── src/                   # 📦 LOGIC & UTILITIES
│   ├── components/        # Component tái sử dụng
│   ├── hooks/             # Custom hooks
│   ├── services/          # Gọi API
│   ├── contexts/          # Global state (Context API)
│   ├── types/             # TypeScript types
│   ├── utils/             # Hàm tiện ích
│   └── constants/         # Hằng số
│
├── server/                # 🖥️ BACKEND - Node.js + Express
│   ├── src/
│   │   ├── routes/        # API endpoints
│   │   ├── controllers/   # Xử lý logic API
│   │   ├── services/      # Business logic
│   │   ├── middleware/    # Auth, validation, error handling
│   │   ├── crawlers/      # Web crawler
│   │   └── config/        # Firebase, Algolia config
│   └── data/              # Dữ liệu crawl
│
└── types/                 # TypeScript types chung
```

### 3.2 Luồng hoạt động của 1 feature (Ví dụ: Xem danh sách job)

```
1. USER MỞ APP
   ↓
2. app/(candidate)/index.tsx (SCREEN)
   - Component hiển thị UI
   - Gọi custom hook để lấy data
   
3. src/hooks/useCandidateHome.ts (HOOK)
   - Quản lý state (loading, jobs, error)
   - Gọi service để fetch data
   
4. src/services/jobApi.service.ts (SERVICE)
   - Gọi API backend
   - Xử lý response/error
   
5. server/src/routes/job.routes.ts (ROUTE)
   - Định nghĩa endpoint: GET /api/jobs
   
6. server/src/controllers/job.controller.ts (CONTROLLER)
   - Nhận request
   - Gọi service xử lý
   
7. server/src/services/job.service.ts (SERVICE)
   - Lấy data từ Firebase
   - Trả về cho controller
   
8. Firebase Firestore (DATABASE)
   - Lưu trữ data jobs
   
9. RESPONSE → SERVICE → HOOK → COMPONENT → UI
```

### 3.3 Chi tiết từng folder

#### 📱 `app/` - Screens (Màn hình)

```typescript
// app/(candidate)/index.tsx
import { useCandidateHome } from '@/hooks/useCandidateHome';
import { JobCard } from '@/components/candidate/HomeComponents';

export default function CandidateHome() {
  // 1. Lấy data từ hook
  const { jobs, loading, error } = useCandidateHome();
  
  // 2. Hiển thị UI
  if (loading) return <LoadingSpinner />;
  if (error) return <Text>Error: {error}</Text>;
  
  return (
    <View>
      <FlatList
        data={jobs}
        renderItem={({ item }) => <JobCard job={item} />}
      />
    </View>
  );
}
```

**QUY TẮC:**
- Screen chỉ lo hiển thị UI
- Logic phức tạp → Hook
- Fetch data → Service

#### 🧩 `src/components/` - Component tái sử dụng

```typescript
// src/components/candidate/HomeComponents.tsx
interface JobCardProps {
  job: Job;
}

export const JobCard = ({ job }: JobCardProps) => {
  return (
    <TouchableOpacity onPress={() => router.push(`/jobDescription/${job.id}`)}>
      <View>
        <Text>{job.title}</Text>
        <Text>{job.salary}</Text>
      </View>
    </TouchableOpacity>
  );
};
```

**QUY TẮC:**
- Component nhỏ, chỉ làm 1 việc
- Nhận data qua props
- Có thể dùng lại nhiều nơi

#### 🪝 `src/hooks/` - Custom Hooks (Logic tái sử dụng)

```typescript
// src/hooks/useCandidateHome.ts
import { useState, useEffect } from 'react';
import { jobService } from '@/services/jobApi.service';

export const useCandidateHome = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    fetchJobs();
  }, []);
  
  const fetchJobs = async () => {
    try {
      setLoading(true);
      const data = await jobService.getAllJobs();
      setJobs(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return { jobs, loading, error, refetch: fetchJobs };
};
```

**QUY TẮC:**
- Hook = function bắt đầu với `use`
- Chứa logic, state management
- Có thể dùng lại nhiều component

#### 🌐 `src/services/` - API Calls

```typescript
// src/services/jobApi.service.ts
import apiClient from './apiClient';

export const jobService = {
  // Lấy tất cả jobs
  getAllJobs: async (): Promise<Job[]> => {
    const response = await apiClient.get('/jobs');
    return response.data;
  },
  
  // Lấy job theo ID
  getJobById: async (id: string): Promise<Job> => {
    const response = await apiClient.get(`/jobs/${id}`);
    return response.data;
  },
  
  // Tạo job mới
  createJob: async (jobData: CreateJobDto): Promise<Job> => {
    const response = await apiClient.post('/jobs', jobData);
    return response.data;
  }
};
```

**QUY TẮC:**
- Mọi API call đều qua service
- Xử lý error ở đây
- Trả về typed data

#### 📝 `src/types/` - TypeScript Definitions

```typescript
// src/types/index.ts
export interface Job {
  id: string;
  title: string;
  salary: string;
  description: string;
  company: Company;
  jobType: JobType;
  category: JobCategory;
  createdAt: string;
}

export interface Company {
  id: string;
  name: string;
  logo: string;
  description: string;
}

export type JobType = 'full-time' | 'part-time' | 'contract' | 'internship';
```

#### 🛠️ `src/utils/` - Utility Functions

```typescript
// src/utils/salary.utils.ts
export const formatSalary = (salary: string): string => {
  // "1000-2000" → "1,000 - 2,000 USD"
  const [min, max] = salary.split('-');
  return `${parseInt(min).toLocaleString()} - ${parseInt(max).toLocaleString()} USD`;
};

// src/utils/date.utils.ts
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN');
};
```

#### 🔧 `src/constants/` - Hằng số

```typescript
// src/constants/addJob.constants.ts
export const JOB_TYPES = [
  { id: '1', label: 'Full-time', value: 'full-time' },
  { id: '2', label: 'Part-time', value: 'part-time' },
  { id: '3', label: 'Contract', value: 'contract' }
];

export const SALARY_RANGES = [
  '500-1000',
  '1000-2000',
  '2000-3000',
  '3000+'
];
```

---

## 4. Quy trình làm việc

### 4.1 Tạo feature mới (Step-by-step)

**VÍ DỤ: Tạo tính năng "Lưu job yêu thích"**

#### Bước 1: Tạo Type

```typescript
// src/types/index.ts
export interface SavedJob {
  userId: string;
  jobId: string;
  savedAt: string;
}
```

#### Bước 2: Tạo Service (API)

```typescript
// src/services/savedJobApi.service.ts
export const savedJobService = {
  saveJob: async (userId: string, jobId: string): Promise<void> => {
    await apiClient.post('/saved-jobs', { userId, jobId });
  },
  
  getSavedJobs: async (userId: string): Promise<Job[]> => {
    const response = await apiClient.get(`/saved-jobs/${userId}`);
    return response.data;
  },
  
  removeSavedJob: async (userId: string, jobId: string): Promise<void> => {
    await apiClient.delete(`/saved-jobs/${userId}/${jobId}`);
  }
};
```

#### Bước 3: Tạo Hook

```typescript
// src/hooks/useSavedJobs.ts
export const useSavedJobs = (userId: string) => {
  const [savedJobs, setSavedJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  
  const fetchSavedJobs = async () => {
    setLoading(true);
    const jobs = await savedJobService.getSavedJobs(userId);
    setSavedJobs(jobs);
    setLoading(false);
  };
  
  const saveJob = async (jobId: string) => {
    await savedJobService.saveJob(userId, jobId);
    await fetchSavedJobs(); // Refresh
  };
  
  const removeJob = async (jobId: string) => {
    await savedJobService.removeSavedJob(userId, jobId);
    await fetchSavedJobs();
  };
  
  useEffect(() => {
    fetchSavedJobs();
  }, [userId]);
  
  return { savedJobs, loading, saveJob, removeJob };
};
```

#### Bước 4: Tạo Component

```typescript
// src/components/SaveJobButton.tsx
interface SaveJobButtonProps {
  jobId: string;
  isSaved: boolean;
  onSave: () => void;
  onRemove: () => void;
}

export const SaveJobButton = ({ jobId, isSaved, onSave, onRemove }: SaveJobButtonProps) => {
  return (
    <TouchableOpacity onPress={isSaved ? onRemove : onSave}>
      <Icon name={isSaved ? 'heart' : 'heart-outline'} />
    </TouchableOpacity>
  );
};
```

#### Bước 5: Sử dụng trong Screen

```typescript
// app/(candidate)/savedJobs.tsx
export default function SavedJobsScreen() {
  const { user } = useAuth();
  const { savedJobs, loading, removeJob } = useSavedJobs(user.id);
  
  return (
    <View>
      <FlatList
        data={savedJobs}
        renderItem={({ item }) => (
          <JobCard
            job={item}
            actions={
              <SaveJobButton
                jobId={item.id}
                isSaved={true}
                onRemove={() => removeJob(item.id)}
              />
            }
          />
        )}
      />
    </View>
  );
}
```

### 4.2 Debug workflow

```
1. LỖI Ở ĐÂU?
   - UI không hiển thị → Check Component
   - Data không có → Check Hook/Service
   - API lỗi → Check Backend

2. CHECK THEO THỨ TỰ:
   Console.log ở từng layer:
   
   Screen:
   console.log('Screen - jobs:', jobs);
   
   Hook:
   console.log('Hook - fetchJobs called');
   console.log('Hook - response:', data);
   
   Service:
   console.log('Service - API call:', endpoint);
   console.log('Service - response:', response);

3. TOOLS:
   - React DevTools: Xem props, state
   - Network tab: Xem API calls
   - Console: Xem logs
```

---

## 5. Backend & API

### 5.1 Cấu trúc Backend

```
server/src/
├── index.ts              # Entry point, khởi động server
├── routes/               # Định nghĩa endpoints
│   └── job.routes.ts
├── controllers/          # Xử lý request/response
│   └── job.controller.ts
├── services/             # Business logic
│   └── job.service.ts
├── middleware/           # Auth, validation
│   ├── auth.middleware.ts
│   └── validate.ts
└── config/               # Firebase, database config
    └── firebase.ts
```

### 5.2 Request Flow

```
CLIENT → ROUTE → MIDDLEWARE → CONTROLLER → SERVICE → DATABASE
```

**Chi tiết:**

```typescript
// 1. ROUTE - Định nghĩa endpoint
// server/src/routes/job.routes.ts
import { Router } from 'express';
import { jobController } from '../controllers/job.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.get('/jobs', jobController.getAllJobs);
router.get('/jobs/:id', jobController.getJobById);

// Protected routes (cần đăng nhập)
router.post('/jobs', authMiddleware, jobController.createJob);
router.put('/jobs/:id', authMiddleware, jobController.updateJob);
router.delete('/jobs/:id', authMiddleware, jobController.deleteJob);

export default router;

// 2. CONTROLLER - Xử lý request/response
// server/src/controllers/job.controller.ts
import { Request, Response } from 'express';
import { jobService } from '../services/job.service';

export const jobController = {
  getAllJobs: async (req: Request, res: Response) => {
    try {
      const jobs = await jobService.getAllJobs();
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  
  getJobById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const job = await jobService.getJobById(id);
      
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }
      
      res.json(job);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  
  createJob: async (req: Request, res: Response) => {
    try {
      const jobData = req.body;
      const newJob = await jobService.createJob(jobData);
      res.status(201).json(newJob);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

// 3. SERVICE - Business logic
// server/src/services/job.service.ts
import { db } from '../config/firebase';

export const jobService = {
  getAllJobs: async () => {
    const snapshot = await db.collection('jobs').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  
  getJobById: async (id: string) => {
    const doc = await db.collection('jobs').doc(id).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  },
  
  createJob: async (jobData: any) => {
    const docRef = await db.collection('jobs').add({
      ...jobData,
      createdAt: new Date().toISOString()
    });
    return { id: docRef.id, ...jobData };
  }
};

// 4. MIDDLEWARE - Auth, validation
// server/src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken; // Gắn user vào request
    next(); // Tiếp tục sang controller
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

### 5.3 API Endpoints trong dự án

```
AUTH:
POST   /api/auth/register        - Đăng ký
POST   /api/auth/login           - Đăng nhập
GET    /api/auth/me              - Lấy thông tin user hiện tại

JOBS:
GET    /api/jobs                 - Lấy tất cả jobs
GET    /api/jobs/:id             - Lấy job theo ID
POST   /api/jobs                 - Tạo job mới (employer)
PUT    /api/jobs/:id             - Cập nhật job (employer)
DELETE /api/jobs/:id             - Xóa job (employer)
GET    /api/jobs/search?q=       - Tìm kiếm job

APPLICATIONS:
POST   /api/applications         - Ứng tuyển job
GET    /api/applications/user/:userId  - Lấy đơn ứng tuyển của user
GET    /api/applications/job/:jobId    - Lấy ứng viên của job
PUT    /api/applications/:id     - Cập nhật trạng thái đơn

COMPANIES:
GET    /api/companies            - Lấy tất cả công ty
GET    /api/companies/:id        - Lấy công ty theo ID

CATEGORIES:
GET    /api/categories           - Lấy tất cả danh mục job
```

---

## 6. Web Crawler

### 6.1 Crawler là gì?

**CRAWLER = BOT TỰ ĐỘNG THU THẬP DỮ LIỆU TỪ WEBSITE**

Ví dụ: Lấy 1000 job từ viecoi.vn về database của mình

### 6.2 Quy trình Crawler

```
1. FETCH HTML
   Tải nội dung trang web
   
2. PARSE HTML
   Phân tích cấu trúc HTML, tìm dữ liệu
   
3. EXTRACT DATA
   Lấy ra thông tin cần thiết (title, salary, ...)
   
4. NORMALIZE
   Chuẩn hóa dữ liệu (format, validate)
   
5. SAVE TO DATABASE
   Lưu vào Firebase
```

### 6.3 Code Crawler (Đơn giản hóa)

```typescript
// server/src/crawlers/viecoi/job-crawler.ts

import axios from 'axios';
import * as cheerio from 'cheerio';

// 1. FETCH HTML từ URL
async function fetchJobPage(url: string) {
  const response = await axios.get(url);
  return response.data; // HTML string
}

// 2. PARSE HTML & EXTRACT DATA
function extractJobData(html: string) {
  // Cheerio = jQuery cho Node.js
  const $ = cheerio.load(html);
  
  // Tìm element bằng CSS selector
  const title = $('.job-title').text().trim();
  const salary = $('.job-salary').text().trim();
  const company = $('.company-name').text().trim();
  const description = $('.job-description').text().trim();
  
  return {
    title,
    salary,
    company,
    description
  };
}

// 3. CRAWL NHIỀU JOBS
async function crawlJobs(urls: string[]) {
  const jobs = [];
  
  for (const url of urls) {
    try {
      // Fetch HTML
      const html = await fetchJobPage(url);
      
      // Extract data
      const jobData = extractJobData(html);
      
      jobs.push({
        ...jobData,
        external_url: url,
        source: 'viecoi',
        crawled_at: new Date().toISOString()
      });
      
      // Delay để không spam server
      await delay(1000); // 1 giây
      
    } catch (error) {
      console.error(`Failed to crawl ${url}:`, error);
    }
  }
  
  return jobs;
}

// 4. NORMALIZE DATA
function normalizeJob(rawJob: any) {
  return {
    title: rawJob.title,
    salary: parseSalary(rawJob.salary), // "1000-2000 USD"
    description: rawJob.description,
    company: {
      name: rawJob.company
    },
    job_type: mapJobType(rawJob.type), // "full-time" → chuẩn hóa
    source: 'viecoi',
    external_url: rawJob.external_url
  };
}

// Parse salary từ text
function parseSalary(salaryText: string): string {
  // "1,000 - 2,000 USD" → "1000-2000"
  const numbers = salaryText.match(/\d+/g);
  if (numbers && numbers.length >= 2) {
    return `${numbers[0]}-${numbers[1]}`;
  }
  return 'Negotiable';
}

// 5. SAVE TO FIRESTORE
async function saveJobs(jobs: any[]) {
  const db = admin.firestore();
  
  for (const job of jobs) {
    // Kiểm tra trùng lặp
    const existing = await db.collection('jobs')
      .where('external_url', '==', job.external_url)
      .get();
    
    if (existing.empty) {
      // Chưa có → Thêm mới
      await db.collection('jobs').add(job);
    } else {
      // Đã có → Update
      const docId = existing.docs[0].id;
      await db.collection('jobs').doc(docId).update(job);
    }
  }
}

// MAIN FUNCTION
async function main() {
  // 1. Lấy danh sách URLs
  const urls = await fetchJobUrls(); // Từ sitemap
  
  // 2. Crawl 50 jobs
  const rawJobs = await crawlJobs(urls.slice(0, 50));
  
  // 3. Normalize
  const normalizedJobs = rawJobs.map(normalizeJob);
  
  // 4. Save to Firestore
  await saveJobs(normalizedJobs);
  
  console.log(`✅ Crawled ${normalizedJobs.length} jobs`);
}

main();
```

### 6.4 Cấu trúc Crawler trong dự án

```
server/src/crawlers/viecoi/
├── fetch-job-urls.ts      # Lấy danh sách URLs từ sitemap
├── job-crawler.ts         # Crawl từng job
├── normalizer.ts          # Chuẩn hóa dữ liệu
├── normalize-runner.ts    # Chạy normalize hàng loạt
├── upsert-jobs.ts         # Lưu/update vào Firestore
├── test-firestore.ts      # Kiểm tra data trong Firestore
└── sync-algolia.ts        # Đồng bộ với Algolia (search)
```

### 6.5 Chạy Crawler

```bash
# 1. Lấy danh sách URLs
npm run crawl:viecoi-sitemap

# 2. Crawl 50 jobs
npm run crawl:viecoi-jobs -- --limit 50

# 3. Normalize data
npm run normalize:viecoi

# 4. Upsert vào Firestore
npm run upsert:viecoi-jobs

# 5. Test data
npx ts-node src/crawlers/viecoi/test-firestore.ts
```

---

## 7. Firebase & Database

### 7.1 Firebase là gì?

**FIREBASE = BACKEND AS A SERVICE (BaaS)**

Thay vì tự code database, authentication, storage → Firebase lo hết.

**Dịch vụ sử dụng:**
- **Firestore**: Database NoSQL (lưu jobs, users, applications)
- **Authentication**: Đăng nhập, đăng ký
- **Storage**: Lưu file (CV, logo công ty)

### 7.2 Firestore Structure

```
Firestore (NoSQL Database)
├── jobs (collection)
│   ├── job1 (document)
│   │   ├── id: "abc123"
│   │   ├── title: "Software Developer"
│   │   ├── salary: "1000-2000"
│   │   ├── company: { name: "ABC Corp", logo: "..." }
│   │   └── created_at: "2024-01-01"
│   ├── job2 (document)
│   └── ...
│
├── users (collection)
│   ├── user1 (document)
│   │   ├── id: "user123"
│   │   ├── name: "John Doe"
│   │   ├── email: "john@example.com"
│   │   └── role: "candidate"
│   └── ...
│
├── applications (collection)
│   ├── app1 (document)
│   │   ├── userId: "user123"
│   │   ├── jobId: "abc123"
│   │   ├── status: "pending"
│   │   └── appliedAt: "2024-01-01"
│   └── ...
│
└── companies (collection)
    └── ...
```

### 7.3 Firestore Operations

```typescript
import { db } from '../config/firebase';

// 1. LẤY TẤT CẢ DOCUMENTS
const getJobs = async () => {
  const snapshot = await db.collection('jobs').get();
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

// 2. LẤY 1 DOCUMENT THEO ID
const getJobById = async (id: string) => {
  const doc = await db.collection('jobs').doc(id).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
};

// 3. THÊM DOCUMENT MỚI
const createJob = async (jobData: any) => {
  const docRef = await db.collection('jobs').add(jobData);
  return docRef.id;
};

// 4. CẬP NHẬT DOCUMENT
const updateJob = async (id: string, updates: any) => {
  await db.collection('jobs').doc(id).update(updates);
};

// 5. XÓA DOCUMENT
const deleteJob = async (id: string) => {
  await db.collection('jobs').doc(id).delete();
};

// 6. QUERY (Lọc dữ liệu)
const searchJobs = async (keyword: string) => {
  const snapshot = await db.collection('jobs')
    .where('title', '>=', keyword)
    .where('title', '<=', keyword + '\uf8ff')
    .get();
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// 7. PAGINATION (Phân trang)
const getJobsPaginated = async (pageSize: number, lastDoc?: any) => {
  let query = db.collection('jobs')
    .orderBy('created_at', 'desc')
    .limit(pageSize);
  
  if (lastDoc) {
    query = query.startAfter(lastDoc);
  }
  
  const snapshot = await query.get();
  return {
    jobs: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
    lastDoc: snapshot.docs[snapshot.docs.length - 1]
  };
};
```

### 7.4 Firebase Authentication

```typescript
import { auth } from '../config/firebase';

// 1. ĐĂNG KÝ
const register = async (email: string, password: string) => {
  const userCredential = await auth.createUserWithEmailAndPassword(email, password);
  return userCredential.user;
};

// 2. ĐĂNG NHẬP
const login = async (email: string, password: string) => {
  const userCredential = await auth.signInWithEmailAndPassword(email, password);
  return userCredential.user;
};

// 3. ĐĂNG XUẤT
const logout = async () => {
  await auth.signOut();
};

// 4. LẤY USER HIỆN TẠI
const getCurrentUser = () => {
  return auth.currentUser;
};

// 5. LẮNG NGHE TRẠNG THÁI ĐĂNG NHẬP
auth.onAuthStateChanged((user) => {
  if (user) {
    console.log('User logged in:', user.uid);
  } else {
    console.log('User logged out');
  }
});
```

---

## 8. Debugging & Testing

### 8.1 Debug Checklist

```
❌ LỖI: UI không hiển thị
✅ CHECK:
   1. Data có đúng không? → console.log(data)
   2. Component nhận props đúng? → console.log(props)
   3. Conditional rendering? → if (loading) return <Loading />

❌ LỖI: API không trả data
✅ CHECK:
   1. URL đúng không? → console.log('API URL:', url)
   2. Headers đúng? → console.log('Headers:', headers)
   3. Backend chạy chưa? → Check terminal server
   4. Network tab → Xem request/response

❌ LỖI: State không update
✅ CHECK:
   1. Gọi setState đúng? → setJobs([...jobs, newJob])
   2. useEffect dependencies? → useEffect(() => {}, [jobs])
   3. Async issue? → await fetchData()
```

### 8.2 Console.log Strategies

```typescript
// 1. LOG INPUT/OUTPUT
const fetchJobs = async () => {
  console.log('🔵 fetchJobs called');
  
  const response = await api.get('/jobs');
  console.log('✅ Response:', response.data);
  
  return response.data;
};

// 2. LOG STATE CHANGES
useEffect(() => {
  console.log('📊 Jobs updated:', jobs);
}, [jobs]);

// 3. LOG ERRORS
try {
  await fetchJobs();
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}

// 4. LOG RENDER
console.log('🎨 Component rendered');
```

### 8.3 Common Errors & Solutions

```typescript
// ERROR: Cannot read property 'X' of undefined
// SOLUTION: Check if object exists
const title = job?.title || 'No title';

// ERROR: Map is not a function
// SOLUTION: Check if data is array
const jobs = Array.isArray(data) ? data : [];

// ERROR: Infinite loop in useEffect
// SOLUTION: Add dependencies
useEffect(() => {
  fetchJobs();
}, []); // ← Add this!

// ERROR: State not updating
// SOLUTION: Use functional update
setCount(prev => prev + 1); // ✅ Correct
setCount(count + 1);        // ❌ Might be stale
```

---

## 📝 Tóm tắt - Kiến thức quan trọng nhất

### ✅ JavaScript/TypeScript
- Arrow functions, async/await
- Array methods: map, filter, find
- Destructuring, spread operator
- Interface, Type

### ✅ React Native
- Component, Props, State
- useState, useEffect
- Expo Router navigation
- FlatList, TouchableOpacity

### ✅ Kiến trúc
```
Screen → Hook → Service → API → Database
```

### ✅ Quy trình tạo feature
1. Tạo Type
2. Tạo Service (API call)
3. Tạo Hook (logic + state)
4. Tạo Component (UI)
5. Sử dụng trong Screen

### ✅ Backend
```
Route → Middleware → Controller → Service → Firestore
```

### ✅ Crawler
```
Fetch → Parse → Extract → Normalize → Save
```

### ✅ Debug
1. Console.log từng layer
2. Check Network tab
3. Kiểm tra props, state
4. Verify API response

---

## 🎓 Học tiếp

### Thứ tự học (Ưu tiên)

1. **JavaScript ES6+** (1-2 ngày)
   - MDN Web Docs
   - javascript.info

2. **TypeScript Basics** (1 ngày)
   - typescriptlang.org/docs

3. **React Fundamentals** (3-5 ngày)
   - react.dev/learn
   - Focus: Components, Props, State, Hooks

4. **React Native** (2-3 ngày)
   - reactnative.dev
   - Expo docs

5. **Practice trong dự án** (Hàng ngày)
   - Đọc code từ simple → complex
   - Sửa bug, thêm feature nhỏ
   - Console.log để hiểu flow

### Lời khuyên

1. **Đừng học hết rồi mới code** → Học + Code đan xen
2. **Copy code → Hiểu code → Sửa code → Viết code mới**
3. **Gặp lỗi → Google → Thử → Học**
4. **Mỗi ngày 1 concept nhỏ, đừng học quá nhiều**

---

**🎯 MỤC TIÊU: Sau 1-2 tuần, bạn có thể tự tạo 1 feature đơn giản từ đầu đến cuối!**
