import { router } from "expo-router";
import { auth, db } from "@/config/firebase";
import { getDoc, doc } from "firebase/firestore";

/**
 * Smart back:
 * - Nếu có thể quay lại (từ trang JobDetail -> Home) thì back()
 * - Nếu không (VD reload lại app, không có stack trước đó) thì về /(tabs)
 */
export const smartBack = async () => {
  try {
    router.back();
  } catch {
    const user = auth.currentUser;
    if (!user) {
      router.replace("/(auth)/login" as any);
      return;
    }

    const snap = await getDoc(doc(db, "users", user.uid));
    const role = snap.exists() ? snap.data().role : "candidate";
    router.replace("/(tabs)" as any); // vẫn render đúng home theo role
  }
};
