require('dotenv').config();
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs, writeBatch, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: "job4s-app.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ✅ Fixed IDs tương thích với backend validator và Algolia
const WORKING_TYPES = [
  { id: "full-time", type_name: "Toàn thời gian", icon: "💼", color: "#3b82f6", description: "Full-time, 40h/tuần", isSystem: true },
  { id: "part-time", type_name: "Bán thời gian", icon: "⏰", color: "#8b5cf6", description: "Part-time, linh hoạt giờ", isSystem: true },
  { id: "internship", type_name: "Thực tập", icon: "🎓", color: "#10b981", description: "Sinh viên, học việc", isSystem: true },
  { id: "contract", type_name: "Hợp đồng", icon: "📝", color: "#f59e0b", description: "Theo dự án, có thời hạn", isSystem: true },
  { id: "freelance", type_name: "Freelance", icon: "🌐", color: "#06b6d4", description: "Tự do, remote", isSystem: true },
  { id: "remote", type_name: "Remote", icon: "🏠", color: "#ec4899", description: "Làm việc từ xa 100%", isSystem: true },
  { id: "hybrid", type_name: "Hybrid", icon: "🔄", color: "#6366f1", description: "Kết hợp văn phòng & remote", isSystem: true },
];

async function seedJobTypes() {
  try {
    console.log("🌱 Starting job types seed...");
    const snap = await getDocs(collection(db, "job_types"));
    if (snap.docs.length > 0) {
      console.log(`🗑️  Deleting ${snap.docs.length} old types...`);
      const batch = writeBatch(db);
      snap.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }
    console.log(`📝 Adding ${WORKING_TYPES.length} working types with fixed IDs...`);
    for (const type of WORKING_TYPES) {
      const { id, ...typeData } = type;
      // ✅ Sử dụng doc().set() với fixed ID thay vì addDoc()
      await setDoc(doc(db, "job_types", id), {
        ...typeData,
        created_at: new Date().toISOString(),
      });
      console.log(`  ✅ ${id}: ${typeData.type_name}`);
    }
    console.log("✅ Job types seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

seedJobTypes();