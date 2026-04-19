'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth';
import { IconLock, IconMail, IconMoon, IconSun, IconEye, IconEyeOff } from '@tabler/icons-react';
import { useDarkMode } from '@/components/DarkModeProvider';
import Image from 'next/image';
import TextInput from '@/components/ui/TextInput';
import { Button } from '@/components/ui';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const { signIn, loading, user } = useAuthStore();
  const router = useRouter();
  const emailInputRef = useRef<HTMLInputElement>(null);
  const { theme, toggleTheme } = useDarkMode();

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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-2.5 rounded-xl bg-white dark:bg-neutral-900 shadow-elevated border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all btn-press z-10"
        aria-label={theme === 'light' ? 'Aktifkan Dark Mode' : 'Aktifkan Light Mode'}
      >
        {theme === 'light' ? <IconMoon className="w-5 h-5" /> : <IconSun className="w-5 h-5" />}
      </button>
      
      {/* Background pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-neutral-50 via-neutral-100 to-neutral-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950" />
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02]" 
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }} 
      />
      
      <div className="relative w-full max-w-md px-4">
        <div className="bg-white dark:bg-neutral-900 rounded-3xl shadow-elevated border border-neutral-200 dark:border-neutral-800 p-8 animate-scale-in">
          <div className="text-center mb-8">
            <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl shadow-brand mb-5 overflow-hidden bg-gradient-to-br from-brand-400 to-brand-600">
              <Image src="/images/logo.png" alt="BMS Logo" fill className="object-contain p-3" />
            </div>
            <h1 className="text-h1 font-bold text-neutral-900 dark:text-white tracking-tight">BMS</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1.5 font-medium">Bagus Management System</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-accent-rose-50 dark:bg-accent-rose-950/50 text-accent-rose-600 dark:text-accent-rose-400 p-4 rounded-xl text-sm border border-accent-rose-200 dark:border-accent-rose-800 animate-fade-in" role="alert">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                Email
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">
                  <IconMail size={18} />
                </div>
                <input
                  ref={emailInputRef}
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full pl-11 pr-4 py-3.5 rounded-xl border-2 outline-none transition-all btn-press ${
                    emailError 
                      ? 'border-accent-rose-400 focus:border-accent-rose-500 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.15)]' 
                      : 'border-neutral-200 dark:border-neutral-700 focus:border-brand-500 focus:shadow-brand'
                  } bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400`}
                  placeholder="admin@example.com"
                  required
                  autoComplete="username"
                  aria-invalid={!!emailError}
                  aria-describedby={emailError ? 'email-error' : undefined}
                />
              </div>
              {emailError && (
                <p id="email-error" className="text-sm text-accent-rose-600 dark:text-accent-rose-400">{emailError}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                Password
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">
                  <IconLock size={18} />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-11 pr-12 py-3.5 rounded-xl border-2 outline-none transition-all btn-press ${
                    passwordError 
                      ? 'border-accent-rose-400 focus:border-accent-rose-500 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.15)]' 
                      : 'border-neutral-200 dark:border-neutral-700 focus:border-brand-500 focus:shadow-brand'
                  } bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400`}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  aria-invalid={!!passwordError}
                  aria-describedby={passwordError ? 'password-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                </button>
              </div>
              {passwordError && (
                <p id="password-error" className="text-sm text-accent-rose-600 dark:text-accent-rose-400">{passwordError}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              fullWidth
              size="lg"
              variant="primary"
            >
              {loading ? 'Memuat...' : 'Masuk'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}