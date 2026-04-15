'use client';

import { useAuthStore } from '@/lib/auth';

interface AdminOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const AdminOnly: React.FC<AdminOnlyProps> = ({ children, fallback = null }) => {
  const isAdmin = useAuthStore(state => state.isAdmin());
  
  return isAdmin ? <>{children}</> : <>{fallback}</>;
};
