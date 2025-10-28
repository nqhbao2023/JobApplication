import { router } from "expo-router";
import { auth, db } from "@/config/firebase";
import { getDoc, doc } from "firebase/firestore";

/**
 * Smart back cải tiến:
 * - Nếu có thể quay lại stack → back()
 * - Nếu không (VD reload lại app, stack rỗng) → fallback thông minh:
 *    + Nếu có fallbackRoute → ưu tiên dùng nó
 *    + Nếu user chưa đăng nhập → /auth/login
 *    + Nếu user là candidate → /(candidate)/appliedJob
 *    + Nếu user là employer → /(employer)/appliedList
 *    + Mặc định → /(tabs)
 */
export const smartBack = async (fallbackRoute?: string) => {
  try {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    if (fallbackRoute) {
      router.replace(fallbackRoute as never);
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      router.replace("/(auth)/login" as never);
      return;
    }

    const snap = await getDoc(doc(db, "users", user.uid));
    const role = snap.exists() ? snap.data().role : "candidate";

    if (role === "candidate") {
      router.replace("/(candidate)/appliedJob" as never);
    } else if (role === "employer") {
      router.replace("/(employer)/appliedList" as never);
    } else {
      router.replace("/(tabs)" as never);
    }
  } catch (error) {
    console.warn("⚠️ smartBack fallback error:", error);
    router.replace("/(tabs)" as never);
  }
};

export const backToCandidate = () => smartBack("/(candidate)/appliedJob");
export const backToEmployer = () => smartBack("/(employer)/appliedList");
