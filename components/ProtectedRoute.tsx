'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth';
import { PageLoadingSpinner } from '@/components/ui';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, initialized, isAdmin } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (initialized && !user) {
      router.push('/login');
    }
    if (initialized && user && requireAdmin && !isAdmin()) {
      router.push('/');
    }
  }, [user, initialized, isAdmin, requireAdmin, router]);

  if (!initialized) {
    return <PageLoadingSpinner message="Memverifikasi sesi..." />;
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
