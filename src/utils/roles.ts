// src/utils/roles.ts
// Utility functions cho role handling
// Note: Role loading chính được xử lý qua RoleContext và authApiService
// Các hàm này chỉ dùng để check/validate role

import { AppRole, AppRoleOrNull } from "@/types";

/**
 * Normalize role từ string về AppRoleOrNull
 * Backend đã handle việc normalize (student → candidate), hàm này chỉ để client-side validation
 */
export function normalizeRole(raw?: string | null): AppRoleOrNull {
  if (!raw) return null;
  if (raw === "student") return "candidate";
  if (["candidate", "employer", "admin"].includes(raw.toLowerCase())) {
    return raw.toLowerCase() as AppRole;
  }
  return null;
}

export const isCandidate = (r?: AppRoleOrNull) => r === "candidate";
export const isEmployer  = (r?: AppRoleOrNull) => r === "employer";
export const isAdmin     = (r?: AppRoleOrNull) => r === "admin";

/**
 * @deprecated Use RoleContext.useRole() hoặc authApiService.getCurrentRole() thay vì hàm này
 * Giữ lại để backward compatibility, nhưng khuyến khích dùng API service
 */
export async function getCurrentUserRole(): Promise<AppRoleOrNull> {
  // Import dynamic để tránh circular dependency
  const { authApiService } = await import("@/services/authApi.service");
  try {
    const roleData = await authApiService.getCurrentRole();
    return roleData.role;
  } catch (error) {
    console.error("getCurrentUserRole error:", error);
    return null;
  }
}
