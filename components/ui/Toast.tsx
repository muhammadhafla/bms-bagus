'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';

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
    const id = Date.now().toString();
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
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2" role="region" aria-label="Notifications">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  const toastRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(0);
  const duration = toast.duration || 3000;

  useEffect(() => {
    startTimeRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (isPaused) return;
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, ((duration - elapsed) / duration) * 100);
      setProgress(remaining);
      
      if (remaining === 0) {
        onRemove(toast.id);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isPaused, duration, onRemove, toast.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onRemove(toast.id);
      }
    };

    const currentToast = toastRef.current;
    if (currentToast) {
      currentToast.addEventListener('keydown', handleKeyDown);
      currentToast.focus();
    }

    return () => {
      if (currentToast) {
        currentToast.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [onRemove, toast.id]);

  return (
    <div
      ref={toastRef}
      tabIndex={-1}
      role="status"
      aria-live="polite"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => {
        setIsPaused(false);
        startTimeRef.current = Date.now() - ((100 - progress) / 100) * duration;
      }}
      className={`px-4 py-3 rounded-xl shadow-lg text-white min-w-[300px] flex items-center justify-between border-l-4 focus:outline-none focus:ring-2 focus:ring-brand-500 ${
        toast.type === 'success' ? 'bg-green-600 border-l-green-400' : toast.type === 'error' ? 'bg-red-600 border-l-red-400' : 'bg-brand-600 border-l-brand-400'
      }`}
    >
      <span>{toast.message}</span>
      <div className="flex items-center gap-2">
        <div className="w-16 h-1 bg-white/20 rounded-full overflow-hidden">
          <div 
            className="h-full bg-white/80 rounded-full transition-all duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>
        <button
          onClick={() => onRemove(toast.id)}
          className="ml-2 text-white/80 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white rounded"
          aria-label="Tutup notifikasi"
        >
          ×
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