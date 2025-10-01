// src/features/auth/authSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  createUserWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/config/firebase';

interface AuthState {
  user: User | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  status: 'idle',
  error: null,
};

// Save or update user in Firestore
const saveUserToFirestore = async (user: User) => {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  const data = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName ?? null,
    photoURL: user.photoURL ?? null,
    provider: user.providerData[0]?.providerId === 'google.com' ? 'google' : 'password',
    updatedAt: serverTimestamp(),
  };

  if (snap.exists()) {
    await updateDoc(ref, data);
  } else {
    await setDoc(ref, { ...data, createdAt: serverTimestamp() });
  }
};

export const signUpEmail = createAsyncThunk(
  'auth/signUpEmail',
  async ({ email, password }: { email: string; password: string }, thunkAPI) => {
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      await saveUserToFirestore(userCred.user);
      return userCred.user;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

export const signInEmail = createAsyncThunk(
  'auth/signInEmail',
  async ({ email, password }: { email: string; password: string }, thunkAPI) => {
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      await saveUserToFirestore(userCred.user);
      return userCred.user;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

export const signInWithGoogle = createAsyncThunk('auth/signInWithGoogle', async (_, thunkAPI) => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await saveUserToFirestore(result.user);
    return result.user;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error.message);
  }
});

export const signOut = createAsyncThunk('auth/signOut', async () => {
  await fbSignOut(auth);
});

export const listenAuthState = createAsyncThunk('auth/listenAuthState', async (_, thunkAPI) => {
  return new Promise<User | null>((resolve) => {
    onAuthStateChanged(auth, (user) => {
      resolve(user ?? null);
    });
  });
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(signUpEmail.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(signUpEmail.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload;
      })
      .addCase(signUpEmail.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      .addCase(signInEmail.fulfilled, (state, action) => {
        state.user = action.payload;
        state.status = 'succeeded';
      })
      .addCase(signInWithGoogle.fulfilled, (state, action) => {
        state.user = action.payload;
        state.status = 'succeeded';
      })
      .addCase(signOut.fulfilled, (state) => {
        state.user = null;
        state.status = 'idle';
      })
      .addCase(listenAuthState.fulfilled, (state, action) => {
        state.user = action.payload;
        state.status = action.payload ? 'succeeded' : 'idle';
      });
  },
});

export default authSlice.reducer;
