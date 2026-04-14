'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth';
import { IconLock } from '@tabler/icons-react';
import Image from 'next/image';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const { signIn, loading, user } = useAuthStore();
  const router = useRouter();
  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

  const validateForm = () => {
    let isValid = true;
    setEmailError('');
    setPasswordError('');

    if (!email) {
      setEmailError('Email wajib diisi');
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Format email tidak valid');
      isValid = false;
    }

    if (!password) {
      setPasswordError('Password wajib diisi');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password minimal 6 karakter');
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    const result = await signIn(email, password);
    if (result.success) {
      router.push('/');
    } else {
      setError(result.error || 'Login gagal');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl p-8 border border-neutral-200 dark:border-neutral-800">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-lg mb-4 overflow-hidden">
              <Image src="/images/logo.png" alt="BMS Logo" fill className="object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">BMS</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Bagus Management System</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm border border-red-200 dark:border-red-800" role="alert">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Email
              </label>
              <input
                ref={emailInputRef}
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-4 py-3 rounded-lg border outline-none transition-colors ${
                  emailError 
                    ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-900' 
                    : 'border-neutral-200 dark:border-neutral-700 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:focus:ring-brand-900'
                } bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100`}
                placeholder="admin@example.com"
                required
                autoComplete="username"
                aria-invalid={!!emailError}
                aria-describedby={emailError ? 'email-error' : undefined}
              />
              {emailError && (
                <p id="email-error" className="mt-1 text-sm text-red-600 dark:text-red-400">{emailError}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-4 py-3 rounded-lg border outline-none transition-colors ${
                  passwordError 
                    ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-900' 
                    : 'border-neutral-200 dark:border-neutral-700 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:focus:ring-brand-900'
                } bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100`}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                aria-invalid={!!passwordError}
                aria-describedby={passwordError ? 'password-error' : undefined}
              />
              {passwordError && (
                <p id="password-error" className="mt-1 text-sm text-red-600 dark:text-red-400">{passwordError}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-brand-500 to-brand-600 text-white font-medium rounded-lg hover:from-brand-600 hover:to-brand-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
            >
              {loading ? 'Loading...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
