require('dotenv').config();
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs, writeBatch } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: AIzaSyDWOpfdH_wDYHzdRgQBW1DEEvUrBQuUkdo,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: "job4s-app.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const PROFESSIONAL_CATEGORIES = [
  { category_name: "Công nghệ thông tin", icon: "💻", description: "Lập trình, phát triển phần mềm, IT" },
  { category_name: "Kế toán / Kiểm toán", icon: "📊", description: "Kế toán viên, kiểm toán viên" },
  { category_name: "Bất động sản", icon: "🏢", description: "Môi giới, tư vấn, quản lý BĐS" },
  { category_name: "Ngân hàng / Tài chính", icon: "💰", description: "Ngân hàng, đầu tư, tài chính" },
  { category_name: "Marketing / Truyền thông", icon: "📱", description: "Digital marketing, PR, quảng cáo" },
  { category_name: "Bán hàng / Kinh doanh", icon: "💼", description: "Sales, business development" },
  { category_name: "Nhân sự", icon: "👥", description: "Tuyển dụng, đào tạo, quản lý nhân sự" },
  { category_name: "Hành chính / Văn phòng", icon: "📋", description: "Hành chính, thư ký, văn phòng" },
  { category_name: "Dịch vụ khách hàng", icon: "☎️", description: "CSKH, telesales, call center" },
  { category_name: "Y tế / Dược", icon: "⚕️", description: "Bác sĩ, y tá, dược sĩ" },
  { category_name: "Giáo dục / Đào tạo", icon: "🎓", description: "Giảng viên, giáo viên, đào tạo" },
  { category_name: "Xây dựng / Kiến trúc", icon: "🏗️", description: "Kỹ sư xây dựng, kiến trúc sư" },
  { category_name: "Sản xuất / Vận hành", icon: "⚙️", description: "Quản lý sản xuất, kỹ thuật" },
  { category_name: "Du lịch / Khách sạn", icon: "✈️", description: "Nhân viên khách sạn, tour guide" },
  { category_name: "Ẩm thực / F&B", icon: "🍽️", description: "Đầu bếp, phục vụ, quản lý nhà hàng" },
  { category_name: "Logistics / Vận tải", icon: "🚚", description: "Kho vận, giao nhận, logistics" },
  { category_name: "Luật / Pháp lý", icon: "⚖️", description: "Luật sư, chuyên viên pháp lý" },
  { category_name: "Thiết kế đồ họa", icon: "🎨", description: "Graphic designer, UI/UX" },
  { category_name: "Nông nghiệp / Thủy sản", icon: "🌾", description: "Nông nghiệp, thủy sản, chăn nuôi" },
  { category_name: "Điện / Điện tử", icon: "⚡", description: "Kỹ sư điện, điện tử, tự động hóa" },
  { category_name: "Cơ khí / Ô tô", icon: "🔧", description: "Kỹ thuật cơ khí, sửa chữa ô tô" },
  { category_name: "Thời trang / Dệt may", icon: "👔", description: "Thiết kế thời trang, may mặc" },
  { category_name: "Báo chí / Biên tập", icon: "📰", description: "Phóng viên, biên tập viên" },
  { category_name: "Bảo hiểm", icon: "🛡️", description: "Tư vấn bảo hiểm, claim" },
  { category_name: "Viễn thông", icon: "📡", description: "Kỹ thuật viên viễn thông, mạng" },
  { category_name: "Môi trường / An toàn", icon: "🌱", description: "An toàn lao động, môi trường" },
  { category_name: "Nghệ thuật / Giải trí", icon: "🎭", description: "Nghệ sĩ, diễn viên, biểu diễn" },
  { category_name: "Thể thao / Thể hình", icon: "⚽", description: "HLV thể hình, vận động viên" },
  { category_name: "Làm đẹp / Spa", icon: "💅", description: "Thẩm mỹ viên, chăm sóc sắc đẹp" },
  { category_name: "Khác", icon: "📦", description: "Ngành nghề khác" },
];

async function seedCategories() {
  try {
    console.log("🌱 Starting category seed...");

    const snap = await getDocs(collection(db, "job_categories"));
    if (snap.docs.length > 0) {
      console.log(`🗑️  Deleting ${snap.docs.length} old categories...`);
      const batch = writeBatch(db);
      snap.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }

    console.log(`📝 Adding ${PROFESSIONAL_CATEGORIES.length} professional categories...`);
    for (const category of PROFESSIONAL_CATEGORIES) {
      await addDoc(collection(db, "job_categories"), {
        ...category,
        created_at: new Date().toISOString(),
      });
    }

    console.log("✅ Categories seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

seedCategories();

