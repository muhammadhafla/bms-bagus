'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
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
  IconHistory,
  IconMenu,
  IconDotsVertical,
  IconMenu2,
  IconChevronRight,
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

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, initialized, signOut } = useAuthStore();
  const isAdminUser = useAuthStore(state => state.isAdmin());
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
   const [autoHideEnabled, setAutoHideEnabled] = useState(false);
   const [sidebarHovered, setSidebarHovered] = useState(false);
   const [userMenuOpen, setUserMenuOpen] = useState(false);

   // Computed: sidebar width based on mode
   // Auto-hide ON: shows collapsed (w-16) by default, expands to w-56 on hover
   // Auto-hide OFF: always shows full width w-56
   const isSidebarVisible = autoHideEnabled ? sidebarHovered : true;
   const sidebarWidth = autoHideEnabled
     ? (sidebarHovered ? 'lg:w-56' : 'lg:w-16')
     : 'lg:w-56';
   const contentMargin = autoHideEnabled
     ? (sidebarHovered ? 'lg:ml-56' : 'lg:ml-16')
     : 'lg:ml-56';

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
  const navItems = useMemo(() => {
    const items = [...NAV_ITEMS];
    if (isAdminUser) {
      items.push({ href: '/users', title: 'Users', icon: IconUsers });
    }
    return items;
  }, [isAdminUser]);

  // Memoized handlers
   const handleSignOut = useCallback(async () => {
     setIsLoggingOut(true);
     setLogoutConfirmOpen(false);
     await signOut();
     router.push('/login');
     router.refresh();
   }, [signOut, router]);

   const handleToggleInventory = useCallback(() => {
     setInventoryExpanded((prev) => !prev);
   }, []);

   const handleTogglePurchasing = useCallback(() => {
     setPurchasingExpanded((prev) => !prev);
   }, []);

   const handleToggleTransactions = useCallback(() => {
     setTransactionsExpanded((prev) => !prev);
   }, []);

   const handleToggleAutoHide = useCallback(() => {
     setAutoHideEnabled((prev) => !prev);
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

      {/* Mobile Menu Toggle Button (fixed, only visible on mobile) */}
      <button
        onClick={() => setMobileMenuOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-30 p-2 rounded-lg bg-white dark:bg-neutral-800 shadow-md border border-neutral-200 dark:border-neutral-700"
        aria-label="Open menu"
      >
        <IconMenu className="w-5 h-5" />
      </button>

      {/* Sidebar - Responsive */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 bg-white dark:bg-neutral-950 flex flex-col shadow-sm transform transition-all duration-300 ease-in-out overflow-x-hidden
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${sidebarWidth}
        `}
        aria-label="Sidebar navigation"
        onMouseEnter={() => autoHideEnabled && setSidebarHovered(true)}
        onMouseLeave={() => autoHideEnabled && setSidebarHovered(false)}
      >
          {/* Sidebar Header: Logo + Collapse Toggle */}
          <div className={`p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center ${isSidebarVisible ? 'justify-between' : 'justify-center'}`}>
            <Link href="/" className={`flex items-center ${isSidebarVisible ? 'gap-3' : 'gap-0'} ${!isSidebarVisible ? 'lg:justify-center' : ''}`}>
              <div
                className={`relative rounded-xl flex items-center justify-center shadow-md overflow-hidden transition-all ${!isSidebarVisible && autoHideEnabled ? 'lg:w-6 lg:h-6' : 'w-10 h-10'}`}
              >
                <Image src="/images/logo.png" alt="BMS Logo" fill className="object-contain" />
              </div>
              {isSidebarVisible && (
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-brand-400">
                  BMS
                </span>
              )}
            </Link>
            {isSidebarVisible && (
              <button
                onClick={handleToggleAutoHide}
                className={`p-2 rounded-lg transition-colors hidden lg:block ${autoHideEnabled ? 'bg-brand-100 dark:bg-brand-900 text-brand-600 dark:text-brand-400' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
                aria-label={autoHideEnabled ? 'Disable auto-hide' : 'Enable auto-hide'}
              >
                {autoHideEnabled ? (
                  <IconMenu2 className="w-5 h-5" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                )}
              </button>
            )}
          </div>

         {/* Navigation */}
         <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-4 overflow-x-hidden">
           {/* Main Navigation */}
           <div className="space-y-1">
             {navItems.map((item) => (
               <SidebarLink
                 key={item.href}
                 href={item.href}
                 title={item.title}
                 icon={item.icon}
                 isActive={pathname === item.href}
                 sidebarCollapsed={!isSidebarVisible}
               />
             ))}
           </div>

           {/* Inventory Group */}
           <div className="space-y-1">
             {(isSidebarVisible || mobileMenuOpen) && (
               <button
                 type="button"
                 onClick={handleToggleInventory}
                 className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                 aria-expanded={inventoryExpanded}
               >
                 <span className="flex-1 text-left">Inventory</span>
                 {isSidebarVisible && (
                   <IconChevronRight
                     className={`w-3 h-3 transition-transform ${inventoryExpanded ? 'rotate-90' : ''}`}
                   />
                 )}
               </button>
             )}
              {(inventoryExpanded && (isSidebarVisible || mobileMenuOpen)) ? (
                <div className="space-y-1 pl-2">
                  {INVENTORY_ITEMS.map((item) => (
                    <SidebarLink
                      key={item.href}
                      href={item.href}
                      title={item.title}
                      icon={item.icon}
                      isActive={pathname === item.href}
                      sidebarCollapsed={!isSidebarVisible}
                    />
                  ))}
                </div>
              ) : null}
           </div>

           {/* Purchasing Group */}
           <div className="space-y-1">
             {(isSidebarVisible || mobileMenuOpen) && (
               <button
                 type="button"
                 onClick={handleTogglePurchasing}
                 className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                 aria-expanded={purchasingExpanded}
               >
                 <span className="flex-1 text-left">Purchasing</span>
                 {isSidebarVisible && (
                   <IconChevronRight
                     className={`w-3 h-3 transition-transform ${purchasingExpanded ? 'rotate-90' : ''}`}
                   />
                 )}
               </button>
             )}
              {(purchasingExpanded && (isSidebarVisible || mobileMenuOpen)) ? (
                <div className="space-y-1 pl-2">
                  {PURCHASING_ITEMS.map((item) => (
                    <SidebarLink
                      key={item.href}
                      href={item.href}
                      title={item.title}
                      icon={item.icon}
                      isActive={pathname === item.href}
                      sidebarCollapsed={!isSidebarVisible}
                    />
                  ))}
                </div>
              ) : null}
           </div>

            {/* Transactions Group */}
            <div className="space-y-1">
              {(isSidebarVisible || mobileMenuOpen) && (
                <button
                  type="button"
                  onClick={handleToggleTransactions}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  aria-expanded={transactionsExpanded}
                >
                  <span className="flex-1 text-left">Transactions</span>
                  {isSidebarVisible && (
                    <IconChevronRight
                      className={`w-3 h-3 transition-transform ${transactionsExpanded ? 'rotate-90' : ''}`}
                    />
                  )}
                </button>
              )}
              {(transactionsExpanded && (isSidebarVisible || mobileMenuOpen)) ? (
                <div className="space-y-1 pl-2">
                  {TRANSACTIONS_ITEMS.map((item) => (
                    <SidebarLink
                      key={item.href}
                      href={item.href}
                      title={item.title}
                      icon={item.icon}
                      isActive={pathname === item.href}
                      sidebarCollapsed={!isSidebarVisible}
                    />
                  ))}
                </div>
              ) : null}
            </div>
         </nav>

        {/* Sidebar Footer: User Dropup Menu */}
        <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 relative">
          {/* User Menu Trigger */}
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all relative"
            aria-label="Open user menu"
            aria-expanded={userMenuOpen}
          >
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
              {profile?.nama?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            {isSidebarVisible && (
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                  {profile?.nama || 'User'}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                  {user?.email}
                </p>
              </div>
            )}
            {isSidebarVisible && (
              <IconDotsVertical className="w-4 h-4 text-neutral-400" />
            )}
          </button>

          {/* Dropup Menu */}
          {userMenuOpen && (
            <div className="absolute bottom-full left-2 right-2 mb-2 bg-white dark:bg-neutral-900 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 py-1 z-50">
              {/* Account Info Section */}
              <div className="px-3 py-2 border-b border-neutral-200 dark:border-neutral-700">
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {profile?.nama || 'User'}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {user?.email}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 capitalize">
                  {profile?.role || 'Staff'}
                </p>
              </div>

              {/* Theme Toggle */}
              <button
                onClick={() => {
                  toggleTheme();
                  setUserMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                {theme === 'dark' ? <IconSun className="w-4 h-4" /> : <IconMoon className="w-4 h-4" />}
                <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
              </button>

              {/* Logout */}
              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  setLogoutConfirmOpen(true);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <IconLogout className="w-4 h-4" />
                <span>Keluar</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${contentMargin}`}>
        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6 pt-16 lg:pt-4">
          {children}
        </main>
      </div>
    </div>
  );
}
