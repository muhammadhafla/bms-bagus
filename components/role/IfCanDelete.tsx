'use client';

import { useAuthStore } from '@/lib/auth';

interface IfCanDeleteProps {
  children: React.ReactNode;
  createdBy?: string;
  status?: string;
  fallback?: React.ReactNode;
}

export const IfCanDelete: React.FC<IfCanDeleteProps> = ({ 
  children, 
  createdBy, 
  status,
  fallback = null 
}) => {
  const { isAdmin, user } = useAuthStore(state => ({
    isAdmin: state.isAdmin(),
    user: state.user
  }));
  
  if (isAdmin) {
    return <>{children}</>;
  }
  
  // Special case for stock opname draft
  if (status === 'draft' && createdBy === user?.id) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
};
