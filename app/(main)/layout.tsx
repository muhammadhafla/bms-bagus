'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/lib/auth';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useDarkMode } from '@/components/DarkModeProvider';
import { useToast } from '@/components/ui/Toast';
import {
  IconPackage,
  IconShoppingCart,
  IconArrowBack,
  IconReport,
  IconReceipt,
  IconClipboardCheck,
  IconUsers,
  IconLogout,
  IconSun,
  IconMoon,
  IconChevronRight,
  IconHistory,
} from '@tabler/icons-react';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, initialized, signOut, isAdmin } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useDarkMode();
  const { showToast } = useToast();
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [inventoryExpanded, setInventoryExpanded] = useState(true);
  const [purchasingExpanded, setPurchasingExpanded] = useState(true);
  const [transactionsExpanded, setTransactionsExpanded] = useState(true);

  useEffect(() => {
    if (initialized && !user) {
      router.push('/login');
    }
  }, [user, initialized, router]);

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
    } catch (error) {
      showToast('Gagal keluar dari sistem', 'error');
      setIsLoggingOut(false);
      setLogoutConfirmOpen(false);
      router.push('/login');
    }
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
    { href: '/dashboard', title: 'Dashboard', icon: IconPackage },
    ...(isAdmin() ? [
      { href: '/users', title: 'Users', icon: IconUsers },
    ] : []),
  ];

  const inventoryItems = [
    { href: '/inventory', title: 'Stock', icon: IconPackage },
    { href: '/inventory/stock-opname', title: 'Stock Opname', icon: IconClipboardCheck },
    { href: '/inventory/reports', title: 'Laporan', icon: IconReport },
  ];

  const purchasingItems = [
    { href: '/purchasing', title: 'Transaksi Baru', icon: IconShoppingCart },
    { href: '/purchasing/riwayat', title: 'Riwayat', icon: IconHistory },
  ];

  const transactionsItems = [
    { href: '/transactions/receipt', title: 'Struk', icon: IconReceipt },
    { href: '/transactions/return', title: 'Return', icon: IconArrowBack },
  ];

  const isInventoryActive = pathname.startsWith('/inventory');
  const isPurchasingActive = pathname.startsWith('/purchasing');
  const isTransactionsActive = pathname.startsWith('/transactions');

  return (
    <div className="flex min-h-screen bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">
      <ConfirmDialog
        isOpen={logoutConfirmOpen}
        title="Keluar dari Sistem"
        message="Apakah Anda yakin ingin keluar dari sistem?"
        confirmLabel="Ya, Keluar"
        cancelLabel="Batal"
        onConfirm={handleSignOut}
        onCancel={() => setLogoutConfirmOpen(false)}
        danger
      />
      
      {/* Sidebar - Pusat Kontrol & Branding */}
      <aside className="w-64 bg-white dark:bg-neutral-950 flex flex-col shadow-sm">
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
          <Link href="/" className="flex items-center gap-4">
            <div className="w-12 h-12 relative rounded-xl flex items-center justify-center shadow-md overflow-hidden">
              <Image src="/images/logo.png" alt="BMS Logo" fill className="object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">BMS</h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Inventory System</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 shadow-sm'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.title}</span>
              </Link>
            );
          })}

          {/* Inventory Group */}
          <button
            onClick={() => setInventoryExpanded(!inventoryExpanded)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              isInventoryActive
                ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 shadow-sm'
                : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100'
            }`}
          >
            <IconPackage className="w-5 h-5" />
            <span className="flex-1 text-left">Inventory</span>
            <IconChevronRight className={`w-4 h-4 transition-transform ${inventoryExpanded ? 'rotate-90' : ''}`} />
          </button>

          {inventoryExpanded && (
            <div className="ml-4 pl-4 border-l border-neutral-200 dark:border-neutral-700 space-y-1">
              {inventoryItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'text-brand-700 dark:text-brand-300 font-semibold'
                        : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.title}</span>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Purchasing Group */}
          <button
            onClick={() => setPurchasingExpanded(!purchasingExpanded)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              isPurchasingActive
                ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 shadow-sm'
                : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100'
            }`}
          >
            <IconShoppingCart className="w-5 h-5" />
            <span className="flex-1 text-left">Purchasing</span>
            <IconChevronRight className={`w-4 h-4 transition-transform ${purchasingExpanded ? 'rotate-90' : ''}`} />
          </button>

          {purchasingExpanded && (
            <div className="ml-4 pl-4 border-l border-neutral-200 dark:border-neutral-700 space-y-1">
              {purchasingItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'text-brand-700 dark:text-brand-300 font-semibold'
                        : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.title}</span>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Transactions Group */}
          <button
            onClick={() => setTransactionsExpanded(!transactionsExpanded)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              isTransactionsActive
                ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 shadow-sm'
                : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100'
            }`}
          >
            <IconReceipt className="w-5 h-5" />
            <span className="flex-1 text-left">Transactions</span>
            <IconChevronRight className={`w-4 h-4 transition-transform ${transactionsExpanded ? 'rotate-90' : ''}`} />
          </button>

          {transactionsExpanded && (
            <div className="ml-4 pl-4 border-l border-neutral-200 dark:border-neutral-700 space-y-1">
              {transactionsItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'text-brand-700 dark:text-brand-300 font-semibold'
                        : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.title}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </nav>

        {/* User Info & Control */}
        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
          {/* User Profile */}
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-900">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">{user?.email || 'User'}</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{isAdmin() ? 'Administrator' : 'Staff'}</p>
            </div>
          </div>

          {/* Toggle Theme */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 transition-colors"
          >
            <div className="w-5 h-5 flex items-center justify-center">
              {theme === 'light' ? <IconMoon className="w-5 h-5" /> : <IconSun className="w-5 h-5" />}
            </div>
            <span className="flex-1">{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
          </button>

          {/* Logout */}
          <button
            onClick={() => setLogoutConfirmOpen(true)}
            disabled={isLoggingOut}
            className="w-full px-4 py-3 text-sm text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-xl dark:text-neutral-300 dark:bg-neutral-900 dark:hover:text-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="w-5 h-5 flex items-center justify-center">
              {isLoggingOut ? (
                <div className="w-4 h-4 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <IconLogout className="w-5 h-5" />
              )}
            </div>
            <span className="flex-1">{isLoggingOut ? 'Keluar...' : 'Logout'}</span>
          </button>
        </div>
      </aside>

      {/* Konten Utama */}
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
