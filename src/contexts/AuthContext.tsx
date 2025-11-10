import React, { createContext, useContext, useState, useCallback } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  updateProfile 
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '@/config/firebase';
import { AppRole } from '@/types';
import { mapAuthError } from '@/utils/validation/auth';
import { useRole } from './RoleContext';
import { authApiService } from '@/services/authApi.service';

/**
 * 🔐 AuthContext - Quản lý authentication
 * 
 * Luồng hoạt động:
 * 1. Client đăng nhập/đăng ký qua Firebase Auth (client SDK)
 * 2. Sau khi thành công, gọi API backend để sync thông tin user vào Firestore
 * 3. Backend xử lý việc lưu/update user data, normalize role
 * 4. Client lưu token và role vào AsyncStorage để offline-first
 * 
 * Lý do giữ Firebase Auth ở client:
 * - Firebase Auth SDK có sẵn offline persistence tốt
 * - Token refresh tự động
 * - Không cần viết lại authentication flow phức tạp
 */

type AuthContextType = {
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, phone: string, email: string, password: string, role: AppRole) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refresh: refreshRole } = useRole();

  const clearError = useCallback(() => setError(null), []);

  /**
   * 🔓 Đăng nhập
   * Flow: Firebase Auth → Backend API sync → Lưu local cache
   */
  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      // Bước 1: Đăng nhập Firebase
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        email.trim(), 
        password
      );

      // Bước 2: Lấy token để gọi API
      const token = await userCredential.user.getIdToken();

      // Bước 3: Verify với backend và lấy role
      try {
        const roleData = await authApiService.getCurrentRole();
        
        // Bước 4: Kiểm tra user có bị xóa không
        if (!roleData.role) {
          await firebaseSignOut(auth);
          await AsyncStorage.removeItem('userRole');
          throw new Error('deleted-user');
        }

        // Bước 5: Lưu role vào local cache
        await AsyncStorage.setItem('userRole', roleData.role);
        await refreshRole();

      } catch (apiError: any) {
        // Nếu API fail, rollback authentication
        console.error('❌ Backend verification failed:', apiError);
        await firebaseSignOut(auth);
        await AsyncStorage.removeItem('userRole');
        throw apiError;
      }

    } catch (err: any) {
      console.error('❌ Sign in error:', err);
      
      if (err.message === 'deleted-user') {
        setError('Tài khoản của bạn đã bị xóa khỏi hệ thống. Vui lòng liên hệ quản trị viên.');
      } else {
        // Cleanup nếu có lỗi
        if (auth.currentUser) {
          await firebaseSignOut(auth);
          await AsyncStorage.removeItem('userRole');
        }
        setError(mapAuthError(err?.code));
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refreshRole]);

  /**
   * 📝 Đăng ký
   * Flow: Firebase Auth → Update profile → Backend API sync → Lưu local cache
   */
  const signUp = useCallback(async (
    name: string,
    phone: string,
    email: string,
    password: string,
    role: AppRole
  ) => {
    setLoading(true);
    setError(null);
    let userCreated = false;

    try {
      // Bước 1: Tạo account Firebase
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        email.trim(), 
        password
      );
      userCreated = true;

      // Bước 2: Update display name
      await updateProfile(userCredential.user, { 
        displayName: name.trim() 
      });

      // Bước 3: Sync với backend (backend sẽ lưu vào Firestore)
      try {
        await authApiService.syncUser({
          uid: userCredential.user.uid,
          email: userCredential.user.email!,
          name: name.trim(),
          phone: phone.trim(),
          role,
        });

        // Bước 4: Refresh role từ backend
        await refreshRole();

      } catch (apiError: any) {
        console.error('❌ Backend sync failed:', apiError);
        
        // Nếu backend fail, xóa user đã tạo để đảm bảo data consistency
        try {
          await auth.currentUser?.delete();
          console.log('🧹 Cleaned up incomplete user account');
        } catch (deleteErr) {
          console.warn('⚠️ Failed to delete incomplete user:', deleteErr);
        }
        
        throw new Error('Backend sync failed. Account creation rolled back.');
      }

    } catch (err: any) {
      console.error('❌ Sign up error:', err);
      
      // Cleanup nếu user đã tạo nhưng có lỗi
      if (userCreated) {
        try {
          await auth.currentUser?.delete();
          console.log('🧹 Cleaned up incomplete user account');
        } catch (deleteErr) {
          console.warn('⚠️ Failed to delete incomplete user:', deleteErr);
        }
      }

      if (err?.message?.includes('Backend sync failed')) {
        setError('Không thể đồng bộ dữ liệu. Vui lòng thử lại.');
      } else {
        setError(mapAuthError(err?.code));
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refreshRole]);

  /**
   * 🚪 Đăng xuất
   * Flow: Clear local cache → Firebase signOut → Refresh role state
   */
  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      // Bước 1: Clear local cache trước
      await AsyncStorage.removeItem('userRole');
      
      // Bước 2: Đăng xuất Firebase
      await firebaseSignOut(auth);
      
      // Bước 3: Reset role state
      await refreshRole();
      
    } catch (err: any) {
      console.error('❌ Sign out error:', err);
      setError(mapAuthError(err?.code));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refreshRole]);

  return (
    <AuthContext.Provider value={{ 
      loading, 
      error, 
      signIn, 
      signUp, 
      signOut, 
      clearError 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};