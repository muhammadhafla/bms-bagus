'use client';

import { useEffect, useRef } from 'react';
import { IconAlertTriangle, IconInfoCircle } from '@tabler/icons-react';
import { Button } from './Button';
import { Portal } from './Portal';

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
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      dialogRef.current?.focus();
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
          className="absolute inset-0 bg-black/50 animate-fade-in"
          onClick={onCancel}
          aria-hidden="true"
        />
        
        <div 
          ref={dialogRef}
          tabIndex={-1}
          className="relative bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in border border-neutral-200 dark:border-neutral-800 focus:outline-none"
        >
          <div className={`p-6 border-b ${
            danger ? 'border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10' : 'border-neutral-100 dark:border-neutral-800'
          }`}>
            <div className="flex items-start gap-4">
              <div className={`p-2 rounded-xl shrink-0 ${
                danger 
                  ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' 
                  : 'bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400'
              }`}>
                {danger ? <IconAlertTriangle className="w-6 h-6" /> : <IconInfoCircle className="w-6 h-6" />}
              </div>
              <div className="flex-1 pt-1">
                <h3 id="dialog-title" className="text-lg font-bold text-neutral-900 dark:text-white leading-tight">
                  {title}
                </h3>
                <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                  {message}
                </p>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-neutral-50 dark:bg-neutral-950/50 flex gap-3 justify-end border-t border-neutral-200 dark:border-neutral-800">
            <Button
              variant="secondary"
              onClick={onCancel}
              className="px-5 font-medium"
            >
              {cancelLabel}
            </Button>
            <Button
              variant={danger ? 'danger' : 'primary'}
              onClick={() => {
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
