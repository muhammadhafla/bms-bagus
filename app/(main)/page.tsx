'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageLoadingSpinner } from '@/components/ui';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return <PageLoadingSpinner />;
}
