import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithCredential,
  fetchSignInMethodsForEmail,
  linkWithCredential,
  EmailAuthProvider,
  getAdditionalUserInfo,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '@/config/firebase';
import { AppRole } from '@/types';
import { mapAuthError } from '@/utils/validation/auth';
import { useRole } from './RoleContext';
import { authApiService } from '@/services/authApi.service';

type AuthProvider = 'password' | 'google.com' | 'facebook.com';

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
  getLinkedProviders: () => AuthProvider[];
  linkEmailPassword: (email: string, password: string) => Promise<void>;
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
   * Handles multiple scenarios:
   * 1. New Google user → Create new account
   * 2. Existing email/password user → Firebase auto-merges if same email
   * 3. Email exists with different provider → Handle gracefully
   */
  const signInWithGoogle = useCallback(
    async (idToken: string) => {
      setLoading(true);
      setError(null);

      try {
        // Step 1: Create Google credential
        const credential = GoogleAuthProvider.credential(idToken);
        
        // Step 2: Sign in with Firebase
        // Firebase sẽ tự động merge nếu email đã tồn tại với password provider
        const userCredential = await signInWithCredential(auth, credential);
        const user = userCredential.user;
        
        // Step 3: Check providers linked to this account
        const providers = user.providerData.map(p => p.providerId);
        console.log('🔐 Linked providers:', providers);
        
        // Step 4: Check if this is a new Google user or existing user
        const additionalInfo = getAdditionalUserInfo(userCredential);
        const isNewUser = additionalInfo?.isNewUser ?? false;

        // Step 5: Sync with backend
        try {
          const roleData = await authApiService.getCurrentRole();

          if (!roleData.role || isNewUser) {
            // New user or user not in backend yet - sync with backend
            await authApiService.syncUser({
              uid: user.uid,
              email: user.email!,
              name: user.displayName || 'User',
              phone: user.phoneNumber || '',
              photoURL: user.photoURL || undefined,
              role: 'candidate', // Default role
            });
            await AsyncStorage.setItem('userRole', 'candidate');
            console.log('✅ New Google user synced with backend');
          } else {
            // Existing user - just save role
            await AsyncStorage.setItem('userRole', roleData.role);
            console.log('✅ Existing user logged in via Google');
          }

          await refreshRole();
        } catch (apiError: any) {
          // Network error - still allow login
          if (apiError?.code === 'NETWORK_ERROR' || apiError?.code === 'ERR_NETWORK' || !apiError?.response) {
            console.warn('⚠️ Backend sync skipped (network issue), proceeding with login');
            await AsyncStorage.setItem('userRole', 'candidate');
            await refreshRole();
            return;
          }
          
          console.error('❌ Backend verification failed:', apiError);

          // Rollback authentication for critical errors
          await firebaseSignOut(auth);
          await AsyncStorage.removeItem('userRole');

          throw new Error('Không thể đồng bộ dữ liệu. Vui lòng thử lại.');
        }
      } catch (err: any) {
        const errorCode = err?.code || '';
        let errorMessage = '';
        
        // Handle specific Firebase errors
        if (errorCode === 'auth/account-exists-with-different-credential') {
          // Email đã tồn tại với phương thức khác (password)
          errorMessage = 'Email này đã được đăng ký bằng mật khẩu. Vui lòng đăng nhập bằng email/mật khẩu.';
        } else if (errorCode === 'auth/popup-closed-by-user' || errorCode === 'auth/cancelled-popup-request') {
          errorMessage = 'Đăng nhập bị hủy.';
        } else if (errorCode === 'auth/network-request-failed') {
          errorMessage = 'Lỗi kết nối mạng. Vui lòng kiểm tra internet.';
        } else if (err?.message) {
          errorMessage = err.message;
        } else {
          errorMessage = 'Đăng nhập Google thất bại. Vui lòng thử lại.';
        }
        
        setError(errorMessage);
        console.error('❌ Google sign in error:', errorCode || errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [refreshRole]
  );

  /**
   * Get linked auth providers for current user
   */
  const getLinkedProviders = useCallback((): AuthProvider[] => {
    const user = auth.currentUser;
    if (!user) return [];
    
    return user.providerData.map(p => p.providerId as AuthProvider);
  }, []);

  /**
   * Link email/password to existing account (e.g., Google user wants to add password)
   */
  const linkEmailPassword = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      setError(null);

      try {
        const user = auth.currentUser;
        if (!user) {
          throw new Error('Bạn cần đăng nhập trước.');
        }

        // Check if already has password provider
        const hasPassword = user.providerData.some(p => p.providerId === 'password');
        if (hasPassword) {
          throw new Error('Tài khoản đã có mật khẩu.');
        }

        // Create email/password credential and link
        const credential = EmailAuthProvider.credential(email, password);
        await linkWithCredential(user, credential);
        
        console.log('✅ Email/password linked successfully');
      } catch (err: any) {
        const errorCode = err?.code || '';
        let errorMessage = '';
        
        if (errorCode === 'auth/provider-already-linked') {
          errorMessage = 'Tài khoản đã được liên kết với email/mật khẩu.';
        } else if (errorCode === 'auth/email-already-in-use') {
          errorMessage = 'Email này đã được sử dụng bởi tài khoản khác.';
        } else if (errorCode === 'auth/weak-password') {
          errorMessage = 'Mật khẩu quá yếu. Vui lòng chọn mật khẩu mạnh hơn.';
        } else if (err?.message) {
          errorMessage = err.message;
        } else {
          errorMessage = 'Không thể liên kết tài khoản. Vui lòng thử lại.';
        }
        
        setError(errorMessage);
        console.error('❌ Link email/password error:', errorCode || errorMessage);
      } finally {
        setLoading(false);
      }
    },
    []
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
        getLinkedProviders,
        linkEmailPassword,
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