'use client';

import React from 'react';
import { useAuthStore, AppRole } from '@/lib/auth';

interface RoleGuardProps {
  children: React.ReactNode;
  roles?: (AppRole | string)[];
  role?: AppRole | string;
  fallback?: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  roles,
  role,
  fallback = null,
}) => {
  const profile = useAuthStore((state) => state.profile);
  const initialized = useAuthStore((state) => state.initialized);
  const isAdmin = useAuthStore((state) => state.isAdmin());
  const hasAnyRole = useAuthStore((state) => state.hasAnyRole);

  if (!initialized || !profile) {
    return <>{fallback}</>;
  }

  // Admin always has access to everything
  if (isAdmin) {
    return <>{children}</>;
  }

  const targetRoles = roles || (role ? [role] : []);
  if (targetRoles.length === 0) {
    return <>{children}</>;
  }

  const hasMatchingRole = hasAnyRole(targetRoles as string[]);

  return hasMatchingRole ? <>{children}</> : <>{fallback}</>;
};
