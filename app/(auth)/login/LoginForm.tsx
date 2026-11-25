'use client';

import { useState, useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAuthStore } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { IconLock, IconEye, IconEyeOff, IconUser } from '@tabler/icons-react';
import { Button, TextInput } from '@/components/ui';

function getSafeRedirectTarget(): string {
  if (typeof window === 'undefined') return '/dashboard';
  const rawRedirect = new URLSearchParams(window.location.search).get('redirectTo');
  if (
    rawRedirect &&
    rawRedirect.startsWith('/') &&
    !rawRedirect.startsWith('//') &&
    !rawRedirect.startsWith('/login')
  ) {
    return rawRedirect;
  }
  return '/dashboard';
}

export function LoginForm() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [identifierError, setIdentifierError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signIn, loading } = useAuthStore(
    useShallow((state) => ({ signIn: state.signIn, loading: state.loading })),
  );
  const identifierInputRef = useRef<HTMLInputElement>(null);

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

  const isBusy = isSubmitting || loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBusy) return;
    setError('');

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      let loginEmail = identifier.trim();

      // Resolve username to email if it's not an email
      if (!loginEmail.includes('@')) {
        const { data, error: resolveError } = await supabase.rpc('resolve_username', {
          p_username: loginEmail.toLowerCase(),
        });

        if (resolveError || !data) {
          setError('Email/username atau password salah');
          setIsSubmitting(false);
          return;
        }
        loginEmail = data;
      }

      const result = await signIn(loginEmail, password);
      if (result.success) {
        // Hard navigation menghindari router cache / RSC hang pasca set-cookie login
        // sekaligus menjaga tombol tetap nonaktif sampai halaman berpindah.
        window.location.assign(getSafeRedirectTarget());
      } else {
        setError(
          result.error?.includes('Invalid')
            ? 'Email/username atau password salah'
            : result.error || 'Login gagal',
        );
        setIsSubmitting(false);
      }
    } catch {
      setError('Terjadi kesalahan saat login');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div
          className="bg-accent-rose-50 dark:bg-accent-rose-950/50 text-accent-rose-600 dark:text-accent-rose-400 border-accent-rose-200 dark:border-accent-rose-800 animate-fade-in flex items-center gap-2 rounded-xl border p-4 text-sm"
          role="alert"
        >
          <IconLock size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <TextInput
        ref={identifierInputRef}
        id="identifier"
        type="text"
        label="Email atau Username"
        placeholder="email atau username"
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
        error={identifierError}
        icon={<IconUser size={20} />}
        required
        autoComplete="username"
      />

      <TextInput
        id="password"
        type={showPassword ? 'text' : 'password'}
        label="Password"
        placeholder="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={passwordError}
        icon={<IconLock size={20} />}
        rightElement={
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="p-3 text-neutral-400 transition-colors hover:text-neutral-600 dark:hover:text-neutral-300"
            aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
          >
            {showPassword ? <IconEyeOff size={20} /> : <IconEye size={20} />}
          </button>
        }
        required
        autoComplete="current-password"
      />

      <Button
        type="submit"
        disabled={isBusy}
        loading={isBusy}
        fullWidth
        size="lg"
        variant="primary"
        className="shadow-brand mt-2 text-base tracking-wide"
        onClick={() => {
          if ('vibrate' in navigator) navigator.vibrate(15);
        }}
      >
        {isBusy ? 'Memverifikasi...' : 'Masuk'}
      </Button>
    </form>
  );
}
