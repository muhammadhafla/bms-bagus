'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { IconLock, IconEye, IconEyeOff, IconUser } from '@tabler/icons-react';
import { Button, TextInput } from '@/components/ui';

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
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors p-3"
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
