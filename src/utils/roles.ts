// src/utils/roles.ts
import axios from 'axios';
import { auth } from '@/config/firebase';
import { AppRole, AppRoleOrNull } from '@/types';
import { userApiService } from '@/services/userApi.service';

// Map các role cũ về role chuẩn
export function normalizeRole(raw?: string | null): AppRoleOrNull {
  if (!raw) return null;
  if (raw === "student") return "candidate";
  if (["candidate", "employer", "admin"].includes(raw)) return raw as AppRole;
  return null;
}

export const isCandidate = (r?: AppRoleOrNull) => r === "candidate";
export const isEmployer  = (r?: AppRoleOrNull) => r === "employer";
export const isAdmin     = (r?: AppRoleOrNull) => r === "admin";

// Lấy role hiện tại từ Firestore + tự động normalize
export async function getCurrentUserRole(): Promise<AppRoleOrNull> {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const profile = await userApiService.getCurrentUser();
    if (profile.shouldRefreshToken) {
      await user.getIdToken(true);
    }
    return normalizeRole(profile.role);
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        return null;
      }
    }
    throw error;
  }
}
