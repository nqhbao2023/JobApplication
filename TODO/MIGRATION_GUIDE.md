# 🛠️ Migration Guide: How to Migrate to API

## Bắt đầu

Tài liệu này hướng dẫn **từng bước cụ thể** để migrate code từ Firestore Client SDK sang REST API.

---

## Step 1: Tạo Server Endpoints (Backend)

### 1.1. Tạo User Controller

```typescript
// server/src/controllers/user.controller.ts
import { Request, Response } from 'express';
import { userService } from '../services/user.service';

export const userController = {
  // Get current user profile
  async getMe(req: Request, res: Response) {
    try {
      const userId = req.user!.uid;
      const user = await userService.getUserById(userId);
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // Update current user profile
  async updateMe(req: Request, res: Response) {
    try {
      const userId = req.user!.uid;
      const updates = req.body;
      const user = await userService.updateUser(userId, updates);
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // Upload avatar
  async uploadAvatar(req: Request, res: Response) {
    try {
      const userId = req.user!.uid;
      const file = req.file; // From multer middleware
      
      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const photoURL = await userService.uploadAvatar(userId, file);
      res.json({ photoURL });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // Admin: Get all users
  async getAllUsers(req: Request, res: Response) {
    try {
      const { role, page = 1, limit = 20, search } = req.query;
      const result = await userService.getAllUsers({
        role: role as string,
        page: Number(page),
        limit: Number(limit),
        search: search as string,
      });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // Admin: Create user
  async createUser(req: Request, res: Response) {
    try {
      const user = await userService.createUser(req.body);
      res.status(201).json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // Admin: Update user
  async updateUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const updates = req.body;
      const user = await userService.updateUser(userId, updates);
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // Admin: Delete user
  async deleteUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      await userService.deleteUser(userId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
};
```

### 1.2. Tạo User Service

```typescript
// server/src/services/user.service.ts
import { firestore, storage, auth } from '../config/firebase';
import { CreateUserPayload, UpdateUserPayload } from '../types/user.types';

export const userService = {
  async getUserById(userId: string) {
    const userDoc = await firestore.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      throw new Error('User not found');
    }

    return {
      uid: userDoc.id,
      ...userDoc.data(),
    };
  },

  async updateUser(userId: string, updates: UpdateUserPayload) {
    const userRef = firestore.collection('users').doc(userId);
    
    await userRef.update({
      ...updates,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });

    return this.getUserById(userId);
  },

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const bucket = storage.bucket();
    const fileName = `avatars/${userId}/${Date.now()}_${file.originalname}`;
    const fileUpload = bucket.file(fileName);

    await fileUpload.save(file.buffer, {
      metadata: {
        contentType: file.mimetype,
      },
    });

    const [url] = await fileUpload.getSignedUrl({
      action: 'read',
      expires: '03-01-2500', // Far future
    });

    // Update user photoURL
    await this.updateUser(userId, { photoURL: url });

    return url;
  },

  async getAllUsers(params: {
    role?: string;
    page: number;
    limit: number;
    search?: string;
  }) {
    let query = firestore.collection('users').orderBy('createdAt', 'desc');

    if (params.role) {
      query = query.where('role', '==', params.role) as any;
    }

    if (params.search) {
      // Simple search by email or displayName
      // For better search, use Algolia/Elasticsearch
    }

    const snapshot = await query.get();
    const users = snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data(),
    }));

    // Pagination
    const start = (params.page - 1) * params.limit;
    const end = start + params.limit;
    const paginatedUsers = users.slice(start, end);

    return {
      users: paginatedUsers,
      total: users.length,
      page: params.page,
      totalPages: Math.ceil(users.length / params.limit),
    };
  },

  async createUser(data: CreateUserPayload) {
    // Create Firebase Auth user
    const userRecord = await auth.createUser({
      email: data.email,
      password: data.password,
      displayName: data.displayName,
    });

    // Create Firestore document
    await firestore.collection('users').doc(userRecord.uid).set({
      email: data.email,
      displayName: data.displayName,
      role: data.role,
      phone: data.phone || null,
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });

    return this.getUserById(userRecord.uid);
  },

  async deleteUser(userId: string) {
    // Delete from Firebase Auth
    await auth.deleteUser(userId);

    // Delete from Firestore
    await firestore.collection('users').doc(userId).delete();
  },
};
```

### 1.3. Tạo Routes

```typescript
// server/src/routes/user.routes.ts
import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Current user routes
router.get('/me', authMiddleware, userController.getMe);
router.put('/me', authMiddleware, userController.updateMe);
router.post('/me/avatar', authMiddleware, upload.single('avatar'), userController.uploadAvatar);

// Admin routes
router.get('/', authMiddleware, adminMiddleware, userController.getAllUsers);
router.post('/', authMiddleware, adminMiddleware, userController.createUser);
router.put('/:userId', authMiddleware, adminMiddleware, userController.updateUser);
router.delete('/:userId', authMiddleware, adminMiddleware, userController.deleteUser);

export default router;
```

### 1.4. Register Routes

```typescript
// server/src/index.ts
import userRoutes from './routes/user.routes';

app.use('/api/users', userRoutes);
```

---

## Step 2: Migrate Client Code (Frontend)

### Example: Migrate Profile Screen

#### Before (Firestore):

```typescript
// app/(shared)/person.tsx
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth, storage } from '@/config/firebase';

const Person = () => {
  const [userData, setUserData] = useState(null);

  // Load user data
  useEffect(() => {
    const loadUser = async () => {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser!.uid));
      setUserData(userDoc.data());
    };
    loadUser();
  }, []);

  // Update profile
  const handleUpdate = async (data) => {
    await updateDoc(doc(db, 'users', auth.currentUser!.uid), data);
  };

  // Upload avatar
  const handleUploadAvatar = async (uri) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const storageRef = ref(storage, `avatars/${auth.currentUser!.uid}.jpg`);
    await uploadBytes(storageRef, blob);
    const url = await getDownloadURL(storageRef);
    
    await updateDoc(doc(db, 'users', auth.currentUser!.uid), { photoURL: url });
  };
};
```

#### After (API):

```typescript
// app/(shared)/person.tsx
import { userApiService } from '@/services';

const Person = () => {
  const [userData, setUserData] = useState(null);

  // Load user data
  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await userApiService.getCurrentUser();
        setUserData(user);
      } catch (error) {
        console.error('Failed to load user:', error);
      }
    };
    loadUser();
  }, []);

  // Update profile
  const handleUpdate = async (data) => {
    try {
      const updatedUser = await userApiService.updateProfile(data);
      setUserData(updatedUser);
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  // Upload avatar
  const handleUploadAvatar = async (uri) => {
    try {
      const { photoURL } = await userApiService.uploadAvatar(uri);
      setUserData(prev => ({ ...prev, photoURL }));
    } catch (error) {
      console.error('Failed to upload avatar:', error);
    }
  };
};
```

---

## Step 3: Testing

### 3.1. Test API Endpoints

```bash
# Test get current user
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/users/me

# Test update profile
curl -X PUT \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"displayName":"New Name"}' \
  http://localhost:3000/api/users/me

# Test upload avatar
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -F "avatar=@avatar.jpg" \
  http://localhost:3000/api/users/me/avatar
```

### 3.2. Test in App

1. Login to app
2. Go to profile screen
3. Update profile fields
4. Upload new avatar
5. Check if changes persist after reload

---

## Step 4: Rollback Plan

### If Issues Found:

```typescript
// Create feature flag
const USE_API = false; // Set to false to rollback

const loadUser = async () => {
  if (USE_API) {
    return await userApiService.getCurrentUser();
  } else {
    const userDoc = await getDoc(doc(db, 'users', userId));
    return userDoc.data();
  }
};
```

---

## Next Steps

1. ✅ Tạo User API Service (DONE)
2. ⏳ Tạo Server Endpoints (TODO)
3. ⏳ Migrate AuthContext (TODO)
4. ⏳ Migrate RoleContext (TODO)
5. ⏳ Migrate Profile Screen (TODO)

