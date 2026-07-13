import { useEffect } from 'react';

export function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return;

    const prevOverflow = document.body.style.overflow;
    const prevCount = parseInt(document.body.dataset.scrollLockCount || '0', 10);
    const newCount = prevCount + 1;
    document.body.dataset.scrollLockCount = String(newCount);
    document.body.style.overflow = 'hidden';

    return () => {
      const currentCount = parseInt(document.body.dataset.scrollLockCount || '1', 10);
      const nextCount = Math.max(0, currentCount - 1);
      document.body.dataset.scrollLockCount = String(nextCount);
      if (nextCount === 0) {
        document.body.style.overflow = prevOverflow;
        delete document.body.dataset.scrollLockCount;
      }
    };
  }, [isLocked]);
}
