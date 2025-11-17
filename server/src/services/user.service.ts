import { db as firestore, storage, auth as adminAuth } from '../config/firebase';
import admin from 'firebase-admin';

export interface UpdateUserPayload {
  displayName?: string;
  phone?: string;
  skills?: string[];
  bio?: string;
  photoURL?: string;
}

export const userService = {
  /**
   * Get user by ID
   */
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

  /**
   * Update user profile
   */
  async updateUser(userId: string, updates: UpdateUserPayload) {
    const userRef = firestore.collection('users').doc(userId);
    
    await userRef.update({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return this.getUserById(userId);
  },

  /**
   * Upload user avatar
   */
  async uploadAvatar(userId: string, file: any): Promise<string> {
    try {
      console.log('🔄 Starting avatar upload for user:', userId);
      console.log('📁 File info:', { name: file.originalname, size: file.size, type: file.mimetype });
      
      const bucket = storage.bucket();
      console.log('📦 Bucket name:', bucket.name);
      
      const fileName = `avatars/${userId}/avatar.jpg`;
      const fileUpload = bucket.file(fileName);

      console.log('💾 Saving file to storage...');
      await fileUpload.save(file.buffer, {
        metadata: {
          contentType: file.mimetype,
        },
      });

      console.log('🔓 Making file public...');
      // Make file publicly accessible
      await fileUpload.makePublic();

      console.log('🔗 Generating public URL...');
      // Get public URL with token
      const [metadata] = await fileUpload.getMetadata();
      const token = metadata.metadata?.firebaseStorageDownloadTokens || Date.now();
      const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media&token=${token}`;

      console.log('✅ Public URL generated:', publicUrl);

      console.log('📝 Updating user photoURL...');
      // Update user photoURL
      await this.updateUser(userId, { photoURL: publicUrl });

      console.log('✅ Avatar upload complete!');
      return publicUrl;
    } catch (error: any) {
      console.error('❌ Upload avatar error:', error);
      console.error('❌ Error stack:', error.stack);
      throw new Error(`Failed to upload avatar: ${error.message}`);
    }
  },

  /**
   * Get all users (admin only)
   */
  async getAllUsers(params: {
    role?: string;
    page: number;
    limit: number;
    search?: string;
  }) {
    let query: FirebaseFirestore.Query = firestore.collection('users');

    if (params.role) {
      query = query.where('role', '==', params.role);
    }

    // Get all documents
    const snapshot = await query.get();
    
    let users = snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data(),
    }));

    // Client-side search (for simple implementation)
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      users = users.filter((user: any) => 
        user.email?.toLowerCase().includes(searchLower) ||
        user.displayName?.toLowerCase().includes(searchLower)
      );
    }

    // Sort by createdAt desc
    users.sort((a: any, b: any) => {
      const aTime = a.createdAt?.toDate?.() || new Date(0);
      const bTime = b.createdAt?.toDate?.() || new Date(0);
      return bTime.getTime() - aTime.getTime();
    });

    // Pagination
    const total = users.length;
    const start = (params.page - 1) * params.limit;
    const end = start + params.limit;
    const paginatedUsers = users.slice(start, end);

    return {
      users: paginatedUsers,
      total,
      page: params.page,
      totalPages: Math.ceil(total / params.limit),
    };
  },

  /**
   * Create new user (admin only)
   */
  async createUser(data: {
    email: string;
    password: string;
    displayName: string;
    role: 'candidate' | 'employer' | 'admin';
    phone?: string;
  }) {
    // Create Firebase Auth user
    const userRecord = await adminAuth.createUser({
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
      skills: [],
      savedJobIds: [],
      provider: 'password',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return this.getUserById(userRecord.uid);
  },

  /**
   * Delete user (admin only)
   */
  async deleteUser(userId: string) {
    // Delete from Firebase Auth
    await adminAuth.deleteUser(userId);

    // Delete from Firestore
    await firestore.collection('users').doc(userId).delete();
  },
};
