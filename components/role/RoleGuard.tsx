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

  if (!initialized || !profile) {
    return <>{fallback}</>;
  }

  // Admin always has access to everything
  const isAdmin = profile.role === 'admin' || (profile.roles && profile.roles.includes('admin'));
  if (isAdmin) {
    return <>{children}</>;
  }

  const targetRoles = roles || (role ? [role] : []);
  if (targetRoles.length === 0) {
    return <>{children}</>;
  }

  const userRoles = profile.roles || (profile.role ? [profile.role] : []);
  const hasMatchingRole = targetRoles.some((r) => userRoles.includes(r));

  return hasMatchingRole ? <>{children}</> : <>{fallback}</>;
};
