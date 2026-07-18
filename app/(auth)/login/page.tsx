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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Theme Toggle */}
      <ThemeToggle />
      
      {/* Background pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-neutral-50 via-neutral-100 to-neutral-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950" />
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02]" 
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }} 
      />
      
      <div className="relative w-full max-w-md px-4">
        <div className="bg-white dark:bg-neutral-900 rounded-3xl shadow-elevated border border-neutral-200 dark:border-neutral-800 p-8 animate-scale-in">
          <div className="text-center mb-8">
            <div className="relative inline-flex items-center justify-center mx-auto w-24 h-24 mb-3 dark:bg-white dark:rounded-3xl dark:shadow-md transition-all p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/images/logo.svg" 
              alt="BMS Bagus" 
              className="w-full h-full object-contain"
            />
          </div>
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  );
}