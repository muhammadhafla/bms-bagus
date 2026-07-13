'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { IconX } from '@tabler/icons-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type?: 'success' | 'error' | 'info', duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info', duration = 3000) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[999] flex flex-col gap-2" role="region" aria-label="Notifications">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [isPaused, setIsPaused] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const toastRef = useRef<HTMLDivElement>(null);
  const duration = toast.duration || 3000;
  const remainingTimeRef = useRef(duration);
  const startTimeRef = useRef<number>(0);

  const handleRemove = useCallback(() => {
    setIsLeaving(true);
    setTimeout(() => onRemove(toast.id), 300);
  }, [onRemove, toast.id]);

  useEffect(() => {
    if (isPaused) return;

    startTimeRef.current = Date.now();
    const timeout = setTimeout(() => {
      handleRemove();
    }, remainingTimeRef.current);

    return () => clearTimeout(timeout);
  }, [isPaused, handleRemove]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleRemove();
      }
    };

    const currentToast = toastRef.current;
    if (currentToast) {
      currentToast.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      if (currentToast) {
        currentToast.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [handleRemove]);

  return (
    <div
      ref={toastRef}
      tabIndex={-1}
      role="status"
      aria-live="polite"
      onMouseEnter={() => {
        setIsPaused(true);
        remainingTimeRef.current -= (Date.now() - startTimeRef.current);
      }}
      onMouseLeave={() => setIsPaused(false)}
      className={`p-4 rounded-xl shadow-elevated border-l-4 flex items-start gap-3 relative overflow-hidden backdrop-blur-xl transition-all duration-300 transform
        ${isLeaving ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
        ${toast.type === 'success' ? 'bg-accent-teal-600 border-l-accent-teal-400' : toast.type === 'error' ? 'bg-accent-rose-600 border-l-accent-rose-400' : 'bg-brand-600 border-l-brand-400'}
      `}
    >
      <span>{toast.message}</span>
      <div className="flex items-center gap-2">
        <div className="w-16 h-1 bg-white/20 rounded-full overflow-hidden">
          <div 
            className="h-full bg-white/80 rounded-full"
            style={{ 
              animation: `toast-shrink ${duration}ms linear forwards`,
              animationPlayState: isPaused ? 'paused' : 'running'
            }}
          />
        </div>
        <button
          onClick={handleRemove}
          className="ml-2 text-white/80 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white rounded"
          aria-label="Tutup notifikasi"
        >
          <IconX className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}