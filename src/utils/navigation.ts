import { router } from "expo-router";
import { auth, db } from "@/config/firebase";
import { getDoc, doc } from "firebase/firestore";

/**
 * 🧭 smartBack v2.2 — Navigation với fallback thông minh
 *
 * Hành vi:
 * 1️⃣ Ưu tiên quay lại trang trước đó trong navigation stack
 * 2️⃣ Nếu được truyền fallbackRoute → chuyển đến đó
 * 3️⃣ Nếu không → tự động phát hiện role và chuyển về trang chính
 */
export const smartBack = async (fallbackRoute?: string) => {
  try {
    // ✅ ALWAYS try to go back first (even if canGoBack is unreliable)
    // This ensures proper navigation behavior in most cases
    if (router.canGoBack && router.canGoBack()) {
      console.log("📱 SmartBack: Going back in navigation stack");
      router.back();
      return;
    }

    // ✅ Nếu được chỉ định fallback route cụ thể
    if (fallbackRoute) {
      console.log("📱 SmartBack: Using provided fallback:", fallbackRoute);
      router.replace(fallbackRoute as never);
      return;
    }

    // ✅ Kiểm tra đăng nhập
    const user = auth.currentUser;
    if (!user) {
      console.log("📱 SmartBack: No user, redirecting to login");
      router.replace("/(auth)/login" as never);
      return;
    }

    // ✅ Lấy thông tin role từ Firestore
    const snap = await getDoc(doc(db, "users", user.uid));
    const role = snap.exists() ? snap.data().role : "candidate";

    console.log("📱 SmartBack: User role detected:", role);

    // ✅ Điều hướng về trang chính theo role
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

