'use client';

import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
          <div className="shadow-elevated relative w-full max-w-md overflow-hidden rounded-2xl border border-neutral-100 bg-white p-8 text-center">
            <div className="bg-accent-rose-100 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
              <span className="text-accent-rose-600 text-3xl">⚠️</span>
            </div>
            <h1 className="mb-4 text-2xl font-bold text-neutral-900 dark:text-white">
              Terjadi Kesalahan
            </h1>
            <p className="mb-6 text-neutral-600 dark:text-neutral-400">
              Terjadi kesalahan tak terduga. Silakan muat ulang halaman.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 rounded-xl bg-gradient-to-r px-6 py-3 font-medium text-white shadow-md transition-all"
            >
              Muat Ulang
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
