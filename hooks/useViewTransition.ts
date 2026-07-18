'use client';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

export function useViewTransition() {
  const router = useRouter();

  const navigate = useCallback((href: string) => {
    if (!document.startViewTransition) {
      // Fallback: browser lama langsung navigate tanpa animasi
      router.push(href);
      return;
    }
    document.startViewTransition(() => {
      router.push(href);
    });
  }, [router]);

  return { navigate };
}
