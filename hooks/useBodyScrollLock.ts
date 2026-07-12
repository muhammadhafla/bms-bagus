import { useEffect } from 'react';

let openModalCount = 0;

export function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (isLocked) {
      openModalCount++;
      if (openModalCount === 1) {
        document.body.style.overflow = 'hidden';
      }
    }

    return () => {
      if (isLocked) {
        openModalCount--;
        if (openModalCount === 0) {
          document.body.style.overflow = '';
        }
      }
    };
  }, [isLocked]);
}
