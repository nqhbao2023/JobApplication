// src/config/firebase.ts
import { initializeApp, getApps } from "firebase/app";
import {
  initializeAuth,
  getAuth,
  GoogleAuthProvider,
  type Auth,
  // @ts-ignore
  getReactNativePersistence,
} from "firebase/auth";
import {
  initializeFirestore,
  getFirestore,
  memoryLocalCache,
  type Firestore,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ⚙️ Cấu hình Firebase — chú ý dòng storageBucket
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,

  // ✅ Bucket thật của anh là .firebasestorage.app (không phải appspot.com)
  storageBucket: "job4s-app.firebasestorage.app",

  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// ✅ Khởi tạo app Firebase (tránh tạo lại nếu đã có)
const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);

// ✅ Auth với persistence React Native (AsyncStorage)
let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

// ✅ Firestore với cấu hình tối ưu cho React Native
let db: Firestore;
try {
  db = initializeFirestore(app, {
    localCache: memoryLocalCache(),
    experimentalForceLongPolling: true,
    experimentalAutoDetectLongPolling: true,
  });
} catch {
  db = getFirestore(app);
}

// ✅ Storage: ép trỏ đúng bucket domain .firebasestorage.app
const storage = getStorage(app, "gs://job4s-app.firebasestorage.app");

// ✅ Log kiểm tra bucket thực tế
console.log(" STORAGE USED =", storage.app.options.storageBucket);

// ✅ Provider Google Auth
const googleProvider = new GoogleAuthProvider();

export { auth, db, storage, googleProvider };
