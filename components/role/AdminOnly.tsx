'use client';

import { useAuthStore } from '@/lib/auth';

interface AdminOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const AdminOnly: React.FC<AdminOnlyProps> = ({ children, fallback = null }) => {
  const isAdmin = useAuthStore((state) => state.isAdmin());
  const initialized = useAuthStore((state) => state.initialized);

  if (!initialized) {
    return <>{fallback}</>;
  }

  return isAdmin ? <>{children}</> : <>{fallback}</>;
};
