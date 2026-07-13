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
        <div className="flex items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-950">
          <div className="bg-white p-8 rounded-2xl shadow-elevated max-w-md w-full border border-neutral-100 text-center relative overflow-hidden">
            <div className="w-16 h-16 bg-accent-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl text-accent-rose-600">⚠️</span>
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">Terjadi Kesalahan</h1>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">
              Terjadi kesalahan tak terduga. Silakan muat ulang halaman.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-xl hover:from-brand-600 hover:to-brand-700 shadow-md transition-all font-medium"
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