'use client';

import { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore, useIsAdmin } from '@/lib/auth';
import { usePresenceStore } from '@/lib/presence';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useDarkMode } from '@/components/DarkModeProvider';
import { toast, Toaster } from "sonner";
import Tooltip from '@/components/ui/Tooltip';
import BottomNav from '@/components/ui/BottomNav';
import { InstallBanner } from '@/components/ui/InstallBanner';
import { UpdateBanner } from '@/components/ui/UpdateBanner';
import { AuthProvider } from "@/components/AuthProvider";
import { QueryProvider } from "@/components/QueryProvider";
import {
  IconLayoutDashboard,
  IconPackage,
  IconShoppingCart,
  IconArrowBack,
  IconReport,
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
  IconTruck,
  IconTags,
  IconPrinter,
  IconChartBar,
} from '@tabler/icons-react';

// Constants extracted outside component to prevent re-creation
const NAV_ITEMS = [
  { href: '/dashboard', title: 'Dashboard', icon: IconLayoutDashboard },
];

const INVENTORY_ITEMS = [
  { href: '/inventory', title: 'Stok', icon: IconPackage },
  { href: '/inventory/kategori', title: 'Kategori', icon: IconTags },
  { href: '/inventory/stock-opname', title: 'Stok Opname', icon: IconClipboardCheck },
];

const PURCHASING_ITEMS = [
  { href: '/purchasing', title: 'Transaksi Baru', icon: IconShoppingCart },
  { href: '/purchasing/supplier', title: 'Supplier', icon: IconTruck },
];

const TRANSACTIONS_ITEMS = [
  { href: '/transactions/history', title: 'Riwayat Transaksi', icon: IconHistory },
  { href: '/transactions/return', title: 'Retur', icon: IconArrowBack },
];

const PRINTING_ITEMS = [
  { href: '/bulk-print', title: 'Cetak Massal', icon: IconPrinter },
  { href: '/print-history', title: 'Riwayat Cetak', icon: IconHistory },
  { href: '/master/label-templates', title: 'Template Label', icon: IconTags },
];

const FINANCE_ITEMS = [
  { href: '/finance/cash-flow', title: 'Arus Kas', icon: IconReport },
];

import { useSidebarState } from '@/hooks/useSidebarState';

interface SidebarLinkProps {
  href: string;
  title: string;
  icon: React.ElementType;
  isActive: boolean;
  sidebarCollapsed: boolean;
}

function SidebarLink({ href, title, icon: Icon, isActive, sidebarCollapsed }: SidebarLinkProps) {
  const link = (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
        isActive
          ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300 font-semibold'
          : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-100 dark:hover:bg-neutral-800'
      }`}
    >
      <Icon className={`w-4 h-4 flex-shrink-0 ${sidebarCollapsed ? 'lg:w-3 lg:h-3' : ''}`} />
      <span className={`transition-all ${sidebarCollapsed ? 'lg:hidden' : 'lg:block'}`}>
        {title}
      </span>
    </Link>
  );

  if (sidebarCollapsed) {
    return (
      <Tooltip content={title} position="right" className="w-full block">
        {link}
      </Tooltip>
    );
  }

  return link;
}

export function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, initialized, signOut } = useAuthStore();
  const isAdminUser = useIsAdmin();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useDarkMode();
  const {
     sidebarCollapsed, setSidebarCollapsed,
     inventoryExpanded, setInventoryExpanded,
     purchasingExpanded, setPurchasingExpanded,
     transactionsExpanded, setTransactionsExpanded,
     printingExpanded, setPrintingExpanded,
     financeExpanded, setFinanceExpanded,
     autoHideEnabled, setAutoHideEnabled,
   } = useSidebarState();
   const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
   const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
   const [isLoggingOut, setIsLoggingOut] = useState(false);
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

   // Click-outside handler for userMenuOpen
   useEffect(() => {
     const handleClickOutside = (event: MouseEvent) => {
       const userMenuElement = document.getElementById('user-menu-container');
       if (userMenuElement && !userMenuElement.contains(event.target as Node)) {
         setUserMenuOpen(false);
       }
     };
     if (userMenuOpen) {
       document.addEventListener('mousedown', handleClickOutside);
     }
     return () => {
       document.removeEventListener('mousedown', handleClickOutside);
     };
   }, [userMenuOpen]);

  // Auth redirect
  useEffect(() => {
    if (initialized && !user) {
      router.push('/login');
    }
  }, [user, initialized, router]);

  // Presence tracker
  const { initializePresence, cleanupPresence } = usePresenceStore();
  
  useEffect(() => {
    if (user?.id) {
      initializePresence(user.id);
    }
    return () => {
      cleanupPresence();
    };
  }, [user?.id, initializePresence, cleanupPresence]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Memoize computed values
  const navItems = useMemo(() => {
    const items = [...NAV_ITEMS];
    if (isAdminUser) {
      items.push({ href: '/analytics', title: 'Analisis & Laporan', icon: IconChartBar });
      items.push({ href: '/users', title: 'Pengguna', icon: IconUsers });
    }
    return items;
  }, [isAdminUser]);

  // Memoized handlers
   const handleSignOut = useCallback(() => {
     setIsLoggingOut(true);
     setLogoutConfirmOpen(false);
     signOut(); // The state is cleared optimistically, which triggers the redirect in useEffect
   }, [signOut]);

   const handleToggleInventory = useCallback(() => {
    setInventoryExpanded((prev: boolean) => !prev);
  }, [setInventoryExpanded]);

  const handleTogglePurchasing = useCallback(() => {
    setPurchasingExpanded((prev: boolean) => !prev);
  }, [setPurchasingExpanded]);

  const handleToggleTransactions = useCallback(() => {
    setTransactionsExpanded((prev: boolean) => !prev);
  }, [setTransactionsExpanded]);

  const handleTogglePrinting = useCallback(() => {
    setPrintingExpanded((prev: boolean) => !prev);
  }, [setPrintingExpanded]);

  const handleToggleFinance = useCallback(() => {
    setFinanceExpanded((prev: boolean) => !prev);
  }, [setFinanceExpanded]);

  const handleToggleAutoHide = useCallback(() => {
    setAutoHideEnabled((prev: boolean) => !prev);
  }, [setAutoHideEnabled]);



  return (
    <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
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
      {/* Removed overlay since mobile uses BottomNav */}

      {/* Mobile Menu Toggle Button (fixed, only visible on mobile) */}
      {/* Removed hamburger since mobile uses BottomNav */}

      {/* Sidebar - Responsive */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col transform transition-all duration-300 ease-in-out overflow-x-hidden
          ${mobileMenuOpen ? 'translate-x-0 bg-neutral-50 dark:bg-neutral-950 shadow-xl' : '-translate-x-full lg:translate-x-0'}
          ${sidebarWidth}
        `}
        aria-label="Sidebar navigation"
        onMouseEnter={() => autoHideEnabled && setSidebarHovered(true)}
        onMouseLeave={() => autoHideEnabled && setSidebarHovered(false)}
      >
          {/* Sidebar Header: Logo + Collapse Toggle */}
          <div className={`p-4 flex items-center ${isSidebarVisible ? 'justify-between' : 'justify-center'}`}>
            <Link href="/" className={`flex items-center ${isSidebarVisible ? 'gap-3' : 'gap-0'} ${!isSidebarVisible ? 'lg:justify-center' : ''}`}>
              <div className={`relative flex items-center justify-center transition-all ${!isSidebarVisible && autoHideEnabled ? 'lg:w-6 lg:h-6' : 'w-10 h-10'} dark:bg-white dark:rounded-xl`}>
                <Image src="/images/logo.svg" alt="BMS Logo" fill sizes="(max-width: 1023px) 24px, 40px" priority className="object-contain dark:p-1.5" />
              </div>

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
                 className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 transition-colors"
                 aria-expanded={inventoryExpanded}
               >
                 <span className="flex-1 text-left">Stok</span>
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
           {isAdminUser && (
             <div className="space-y-1">
               {(isSidebarVisible || mobileMenuOpen) && (
                 <button
                   type="button"
                   onClick={handleTogglePurchasing}
                   className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 transition-colors"
                   aria-expanded={purchasingExpanded}
                 >
                   <span className="flex-1 text-left">Pembelian</span>
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
           )}

            {/* Transactions Group */}
            <div className="space-y-1">
              {(isSidebarVisible || mobileMenuOpen) && (
                <button
                  type="button"
                  onClick={handleToggleTransactions}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 transition-colors"
                  aria-expanded={transactionsExpanded}
                >
                  <span className="flex-1 text-left">Transaksi</span>
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

            {/* Printing Group */}
            <div className="space-y-1">
              {(isSidebarVisible || mobileMenuOpen) && (
                <button
                  type="button"
                  onClick={handleTogglePrinting}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 transition-colors"
                  aria-expanded={printingExpanded}
                >
                  <span className="flex-1 text-left">Pencetakan Label</span>
                  {isSidebarVisible && (
                    <IconChevronRight
                      className={`w-3 h-3 transition-transform ${printingExpanded ? 'rotate-90' : ''}`}
                    />
                  )}
                </button>
              )}
              {(printingExpanded && (isSidebarVisible || mobileMenuOpen)) ? (
                <div className="space-y-1 pl-2">
                  {PRINTING_ITEMS.filter(item => isAdminUser || item.href !== '/master/label-templates').map((item) => (
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

            {/* Finance Group */}
            <div className="space-y-1">
              {(isSidebarVisible || mobileMenuOpen) && (
                <button
                  type="button"
                  onClick={handleToggleFinance}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 transition-colors"
                  aria-expanded={financeExpanded}
                >
                  <span className="flex-1 text-left">Keuangan</span>
                  {isSidebarVisible && (
                    <IconChevronRight
                      className={`w-3 h-3 transition-transform ${financeExpanded ? 'rotate-90' : ''}`}
                    />
                  )}
                </button>
              )}
              {(financeExpanded && (isSidebarVisible || mobileMenuOpen)) ? (
                <div className="space-y-1 pl-2">
                  {FINANCE_ITEMS.map((item) => (
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
        <div id="user-menu-container" className="p-3 relative">
          {/* User Menu Trigger */}
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all relative"
            aria-label="Open user menu"
            aria-expanded={userMenuOpen}
          >
            {/* Avatar */}
            {profile?.avatar_url ? (
              <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-neutral-200 dark:border-neutral-700">
                <Image src={profile.avatar_url} alt="Avatar" fill className="object-cover" sizes="32px" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                {profile?.nama?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            )}
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

              {/* Profile Link */}
              <Link
                href="/profile"
                onClick={() => setUserMenuOpen(false)}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <IconUsers className="w-4 h-4" />
                <span>Edit Profil</span>
              </Link>

              {/* Theme Toggle */}
              <button
                onClick={() => {
                  toggleTheme();
                  setUserMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                {theme === 'dark' ? <IconSun className="w-4 h-4" /> : <IconMoon className="w-4 h-4" />}
                <span>{theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}</span>
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
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${contentMargin} p-0 lg:p-3`}>
        {/* Page content */}
        <main className="flex-1 overflow-auto bg-white dark:bg-neutral-900 rounded-none lg:rounded-[2rem] shadow-none lg:shadow-sm border-0 lg:border border-neutral-200/50 dark:border-neutral-800/50 p-4 lg:p-6 relative pb-24 lg:pb-6">
          <UpdateBanner />
          <InstallBanner />
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
              <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-neutral-500 dark:text-neutral-400">Memuat halaman...</p>
            </div>
          }>
            {children}
          </Suspense>
        </main>
      </div>

      {/* Bottom Navigation for Mobile */}
      <BottomNav />
      {/* Mobile: top-center */}
      <Toaster
        richColors
        position="top-center"
        toastOptions={{
          classNames: {
            toast: 'lg:hidden',
          }
        }}
      />
      {/* Desktop: bottom-right */}
      <Toaster
        richColors
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast: 'hidden lg:flex',
          }
        }}
      />
    </div>
  );
}

export default function MainLayoutWithProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <MainLayout>{children}</MainLayout>
      </AuthProvider>
    </QueryProvider>
  );
}
