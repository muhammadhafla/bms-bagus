'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  IconPackage,
  IconShoppingCart,
  IconArrowBack,
  IconReport,
  IconReceipt,
  IconSun,
  IconMoon,
  IconLogout,
  IconMenu,
  IconX,
} from '@tabler/icons-react';
import { useDarkMode } from '@/components/DarkModeProvider';
import { useState, useEffect, useRef } from 'react';

interface NavbarProps {
  userEmail?: string;
  onLogout?: () => void;
}

const navItems = [
  { href: '/inventory', title: 'Inventory', icon: IconPackage },
  { href: '/pembelian', title: 'Pembelian', icon: IconShoppingCart },
  { href: '/return', title: 'Return', icon: IconArrowBack },
  { href: '/reports', title: 'Laporan', icon: IconReport },
  { href: '/receipt', title: 'Struk', icon: IconReceipt },
];

export default function Navbar({ userEmail, onLogout }: NavbarProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useDarkMode();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isMobileMenuOpen && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const getCurrentPage = () => {
    const item = navItems.find((item) => item.href === pathname);
    return item?.title || 'Home';
  };

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <button
            className="md:hidden p-2 rounded-lg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Buka menu"
            aria-expanded={isMobileMenuOpen}
          >
            <IconMenu className="w-6 h-6" />
          </button>
          
          <Link href="/" className="flex items-center gap-2">
            <img src="/images/logo.png" alt="BMS Logo" className="w-8 h-8 rounded-lg" />
            <span className="font-bold text-neutral-900 dark:text-white hidden sm:block">BMS</span>
          </Link>
          
          <div className="hidden md:block h-6 w-px bg-neutral-200 dark:bg-neutral-700" />
          
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400'
                      : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  {item.title}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500 dark:text-neutral-400 hidden sm:block">
            {getCurrentPage()}
          </span>
          
          <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-700" />
          
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? (
              <IconMoon className="w-5 h-5" />
            ) : (
              <IconSun className="w-5 h-5" />
            )}
          </button>

          {userEmail && onLogout && (
            <>
              <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-700" />
              <button
                onClick={onLogout}
                className="p-2 rounded-lg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                aria-label="Logout"
              >
                <IconLogout className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>

      {isMobileMenuOpen && (
        <div 
          ref={mobileMenuRef}
          className="fixed inset-0 z-50 bg-white dark:bg-neutral-900 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu navigasi"
        >
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
              <Link href="/" className="flex items-center gap-2">
                <img src="/images/logo.png" alt="BMS Logo" className="w-8 h-8 rounded-lg" />
                <span className="font-bold text-neutral-900 dark:text-white">BMS</span>
              </Link>
              <button
                ref={closeButtonRef}
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-lg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                aria-label="Tutup menu"
              >
                <IconX className="w-6 h-6" />
              </button>
            </div>

            <nav className="flex-1 overflow-auto py-4 px-4" role="navigation">
              <ul className="space-y-2">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={isActive ? 'page' : undefined}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                          isActive
                            ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400'
                            : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        {item.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="px-4 py-4 border-t border-neutral-200 dark:border-neutral-800">
              <button
                onClick={toggleTheme}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                {theme === 'light' ? (
                  <IconMoon className="w-5 h-5" />
                ) : (
                  <IconSun className="w-5 h-5" />
                )}
                <span className="font-medium">{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
              </button>
              
              {userEmail && onLogout && (
                <button
                  onClick={onLogout}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <IconLogout className="w-5 h-5" />
                  <span className="font-medium">Logout</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
