'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/lib/auth';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useDarkMode } from '@/components/DarkModeProvider';
import { useToast } from '@/components/ui/Toast';
import Tooltip from '@/components/ui/Tooltip';
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
  IconMenu,
  IconX,
  IconArrowLeft,
  IconArrowRight,
} from '@tabler/icons-react';

// Constants extracted outside component to prevent re-creation
const NAV_ITEMS = [
  { href: '/dashboard', title: 'Dashboard', icon: IconPackage },
];

const INVENTORY_ITEMS = [
  { href: '/inventory', title: 'Stock', icon: IconPackage },
  { href: '/inventory/stock-opname', title: 'Stock Opname', icon: IconClipboardCheck },
  { href: '/inventory/reports', title: 'Laporan', icon: IconReport },
];

const PURCHASING_ITEMS = [
  { href: '/purchasing', title: 'Transaksi Baru', icon: IconShoppingCart },
  { href: '/purchasing/riwayat', title: 'Riwayat', icon: IconHistory },
];

const TRANSACTIONS_ITEMS = [
  { href: '/transactions/receipt', title: 'Struk', icon: IconReceipt },
  { href: '/transactions/return', title: 'Return', icon: IconArrowBack },
];

// Storage keys
const STORAGE_KEYS = {
  SIDEBAR_COLLAPSED: 'bms-sidebar-collapsed',
  INVENTORY_EXPANDED: 'bms-inventory-expanded',
  PURCHASING_EXPANDED: 'bms-purchasing-expanded',
  TRANSACTIONS_EXPANDED: 'bms-transactions-expanded',
} as const;

// Helper to read from localStorage safely
function getStoredValue<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

// Helper to write to localStorage safely
function setStoredValue<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // silently fail
  }
}

interface SidebarGroupProps {
  title: string;
  icon: React.ElementType;
  isActive: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  sidebarCollapsed: boolean;
  groupId: string;
}

function SidebarGroup({
  title,
  icon: Icon,
  isActive,
  isExpanded,
  onToggle,
  children,
  sidebarCollapsed,
  groupId,
}: SidebarGroupProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle();
    }
  }, [onToggle]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={onToggle}
        onKeyDown={handleKeyDown}
        aria-expanded={isExpanded}
        aria-controls={`group-${groupId}`}
        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
          isActive
            ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 shadow-sm'
            : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100'
        }`}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span className={`flex-1 text-left transition-all ${sidebarCollapsed ? 'lg:hidden' : 'lg:block'}`}>
          {title}
        </span>
        <IconChevronRight
          className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {isExpanded && (
        <div
          id={`group-${groupId}`}
          role="group"
          aria-label={`${title} submenu`}
          className="ml-4 pl-4 border-l border-neutral-200 dark:border-neutral-700 space-y-1"
        >
          {children}
        </div>
      )}
    </>
  );
}

interface SidebarLinkProps {
  href: string;
  title: string;
  icon: React.ElementType;
  isActive: boolean;
  sidebarCollapsed: boolean;
}

function SidebarLink({ href, title, icon: Icon, isActive, sidebarCollapsed }: SidebarLinkProps) {
  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
        isActive
          ? 'text-brand-700 dark:text-brand-300 font-semibold'
          : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
      }`}
    >
      <Icon className={`w-4 h-4 flex-shrink-0 ${sidebarCollapsed ? 'lg:w-3 lg:h-3' : ''}`} />
      <span className={`transition-all ${sidebarCollapsed ? 'lg:hidden' : 'lg:block'}`}>
        {title}
      </span>
    </Link>
  );
}

function CollapsedIconButton({
  onClick,
  title,
  icon: Icon,
  'aria-label': ariaLabel,
}: {
  onClick: () => void;
  title: string;
  icon: React.ElementType;
  'aria-label': string;
}) {
  return (
    <Tooltip content={title}>
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className="hidden lg:flex p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 items-center justify-center"
      >
        <Icon className="w-5 h-5" />
      </button>
    </Tooltip>
  );
}

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

  // State with localStorage persistence
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() =>
    getStoredValue(STORAGE_KEYS.SIDEBAR_COLLAPSED, false)
  );
  const [inventoryExpanded, setInventoryExpanded] = useState<boolean>(() =>
    getStoredValue(STORAGE_KEYS.INVENTORY_EXPANDED, true)
  );
  const [purchasingExpanded, setPurchasingExpanded] = useState<boolean>(() =>
    getStoredValue(STORAGE_KEYS.PURCHASING_EXPANDED, true)
  );
  const [transactionsExpanded, setTransactionsExpanded] = useState<boolean>(() =>
    getStoredValue(STORAGE_KEYS.TRANSACTIONS_EXPANDED, true)
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Persist state changes to localStorage
  useEffect(() => {
    setStoredValue(STORAGE_KEYS.SIDEBAR_COLLAPSED, sidebarCollapsed);
  }, [sidebarCollapsed]);

  useEffect(() => {
    setStoredValue(STORAGE_KEYS.INVENTORY_EXPANDED, inventoryExpanded);
  }, [inventoryExpanded]);

  useEffect(() => {
    setStoredValue(STORAGE_KEYS.PURCHASING_EXPANDED, purchasingExpanded);
  }, [purchasingExpanded]);

  useEffect(() => {
    setStoredValue(STORAGE_KEYS.TRANSACTIONS_EXPANDED, transactionsExpanded);
  }, [transactionsExpanded]);

  // Auth redirect
  useEffect(() => {
    if (initialized && !user) {
      router.push('/login');
    }
  }, [user, initialized, router]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Memoize computed values
  const isAdminUser = useMemo(() => isAdmin(), [isAdmin]);
  const navItems = useMemo(() => {
    const items = [...NAV_ITEMS];
    if (isAdminUser) {
      items.push({ href: '/users', title: 'Users', icon: IconUsers });
    }
    return items;
  }, [isAdminUser]);

  const isInventoryActive = useMemo(() => pathname.startsWith('/inventory'), [pathname]);
  const isPurchasingActive = useMemo(() => pathname.startsWith('/purchasing'), [pathname]);
  const isTransactionsActive = useMemo(() => pathname.startsWith('/transactions'), [pathname]);

  // Memoized handlers
  const handleSignOut = useCallback(async () => {
    setIsLoggingOut(true);
    setLogoutConfirmOpen(false);
    await signOut();
    router.push('/login');
    router.refresh();
  }, [signOut, router]);

  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  const handleToggleInventory = useCallback(() => {
    setInventoryExpanded((prev) => !prev);
  }, []);

  const handleTogglePurchasing = useCallback(() => {
    setPurchasingExpanded((prev) => !prev);
  }, []);

  const handleToggleTransactions = useCallback(() => {
    setTransactionsExpanded((prev) => !prev);
  }, []);

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

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - Responsive */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50 bg-white dark:bg-neutral-950 flex flex-col shadow-sm transform transition-all duration-300 ease-in-out
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${sidebarCollapsed ? 'lg:w-28' : 'lg:w-64'}
        `}
        aria-label="Sidebar navigation"
      >
        {/* Header */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-4">
            <div
              className={`relative rounded-xl flex items-center justify-center shadow-md overflow-hidden transition-all ${sidebarCollapsed ? 'w-8 h-8' : 'w-10 h-10'}`}
            >
              <Image src="/images/logo.png" alt="BMS Logo" fill className="object-contain" />
            </div>
            <div className={`transition-all ${sidebarCollapsed ? 'lg:hidden' : 'lg:block'}`}>
              <h1 className="text-lg font-bold text-neutral-900 dark:text-white">BMS</h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Inventory</p>
            </div>
          </Link>

          <div className="flex items-center gap-1">
            <CollapsedIconButton
              onClick={handleToggleSidebar}
              title={sidebarCollapsed ? 'Buka Sidebar' : 'Tutup Sidebar'}
              icon={sidebarCollapsed ? IconArrowRight : IconArrowLeft}
              aria-label={sidebarCollapsed ? 'Buka Sidebar' : 'Tutup Sidebar'}
            />
            <button
              type="button"
              className="lg:hidden p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Tutup menu mobile"
            >
              <IconX className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 lg:p-4 space-y-1 overflow-y-auto">
          {/* Main nav items */}
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <SidebarLink
                key={item.href}
                href={item.href}
                title={item.title}
                icon={item.icon}
                isActive={isActive}
                sidebarCollapsed={sidebarCollapsed}
              />
            );
          })}

          {/* Inventory Group */}
          <SidebarGroup
            title="Inventory"
            icon={IconPackage}
            isActive={isInventoryActive}
            isExpanded={inventoryExpanded}
            onToggle={handleToggleInventory}
            sidebarCollapsed={sidebarCollapsed}
            groupId="inventory"
          >
            {INVENTORY_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <SidebarLink
                  key={item.href}
                  href={item.href}
                  title={item.title}
                  icon={item.icon}
                  isActive={isActive}
                  sidebarCollapsed={sidebarCollapsed}
                />
              );
            })}
          </SidebarGroup>

          {/* Purchasing Group */}
          <SidebarGroup
            title="Purchasing"
            icon={IconShoppingCart}
            isActive={isPurchasingActive}
            isExpanded={purchasingExpanded}
            onToggle={handleTogglePurchasing}
            sidebarCollapsed={sidebarCollapsed}
            groupId="purchasing"
          >
            {PURCHASING_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <SidebarLink
                  key={item.href}
                  href={item.href}
                  title={item.title}
                  icon={item.icon}
                  isActive={isActive}
                  sidebarCollapsed={sidebarCollapsed}
                />
              );
            })}
          </SidebarGroup>

          {/* Transactions Group */}
          <SidebarGroup
            title="Transactions"
            icon={IconReceipt}
            isActive={isTransactionsActive}
            isExpanded={transactionsExpanded}
            onToggle={handleToggleTransactions}
            sidebarCollapsed={sidebarCollapsed}
            groupId="transactions"
          >
            {TRANSACTIONS_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <SidebarLink
                  key={item.href}
                  href={item.href}
                  title={item.title}
                  icon={item.icon}
                  isActive={isActive}
                  sidebarCollapsed={sidebarCollapsed}
                />
              );
            })}
          </SidebarGroup>
        </nav>

        {/* User Info & Controls */}
        <div className={`p-2 lg:p-4 border-t border-neutral-200 dark:border-neutral-800 space-y-2 ${sidebarCollapsed ? 'lg:space-y-1' : ''}`}>
          {/* User Profile */}
          <div
            className={`flex items-center gap-3 px-3 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''}`}
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold flex-shrink-0">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className={`flex-1 min-w-0 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
              <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                {user?.email || 'User'}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                {isAdminUser ? 'Administrator' : 'Staff'}
              </p>
            </div>
          </div>

          {/* Toggle Theme */}
          <button
            type="button"
            onClick={toggleTheme}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 transition-colors ${sidebarCollapsed ? 'lg:justify-center lg:px-3' : ''}`}
            aria-label={theme === 'light' ? 'Aktifkan Dark Mode' : 'Aktifkan Light Mode'}
          >
            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              {theme === 'light' ? <IconMoon className="w-5 h-5" /> : <IconSun className="w-5 h-5" />}
            </div>
            <span className={`flex-1 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
              {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
            </span>
          </button>

          {/* Logout */}
          <button
            type="button"
            onClick={() => setLogoutConfirmOpen(true)}
            disabled={isLoggingOut}
            className="w-full px-4 py-3 text-sm text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-xl dark:text-neutral-300 dark:bg-neutral-900 dark:hover:text-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Keluar dari sistem"
          >
            <div className="w-5 h-5 flex items-center justify-center">
              {isLoggingOut ? (
                <div className="w-4 h-4 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <IconLogout className="w-5 h-5" />
              )}
            </div>
            <span className={`flex-1 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
              {isLoggingOut ? 'Keluar...' : 'Logout'}
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`flex-1 overflow-auto transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-28' : ''}`}
        aria-label="Konten utama"
      >
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center gap-4 p-4 bg-white dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-30">
          <button
            type="button"
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Buka menu"
            aria-expanded={mobileMenuOpen}
          >
            <IconMenu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 relative rounded-lg flex items-center justify-center shadow-sm overflow-hidden">
              <Image src="/images/logo.png" alt="BMS Logo" fill className="object-contain" />
            </div>
            <span className="font-bold text-neutral-900 dark:text-white">BMS</span>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}
