'use client';

import {
  IconShoppingCart,
  IconPackage,
  IconTruck,
  IconClipboardCheck,
  IconArrowBack,
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
} from '@tabler/icons-react';
import Link from 'next/link';
import Image from 'next/image';
import { DashboardStats, LowStockItem, RecentTransaction } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import { useState } from 'react';
import { TransactionModal } from './TransactionModal';
import { formatTimeWIB, formatDateWIB } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { inventoryApi } from '@/lib/api/inventory';
import { useQueryClient } from '@tanstack/react-query';

interface MobileLaunchpadProps {
  stats?: DashboardStats | null;
  kasBalance: number;
  lowStock?: LowStockItem[];
  recentTransactions?: RecentTransaction[];
  isAdminUser: boolean;
  isLoading: boolean;
  onRefresh: () => void;
}

export function MobileLaunchpad({
  stats,
  kasBalance,
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

  const queryClient = useQueryClient();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 500);
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
      href: '/purchasing',
      title: 'Pembelian',
      icon: IconShoppingCart,
      color: 'text-brand-600',
      bg: 'bg-brand-50 dark:bg-brand-900/50',
    },
    {
      href: '/inventory',
      title: 'Stok',
      icon: IconPackage,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-900/50',
    },
    {
      href: '/inventory/stock-opname',
      title: 'Opname',
      icon: IconClipboardCheck,
      color: 'text-purple-600',
      bg: 'bg-purple-50 dark:bg-purple-900/50',
    },
    {
      href: '/transactions/return',
      title: 'Retur',
      icon: IconArrowBack,
      color: 'text-rose-600',
      bg: 'bg-rose-50 dark:bg-rose-900/50',
    },
    {
      href: '/finance/cash-flow',
      title: 'Arus Kas',
      icon: IconReport,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-900/50',
    },
    {
      href: '/inventory/promo',
      title: 'Promo',
      icon: IconTags,
      color: 'text-orange-600',
      bg: 'bg-orange-50 dark:bg-orange-900/50',
    },
    {
      href: '/analytics',
      title: 'Laporan',
      icon: IconChartBar,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 dark:bg-indigo-900/50',
    },
    {
      href: '/bulk-print',
      title: 'Cetak',
      icon: IconPrinter,
      color: 'text-slate-600',
      bg: 'bg-slate-50 dark:bg-slate-900/50',
    },
  ];

  const staffMenus = [
    {
      href: '/inventory',
      title: 'Stok',
      icon: IconPackage,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-900/50',
    },
    {
      href: '/inventory/stock-opname',
      title: 'Opname',
      icon: IconClipboardCheck,
      color: 'text-purple-600',
      bg: 'bg-purple-50 dark:bg-purple-900/50',
    },
    {
      href: '/transactions/return',
      title: 'Retur',
      icon: IconArrowBack,
      color: 'text-rose-600',
      bg: 'bg-rose-50 dark:bg-rose-900/50',
    },
    {
      href: '/bulk-print',
      title: 'Cetak Lbl',
      icon: IconPrinter,
      color: 'text-slate-600',
      bg: 'bg-slate-50 dark:bg-slate-900/50',
    },
  ];

  const menus = isAdminUser ? adminMenus : staffMenus;

  const todayStr = formatDateWIB(new Date(), { weekday: 'long', day: 'numeric', month: 'short' });

  const filteredTransactions =
    recentTransactions?.filter((trx) => (isAdminUser ? true : trx.type === 'penjualan')) || [];

  return (
    <div className="flex flex-col pb-6">
      {/* Header Lightweight */}
      <div className="mb-4 flex items-center justify-between px-1">
        <div>
          <h1 className="text-xl leading-tight font-bold text-neutral-900 dark:text-white">
            Halo, {profile?.nama?.split(' ')[0] || 'User'} 👋
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{todayStr}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="rounded-full bg-neutral-100 p-2 transition-transform active:scale-95 dark:bg-neutral-800"
          >
            <IconRefresh
              className={`h-5 w-5 text-neutral-600 dark:text-neutral-300 ${isRefreshing ? 'animate-spin' : ''}`}
            />
          </button>
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

      {/* Info Bar (Split) */}
      {isAdminUser && (
        <div className="mb-5 flex gap-2">
          <Link
            href="/analytics"
            className="from-brand-600 to-brand-700 flex flex-1 flex-col justify-center rounded-xl bg-gradient-to-br p-3 shadow-sm transition-transform active:scale-95"
          >
            <p className="text-brand-100 mb-1 text-[10px] font-bold tracking-wider uppercase">
              Penjualan Hari Ini
            </p>
            <p className="text-lg font-extrabold text-white">
              {isLoading ? '...' : `Rp ${(stats?.todaySales || 0).toLocaleString('id-ID')}`}
            </p>
          </Link>
        </div>
      )}

      {/* Grid Launchpad */}
      <div className="mb-5 rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
        <div className="grid grid-cols-4 gap-x-2 gap-y-4">
          {menus.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.title}
                href={item.href}
                className="group flex flex-col items-center gap-1.5 transition-transform select-none active:scale-90"
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.bg} transition-all group-hover:brightness-95`}
                >
                  <Icon className={`h-6 w-6 ${item.color}`} stroke={2} />
                </div>
                <span className="text-center text-[10px] leading-tight font-semibold text-neutral-700 dark:text-neutral-300">
                  {item.title}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Low Stock Alert (Flash Sale style carousel) */}
      {!isLoading && lowStock && lowStock.length > 0 && (
        <div className="mb-5">
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="flex items-center gap-1 text-sm font-extrabold tracking-wide text-red-600 uppercase dark:text-red-400">
              <IconBell className="h-4 w-4" /> Stok Tipis!
            </h2>
            <Link
              href="/inventory?filter=low-stock"
              className="text-xs font-semibold text-neutral-500 hover:text-neutral-900"
            >
              Lihat Semua &gt;
            </Link>
          </div>
          <div className="scrollbar-hide -mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
            {lowStock.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedLowStock(item)}
                className="w-32 flex-none snap-center rounded-xl border border-red-100 bg-red-50 p-2 text-left transition-transform active:scale-95 dark:border-red-900/50 dark:bg-red-900/20"
              >
                <div className="mb-2 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-900/30">
                  <IconPackage className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="mb-0.5 truncate text-[10px] font-semibold text-neutral-900 dark:text-white">
                    {item.nama_barang}
                  </p>
                  <p className="text-[10px] font-bold text-red-600 dark:text-red-400">
                    Sisa {item.stok}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {!isLoading && filteredTransactions.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
              Aktivitas Terakhir
            </h2>
            <Link href="/transactions/history" className="text-brand-600 text-xs font-semibold">
              Riwayat &gt;
            </Link>
          </div>
          <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-100 bg-white shadow-sm dark:divide-neutral-700 dark:border-neutral-700 dark:bg-neutral-800">
            {filteredTransactions.slice(0, 3).map((trx) => (
              <button
                key={trx.id}
                onClick={() => {
                  setSelectedTxId(trx.id);
                  setSelectedTxType(trx.type as 'penjualan' | 'pembelian');
                }}
                className="flex w-full items-center justify-between p-3 text-left transition-colors active:bg-neutral-50 dark:active:bg-neutral-700/50"
              >
                <div>
                  <p className="text-xs font-semibold text-neutral-900 uppercase dark:text-white">
                    {trx.id.split('-')[0]}
                  </p>
                  <p className="text-[10px] text-neutral-500">
                    {formatTimeWIB(trx.created_at, { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-xs font-bold ${trx.type === 'pembelian' ? 'text-rose-600' : 'text-emerald-600'}`}
                  >
                    {trx.type === 'pembelian' ? '-' : '+'} Rp{' '}
                    {(trx.total || 0).toLocaleString('id-ID')}
                  </p>
                  <p className="text-[10px] text-neutral-500">
                    {trx.type === 'pembelian' ? 'Pembelian' : 'Penjualan'}
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
    </div>
  );
}
