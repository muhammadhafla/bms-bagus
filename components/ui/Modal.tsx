'use client';

import { useEffect, useCallback, useId } from 'react';
import { IconX } from '@tabler/icons-react';
import { Portal } from './Portal';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isBottomSheetOnMobile?: boolean;
}

export function Modal({ isOpen, onClose, title, children, size = 'md', isBottomSheetOnMobile = false }: ModalProps) {
  const titleId = useId();

  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, handleEscape]);

  useBodyScrollLock(isOpen);

  const focusTrapRef = useFocusTrap(isOpen);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  };

  return (
    <Portal>
      <div className={`fixed inset-0 z-[100] flex ${isBottomSheetOnMobile ? 'items-end sm:items-center' : 'items-center'} justify-center p-0 sm:p-4 animate-fade-in`}>
        <div 
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
          aria-hidden="true"
        />
        <div 
          ref={focusTrapRef} 
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          className={`relative w-full ${sizeClasses[size]} bg-white dark:bg-neutral-950 shadow-xl flex flex-col max-h-[90vh] sm:max-h-full ${isBottomSheetOnMobile ? 'rounded-t-2xl sm:rounded-2xl animate-slide-up sm:animate-scale-in pb-[env(safe-area-inset-bottom)]' : 'rounded-2xl animate-scale-in'}`}
        >
          {isBottomSheetOnMobile && (
            <div className="sm:hidden w-full flex justify-center pt-3 pb-1 shrink-0 bg-transparent">
              <div className="w-12 h-1.5 bg-neutral-300 dark:bg-neutral-700 rounded-full" />
            </div>
          )}
          {title && (
            <div className={`flex items-center justify-between px-5 ${isBottomSheetOnMobile ? 'pt-2 pb-4 sm:p-5' : 'p-5'} border-b border-neutral-200 dark:border-neutral-800 shrink-0`}>
              <h2 id={titleId} className="text-xl font-bold text-neutral-900 dark:text-white">{title}</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-800 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500"
                aria-label="Tutup"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-5">
            {children}
          </div>
        </div>
      </div>
    </Portal>
  );
}
