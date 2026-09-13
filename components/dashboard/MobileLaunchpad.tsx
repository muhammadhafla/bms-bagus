'use client';

import {
  IconShoppingCart,
  IconPackage,
  IconTruck,
  IconClipboardCheck,
  IconTags,
  IconChartBar,
  IconPrinter,
  IconHistory,
  IconBell,
  IconRefresh,
  IconSwitch,
  IconEye,
  IconUsersGroup,
  IconReport,
  IconClock,
  IconWallet,
  IconReceipt,
  IconBuildingWarehouse,
  IconUserCheck,
} from '@tabler/icons-react';
import Link from 'next/link';
import Image from 'next/image';
import { DashboardStats, LowStockItem, RecentTransaction } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import { useState, useRef, useEffect } from 'react';
import { TransactionModal } from './TransactionModal';
import { formatTimeWIB, formatDateWIB } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { HRAlerts } from '@/components/dashboard/HRAlerts';
import { inventoryApi } from '@/lib/api/inventory';
import { useQueryClient } from '@tanstack/react-query';

export interface ActiveShift {
  userId: string;
  userName: string;
  gudangId?: string | null;
  gudangName?: string | null;
  pemasukan: number;
  pengeluaran: number;
  saldo: number;
  lastActivity: string;
  shiftClosed: boolean;
}

interface MobileLaunchpadProps {
  stats?: DashboardStats | null;
  kasBalance: number;
  activeShifts?: ActiveShift[];
  lowStock?: LowStockItem[];
  recentTransactions?: RecentTransaction[];
  isAdminUser: boolean;
  isLoading: boolean;
  onRefresh: () => void;
}

export function MobileLaunchpad({
  stats,
  kasBalance,
  activeShifts = [],
  lowStock,
  recentTransactions,
  isAdminUser,
  isLoading,
  onRefresh,
}: MobileLaunchpadProps) {
  const { profile, user } = useAuthStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [selectedTxType, setSelectedTxType] = useState<'penjualan' | 'pembelian' | null>(null);
  const [selectedLowStock, setSelectedLowStock] = useState<LowStockItem | null>(null);
  const [isDiscontinuing, setIsDiscontinuing] = useState(false);
  const [isSnoozing, setIsSnoozing] = useState(false);

  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const totalActiveShiftBalance = (activeShifts || []).reduce(
    (acc, s) => acc + (s.saldo || 0),
    0
  );

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, clientWidth } = scrollContainerRef.current;
    if (clientWidth > 0) {
      const index = Math.min(2, Math.max(0, Math.round(scrollLeft / clientWidth)));
      if (index !== activeCardIndex) {
        setActiveCardIndex(index);
      }
    }
  };

  const scrollToSlide = (index: number) => {
    if (!scrollContainerRef.current) return;
    const targetChild = scrollContainerRef.current.children[index] as HTMLElement | undefined;
    if (targetChild) {
      targetChild.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'start',
      });
    }
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const stopPropagation = (e: Event) => {
      // Menghentikan propagasi event sentuh horizontal agar tidak memicu PullToRefresh
      e.stopPropagation();
    };

    // Gunakan capture: true untuk memastikan event dicegat sebelum sampai ke listener PullToRefresh
    const options = { passive: true, capture: true };

    el.addEventListener('touchstart', stopPropagation, options);
    el.addEventListener('touchmove', stopPropagation, options);
    el.addEventListener('touchend', stopPropagation, options);

    el.addEventListener('pointerdown', stopPropagation, options);
    el.addEventListener('pointermove', stopPropagation, options);
    el.addEventListener('pointerup', stopPropagation, options);

    return () => {
      el.removeEventListener('touchstart', stopPropagation, options);
      el.removeEventListener('touchmove', stopPropagation, options);
      el.removeEventListener('touchend', stopPropagation, options);

      el.removeEventListener('pointerdown', stopPropagation, options);
      el.removeEventListener('pointermove', stopPropagation, options);
      el.removeEventListener('pointerup', stopPropagation, options);
    };
  }, []);

  const queryClient = useQueryClient();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleSnooze = async (itemId: string, days: number) => {
    setIsSnoozing(true);
    try {
      await inventoryApi.snoozeLowStock(itemId, days);
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onRefresh();
    } catch (error) {
      console.error('Failed to snooze item:', error);
    } finally {
      setIsSnoozing(false);
      setSelectedLowStock(null);
    }
  };


  const handleDiscontinue = async (itemId: string) => {
    setIsDiscontinuing(true);
    try {
      await inventoryApi.toggleDiscontinued(itemId);
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onRefresh();
    } catch (error) {
      console.error('Failed to discontinue item:', error);
    } finally {
      setIsDiscontinuing(false);
      setSelectedLowStock(null);
    }
  };

  const adminMenus = [
    {
      href: '/warehouse/transfers',
      title: 'Mutasi',
      icon: IconTruck,
      color: 'text-blue-600',
      bg: 'bg-neutral-100 dark:bg-neutral-800',
    },
    {
      href: '/admin/payroll/kehadiran',
      title: 'Kehadiran',
      icon: IconUserCheck,
      color: 'text-teal-600',
      bg: 'bg-neutral-100 dark:bg-neutral-800',
    },
    {
      href: '/warehouse/stocks',
      title: 'Gudang',
      icon: IconBuildingWarehouse,
      color: 'text-emerald-600',
      bg: 'bg-neutral-100 dark:bg-neutral-800',
    },
    {
      href: '/inventory/stock-opname',
      title: 'Opname',
      icon: IconClipboardCheck,
      color: 'text-purple-600',
      bg: 'bg-neutral-100 dark:bg-neutral-800',
    },
    {
      href: '/payroll',
      title: 'Absensi',
      icon: IconClock,
      color: 'text-orange-600',
      bg: 'bg-neutral-100 dark:bg-neutral-800',
    },
    {
      href: '/finance/operasional',
      title: 'Pengeluaran',
      icon: IconReceipt,
      color: 'text-pink-600',
      bg: 'bg-neutral-100 dark:bg-neutral-800',
    },
    {
      href: '/admin/payroll/kasbon',
      title: 'Kasbon',
      icon: IconWallet,
      color: 'text-amber-600',
      bg: 'bg-neutral-100 dark:bg-neutral-800',
    },
    {
      href: '/admin/payroll/gaji',
      title: 'Gaji',
      icon: IconReport,
      color: 'text-cyan-600',
      bg: 'bg-neutral-100 dark:bg-neutral-800',
    },
    {
      href: '/finance/cash-flow',
      title: 'Arus Kas',
      icon: IconReport,
      color: 'text-emerald-600',
      bg: 'bg-neutral-100 dark:bg-neutral-800',
    },
    {
      href: '/inventory/promo',
      title: 'Promo',
      icon: IconTags,
      color: 'text-amber-500',
      bg: 'bg-neutral-100 dark:bg-neutral-800',
    },
    {
      href: '/analytics',
      title: 'Laporan',
      icon: IconChartBar,
      color: 'text-indigo-600',
      bg: 'bg-neutral-100 dark:bg-neutral-800',
    },
    {
      href: '/bulk-print',
      title: 'Cetak',
      icon: IconPrinter,
      color: 'text-slate-600',
      bg: 'bg-neutral-100 dark:bg-neutral-800',
    },
  ];

  const staffMenus = [
    {
      href: '/payroll',
      title: 'Absensi',
      icon: IconClock,
      color: 'text-orange-600',
      bg: 'bg-neutral-100 dark:bg-neutral-800',
    },
    {
      href: '/payroll/gaji',
      title: 'Dompet',
      icon: IconWallet,
      color: 'text-cyan-600',
      bg: 'bg-neutral-100 dark:bg-neutral-800',
    },
    {
      href: '/warehouse/stocks',
      title: 'Gudang',
      icon: IconBuildingWarehouse,
      color: 'text-teal-600',
      bg: 'bg-neutral-100 dark:bg-neutral-800',
    },
    {
      href: '/inventory/stock-opname',
      title: 'Opname',
      icon: IconClipboardCheck,
      color: 'text-purple-600',
      bg: 'bg-neutral-100 dark:bg-neutral-800',
    },
  ];

  const menus = isAdminUser ? adminMenus : staffMenus;

  const todayStr = formatDateWIB(new Date(), { weekday: 'long', day: 'numeric', month: 'short' });

  const filteredTransactions =
    recentTransactions?.filter((trx) => (isAdminUser ? true : trx.type === 'penjualan')) || [];

  return (
    <div className="flex flex-col pb-6 pt-2">
      {/* Header (Admin = Slidable Content Card, Non-Admin = Text Only) */}
      {isAdminUser ? (
        <div className="mb-6 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 p-4 shadow-lg shadow-brand-500/20 text-white">
          <Link href="/profile" className="mb-3 flex items-center justify-between transition-opacity active:opacity-70">
            <div>
              <h1 className="text-xl leading-tight font-bold text-white">
                Halo, {profile?.nama?.split(' ')[0] || 'User'} 👋
              </h1>
              <p className="text-xs text-brand-100">{todayStr}</p>
            </div>
            <div className="flex items-center gap-3">
              {profile?.avatar_url ? (
                <div className="relative h-9 w-9 overflow-hidden rounded-full border-2 border-white/20">
                  <Image
                    src={profile.avatar_url}
                    alt="Avatar"
                    fill
                    sizes="36px"
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white backdrop-blur-sm">
                  {profile?.nama?.charAt(0)?.toUpperCase() ||
                    user?.email?.charAt(0)?.toUpperCase() ||
                    'U'}
                </div>
              )}
            </div>
          </Link>

          {/* Slidable Content Area */}
          <div className="pt-3 border-t border-white/10">
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex w-full overflow-x-auto snap-x snap-mandatory scroll-smooth hide-scrollbar no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden overscroll-x-contain touch-pan-x"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {/* Slide 1: Penjualan Hari Ini */}
              <Link
                href="/transactions/history"
                className="w-full min-w-full snap-center shrink-0 flex flex-col gap-0.5 transition-opacity active:opacity-70"
              >
                <div className="flex items-end gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
                  <p className="text-xl min-[380px]:text-2xl sm:text-[2rem] leading-none font-black tracking-tighter text-white whitespace-nowrap">
                    {isLoading ? '...' : `Rp\u00A0${(stats?.todaySales || 0).toLocaleString('id-ID')}`}
                  </p>
                  {stats && stats.todaySales > 0 && (
                    <span className="mb-0.5 sm:mb-1 rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm whitespace-nowrap shrink-0">
                      +{(stats.todayTransactions || 0)} Trx
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium text-brand-100">Penjualan hari ini</p>
              </Link>

              {/* Slide 2: Kas Shift Berjalan */}
              <button
                type="button"
                onClick={() => setIsShiftModalOpen(true)}
                className="w-full min-w-full snap-center shrink-0 flex flex-col gap-0.5 text-left transition-opacity active:opacity-70 cursor-pointer"
              >
                <div className="flex items-end gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
                  <p className="text-xl min-[380px]:text-2xl sm:text-[2rem] leading-none font-black tracking-tighter text-white whitespace-nowrap">
                    {isLoading ? '...' : `Rp\u00A0${totalActiveShiftBalance.toLocaleString('id-ID')}`}
                  </p>
                  <span className="mb-0.5 sm:mb-1 rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm whitespace-nowrap shrink-0">
                    {(activeShifts || []).length} Kasir Aktif
                  </span>
                </div>
                <p className="text-sm font-medium text-brand-100">Kas Shift Berjalan (Klik rincian)</p>
              </button>

              {/* Slide 3: Saldo Kas Toko */}
              <Link
                href="/finance/cash-flow"
                className="w-full min-w-full snap-center shrink-0 flex flex-col gap-0.5 transition-opacity active:opacity-70"
              >
                <div className="flex items-end gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
                  <p className="text-xl min-[380px]:text-2xl sm:text-[2rem] leading-none font-black tracking-tighter text-white whitespace-nowrap">
                    {isLoading ? '...' : `Rp\u00A0${(kasBalance || 0).toLocaleString('id-ID')}`}
                  </p>
                  <span className="mb-0.5 sm:mb-1 rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm whitespace-nowrap shrink-0">
                    Kas Global
                  </span>
                </div>
                <p className="text-sm font-medium text-brand-100">Saldo Kas Toko</p>
              </Link>
            </div>
          </div>

          {/* Dots Indicator (Inside card) */}
          <div className="mt-3 flex items-center justify-center gap-1.5">
            <button
              type="button"
              onClick={() => scrollToSlide(0)}
              aria-label="Slide Penjualan hari ini"
              className={`h-1.5 rounded-full transition-all duration-300 ${
                activeCardIndex === 0
                  ? 'w-5 bg-white'
                  : 'w-1.5 bg-white/30 hover:bg-white/50'
              }`}
            />
            <button
              type="button"
              onClick={() => scrollToSlide(1)}
              aria-label="Slide Kas Shift Berjalan"
              className={`h-1.5 rounded-full transition-all duration-300 ${
                activeCardIndex === 1
                  ? 'w-5 bg-white'
                  : 'w-1.5 bg-white/30 hover:bg-white/50'
              }`}
            />
            <button
              type="button"
              onClick={() => scrollToSlide(2)}
              aria-label="Slide Saldo Kas Toko"
              className={`h-1.5 rounded-full transition-all duration-300 ${
                activeCardIndex === 2
                  ? 'w-5 bg-white'
                  : 'w-1.5 bg-white/30 hover:bg-white/50'
              }`}
            />
          </div>
        </div>
      ) : (
        <div className="mb-6 flex items-center justify-between px-1">
          <div>
            <h1 className="text-xl leading-tight font-bold text-neutral-900 dark:text-white">
              Halo, {profile?.nama?.split(' ')[0] || 'User'} 👋
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{todayStr}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/profile">
              {profile?.avatar_url ? (
                <div className="border-brand-100 dark:border-brand-900 relative h-9 w-9 overflow-hidden rounded-full border-2">
                  <Image
                    src={profile.avatar_url}
                    alt="Avatar"
                    fill
                    sizes="36px"
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="bg-brand-500 flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white">
                  {profile?.nama?.charAt(0)?.toUpperCase() ||
                    user?.email?.charAt(0)?.toUpperCase() ||
                    'U'}
                </div>
              )}
            </Link>
          </div>
        </div>
      )}

      {/* Grid Launchpad */}
      <div className="mb-6">
        <h2 className="mb-3 text-xs font-bold tracking-widest text-neutral-400 uppercase">Aksi Cepat</h2>
        <div className="grid grid-cols-4 gap-y-4 gap-x-2">
          {menus.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.title}
                href={item.href}
                className="group flex flex-col items-center gap-1.5 transition-transform select-none active:scale-90"
              >
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-lg ${item.bg} transition-all group-hover:brightness-95`}
                >
                  <Icon className={`h-6 w-6 ${item.color}`} stroke={2.5} />
                </div>
                <span className="text-center text-[10px] font-bold tracking-tight text-neutral-700 dark:text-neutral-300">
                  {item.title}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* HR & Payroll Alerts (Admin Only) */}
      {isAdminUser && (
        <div className="mb-6">
          <HRAlerts variant="mobile" />
        </div>
      )}

      {/* Low Stock Alert */}
      {!isLoading && lowStock && lowStock.length > 0 && (
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-bold tracking-widest text-neutral-400 uppercase">Stok Perlu Dicek</h2>
            <Link
              href="/inventory?lowStockOnly=true"
              className="text-[10px] font-bold tracking-wider text-brand-600 hover:text-brand-700 uppercase"
            >
              Lihat Semua
            </Link>
          </div>
          <div className="flex flex-col border-y border-neutral-200/60 dark:border-neutral-800">
            {lowStock.slice(0, 4).map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedLowStock(item)}
                className="flex items-center justify-between py-2.5 border-b border-neutral-100/80 last:border-0 dark:border-neutral-800/50 active:bg-neutral-50 dark:active:bg-neutral-800/50 transition-colors"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 flex-shrink-0">
                    <IconPackage className="h-4 w-4" />
                  </div>
                  <p className="truncate text-sm font-bold text-neutral-900 dark:text-white">
                    {item.nama_barang}
                  </p>
                </div>
                <div className="ml-3 flex-shrink-0 text-right">
                  <p className="text-sm font-black text-rose-600 dark:text-rose-400">{item.stok}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {!isLoading && filteredTransactions.length > 0 && (
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-bold tracking-widest text-neutral-400 uppercase">Aktivitas Terakhir</h2>
            <Link href="/transactions/history" className="text-[10px] font-bold tracking-wider text-brand-600 hover:text-brand-700 uppercase">
              Riwayat
            </Link>
          </div>
          <div className="flex flex-col border-y border-neutral-200/60 dark:border-neutral-800">
            {filteredTransactions.slice(0, 4).map((trx) => (
              <button
                key={trx.id}
                onClick={() => {
                  setSelectedTxId(trx.id);
                  setSelectedTxType(trx.type as 'penjualan' | 'pembelian');
                }}
                className="flex w-full items-center justify-between py-2.5 border-b border-neutral-100/80 last:border-0 dark:border-neutral-800/50 active:bg-neutral-50 dark:active:bg-neutral-800/50 transition-colors text-left"
              >
                <div>
                  <p className="text-sm font-bold text-neutral-900 dark:text-white">
                    {trx.id.split('-')[0]}
                  </p>
                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    {formatTimeWIB(trx.created_at, { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p
                    className={`text-sm font-black ${trx.type === 'pembelian' ? 'text-rose-600' : 'text-emerald-600'}`}
                  >
                    {trx.type === 'pembelian' ? '-' : '+'} Rp{' '}
                    {(trx.total || 0).toLocaleString('id-ID')}
                  </p>
                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    {trx.type === 'pembelian' ? 'Beli' : 'Jual'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}



      <TransactionModal
        isOpen={!!selectedTxId}
        onClose={() => {
          setSelectedTxId(null);
          setSelectedTxType(null);
        }}
        transactionId={selectedTxId}
        transactionType={selectedTxType}
        isBottomSheet={true}
      />

      <Modal
        isOpen={!!selectedLowStock}
        onClose={() => setSelectedLowStock(null)}
        title={selectedLowStock?.nama_barang || 'Detail Stok'}
        isBottomSheetOnMobile={true}
      >
        <div className="flex flex-col gap-3 pt-2 pb-2">
          <p className="mb-2 text-sm text-neutral-500">
            Pilih tindakan untuk barang ini. Sisa stok saat ini adalah{' '}
            <span className="font-bold text-red-600 dark:text-red-400">
              {selectedLowStock?.stok}
            </span>
            .
          </p>

          <Link
            href={
              selectedLowStock
                ? `/inventory?search=${encodeURIComponent(selectedLowStock.nama_barang)}`
                : '/inventory'
            }
            onClick={() => setSelectedLowStock(null)}
            className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <IconEye className="h-5 w-5" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                Lihat di Stok (Inventory)
              </p>
              <p className="text-xs text-neutral-500">Tampilkan detail lengkap di tabel</p>
            </div>
          </Link>

          <Link
            href="/purchasing"
            onClick={() => setSelectedLowStock(null)}
            className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400">
              <IconShoppingCart className="h-5 w-5" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                Tambah Stok Pembelian
              </p>
              <p className="text-xs text-neutral-500">Buat transaksi pembelian baru</p>
            </div>
          </Link>

          {/* SNOOZE SECTION */}
          <div className="mt-2 border-t border-neutral-200 dark:border-neutral-800 pt-4 pb-2">
            <p className="mb-1 text-sm font-semibold text-neutral-900 dark:text-white">Tunda Peringatan (Snooze)</p>
            <p className="mb-3 text-xs text-neutral-500">Sembunyikan dari widget sementara waktu</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: '1 Hari', days: 1, icon: '⏱️' },
                { label: '3 Hari', days: 3, icon: '🚚' },
                { label: '1 Minggu', days: 7, icon: '📅' },
                { label: '1 Bulan', days: 30, icon: '📦' },
              ].map((opt) => (
                <button
                  key={opt.days}
                  onClick={() => selectedLowStock && handleSnooze(selectedLowStock.id, opt.days)}
                  disabled={isSnoozing}
                  className="flex items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white p-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                >
                  <span>{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {isAdminUser && (
            <button
              onClick={() => selectedLowStock && handleDiscontinue(selectedLowStock.id)}
              disabled={isDiscontinuing}
              className="flex w-full items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 transition-colors hover:bg-rose-100 disabled:opacity-50 dark:border-rose-900/50 dark:bg-rose-900/20 dark:hover:bg-rose-900/30"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400">
                {isDiscontinuing ? (
                  <IconRefresh className="h-5 w-5 animate-spin" />
                ) : (
                  <IconSwitch className="h-5 w-5" />
                )}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                  Tandai Discontinue
                </p>
                <p className="text-xs text-rose-500 dark:text-rose-400/70">
                  Nonaktifkan barang dari daftar aktif
                </p>
              </div>
            </button>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        title="Kas Shift Berjalan"
        isBottomSheetOnMobile={true}
      >
        <div className="flex flex-col gap-3 pt-1 pb-2">
          <div className="rounded-2xl bg-neutral-100/80 dark:bg-neutral-800/80 p-3.5 border border-neutral-200/60 dark:border-neutral-700/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                Total Uang di Laci Kasir
              </span>
              <span className="rounded bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400 px-2 py-0.5 text-xs font-bold">
                {(activeShifts || []).length} Kasir Aktif
              </span>
            </div>
            <p className="mt-1 text-2xl font-black text-neutral-900 dark:text-white">
              Rp {totalActiveShiftBalance.toLocaleString('id-ID')}
            </p>
          </div>

          <div className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800 max-h-[50vh] overflow-y-auto">
            {(!activeShifts || activeShifts.length === 0) ? (
              <p className="py-8 text-center text-sm text-neutral-400">
                Tidak ada kasir dengan shift aktif saat ini.
              </p>
            ) : (
              activeShifts.map((shift) => (
                <div
                  key={`${shift.userId}_${shift.gudangId || 'all'}`}
                  className="py-3 first:pt-1 last:pb-1"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-neutral-900 dark:text-white truncate">
                        {shift.userName}
                      </p>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        {shift.gudangName || 'Outlet Kasir'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                        Rp {(shift.saldo || 0).toLocaleString('id-ID')}
                      </p>
                      <span className="inline-block text-[10px] font-semibold text-neutral-400">
                        Masuk: Rp {(shift.pemasukan || 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <Link
            href="/finance/cash-flow"
            onClick={() => setIsShiftModalOpen(false)}
            className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-neutral-900 dark:bg-white py-2.5 text-sm font-bold text-white dark:text-neutral-900 transition-opacity active:opacity-80"
          >
            Buka Buku Arus Kas Lengkap
          </Link>
        </div>
      </Modal>
    </div>
  );
}
