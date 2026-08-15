'use client';

import { useEffect, useRef } from 'react';
import { IconAlertTriangle, IconInfoCircle } from '@tabler/icons-react';
import { Button } from './Button';
import { Portal } from './Portal';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';
import { useHaptic } from '@/hooks/useHaptic';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Konfirmasi',
  cancelLabel = 'Batal',
  onConfirm,
  onCancel,
  danger = false,
}: ConfirmDialogProps) {
  const focusTrapRef = useFocusTrap(isOpen);
  const haptic = useHaptic();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <div
          className="animate-fade-in absolute inset-0 bg-black/50"
          onClick={onCancel}
          aria-hidden="true"
        />

        <div
          ref={focusTrapRef}
          tabIndex={-1}
          className="animate-scale-in relative w-full max-w-md overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl focus:outline-none dark:border-neutral-800 dark:bg-neutral-900"
        >
          <div
            className={`border-b p-6 ${
              danger
                ? 'border-accent-rose-100 dark:border-accent-rose-900/30 bg-accent-rose-50/50 dark:bg-accent-rose-900/10'
                : 'border-neutral-100 dark:border-neutral-800'
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`shrink-0 rounded-xl p-2 ${
                  danger
                    ? 'bg-accent-rose-100 text-accent-rose-600 dark:bg-accent-rose-900/30 dark:text-accent-rose-400'
                    : 'bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400'
                }`}
              >
                {danger ? (
                  <IconAlertTriangle className="h-6 w-6" />
                ) : (
                  <IconInfoCircle className="h-6 w-6" />
                )}
              </div>
              <div className="flex-1 pt-1">
                <h3
                  id="dialog-title"
                  className="text-lg leading-tight font-bold text-neutral-900 dark:text-white"
                >
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
                  {message}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-950/50">
            <Button
              variant="secondary"
              onClick={() => {
                haptic.light();
                onCancel();
              }}
              className="px-5 font-medium"
            >
              {cancelLabel}
            </Button>
            <Button
              variant={danger ? 'danger' : 'primary'}
              onClick={() => {
                if (danger) haptic.heavy();
                else haptic.medium();
                onConfirm();
              }}
              className="px-5 font-medium shadow-sm"
              autoFocus
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
