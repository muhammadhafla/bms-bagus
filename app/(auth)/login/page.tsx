import Image from 'next/image';
import { LoginForm } from './LoginForm';
import { ThemeToggle } from './ThemeToggle';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login',
  description: 'Masuk ke BMS Bagus Management System',
};

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Theme Toggle */}
      <ThemeToggle />

      {/* Background pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-neutral-50 via-neutral-100 to-neutral-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950" />
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative w-full max-w-md px-4">
        <div className="shadow-elevated animate-scale-in rounded-3xl border border-neutral-200 bg-white p-8 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mb-8 text-center">
            <div className="relative mx-auto mb-3 inline-flex h-24 w-24 items-center justify-center p-2 transition-all dark:rounded-3xl dark:bg-white dark:shadow-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/logo.svg"
                alt="BMS Bagus"
                className="h-full w-full object-contain"
              />
            </div>
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  );
}
