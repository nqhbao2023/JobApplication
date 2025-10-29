import { router } from "expo-router";
import { auth, db } from "@/config/firebase";
import { getDoc, doc } from "firebase/firestore";

/**
 * 🧭 smartBack v2.1 — Phiên bản an toàn và tối ưu hơn
 *
 * Hành vi:
 * 1️⃣ Nếu có thể quay lại trong stack → back()
 * 2️⃣ Nếu có fallbackRoute được truyền → replace đến đó
 * 3️⃣ Nếu user chưa đăng nhập → chuyển đến trang login
 * 4️⃣ Nếu user là candidate → quay về trang ứng tuyển
 * 5️⃣ Nếu user là employer → quay về danh sách ứng viên
 * 6️⃣ Nếu không xác định → fallback về /(tabs)
 */
export const smartBack = async (fallbackRoute?: string) => {
  try {
    // ✅ Ưu tiên quay lại stack cũ nếu có
    if (router.canGoBack?.()) {
      router.back();
      return;
    }

    // ✅ Nếu được truyền fallbackRoute cụ thể
    if (fallbackRoute) {
      router.replace(fallbackRoute as never);
      return;
    }

    // ✅ Kiểm tra đăng nhập
    const user = auth.currentUser;
    if (!user) {
      router.replace("/(auth)/login" as never);
      return;
    }

    // ✅ Lấy thông tin role từ Firestore
    const snap = await getDoc(doc(db, "users", user.uid));
    const role = snap.exists() ? snap.data().role : "candidate";

    // ✅ Điều hướng theo role
    switch (role) {
      case "candidate":
        router.replace("/(candidate)/appliedJob" as never);
        break;
      case "employer":
        router.replace("/(employer)/appliedList" as never);
        break;
      default:
        router.replace("/(tabs)" as never);
        break;
    }
  } catch (error) {
    console.warn("⚠️ smartBack fallback error:", error);
    router.replace("/(tabs)" as never);
  }
};

/**
 * 🔁 Quay lại trang chính của Candidate
 * (ứng dụng thực tế: sau khi Apply Job, Submit CV, hoặc JobDescription)
 */
export const backToCandidate = () => smartBack("/(candidate)/appliedJob");

/**
 * 🔁 Quay lại trang chính của Employer
 * (ứng dụng thực tế: sau khi duyệt ứng viên, xem chi tiết, hoặc tạo job)
 */
export const backToEmployer = () => smartBack("/(employer)/appliedList");

/**
 * 🧩 Hàm chuyển đến đúng trang Hồ sơ tùy role (dùng chung)
 * Giúp dùng chung nút avatar profile cho cả Candidate và Employer
 */
export const goToProfile = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      router.push("/(auth)/login");
      return;
    }

    const snap = await getDoc(doc(db, "users", user.uid));
    const role = snap.exists() ? snap.data().role : "candidate";

    // ✅ Dẫn hướng rõ ràng theo role (TypeScript hợp lệ)
    if (role === "candidate") {
      router.navigate("/(candidate)/profile");
    } else if (role === "employer") {
      router.navigate("/(employer)/profile");
    } else {
      router.navigate("/(shared)/person");
    }
  } catch (error) {
    console.error("⚠️ goToProfile error:", error);
    router.navigate("/(candidate)/profile");
  }
};

