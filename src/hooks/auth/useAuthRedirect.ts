import { useEffect } from 'react';
import { router, useSegments } from 'expo-router';
import { useRole } from '@/contexts/RoleContext';

export const useAuthRedirect = () => {
  const { role, loading } = useRole();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inAuth = segments[0] === '(auth)';

    if (!role && !inAuth) {
      router.replace('/(auth)/login');
      return;
    }

    if (role && inAuth) {
      const routes: Record<string, any> = {
        admin: '/(admin)',
        employer: '/(employer)',
        candidate: '/(candidate)',
      };

      const targetRoute = routes[role];
      if (targetRoute) {
        router.replace(targetRoute);
      }
    }
  }, [role, loading, segments]);

  return { role, loading };
};
