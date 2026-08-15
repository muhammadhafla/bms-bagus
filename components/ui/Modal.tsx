'use client';

import { useEffect, useCallback, useId, useState } from 'react';
import { IconX } from '@tabler/icons-react';
import { Portal } from './Portal';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { Drawer } from 'vaul';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isBottomSheetOnMobile?: boolean;
  isFullScreenOnMobile?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  isBottomSheetOnMobile = false,
  isFullScreenOnMobile = false,
}: ModalProps) {
  const titleId = useId();
  const focusTrapRef = useFocusTrap(isOpen);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, handleEscape]);

  useBodyScrollLock(isOpen);

  const isDesktop = useMediaQuery('(min-width: 640px)');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  };

  if (mounted && isBottomSheetOnMobile && !isDesktop) {
    return (
      <Drawer.Root
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[100] bg-black/50" />
          <Drawer.Content className="fixed right-0 bottom-0 left-0 z-[101] flex max-h-[96vh] flex-col rounded-t-2xl bg-white outline-none dark:bg-neutral-950">
            <div className="mx-auto mt-3 mb-1 h-1.5 w-12 shrink-0 rounded-full bg-neutral-300 dark:bg-neutral-700" />
            {title && (
              <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-5 pt-2 pb-4 dark:border-neutral-800">
                <Drawer.Title
                  id={titleId}
                  className="text-xl font-bold text-neutral-900 dark:text-white"
                >
                  {title}
                </Drawer.Title>
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
              {children}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  return (
    <Portal>
      <div
        className={`fixed inset-0 z-[100] flex ${isBottomSheetOnMobile ? 'items-end sm:items-center' : 'items-center'} justify-center ${isBottomSheetOnMobile || isFullScreenOnMobile ? 'p-0 sm:p-4' : 'p-4'} animate-fade-in`}
      >
        <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
        <div
          ref={focusTrapRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          className={`relative w-full ${sizeClasses[size]} flex flex-col bg-white shadow-xl dark:bg-neutral-950 ${
            isFullScreenOnMobile
              ? 'animate-slide-up sm:animate-scale-in h-[100dvh] rounded-none pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] sm:h-auto sm:max-h-[90vh] sm:rounded-2xl sm:pt-0'
              : isBottomSheetOnMobile
                ? 'animate-slide-up sm:animate-scale-in max-h-[90vh] rounded-t-2xl pb-[env(safe-area-inset-bottom)] sm:max-h-full sm:rounded-2xl'
                : 'animate-scale-in max-h-[90vh] rounded-2xl sm:max-h-full'
          }`}
        >
          {isBottomSheetOnMobile && (
            <div className="flex w-full shrink-0 justify-center bg-transparent pt-3 pb-1 sm:hidden">
              <div className="h-1.5 w-12 rounded-full bg-neutral-300 dark:bg-neutral-700" />
            </div>
          )}
          {title && (
            <div
              className={`flex items-center justify-between px-5 ${isBottomSheetOnMobile ? 'pt-2 pb-4 sm:p-5' : 'p-5'} shrink-0 border-b border-neutral-200 dark:border-neutral-800`}
            >
              <h2 id={titleId} className="text-xl font-bold text-neutral-900 dark:text-white">
                {title}
              </h2>
              <button
                onClick={onClose}
                className="focus:ring-brand-500 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 focus:ring-2 focus:outline-none dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                aria-label="Tutup"
              >
                <IconX className="h-5 w-5" />
              </button>
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-5">{children}</div>
        </div>
      </div>
    </Portal>
  );
}
