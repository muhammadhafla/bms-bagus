'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth';
import {
  IconPackage,
  IconShoppingCart,
  IconArrowBack,
  IconReport,
  IconReceipt,
  IconSun,
  IconMoon,
} from '@tabler/icons-react';
import { useDarkMode } from '@/components/DarkModeProvider';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, initialized, signOut } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useDarkMode();

  useEffect(() => {
    if (initialized && !user) {
      router.push('/login');
    }
  }, [user, initialized, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-neutral-500 dark:text-neutral-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const navItems = [
    { href: '/inventory', title: 'Inventory', icon: IconPackage },
    { href: '/pembelian', title: 'Pembelian', icon: IconShoppingCart },
    { href: '/return', title: 'Return', icon: IconArrowBack },
    { href: '/reports', title: 'Laporan', icon: IconReport },
    { href: '/receipt', title: 'Struk', icon: IconReceipt },
  ];

  return (
    <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <aside className="w-64 bg-white dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-800 flex flex-col">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 relative rounded-xl flex items-center justify-center shadow-md overflow-hidden">
              <img src="/images/logo.png" alt="BMS Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-lg font-bold text-neutral-900 dark:text-white">BMS</h1>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.title}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 space-y-2">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-lg dark:text-neutral-300 dark:bg-neutral-900 dark:hover:text-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            {theme === 'light' ? (
              <IconMoon className="w-5 h-5" />
            ) : (
              <IconSun className="w-5 h-5" />
            )}
            <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
          </button>
          <button
            onClick={handleSignOut}
            className="w-full px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-lg dark:text-neutral-300 dark:bg-neutral-900 dark:hover:text-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
