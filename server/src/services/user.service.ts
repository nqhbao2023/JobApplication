import admin, { db, auth } from '../config/firebase';
import { AppError } from '../middleware/errorHandler';

export type UserRole = 'candidate' | 'employer' | 'admin';

export interface UserProfile {
  uid: string;
  email?: string | null;
  name?: string | null;
  phone?: string | null;
  role: UserRole;
  skills?: string[];
  savedJobIds?: string[];
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface UserProfileWithMeta extends UserProfile {
  shouldRefreshToken?: boolean;
}

const USERS_COLLECTION = 'users';
const ALLOWED_ROLES: UserRole[] = ['candidate', 'employer', 'admin'];

const normalizeRole = (role?: string | null): UserRole | null => {
  if (!role) return null;
  if (role === 'student') return 'candidate';
  if (ALLOWED_ROLES.includes(role as UserRole)) {
    return role as UserRole;
  }
  return null;
};

const toISOString = (value: unknown): string | null => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof (value as any)?.toDate === 'function') {
    return (value as admin.firestore.Timestamp).toDate().toISOString();
  }
  return null;
};

const ensureCustomRoleClaim = async (uid: string, role: UserRole): Promise<boolean> => {
  const userRecord = await auth.getUser(uid);
  const currentClaims = userRecord.customClaims || {};

  if (currentClaims.role === role) {
    return false;
  }

  await auth.setCustomUserClaims(uid, { ...currentClaims, role });
  return true;
};

const mapDocToProfile = (uid: string, data: FirebaseFirestore.DocumentData): UserProfile => {
  const normalizedRole = normalizeRole(data.role);

  if (!normalizedRole) {
    throw new AppError('User role is missing or invalid', 403);
  }

  return {
    uid,
    email: data.email ?? null,
    name: data.name ?? null,
    phone: data.phone ?? null,
    role: normalizedRole,
    skills: Array.isArray(data.skills) ? data.skills : [],
    savedJobIds: Array.isArray(data.savedJobIds) ? data.savedJobIds : [],
    createdAt: toISOString(data.createdAt),
    updatedAt: toISOString(data.updatedAt),
  };
};

const userService = {
  async getCurrentUser(uid: string): Promise<UserProfileWithMeta> {
    const docRef = db.collection(USERS_COLLECTION).doc(uid);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      throw new AppError('User profile not found', 404);
    }

    const data = snapshot.data()!;
    const normalizedRole = normalizeRole(data.role);

    if (data.role !== normalizedRole && normalizedRole) {
      await docRef.update({ role: normalizedRole });
      data.role = normalizedRole;
    }

    const profile = mapDocToProfile(uid, data);
    const shouldRefreshToken = await ensureCustomRoleClaim(uid, profile.role);

    return { ...profile, shouldRefreshToken };
  },

  async upsertCurrentUser(
    uid: string,
    payload: {
      email?: string | null;
      name: string;
      phone: string;
      role: string;
    }
  ): Promise<UserProfileWithMeta> {
    const normalizedRole = normalizeRole(payload.role);

    if (!normalizedRole) {
      throw new AppError('Invalid role provided', 400);
    }

    const docRef = db.collection(USERS_COLLECTION).doc(uid);
    const snapshot = await docRef.get();

    const now = admin.firestore.FieldValue.serverTimestamp();
    const baseData = {
      email: payload.email ?? null,
      name: payload.name,
      phone: payload.phone,
      role: normalizedRole,
      skills: [],
      savedJobIds: [],
      updatedAt: now,
    };

    if (snapshot.exists) {
      await docRef.set(
        {
          ...baseData,
        },
        { merge: true }
      );
    } else {
      await docRef.set({
        ...baseData,
        uid,
        createdAt: now,
      });
    }

    const updatedSnapshot = await docRef.get();
    const profile = mapDocToProfile(uid, updatedSnapshot.data()!);
    const shouldRefreshToken = await ensureCustomRoleClaim(uid, profile.role);

    return { ...profile, shouldRefreshToken };
  },
};

export default userService;
