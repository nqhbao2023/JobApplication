// src/utils/roles.ts
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/config/firebase";

export type AppRole = "candidate" | "employer" | "admin";

// Map các role cũ về role chuẩn
export function normalizeRole(raw?: string | null): AppRole | null {
  if (!raw) return null;
  if (raw === "student") return "candidate";
  if (["candidate", "employer", "admin"].includes(raw)) return raw as AppRole;
  return null;
}

export const isCandidate = (r?: AppRole | null) => r === "candidate";
export const isEmployer  = (r?: AppRole | null) => r === "employer";
export const isAdmin     = (r?: AppRole | null) => r === "admin";

// Lấy role hiện tại từ Firestore + tự động normalize
export async function getCurrentUserRole(): Promise<AppRole | null> {
  const user = auth.currentUser;
  if (!user) return null;
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  const data = snap.data() as any;
  const normalized = normalizeRole(data.role);

  // Nếu thấy role cũ (student) → update 1 lần về candidate để sạch dữ liệu
  if (data.role === "student") {
    try {
      await updateDoc(ref, { role: "candidate" });
      console.log("🧹 Migrated role student → candidate for", user.email);
    } catch (e) {
      console.warn("⚠️ Cannot update role automatically:", e);
    }
  }

  // Nếu có cờ isAdmin=true → ép role = admin (ưu tiên admin)
  if (data.isAdmin === true) return "admin";

  return normalized;
}
