'use client';

import { useAuthStore } from '@/lib/auth';

interface IfCanEditProps {
  children: React.ReactNode;
  createdBy?: string;
  status?: string;
  fallback?: React.ReactNode;
}

export const IfCanEdit: React.FC<IfCanEditProps> = ({
  children,
  createdBy,
  status,
  fallback = null,
}) => {
  const profile = useAuthStore((state) => state.profile);
  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);
  const isAdmin = useAuthStore((state) => state.isAdmin());

  if (!initialized || !profile) {
    return <>{fallback}</>;
  }

  if (isAdmin) {
    return <>{children}</>;
  }

  // Special case for stock opname draft
  if (status === 'draft' && createdBy === user?.id) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};
