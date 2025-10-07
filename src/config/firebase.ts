// src/config/firebase.ts
import { initializeApp, getApps } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  GoogleAuthProvider,
  type Auth,
  // @ts-ignore
  getReactNativePersistence,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET, // <-- sẽ là job4s-app.firebasestorage.app
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);

let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

const db = getFirestore(app);

// ✅ BUCKET .firebasestorage.app chuẩn cho Blaze
const bucket = firebaseConfig.storageBucket?.includes('firebasestorage.app')
  ? firebaseConfig.storageBucket
  : `${firebaseConfig.projectId}.firebasestorage.app`;

const storage = getStorage(app, `gs://${bucket}`);

console.log('🔥 STORAGE USED =', `gs://${bucket}`);

const googleProvider = new GoogleAuthProvider();

export { auth, db, storage, googleProvider };
