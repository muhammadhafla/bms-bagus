'use client';

import { useAuthStore } from '@/lib/auth';

interface AdminOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const AdminOnly: React.FC<AdminOnlyProps> = ({ children, fallback = null }) => {
  const profile = useAuthStore(state => state.profile);
  const initialized = useAuthStore(state => state.initialized);
  
  if (!initialized || !profile) {
    return <>{fallback}</>;
  }
  
  const isAdmin = profile.role === 'admin';
  return isAdmin ? <>{children}</> : <>{fallback}</>;
};
