import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Job, Company, Category, StudentProfile } from '@/types';

export const CANDIDATE_HOME_CACHE_TTL = 60 * 1000; // 60s cache window to avoid full reloads when returning

export type CandidateHomeUser = {
  $id: string;
  uid?: string;
  email?: string | null;
  name?: string;
  displayName?: string;
  photoURL?: string | null;
  role?: string | null;
  phone?: string | null;
  skills?: string[]; // ✅ Added for AI Job Recommendations
  createdAt?: string | null;
  updatedAt?: string | null;
  studentProfile?: StudentProfile;
};

type CandidateHomeStore = {
  user?: CandidateHomeUser;
  jobs: Job[];
  companies: Company[];
  categories: Category[];
  unreadCount: number;
  lastFetchedAt: number | null;
  loading: boolean;
  error: string | null;
  hydrated: boolean;
  setStateFromPayload: (payload: Partial<CandidateHomeStore>) => void;
  setLoading: (value: boolean) => void;
  setError: (value: string | null) => void;
  setUnreadCount: (value: number) => void;
  setLastFetchedAt: (value: number | null) => void;
  setHydrated: (value: boolean) => void;
  invalidateCache: () => void; // ✅ NEW: Force refresh on next load
  reset: () => void;
};

const initialState = {
  user: undefined,
  jobs: [] as Job[],
  companies: [] as Company[],
  categories: [] as Category[],
  unreadCount: 0,
  lastFetchedAt: null,
  loading: true,
  error: null,
  hydrated: false,
};

export const useCandidateHomeStore = create<CandidateHomeStore>()(
  persist(
    (set) => ({
      ...initialState,
      setStateFromPayload: (payload) => set((state) => ({ ...state, ...payload })),
      setLoading: (value) => set({ loading: value }),
      setError: (value) => set({ error: value }),
      setUnreadCount: (value) => set({ unreadCount: value }),
      setLastFetchedAt: (value) => set({ lastFetchedAt: value }),
      setHydrated: (value) => set({ hydrated: value }),
      invalidateCache: () => set({ lastFetchedAt: null }), // ✅ NEW: Clear cache timestamp to force reload
      reset: () => set({ ...initialState, hydrated: true, loading: false }),
    }),
    {
      name: 'candidate-home-cache',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        jobs: state.jobs,
        companies: state.companies,
        categories: state.categories,
        // ❌ Don't persist unreadCount - always fetch fresh from server/Firestore
        lastFetchedAt: state.lastFetchedAt,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.warn('[CandidateHomeStore] Failed to rehydrate cache', error);
        }
        state?.setHydrated(true);
        state?.setLoading(false);
      },
    }
  )
);
