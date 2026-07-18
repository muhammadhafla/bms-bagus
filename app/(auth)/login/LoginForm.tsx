'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { IconLock, IconEye, IconEyeOff, IconUser } from '@tabler/icons-react';
import { Button } from '@/components/ui';

export function LoginForm() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [identifierError, setIdentifierError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const { signIn, loading, user } = useAuthStore();
  const router = useRouter();
  const identifierInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    identifierInputRef.current?.focus();
  }, []);

  const validateForm = () => {
    let isValid = true;
    setIdentifierError('');
    setPasswordError('');

    if (!identifier) {
      setIdentifierError('Email atau Username wajib diisi');
      isValid = false;
    } else if (identifier.includes('@') && !/\S+@\S+\.\S+/.test(identifier)) {
      setIdentifierError('Format email tidak valid');
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

    let loginEmail = identifier.trim();

    // Resolve username to email if it's not an email
    if (!loginEmail.includes('@')) {
      const { data, error: resolveError } = await supabase.rpc('resolve_username', {
        p_username: loginEmail.toLowerCase()
      });

      if (resolveError || !data) {
        setError('Email/username atau password salah');
        return;
      }
      loginEmail = data;
    }

    const result = await signIn(loginEmail, password);
    if (result.success) {
      router.push('/dashboard');
    } else {
      setError(result.error?.includes('Invalid') ? 'Email/username atau password salah' : result.error || 'Login gagal');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-accent-rose-50 dark:bg-accent-rose-950/50 text-accent-rose-600 dark:text-accent-rose-400 p-4 rounded-xl text-sm border border-accent-rose-200 dark:border-accent-rose-800 animate-fade-in flex items-center gap-2" role="alert">
          <IconLock size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-1.5">
        <div className="relative group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-brand-500 transition-colors">
            <IconUser size={20} />
          </div>
          <input
            ref={identifierInputRef}
            id="identifier"
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className={`peer w-full pl-12 pr-4 pt-6 pb-2 rounded-xl border-2 outline-none transition-all ${
              identifierError 
                ? 'border-accent-rose-400 focus:border-accent-rose-500 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.15)] bg-accent-rose-50/30' 
                : 'border-neutral-200 dark:border-neutral-800 focus:border-brand-500 focus:shadow-[0_0_0_4px_rgba(99,102,241,0.1)] bg-neutral-50 dark:bg-neutral-900 focus:bg-white dark:focus:bg-neutral-950'
            } text-neutral-900 dark:text-neutral-100 placeholder-transparent`}
            placeholder="email atau username"
            required
            autoComplete="username"
            aria-invalid={!!identifierError}
            aria-describedby={identifierError ? 'identifier-error' : undefined}
          />
          <label htmlFor="identifier" className="absolute left-12 top-2 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:font-normal peer-focus:top-2 peer-focus:-translate-y-0 peer-focus:text-[11px] peer-focus:font-semibold peer-focus:text-brand-500 pointer-events-none uppercase tracking-wide">
            Email atau Username
          </label>
        </div>
        {identifierError && (
          <p id="identifier-error" className="text-sm text-accent-rose-600 dark:text-accent-rose-400 pl-1 animate-fade-in-up">{identifierError}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="relative group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-brand-500 transition-colors">
            <IconLock size={20} />
          </div>
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`peer w-full pl-12 pr-12 pt-6 pb-2 rounded-xl border-2 outline-none transition-all ${
              passwordError 
                ? 'border-accent-rose-400 focus:border-accent-rose-500 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.15)] bg-accent-rose-50/30' 
                : 'border-neutral-200 dark:border-neutral-800 focus:border-brand-500 focus:shadow-[0_0_0_4px_rgba(99,102,241,0.1)] bg-neutral-50 dark:bg-neutral-900 focus:bg-white dark:focus:bg-neutral-950'
            } text-neutral-900 dark:text-neutral-100 placeholder-transparent`}
            placeholder="password"
            required
            autoComplete="current-password"
            aria-invalid={!!passwordError}
            aria-describedby={passwordError ? 'password-error' : undefined}
          />
          <label htmlFor="password" className="absolute left-12 top-2 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:font-normal peer-focus:top-2 peer-focus:-translate-y-0 peer-focus:text-[11px] peer-focus:font-semibold peer-focus:text-brand-500 pointer-events-none uppercase tracking-wide">
            Password
          </label>
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors p-1"
            aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
          >
            {showPassword ? <IconEyeOff size={20} /> : <IconEye size={20} />}
          </button>
        </div>
        {passwordError && (
          <p id="password-error" className="text-sm text-accent-rose-600 dark:text-accent-rose-400 pl-1 animate-fade-in-up">{passwordError}</p>
        )}
      </div>

      <Button
        type="submit"
        disabled={loading}
        fullWidth
        size="lg"
        variant="primary"
        className="mt-2 text-base tracking-wide shadow-brand"
        onClick={() => {
          if ('vibrate' in navigator) navigator.vibrate(15);
        }}
      >
        {loading ? 'Memverifikasi...' : 'Masuk'}
      </Button>
    </form>
  );
}
