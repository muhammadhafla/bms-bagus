'use client';

import React, { useEffect, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore, useIsAdmin } from '@/lib/auth';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useDarkMode } from '@/components/DarkModeProvider';
import Tooltip from '@/components/ui/Tooltip';
import {
  IconLayoutDashboard,
  IconPackage,
  IconShoppingCart,
  IconArrowBack,
  IconReport,
  IconReceipt,
  IconBook,
  IconClipboardCheck,
  IconUsers,
  IconUsersGroup,
  IconSettings,
  IconLogout,
  IconSun,
  IconMoon,
  IconHistory,
  IconDotsVertical,
  IconMenu2,
  IconChevronRight,
  IconTruck,
  IconTags,
  IconChartBar,
  IconTicket,
  IconWallet,
  IconPrinter,
  IconClock,
  IconMapPin,
  IconBuildingWarehouse,
  IconTrash,
  IconHelpCircle,
} from '@tabler/icons-react';

import { useSidebarContext } from './SidebarProvider';

const DASHBOARD_ITEMS = [{ href: '/dashboard', title: 'Dashboard', icon: IconLayoutDashboard }];

const OPERASIONAL_ITEMS = [
  { href: '/purchasing', title: 'Transaksi Baru', icon: IconShoppingCart },
  { href: '/transactions/history', title: 'Riwayat Transaksi', icon: IconHistory },
  { href: '/transactions/return', title: 'Retur', icon: IconArrowBack },
  { href: '/inventory/promo', title: 'Manajemen Promo', icon: IconTicket },
];

const INVENTORY_ITEMS = [
  { href: '/inventory', title: 'Katalog Produk', icon: IconPackage },
  { href: '/inventory/stock-opname', title: 'Stok Opname', icon: IconClipboardCheck },
  { href: '/bulk-print', title: 'Cetak Massal', icon: IconPrinter },
  { href: '/print-history', title: 'Riwayat Cetak', icon: IconHistory },
];

const WAREHOUSE_ITEMS = [
  { href: '/warehouse/stocks', title: 'Stok per Gudang', icon: IconBuildingWarehouse },
  { href: '/warehouse/transfers', title: 'Mutasi & Transfer', icon: IconTruck },
  { href: '/warehouse/outbound', title: 'Pengeluaran Khusus', icon: IconTrash },
];

const FINANCE_ITEMS = [
  { href: '/finance/cash-flow', title: 'Arus Kas', icon: IconReport },
  { href: '/finance/operasional', title: 'Pengeluaran', icon: IconReceipt },
  { href: '/finance/ledger', title: 'Buku Besar', icon: IconBook },
];

const PAYROLL_ITEMS = [
  { href: '/admin/payroll/kehadiran', title: 'Data Kehadiran', icon: IconClock },
  { href: '/admin/payroll/kasbon', title: 'Persetujuan Kasbon', icon: IconWallet },
  { href: '/admin/payroll/gaji', title: 'Dashboard Keuangan', icon: IconReport },
];

const PAYROLL_ITEMS_STAFF = [
  { href: '/payroll', title: 'Absensi', icon: IconClock },
  { href: '/payroll/gaji', title: 'Dompet Saya', icon: IconWallet },
];

const REPORT_ITEMS = [
  { href: '/analytics', title: 'Analisis & Laporan', icon: IconChartBar },
  { href: '/inventory/reports/difference', title: 'Laporan Selisih', icon: IconReport },
];

const MASTER_ITEMS = [
  { href: '/users', title: 'Data Pengguna', icon: IconUsers },
  { href: '/admin/payroll/karyawan', title: 'Data Karyawan', icon: IconUsers },
  { href: '/members', title: 'Master Member', icon: IconUsersGroup },
  { href: '/members/tiers', title: 'Konfigurasi Tier', icon: IconSettings },
  { href: '/inventory/kategori', title: 'Kategori Barang', icon: IconTags },
  { href: '/purchasing/supplier', title: 'Data Supplier', icon: IconTruck },
  { href: '/warehouse/master', title: 'Master Gudang', icon: IconBuildingWarehouse },
  { href: '/master/label-templates', title: 'Template Label', icon: IconTags },
  { href: '/admin/payroll/lokasi-kerja', title: 'Lokasi Outlet', icon: IconMapPin },
];

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
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
        isActive
          ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300 font-semibold'
          : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100'
      }`}
    >
      <Icon className={`h-4 w-4 flex-shrink-0 ${sidebarCollapsed ? 'lg:h-3 lg:w-3' : ''}`} />
      <span className={`transition-all ${sidebarCollapsed ? 'lg:hidden' : 'lg:block'}`}>
        {title}
      </span>
    </Link>
  );

  if (sidebarCollapsed) {
    return (
      <Tooltip content={title} position="right" className="block w-full">
        {link}
      </Tooltip>
    );
  }

  return link;
}

const formatRolesLabel = (roles?: string[]) => {
  if (!roles || roles.length === 0) return 'Staff';
  if (roles.includes('admin')) return 'Admin';
  const roleNameMap: Record<string, string> = {
    kepala_cabang: 'Kepala Cabang',
    kepala_gudang: 'Kepala Cabang',
    staff_gudang: 'Staf Gudang',
    kasir: 'Kasir',
    finance: 'Finance',
    staff: 'Staff',
  };
  return roles.map((r) => roleNameMap[r] || r).join(', ');
};

export function Sidebar() {
  const { user, profile, initialized, signOut, hasRole, hasAnyRole } = useAuthStore();
  const isAdminUser = useIsAdmin();
  const isFinanceUser = hasRole('finance') || isAdminUser;
  const isWarehouseUser = hasAnyRole(['kepala_cabang', 'staff_gudang', 'admin']);
  const isKepalaCabang = hasRole('kepala_cabang') || isAdminUser;
  const isKepalaGudang = isKepalaCabang;
  const isKasir = hasRole('kasir') || isAdminUser;

  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useDarkMode();
  const {
    sidebarHovered,
    setSidebarHovered,
    userMenuOpen,
    setUserMenuOpen,
    logoutConfirmOpen,
    setLogoutConfirmOpen,
    isLoggingOut,
    setIsLoggingOut,
    mobileMenuOpen,
    setMobileMenuOpen,
    sidebarCollapsed,
    setSidebarCollapsed,
    operasionalExpanded,
    setOperasionalExpanded,
    inventoryExpanded,
    setInventoryExpanded,
    warehouseExpanded,
    setWarehouseExpanded,
    financeExpanded,
    setFinanceExpanded,
    payrollExpanded,
    setPayrollExpanded,
    reportsExpanded,
    setReportsExpanded,
    masterExpanded,
    setMasterExpanded,
    autoHideEnabled,
    setAutoHideEnabled,
    isSidebarVisible,
    sidebarWidth,
  } = useSidebarContext();

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
  }, [userMenuOpen, setUserMenuOpen]);

  // Auth redirect
  useEffect(() => {
    if (initialized && !user) {
      router.push('/login');
    }
  }, [user, initialized, router]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname, setMobileMenuOpen]);

  const operasionalItems = useMemo(() => OPERASIONAL_ITEMS.filter(item => {
    if (item.href === '/purchasing') return isAdminUser || isKepalaGudang || isFinanceUser;
    if (item.href === '/transactions/history') return isKasir || isAdminUser || isFinanceUser;
    if (item.href === '/transactions/return') return isKasir || isWarehouseUser || isAdminUser;
    if (item.href === '/inventory/promo') return isAdminUser;
    return true;
  }), [isAdminUser, isKepalaGudang, isFinanceUser, isKasir, isWarehouseUser]);

  const inventoryItems = useMemo(() => INVENTORY_ITEMS.filter(item => {
    if (item.href === '/inventory') return true;
    if (item.href === '/inventory/stock-opname') return isWarehouseUser;
    if (item.href === '/bulk-print' || item.href === '/print-history') return isWarehouseUser || isAdminUser;
    return true;
  }), [isWarehouseUser, isAdminUser]);

  const warehouseItems = useMemo(() => isWarehouseUser ? WAREHOUSE_ITEMS : [], [isWarehouseUser]);

  const masterItems = useMemo(() => MASTER_ITEMS.filter(item => {
    if (item.href === '/inventory/kategori') return isAdminUser || isKepalaGudang;
    if (item.href === '/purchasing/supplier') return isAdminUser || isKepalaGudang;
    if (item.href === '/warehouse/master') return isAdminUser;
    return isAdminUser;
  }), [isAdminUser, isKepalaGudang]);

  const handleSignOut = useCallback(() => {
    setIsLoggingOut(true);
    setLogoutConfirmOpen(false);
    signOut();
  }, [signOut, setIsLoggingOut, setLogoutConfirmOpen]);

  if (pathname?.startsWith('/help')) {
    return null;
  }

  return (
    <>
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

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex transform flex-col overflow-x-hidden transition-all duration-300 ease-in-out ${mobileMenuOpen ? 'translate-x-0 bg-neutral-50 shadow-xl dark:bg-neutral-950' : '-translate-x-full lg:translate-x-0'} ${sidebarWidth} `}
        aria-label="Sidebar navigation"
        onMouseEnter={() => autoHideEnabled && setSidebarHovered(true)}
        onMouseLeave={() => autoHideEnabled && setSidebarHovered(false)}
      >
        {/* Sidebar Header: Logo + Collapse Toggle */}
        <div
          className={`flex items-center p-4 ${isSidebarVisible ? 'justify-between' : 'justify-center'}`}
        >
          <Link
            href="/"
            className={`flex items-center ${isSidebarVisible ? 'gap-3' : 'gap-0'} ${!isSidebarVisible ? 'lg:justify-center' : ''}`}
          >
            <div
              className={`relative flex items-center justify-center transition-all ${!isSidebarVisible && autoHideEnabled ? 'lg:h-6 lg:w-6' : 'h-10 w-10'} dark:rounded-xl dark:bg-white`}
            >
              <Image
                src="/images/logo.svg"
                alt="BMS Logo"
                fill
                sizes="(max-width: 1023px) 24px, 40px"
                priority
                className="object-contain dark:p-1.5"
              />
            </div>
          </Link>
          {isSidebarVisible && (
            <button
              onClick={() => setAutoHideEnabled((prev: boolean) => !prev)}
              className={`hidden rounded-lg p-2 transition-colors lg:block ${autoHideEnabled ? 'bg-brand-100 dark:bg-brand-900 text-brand-600 dark:text-brand-400' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
              aria-label={autoHideEnabled ? 'Disable auto-hide' : 'Enable auto-hide'}
            >
              {autoHideEnabled ? (
                <IconMenu2 className="h-5 w-5" />
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m15 18-6-6 6-6" />
                </svg>
              )}
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-4 overflow-x-hidden overflow-y-auto px-3 py-4">
          {/* Main Navigation */}
          <div className="space-y-1">
            {DASHBOARD_ITEMS.map((item) => (
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

          {/* Operasional Group */}
          {operasionalItems.length > 0 && (
            <div className="space-y-1">
              {(isSidebarVisible || mobileMenuOpen) && (
                <button
                  type="button"
                  onClick={() => setOperasionalExpanded((prev: boolean) => !prev)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-semibold tracking-wider text-neutral-400 uppercase transition-colors hover:bg-neutral-200/50 dark:text-neutral-500 dark:hover:bg-neutral-800/50"
                  aria-expanded={operasionalExpanded}
                >
                  <span className="flex-1 text-left">Operasional</span>
                  {isSidebarVisible && (
                    <IconChevronRight
                      className={`h-3 w-3 transition-transform ${operasionalExpanded ? 'rotate-90' : ''}`}
                    />
                  )}
                </button>
              )}
              {operasionalExpanded && (isSidebarVisible || mobileMenuOpen) ? (
                <div className="space-y-1 pl-2">
                  {operasionalItems.map((item) => (
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

          {/* Inventory Group */}
          <div className="space-y-1">
            {(isSidebarVisible || mobileMenuOpen) && (
              <button
                type="button"
                onClick={() => setInventoryExpanded((prev: boolean) => !prev)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-semibold tracking-wider text-neutral-400 uppercase transition-colors hover:bg-neutral-200/50 dark:text-neutral-500 dark:hover:bg-neutral-800/50"
                aria-expanded={inventoryExpanded}
              >
                <span className="flex-1 text-left">Produk & Katalog</span>
                {isSidebarVisible && (
                  <IconChevronRight
                    className={`h-3 w-3 transition-transform ${inventoryExpanded ? 'rotate-90' : ''}`}
                  />
                )}
              </button>
            )}
            {inventoryExpanded && (isSidebarVisible || mobileMenuOpen) ? (
              <div className="space-y-1 pl-2">
                {inventoryItems.map((item) => (
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

          {/* Warehouse Group */}
          {warehouseItems.length > 0 && (
            <div className="space-y-1">
              {(isSidebarVisible || mobileMenuOpen) && (
                <button
                  type="button"
                  onClick={() => setWarehouseExpanded((prev: boolean) => !prev)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-semibold tracking-wider text-neutral-400 uppercase transition-colors hover:bg-neutral-200/50 dark:text-neutral-500 dark:hover:bg-neutral-800/50"
                  aria-expanded={warehouseExpanded}
                >
                  <span className="flex-1 text-left">Gudang & Logistik</span>
                  {isSidebarVisible && (
                    <IconChevronRight
                      className={`h-3 w-3 transition-transform ${warehouseExpanded ? 'rotate-90' : ''}`}
                    />
                  )}
                </button>
              )}
              {warehouseExpanded && (isSidebarVisible || mobileMenuOpen) ? (
                <div className="space-y-1 pl-2">
                  {warehouseItems.map((item) => (
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

          {/* Laporan Group */}
          {(isAdminUser || isFinanceUser) && (
            <div className="space-y-1">
              {(isSidebarVisible || mobileMenuOpen) && (
                <button
                  type="button"
                  onClick={() => setReportsExpanded((prev: boolean) => !prev)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-semibold tracking-wider text-neutral-400 uppercase transition-colors hover:bg-neutral-200/50 dark:text-neutral-500 dark:hover:bg-neutral-800/50"
                  aria-expanded={reportsExpanded}
                >
                  <span className="flex-1 text-left">Laporan & Analitik</span>
                  {isSidebarVisible && (
                    <IconChevronRight
                      className={`h-3 w-3 transition-transform ${reportsExpanded ? 'rotate-90' : ''}`}
                    />
                  )}
                </button>
              )}
              {reportsExpanded && (isSidebarVisible || mobileMenuOpen) ? (
                <div className="space-y-1 pl-2">
                  {REPORT_ITEMS.map((item) => (
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

          {/* HR & Payroll Group */}
          <div className="space-y-1">
            {(isSidebarVisible || mobileMenuOpen) && (
              <button
                type="button"
                onClick={() => setPayrollExpanded((prev: boolean) => !prev)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-semibold tracking-wider text-neutral-400 uppercase transition-colors hover:bg-neutral-200/50 dark:text-neutral-500 dark:hover:bg-neutral-800/50"
                aria-expanded={payrollExpanded}
              >
                <span className="flex-1 text-left">HR & Payroll</span>
                {isSidebarVisible && (
                  <IconChevronRight
                    className={`h-3 w-3 transition-transform ${payrollExpanded ? 'rotate-90' : ''}`}
                  />
                )}
              </button>
            )}
            {payrollExpanded && (isSidebarVisible || mobileMenuOpen) ? (
              <div className="space-y-1 pl-2">
                {(isAdminUser || isFinanceUser ? PAYROLL_ITEMS : PAYROLL_ITEMS_STAFF).map((item) => (
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
          {(isAdminUser || isFinanceUser) && (
            <div className="space-y-1">
              {(isSidebarVisible || mobileMenuOpen) && (
                <button
                  type="button"
                  onClick={() => setFinanceExpanded((prev: boolean) => !prev)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-semibold tracking-wider text-neutral-400 uppercase transition-colors hover:bg-neutral-200/50 dark:text-neutral-500 dark:hover:bg-neutral-800/50"
                  aria-expanded={financeExpanded}
                >
                  <span className="flex-1 text-left">Keuangan</span>
                  {isSidebarVisible && (
                    <IconChevronRight
                      className={`h-3 w-3 transition-transform ${financeExpanded ? 'rotate-90' : ''}`}
                    />
                  )}
                </button>
              )}
              {financeExpanded && (isSidebarVisible || mobileMenuOpen) ? (
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
          )}

          {/* Master Data Group */}
          {masterItems.length > 0 && (
            <div className="space-y-1">
              {(isSidebarVisible || mobileMenuOpen) && (
                <button
                  type="button"
                  onClick={() => setMasterExpanded((prev: boolean) => !prev)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-semibold tracking-wider text-neutral-400 uppercase transition-colors hover:bg-neutral-200/50 dark:text-neutral-500 dark:hover:bg-neutral-800/50"
                  aria-expanded={masterExpanded}
                >
                  <span className="flex-1 text-left">Data Master & Pengaturan</span>
                  {isSidebarVisible && (
                    <IconChevronRight
                      className={`h-3 w-3 transition-transform ${masterExpanded ? 'rotate-90' : ''}`}
                    />
                  )}
                </button>
              )}
              {masterExpanded && (isSidebarVisible || mobileMenuOpen) ? (
                <div className="space-y-1 pl-2">
                  {masterItems.map((item) => (
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

          {/* Pusat Bantuan & Panduan Sistem */}
          <div className="pt-2 mt-2 border-t border-neutral-200/60 dark:border-neutral-800/60">
            <SidebarLink
              href="/help"
              title="Pusat Bantuan & Role"
              icon={IconHelpCircle}
              isActive={pathname === '/help'}
              sidebarCollapsed={!isSidebarVisible}
            />
          </div>
        </nav>

        {/* Sidebar Footer: User Dropup Menu */}
        <div id="user-menu-container" className="relative p-3">
          {/* User Menu Trigger */}
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="relative flex w-full items-center gap-3 rounded-lg p-2 transition-all hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Open user menu"
            aria-expanded={userMenuOpen}
          >
            {/* Avatar */}
            {profile?.avatar_url ? (
              <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-full border border-neutral-200 dark:border-neutral-700">
                <Image
                  src={profile.avatar_url}
                  alt="Avatar"
                  fill
                  className="object-cover"
                  sizes="32px"
                />
              </div>
            ) : (
              <div className="bg-brand-500 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white">
                {profile?.nama?.charAt(0)?.toUpperCase() ||
                  user?.email?.charAt(0)?.toUpperCase() ||
                  'U'}
              </div>
            )}
            {isSidebarVisible && (
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {profile?.nama || 'User'}
                </p>
                <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                  {user?.email}
                </p>
              </div>
            )}
            {isSidebarVisible && <IconDotsVertical className="h-4 w-4 text-neutral-400" />}
          </button>

          {/* Dropup Menu */}
          {userMenuOpen && (
            <div className="absolute right-2 bottom-full left-2 z-50 mb-2 rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
              {/* Account Info Section */}
              <div className="border-b border-neutral-200 px-3 py-2 dark:border-neutral-700">
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {profile?.nama || 'User'}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{user?.email}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {formatRolesLabel(profile?.roles)}
                </p>
              </div>

              {/* Profile Link */}
              <Link
                href="/profile"
                onClick={() => setUserMenuOpen(false)}
                className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                <IconUsers className="h-4 w-4" />
                <span>Edit Profil</span>
              </Link>

              {/* Help & Role Guide Link */}
              <Link
                href="/help"
                onClick={() => setUserMenuOpen(false)}
                className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                <IconHelpCircle className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                <span>Pusat Bantuan & Role</span>
              </Link>

              {/* Theme Toggle */}
              <button
                onClick={() => {
                  toggleTheme();
                  setUserMenuOpen(false);
                }}
                className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                {theme === 'dark' ? (
                  <IconSun className="h-4 w-4" />
                ) : (
                  <IconMoon className="h-4 w-4" />
                )}
                <span>{theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}</span>
              </button>

              {/* Logout */}
              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  setLogoutConfirmOpen(true);
                }}
                className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-neutral-100 dark:text-red-400 dark:hover:bg-neutral-800"
              >
                <IconLogout className="h-4 w-4" />
                <span>Keluar</span>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
