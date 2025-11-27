import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '@/config/firebase';
import { AppRole } from '@/types';
import { mapAuthError } from '@/utils/validation/auth';
import { useRole } from './RoleContext';
import { authApiService } from '@/services/authApi.service';

type AuthContextType = {
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: (idToken: string) => Promise<void>;
  signUp: (
    name: string,
    phone: string,
    email: string,
    password: string,
    role: AppRole
  ) => Promise<void>;
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
   * Sign In with improved error handling
   */
  const signIn = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      setError(null);

      try {
        // Step 1: Firebase login
        const userCredential = await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

        // Step 2: Verify with backend (with graceful fallback)
        try {
          const roleData = await authApiService.getCurrentRole();

          if (roleData.role) {
            // Step 3: Cache role
            await AsyncStorage.setItem('userRole', roleData.role);
          }
          
          await refreshRole();
        } catch (apiError: any) {
          // Network error - still allow login, role will be fetched later
          if (apiError?.code === 'NETWORK_ERROR' || apiError?.code === 'ERR_NETWORK' || !apiError?.response) {
            console.warn('⚠️ Backend verification skipped (network issue), proceeding with login');
            // Don't rollback - user is authenticated with Firebase
            await refreshRole();
            return;
          }
          
          console.error('❌ Backend verification failed:', apiError);

          // Only rollback for non-network errors
          if (apiError.response?.status === 401 || apiError.response?.status === 404) {
            await firebaseSignOut(auth);
            await AsyncStorage.removeItem('userRole');
            throw new Error('session-expired');
          }
          
          // For other errors, still allow login
          console.warn('⚠️ Backend error, but proceeding with login');
          await refreshRole();
        }
      } catch (err: any) {
        // ✅ Extract error code từ Firebase Auth error
        // Firebase v9+ error structure: { code: 'auth/...', message: '...' }
        const errorCode = err?.code || '';
        let errorMessage = '';
        
        // ✅ Handle custom errors (từ backend API)
        if (err?.message === 'deleted-user') {
          errorMessage = 'Tài khoản của bạn đã bị xóa. Liên hệ admin để biết thêm chi tiết.';
        } else if (err?.message === 'session-expired') {
          errorMessage = 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.';
        } else if (errorCode) {
          // ✅ Use mapAuthError for Firebase Auth errors (có error code)
          errorMessage = mapAuthError(errorCode);
        } else {
          // ✅ Fallback: dùng error message nếu không có code
          errorMessage = err?.message || 'Đã xảy ra lỗi. Vui lòng thử lại';
        }
        
        // ✅ Set error state để hiển thị trên UI
        setError(errorMessage);
        
        // ✅ Log error một lần với format đơn giản (tránh log nhiều lần)
        // User errors (invalid-credential, wrong-password) dùng warn level
        const isUserError = errorCode?.includes('invalid-credential') || 
                           errorCode?.includes('wrong-password') || 
                           errorCode?.includes('user-not-found');
        
        if (isUserError) {
          // User error: chỉ log nhẹ nhàng, không throw
          console.warn(`⚠️ Sign in failed: ${errorMessage} (${errorCode})`);
        } else {
          // System error: log đầy đủ để debug
          console.error(`❌ Sign in error [${errorCode}]:`, errorMessage);
        }
        
        // ✅ Không throw error lại - error đã được handle và hiển thị trên UI
        // Chỉ throw cho các lỗi nghiêm trọng cần propagate (nếu có)
      } finally {
        setLoading(false);
      }
    },
    [refreshRole]
  );

  /**
   * Sign Up with atomic transaction
   */
  const signUp = useCallback(
    async (
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
        // Step 1: Create Firebase account
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );
        userCreated = true;

        // Step 2: Update display name
        await updateProfile(userCredential.user, {
          displayName: name.trim(),
        });

        // Step 3: Sync with backend
        try {
          await authApiService.syncUser({
            uid: userCredential.user.uid,
            email: userCredential.user.email!,
            name: name.trim(),
            phone: phone.trim(),
            role,
          });

          // Step 4: Refresh role
          await refreshRole();
        } catch (apiError: any) {
          console.error('❌ Backend sync failed:', apiError);

          // Rollback: Delete Firebase user
          try {
            await auth.currentUser?.delete();
            console.log('🧹 Cleaned up incomplete user account');
          } catch (deleteErr) {
            console.warn('⚠️ Failed to delete incomplete user:', deleteErr);
          }

          throw new Error('Backend sync failed. Account creation rolled back.');
        }
      } catch (err: any) {
        // ✅ Cleanup on error
        if (userCreated && auth.currentUser) {
          try {
            await auth.currentUser.delete();
            console.log('🧹 Cleaned up incomplete user account');
          } catch (deleteErr) {
            console.warn('⚠️ Failed to delete incomplete user:', deleteErr);
          }
        }

        // ✅ Extract và set error message
        const errorCode = err?.code || '';
        let errorMessage = '';
        
        if (err?.message?.includes('Backend sync failed')) {
          errorMessage = 'Không thể đồng bộ dữ liệu. Vui lòng thử lại.';
        } else if (errorCode) {
          errorMessage = mapAuthError(errorCode);
        } else {
          errorMessage = err?.message || 'Đã xảy ra lỗi. Vui lòng thử lại';
        }
        
        setError(errorMessage);
        
        // ✅ Log error một lần với format đơn giản
        const isUserError = errorCode?.includes('email-already-in-use') || 
                           errorCode?.includes('weak-password');
        
        if (isUserError) {
          console.warn(`⚠️ Sign up failed: ${errorMessage} (${errorCode})`);
        } else {
          console.error(`❌ Sign up error [${errorCode}]:`, errorMessage);
        }
        
        // ✅ Không throw error lại - error đã được handle và hiển thị trên UI
      } finally {
        setLoading(false);
      }
    },
    [refreshRole]
  );

  /**
   * Sign In with Google
   */
  const signInWithGoogle = useCallback(
    async (idToken: string) => {
      setLoading(true);
      setError(null);

      try {
        // Step 1: Create Google credential
        const credential = GoogleAuthProvider.credential(idToken);
        
        // Step 2: Sign in with Firebase
        const userCredential = await signInWithCredential(auth, credential);

        // Step 3: Verify with backend
        try {
          const roleData = await authApiService.getCurrentRole();

          if (!roleData.role) {
            // Người dùng mới - sync với backend
            await authApiService.syncUser({
              uid: userCredential.user.uid,
              email: userCredential.user.email!,
              name: userCredential.user.displayName || 'User',
              phone: '',
              role: 'candidate', // Mặc định là candidate
            });
            await AsyncStorage.setItem('userRole', 'candidate');
          } else {
            await AsyncStorage.setItem('userRole', roleData.role);
          }

          await refreshRole();
        } catch (apiError: any) {
          console.error('❌ Backend verification failed:', apiError);

          // Rollback authentication
          await firebaseSignOut(auth);
          await AsyncStorage.removeItem('userRole');

          throw new Error('Không thể đồng bộ dữ liệu. Vui lòng thử lại.');
        }
      } catch (err: any) {
        const errorMessage = err?.message || 'Đăng nhập Google thất bại. Vui lòng thử lại.';
        setError(errorMessage);
        console.error('❌ Google sign in error:', errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [refreshRole]
  );

  /**
   * Sign Out
   */
  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await AsyncStorage.removeItem('userRole');
      await firebaseSignOut(auth);
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
    <AuthContext.Provider
      value={{
        loading,
        error,
        signIn,
        signInWithGoogle,
        signUp,
        signOut,
        clearError,
      }}
    >
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