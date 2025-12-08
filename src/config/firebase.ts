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
  persistentLocalCache,
  type Firestore,
  enableIndexedDbPersistence,
  enableMultiTabIndexedDbPersistence,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// ⚙️ Cấu hình Firebase — sử dụng environment variables
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,

  // ✅ Bucket thật của anh là .firebasestorage.app (không phải appspot.com)
  storageBucket: "job4s-app.firebasestorage.app",

  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// ✅ Validate Firebase config trước khi khởi tạo
if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
  console.error("❌ Firebase configuration is incomplete!");
  console.error("Missing environment variables. Check your .env or EAS configuration.");
  throw new Error("Firebase configuration error");
}

// ✅ Khởi tạo app Firebase (tránh tạo lại nếu đã có)
const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);

// ✅ Auth với persistence React Native (AsyncStorage)
let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (_e) {
  auth = getAuth(app);
}

// ✅ Firestore với cấu hình tối ưu cho React Native
let db: Firestore;
try {
  const isWeb = Platform.OS === 'web';
  const shouldUsePersistentCache = !isWeb && !__DEV__;

  // 🧠 Expo Go + remote debugging thường không hỗ trợ IndexedDB → dùng memory cache để tránh cảnh báo
  const cacheSettings = shouldUsePersistentCache
    ? persistentLocalCache({ tabManager: undefined })
    : memoryLocalCache();

  db = initializeFirestore(app, {
    localCache: cacheSettings,
    experimentalAutoDetectLongPolling: true,
  });

  console.log(
    shouldUsePersistentCache
      ? ' Firestore initialized with persistent cache'
      : 'ℹ Firestore using in-memory cache (dev mode)'
  );
} catch (error) {
  console.warn(' Could not initialize Firestore with configured cache, using default:', error);
  db = getFirestore(app);
}

// ✅ Storage: ép trỏ đúng bucket domain .firebasestorage.app
const storage = getStorage(app, "gs://job4s-app.firebasestorage.app");

// ✅ Log kiểm tra bucket thực tế
console.log(" STORAGE USED =", storage.app.options.storageBucket);

// ✅ Provider Google Auth
const googleProvider = new GoogleAuthProvider();

export { auth, db, storage, googleProvider };
